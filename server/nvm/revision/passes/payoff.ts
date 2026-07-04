// Wave 39 — Pass 11: Payoff/Continuity
// Checks planted clue/setup payoffs: orphan clues, setups paid off too quickly,
// payoffs that arrive before their setups.
// Wave 140 additions: setup without consequence (clues planted multiple times
// but never affecting plot/character decisions) and consequence-delayed payoff
// (payoff occurs too long after setup, breaking the audience's memory arc).
// Wave 154 additions: clustered payoffs (too many resolved in one scene),
// payoff before climax (all loops closed too early, deflating the ending), and
// setup imbalance (clue plants concentrated in one act with no early seeding).
// Wave 261 additions: payoff precedes setup (causal inversion), payoff gap excessive
// (forgotten long fuse), and payoff front-loaded (resolutions cashed out too early).
// Wave 275 additions: Act 2a payoff void (early conflict zone never closes any loops),
// late-majority clue seeding (>60% of clues planted in second half), and
// setup/payoff act skew (planting and harvesting engines operate in separate acts).
// Wave 289 additions: payoff-revelation disconnect (payoffs fire without revelations nearby),
// clue density front-collapse (all clues in first 20%), payoff suspense mismatch
// (payoff scenes have avg suspenseDelta ≤ 0 despite 3+ payoffs).
// Wave 303 additions: clue replant (same clue ID seeded in 2+ scenes), payoff double
// fire (same setup ID resolved in 2+ scenes), thread convergence absent (4+ payoffs
// all resolving in isolation — threads never braid).
// Wave 317 additions: payoff emotion decoupled (all payoff scenes emotionally neutral),
// unresolved clue ratio high (≥40% of seeded clues still open in final scene), payoff
// curiosity mismatch (payoff scenes avg curiosityDelta ≤ 0 despite 3+ payoffs).
// Wave 328 additions: payoff relationship decoupled (no payoff scene moves a bond),
// clue seed curiosity flat (clue-seeding scenes avg curiosityDelta ≤ 0), clue seed
// emotion flat (every clue planted in an emotionally neutral scene).
// Wave 342 additions: clue seed relationship decoupled (no clue-seeding scene moves a
// bond), payoff dramatic turn decoupled (no payoff scene carries a dramatic turn —
// resolutions never pivot the story), setup/payoff dead run (6+ consecutive scenes with
// no seed and no payoff in a story that otherwise uses the machine — connective tissue
// vanishes for a stretch).
// Wave 356 additions: clue seed dramatic turn decoupled (no clue-seeding scene coincides
// with a story pivot), payoff clock decoupled (≥3 payoffs and ≥2 clock scenes but no
// payoff lands under time pressure), late clue plant (a clue seeded in the final 15% —
// no room left to pay it off).
// Wave 370 additions: payoff curiosity peak decoupled (the single highest-curiosity scene
// carries no payoff while payoffs exist elsewhere), payoff Act 3 absent (no payoff lands in
// the final 25% though ≥3 resolve earlier — the finale settles nothing), clue seed midpoint
// void (no clue planted in the 40%–60% pivot while seeds exist on both sides).
// Wave 384 additions: payoff suspense peak decoupled (the single highest-suspense scene
// carries no payoff while payoffs exist elsewhere — the suspense mirror of payoff curiosity
// peak decoupled), clue seed clock decoupled (≥3 seed scenes and ≥2 clock scenes but no clue
// is planted under time pressure — the seed-side sibling of payoff clock decoupled), clue
// seed front-loaded (>60% of clues planted in the first half — the mirror of clue seed late
// majority).
// Wave 398 additions: clue seed suspense flat (all seed scenes have suspenseDelta ≤ 0 —
// evidence planted in tension-free moments; the suspense-channel complement of clue seed
// curiosity flat and clue seed emotion flat), payoff midpoint void (no payoff in the 40%–60%
// pivot zone while payoffs exist before and after — the pivot is structurally inert), clue
// seed revelation decoupled (no seed scene coincides with a revelation — planting evidence
// and making disclosures never overlap, missing the compound effect of both in one moment).
// Wave 412 additions: clue seed curiosity peak decoupled (the single highest-curiosity scene
// seeds no clue while seeds exist elsewhere — the seed-side mirror of payoff curiosity peak
// decoupled), clue seed suspense peak decoupled (the single highest-suspense scene seeds no
// clue while seeds exist elsewhere — the seed-side mirror of payoff suspense peak decoupled),
// payoff relationship peak decoupled (the single largest relational shift scene carries no
// payoff while payoffs exist elsewhere — single-peak isolation × relationship magnitude,
// distinct from the co-occurrence PAYOFF_RELATIONSHIP_DECOUPLED).
// Wave 426 additions: payoff aftermath question void (sequence/aftermath — every payoff scene is
// followed by two scenes that raise no curiosity and plant no new clue, so each resolution
// deflates the story instead of re-engaging it), payoff consecutive run (run-based — three or
// more consecutive scenes each fire a payoff, a "resolution avalanche" that dumps closures
// back-to-back with no rebuild between; distinct from CLUSTERED_PAYOFFS which counts many in ONE
// scene and THREAD_CONVERGENCE_ABSENT which is the opposite, payoffs in isolation), payoff
// relationship valence uniform (valence — when payoffs DO move bonds, every relational shift on
// a payoff scene shares one sign, so the resolution phase ruptures-only or repairs-only;
// distinct from PAYOFF_RELATIONSHIP_DECOUPLED, which fires when NO payoff moves a bond at all).
// Wave 440 additions: payoff backloaded (>70% of payoffs in the second half while ≥3 exist —
// the distribution mirror of PAYOFF_FRONT_LOADED; the first half resolves nothing while the
// second half carries all closures; distribution/timing × underweight/bloat), payoff emotional
// recoil absent (no payoff scene is followed by a negative emotional shift within 2 scenes —
// resolutions never produce grief, loss, or emotional cost downstream; sequence/aftermath ×
// negative-emotion channel, distinct from PAYOFF_AFTERMATH_QUESTION_VOID by channel and from
// PAYOFF_EMOTION_DECOUPLED which audits the payoff scene itself), payoff suspense recoil absent
// (no payoff scene is followed by a suspenseDelta > 0 within 2 scenes — resolutions never create
// new pressure downstream; sequence/aftermath × suspense channel, completing the aftermath-channel
// family alongside curiosity/seed and emotional recoil).
// Wave 454 additions: payoff causeless (backward-cause × payoff signal — no payoff scene is
// preceded in the prior 3 scenes by any narrative escalation: no revelation, no dramatic turn,
// no high-suspense push — resolutions arrive without momentum building toward them), clue seed
// causeless (backward-cause × clue-seed signal — no seed scene is preceded in the prior 2
// scenes by curiosity, emotional charge, or a revelation — evidence planted into narrative dead
// air), clue seed consecutive run (run-based × clue-seed signal — 3+ consecutive scenes each
// plant a new clue, an "evidence avalanche" that overwhelms the audience with simultaneous
// information before they can form emotional attachment to individual threads).
// Wave 468 additions: payoff revelation aftermath absent (sequence/aftermath × revelation ×
// payoff trigger — no payoff scene is followed by a revelation within 2 scenes; completing the
// payoff-aftermath channel family with the disclosure channel), seed suspense aftermath absent
// (sequence/aftermath × suspense × seed trigger — no seed scene is followed by a suspense rise
// within 2 scenes; first aftermath check for seeds, the seed-side sibling of payoff aftermath
// suspense recoil), seed emotional aftermath absent (sequence/aftermath × emotional × seed
// trigger — no seed scene is followed by an emotional shift within 2 scenes; second seed-
// aftermath check, completes the seed aftermath triad alongside seed suspense aftermath).
// Wave 482 additions: seed curiosity aftermath absent (sequence/aftermath × curiosity × seed
// trigger — no seed scene is followed by a curiosity rise in next 2 scenes; third seed-aftermath
// check completing the triad alongside suspense and emotional channels), seed act 3 void (zone
// presence/absence × seed × Act 3 — ≥4 seeds but none in final 25%, Act 3 plants no new
// threads while still resolving prior ones; extends zone family with a new zone/channel), payoff
// aftermath relationship void (sequence/aftermath × relationship × payoff trigger — no payoff
// scene is followed by a relationship shift in next 2 scenes; fifth payoff-aftermath check
// completing the family with the relational channel).
// Wave 510 additions: seed revelation aftermath absent (sequence/aftermath × revelation × seed
// trigger — ≥3 qualifying seeds none followed by a revelation in next 2 scenes while ≥2 revelation
// scenes exist; adds the revelation channel to the seed-aftermath family, completing the five-
// channel family alongside suspense/emotional/curiosity/dramatic-turn channels), payoff seed
// aftermath absent (sequence/aftermath × seed × payoff trigger — ≥3 qualifying payoffs none
// followed by a clue seed in next 2 scenes while ≥2 seed scenes exist; first seed-channel entry
// in the payoff-aftermath family, distinct from PAYOFF_AFTERMATH_QUESTION_VOID which requires
// BOTH seed and curiosity absence), seed drought run (run-based × seed × consecutive absence —
// 5+ consecutive scenes with no seededClueIds while ≥3 seed scenes exist elsewhere; drought
// mirror of CLUE_SEED_CONSECUTIVE_RUN and more targeted than SETUP_PAYOFF_DEAD_RUN which
// requires both seeds and payoffs absent simultaneously).
// Wave 496 additions: payoff temporal cluster (distribution/timing × payoff × thirds — >75%
// of payoffs fall in one structural third while ≥4 exist; extends the distribution family
// beyond binary halves to thirds, fires when the middle or closing third dominates which
// PAYOFF_FRONT_LOADED/BACKLOADED cannot detect), seed dramatic turn aftermath absent (sequence/
// aftermath × dramatic turn × seed trigger — ≥3 qualifying seeds none followed by a turn in
// the next 2 scenes while ≥2 turns exist; adds the dramatic-turn channel to the seed-aftermath
// family alongside suspense, emotional, and curiosity), payoff clock aftermath absent (sequence/
// aftermath × clock × payoff trigger — ≥3 qualifying payoffs none followed by a clock raise in
// the next 2 scenes while ≥2 clock scenes exist; adds the clock channel to the payoff-aftermath
// family and is distinct from PAYOFF_CLOCK_DECOUPLED which audits same-scene co-occurrence).
// Wave 552 additions: payoff drought run (run-based × payoff × consecutive absence —
// 5+ consecutive scenes with no payoff while ≥4 payoffs exist; the payoff-side mirror of
// SEED_DROUGHT_RUN which detects the same drought pattern on the seed trigger; distinct from
// SETUP_PAYOFF_DEAD_RUN which requires both seeds AND payoffs absent simultaneously), seed
// relationship valence uniform (valence × relationship × seed trigger — ≥2 seed scenes
// that each also move a relationship all have shifts of the same sign, so the clue-planting
// engine is relationally monotone; distinct from PAYOFF_RELATIONSHIP_VALENCE_UNIFORM which
// uses payoff trigger, and CLUE_SEED_RELATIONSHIP_DECOUPLED which fires when no overlap at
// all), payoff emotional valence uniform (valence × emotional × payoff trigger — ≥3 payoffs,
// ≥2 with non-neutral emotionalShift, all share one valence so resolutions only produce grief
// or only relief; distinct from PAYOFF_EMOTION_DECOUPLED which fires when ALL payoffs are
// emotionally neutral, and PAYOFF_RELATIONSHIP_VALENCE_UNIFORM which uses the relationship
// channel).
// Wave 538 additions: payoff dramatic turn aftermath absent (sequence/aftermath × dramatic
// turn × payoff trigger — ≥3 qualifying payoffs none followed by a dramatic turn in next 2
// scenes while ≥2 turn scenes exist; every delivery produces no pivot in its wake; completes
// the payoff-aftermath family with the dramatic-turn channel, distinct from PAYOFF_DRAMATIC_
// TURN_DECOUPLED which audits same-scene co-occurrence), seed relationship aftermath absent
// (sequence/aftermath × relationship × seed trigger — ≥3 qualifying seeds none followed by a
// relationship shift in next 2 scenes while ≥2 relational scenes exist; planted clues never
// strain bonds in their aftermath; adds the relationship channel to the seed-aftermath family,
// distinct from CLUE_SEED_RELATIONSHIP_DECOUPLED which audits same-scene co-occurrence), seed
// clock aftermath absent (sequence/aftermath × clock × seed trigger — ≥3 qualifying seeds none
// followed by clockRaised=true in next 2 scenes while ≥2 clock scenes exist; seeds and deadlines
// never compound; adds the clock channel to the seed-aftermath family, distinct from CLUE_SEED_
// CLOCK_DECOUPLED which audits same-scene co-occurrence).
// Wave 580 additions: seed opening zone absent (zone presence/absence × seed × opening third —
// n≥9, ≥4 seed scenes, none in opening structural third; setup act plants no foreshadowing;
// distinct from CLUE_SEED_FRONT_LOADED [too much early], CLUE_SEED_MIDPOINT_VOID [different zone],
// SEED_ACT3_VOID [closing zone]; first zone-absence check on the seed channel's opening zone),
// payoff seed decoupled (co-occurrence/decoupling × payoff × seed cross-channel — n≥8, ≥3 payoff
// and ≥3 seed scenes, no scene carries both simultaneously; distinct from PAYOFF_SEED_AFTERMATH_
// ABSENT [aftermath mode] and PAYOFF_AFTERMATH_QUESTION_VOID [also aftermath]; first same-scene
// co-occurrence check for the payoff × seed cross-channel pair), payoff consecutive valence run
// (run-based × payoff × emotional valence — n≥8, ≥4 payoff scenes, 3+ consecutive payoff scenes
// all with the same non-neutral emotionalShift; local monotone delivery stretch; distinct from
// PAYOFF_EMOTIONAL_VALENCE_UNIFORM [global — ALL payoffs share one sign] and PAYOFF_CONSECUTIVE_RUN
// [runs regardless of valence]; first run-based × valence check in payoff.ts).
// Wave 566 additions: payoff clock peak decoupled (single-peak isolation × clockDelta × payoff —
// n≥8, ≥2 payoff scenes, maxClockDelta>1, the single highest-clockDelta scene carries no payoff;
// the maximum-urgency moment is not where any thread resolves; adds the clock channel to the payoff
// peak-decoupled family alongside PAYOFF_SUSPENSE/CURIOSITY/RELATIONSHIP_PEAK_DECOUPLED, distinct from
// PAYOFF_CLOCK_DECOUPLED [co-occurrence aggregate] and PAYOFF_CLOCK_AFTERMATH_ABSENT [aftermath]),
// seed emotional valence uniform (valence × emotion × seed trigger — n≥8, ≥2 seed scenes carrying
// non-neutral emotion, all one valence; foreshadowing locked into a single feeling-tone; completes the
// valence family across both triggers [seed, payoff] and both channels [relationship, emotion],
// distinct from PAYOFF_EMOTIONAL_VALENCE_UNIFORM [payoff trigger], SEED_RELATIONSHIP_VALENCE_UNIFORM
// [relationship channel], SEED_EMOTION_AFTERMATH_ABSENT [aftermath], CLUE_SEED_EMOTION_FLAT [neutral
// not monotone]), clue seed temporal cluster (distribution/timing × seed × structural thirds — n≥9,
// ≥3 seed scenes, >75% in a single third; foreshadowing ghettoized into one zone; the seed-channel
// sibling of PAYOFF_TEMPORAL_CLUSTER, finer-grained than the binary CLUE_SEED_FRONT_LOADED / CLUE_SEED_
// LATE_MAJORITY and distinct from CLUE_SEED_MIDPOINT_VOID [absence not over-concentration]).
// Wave 524 additions: seed suspense aftermath absent (sequence/aftermath × suspense × seed
// trigger — ≥3 qualifying seeds none followed by suspenseDelta>0 in next 2 scenes while ≥2
// suspense scenes exist; planting clues never raises tension in what follows; adds suspense to
// the seed-aftermath family alongside curiosity/revelation/dramatic-turn; distinct from SEED_
// CURIOSITY_AFTERMATH_ABSENT, SEED_REVELATION_AFTERMATH_ABSENT, SEED_DRAMATIC_TURN_AFTERMATH_
// ABSENT, and the pacing-pass check CURIOSITY_AFTERMATH_FLAT which uses a high-suspense trigger),
// seed emotion aftermath absent (sequence/aftermath × emotion × seed trigger — ≥3 qualifying
// seeds none followed by non-neutral emotionalShift in next 2 scenes while ≥2 emotional scenes
// exist; clue-planting never generates felt consequence; adds emotion to seed-aftermath family;
// distinct from all other seed-aftermath checks which use different output channels), payoff
// relational aftermath absent (sequence/aftermath × relational shift × payoff trigger — ≥3
// qualifying payoffs none followed by a relationship shift in next 2 scenes while ≥2 relational
// scenes exist; thread resolutions never move bonds in their wake; first relational-channel entry
// in the payoff-aftermath family, distinct from PAYOFF_REVELATION_AFTERMATH_ABSENT, PAYOFF_SEED_
// AFTERMATH_ABSENT, and PAYOFF_CLOCK_AFTERMATH_ABSENT which use different aftermath channels).
// Wave 594 additions: seed purpose monotone (average/aggregate × seed × scene-purpose — n≥8,
// ≥4 seed scenes, >70% share the identical `purpose` value; clue-planting is confined to one
// narrative function rather than woven across varied structural beats; the `purpose` field —
// a fixed ScenePurpose enum — is used only once elsewhere in this entire file [an incidental OR-
// condition], making this the first dedicated purpose-distribution check here), payoff purpose
// monotone (the payoff-channel mirror of the above — >70% of payoff scenes share one purpose;
// distinct from SEED_PURPOSE_MONOTONE by channel, following this file's existing convention of
// mirrored seed/payoff pairs like SEED_DROUGHT_RUN/PAYOFF_DROUGHT_RUN and SEED_EMOTIONAL_VALENCE_
// UNIFORM/PAYOFF_EMOTIONAL_VALENCE_UNIFORM), clue seed zone imbalance (underweight/bloat × seed ×
// four structural zones, built on checkZoneImbalance from the shared checks library — audit M2.2 —
// n≥10, ≥4 seed scenes; fires only when one zone has ZERO seeds while another holds ≥50% of the
// total; distinct from SETUP_CLUSTERING [a pure >70%-concentration ratio with no zero-zone
// requirement — a story could have seeds in every zone and still trip that check] and CLUE_SEED_
// TEMPORAL_CLUSTER [uses thirds, not quarters, and likewise has no void-zone requirement]; first
// check in this pass requiring the co-presence of a void AND a bloat rather than either alone).
// Wave 608 additions (built on the shared checks library, audit M2.2): PAYOFF_DIALOGUE_HIGHLIGHT_
// DECOUPLED (co-occurrence/decoupling × payoffSetupIds × dialogueHighlights — first use of
// dialogueHighlights anywhere in this 104-rule pass), VISUAL_STAGING_ZONE_IMBALANCE
// (underweight/bloat × visualBeats × four structural zones — first use of visualBeats anywhere
// in this pass), SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (sequence/aftermath × seed trigger →
// dialogueHighlights absence).
// Wave 622 additions (built on the shared checks library, audit M2.2): VISUAL_BEAT_OPEN_THREAD_
// DECOUPLED (co-occurrence/decoupling × visualBeats × unresolvedClues — first pairing of these
// two fields in this 107-rule pass), CLOCK_STAGING_AFTERMATH_VOID (sequence/aftermath ×
// clockRaised trigger → visualBeats absence — first pairing of these two fields),
// PAYOFF_OPEN_THREAD_ZONE_IMBALANCE (underweight/bloat × unresolvedClues × four structural zones
// — Waves 594/608 applied this template to seededClueIds and visualBeats; unresolvedClues itself
// has never been zone-audited here).
// Wave 636 additions (built on the shared checks library, audit M2.2): PAYOFF_HIGHLIGHT_OPEN_
// THREAD_DECOUPLED (co-occurrence/decoupling × dialogueHighlights × unresolvedClues — first
// pairing of these two fields in this 110-rule pass), PAYOFF_TURN_HIGHLIGHT_AFTERMATH_VOID
// (sequence/aftermath × dramaticTurn trigger → dialogueHighlights absence — first pairing of
// these two fields), PAYOFF_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE (underweight/bloat ×
// dialogueHighlights × four structural zones — Waves 594/608/622 applied this template to
// seededClueIds, visualBeats, and unresolvedClues; dialogueHighlights itself has never been
// zone-audited here).
// Wave 650 additions (built on the shared checks library, audit M2.2): this 113-rule pass already
// hand-rolls the peak/drought/cluster analytical concepts extensively (five PEAK_*_DECOUPLED
// checks on curiosity/suspense/relationship/clock across the payoff and clue-seed channels, two
// drought-run checks on seed/payoff, two temporal-cluster checks on payoff/clue-seed) — but never
// via the shared checkPeakUncaused/checkDroughtRun/checkZoneCluster helpers, and never on the
// visualBeats/dialogueHighlights/unresolvedClues channels. PAYOFF_STAGING_PEAK_UNCAUSED
// (single-peak isolation/backward-cause × visualBeats magnitude — the scene with the densest
// physical staging has no dramatic turn or revelation in itself or the two scenes before it;
// distinct from the existing PEAK_*_DECOUPLED family, which checks whether the peak scene itself
// lacks a channel, not whether a physical-staging peak is backward-caused), PAYOFF_HIGHLIGHT_
// DROUGHT_RUN (run-based × dialogueHighlights absence — a 6+ consecutive-scene stretch with no
// highlighted dialogue while such scenes occur ≥3 times elsewhere; the drought-run template
// applied to a third channel after seed and payoff), PAYOFF_OPEN_THREAD_ZONE_CLUSTER
// (distribution/timing × unresolvedClues × structural thirds — >75% of open-thread scenes
// concentrate in one third; the first checkZoneCluster use in this pass, distinct from the
// hand-rolled PAYOFF_TEMPORAL_CLUSTER and CLUE_SEED_TEMPORAL_CLUSTER, which track different
// channels entirely).
// Wave 664 additions (built on the shared checks library, audit M2.2): PAYOFF_RELATIONSHIP_PEAK_
// UNCAUSED (single-peak isolation/backward-cause × relationshipShifts-count magnitude — the scene
// with the most simultaneous bond changes has no dramatic turn or revelation in itself or the two
// scenes before it; distinct from PAYOFF_RELATIONSHIP_PEAK_DECOUPLED [Wave 412], which anchors on
// the scene with the single largest shift AMOUNT and checks whether it carries a payoff — a
// different magnitude metric and a different question entirely), PAYOFF_CLOCK_DROUGHT_RUN
// (run-based × clockRaised absence — this pass already drought-audits seed/payoff/highlight
// channels; clockRaised itself has never been drought-audited), PAYOFF_STAGING_ZONE_CLUSTER
// (distribution/timing × visualBeats × structural thirds — Wave 650 applied the zone-cluster mode
// to unresolvedClues; visualBeats itself has only been backward-cause peak-audited, never
// cluster-audited on the thirds granularity).
// Wave 678 additions (built on the shared checks library, audit M2.2): PAYOFF_CLOCK_DELTA_PEAK_
// UNCAUSED (single-peak isolation/backward-cause × clockDelta magnitude — distinct from the
// existing PAYOFF_CLOCK_PEAK_DECOUPLED [Wave 566], which checks whether the peak-clockDelta scene
// carries a payoff; this instead asks whether that scene is structurally caused by a dramatic
// turn or revelation), PAYOFF_TURN_DROUGHT_RUN (run-based × dramaticTurn presence absence —
// dramaticTurn anchors several decoupled and aftermath-absent checks here, but has never been
// drought-audited), PAYOFF_NEGATIVE_EMOTION_ZONE_CLUSTER (distribution/timing × emotionalShift
// === 'negative' × structural thirds — emotionalShift anchors PAYOFF_EMOTIONAL_VALENCE_UNIFORM
// and several decoupled checks, but has never been cluster-audited).
// Wave 692 additions (built on the shared checks library): PAYOFF_SEED_PEAK_UNCAUSED (single-peak
// isolation/backward-cause × seededClueIds magnitude — Wave 594's SEED_STAGING_ZONE_IMBALANCE
// already four-zone-audits this channel's bloat/empty distribution; the backward-cause peak mode
// has never been applied to it), PAYOFF_SETUP_PEAK_UNCAUSED (single-peak isolation/backward-cause
// × payoffSetupIds magnitude — this pass's most heavily used field [37 accesses] anchors the
// hand-rolled PAYOFF_TEMPORAL_CLUSTER [distribution/timing] and PAYOFF_DROUGHT_RUN [run-based],
// but the backward-cause peak mode has never been applied to it), PAYOFF_STAKES_ZONE_CLUSTER
// (distribution/timing × purpose === 'raise_stakes' × structural thirds — `purpose` has only ever
// been used to tally counts inside unrelated aggregate checks [Waves 594a/594b]; never the
// standalone subject of its own check).
// Wave 706 additions (built on the shared checks library): PAYOFF_STAGING_DROUGHT_RUN (run-based
// × visualBeats absence — Waves 650/664 applied the backward-cause peak and zone-cluster modes to
// visualBeats; the drought-run mode has never been applied to it, completing the trio),
// PAYOFF_HIGHLIGHT_ZONE_CLUSTER (distribution/timing × dialogueHighlights × structural thirds —
// Wave 650 applied the drought-run mode to dialogueHighlights; the zone-cluster mode has never
// been applied to it), PAYOFF_OPEN_THREAD_PEAK_UNCAUSED (single-peak isolation/backward-cause ×
// unresolvedClues magnitude — Wave 650 applied the zone-cluster mode to unresolvedClues; the
// backward-cause peak mode has never been applied to it).
// Wave 720 additions (built on the shared checks library): PAYOFF_HIGHLIGHT_PEAK_UNCAUSED
// (single-peak isolation/backward-cause × dialogueHighlights magnitude — Waves 650/706 applied
// the drought-run and zone-cluster modes to dialogueHighlights; the backward-cause peak mode has
// never been applied to it, completing the trio), PAYOFF_OPEN_THREAD_DROUGHT_RUN (run-based ×
// unresolvedClues absence — Waves 650/706 applied the zone-cluster and backward-cause peak modes
// to unresolvedClues; the drought-run mode has never been applied to it, completing the trio),
// PAYOFF_RELATIONSHIP_DROUGHT_RUN (run-based × relationshipShifts absence — Wave 664 applied the
// backward-cause peak mode to relationshipShifts; the drought-run mode has never been applied to
// it).
// Wave 734 additions: PAYOFF_RELATIONSHIP_ZONE_CLUSTER (distribution/timing × relationshipShifts
// × structural thirds — Waves 664/720 applied the backward-cause peak and run-based drought modes
// to relationshipShifts; the zone-cluster mode has never been applied to it, completing the
// trio), PAYOFF_SEED_ZONE_CLUSTER (distribution/timing × seededClueIds × structural thirds —
// seededClueIds already anchors the hand-rolled SEED_DROUGHT_RUN [Wave 510] and the shared-library
// backward-cause peak mode [Wave 692]; the thirds-ratio zone-cluster mode has never been applied
// to it), PAYOFF_CLOCK_DELTA_DROUGHT_RUN (run-based × clockDelta≠0 absence — clockDelta has only
// ever anchored single-peak-isolation checks [PAYOFF_CLOCK_PEAK_DECOUPLED, Wave 566;
// PAYOFF_CLOCK_DELTA_PEAK_UNCAUSED, Wave 678]; the run-based drought mode has never been applied
// to it).
// Wave 748 additions: PAYOFF_CLOCK_DELTA_ZONE_CLUSTER (distribution/timing × clockDelta≠0
// presence × structural thirds — Waves 678/734 applied the backward-cause peak and run-based
// drought modes to clockDelta; the zone-cluster mode has never been applied to it, completing the
// trio), PAYOFF_TURN_ZONE_CLUSTER (distribution/timing × dramaticTurn !== 'nothing' × structural
// thirds — Wave 678 applied the run-based drought mode to this signal [PAYOFF_TURN_DROUGHT_RUN];
// the zone-cluster mode has never been applied to it), PAYOFF_STAKES_DROUGHT_RUN (run-based ×
// purpose === 'raise_stakes' absence — Wave 692 applied the zone-cluster mode to this signal
// [PAYOFF_STAKES_ZONE_CLUSTER]; the drought-run mode has never been applied to it).
// Wave 762 additions: PAYOFF_CLOCK_ZONE_CLUSTER (distribution/timing × clockRaised === true ×
// structural thirds — Wave 664 applied the run-based drought mode to clockRaised
// [PAYOFF_CLOCK_DROUGHT_RUN]; the zone-cluster mode has never been applied to it),
// PAYOFF_NEGATIVE_EMOTION_DROUGHT_RUN (run-based × emotionalShift === 'negative' absence — Wave
// 678 applied the zone-cluster mode to this signal [PAYOFF_NEGATIVE_EMOTION_ZONE_CLUSTER]; the
// drought-run mode has never been applied to it), PAYOFF_CURIOSITY_DROUGHT_RUN (run-based ×
// curiosityDelta>0 absence — curiosityDelta has never anchored any of the three shared-library
// modes in this pass).
// Wave 776 additions: PAYOFF_CURIOSITY_PEAK_UNCAUSED (backward-cause × curiosityDelta-as-
// magnitude × 2-scene lookback — Wave 762 applied the run-based drought mode to curiosityDelta;
// the existing PAYOFF_CURIOSITY_PEAK_DECOUPLED audits whether a PAYOFF co-occurs AT the peak
// curiosity scene, not a preparing cause before it — the backward-cause peak mode has never been
// applied to curiosityDelta itself), PAYOFF_CURIOSITY_ZONE_CLUSTER (distribution/timing ×
// curiosityDelta>0 presence × structural thirds — completing the trio for curiosityDelta; the
// zone-cluster mode has never been applied to it), PAYOFF_SUSPENSE_ZONE_CLUSTER
// (distribution/timing × suspenseDelta>0 presence × structural thirds — every existing suspense
// check in this pass is co-occurrence/decoupling or aftermath [PAYOFF_SUSPENSE_MISMATCH,
// PAYOFF_SUSPENSE_PEAK_DECOUPLED, PAYOFF_SUSPENSE_RECOIL_ABSENT, SEED_SUSPENSE_AFTERMATH_ABSENT];
// none of the three shared-library trio modes has ever been applied to suspenseDelta as a
// primary signal).
// Wave 790 additions: PAYOFF_SUSPENSE_DROUGHT_RUN (run-based × suspenseDelta>0 absence — Wave 776
// applied the zone-cluster mode to suspenseDelta; the run-based drought mode has never been
// applied to it, completing 2 of 3 slots), PAYOFF_REVELATION_ZONE_CLUSTER (distribution/timing ×
// revelation × structural thirds — existing revelation checks are co-occurrence/decoupling and
// aftermath [PAYOFF_REVELATION_DISCONNECT, PAYOFF_REVELATION_AFTERMATH_ABSENT]; none of the three
// shared-library trio modes has ever been applied to it), PAYOFF_REVELATION_DROUGHT_RUN
// (run-based × revelation absence — completing 2 of 3 slots for revelation alongside the
// zone-cluster mode added in this same wave).
// Wave 804 additions: PAYOFF_SUSPENSE_PEAK_UNCAUSED (backward-cause × suspenseDelta-as-magnitude
// × 2-scene lookback — completes the trio for suspenseDelta alongside the zone-cluster mode
// (Wave 776) and the run-based drought mode (Wave 790); the backward-cause peak mode has never
// been applied to it), PAYOFF_REVELATION_PEAK_UNCAUSED (backward-cause ×
// revelation-as-magnitude [0/1] × 2-scene lookback — completes the trio for revelation;
// hasCause deliberately omits revelation to avoid circularity), PAYOFF_CHARACTER_MOMENT_
// ZONE_CLUSTER (distribution/timing × purpose === 'character_moment' × structural thirds — this
// purpose value has never been referenced anywhere in this pass; none of the three
// shared-library trio modes has ever been applied to it). Reconnaissance for this wave also
// confirmed that SEED_DROUGHT_RUN (Wave 510, hand-rolled) already completes the seededClueIds
// trio, and PAYOFF_TEMPORAL_CLUSTER (Wave 496, hand-rolled) plus PAYOFF_DROUGHT_RUN (Wave 552,
// hand-rolled) already complete the payoffSetupIds trio, so both fields were correctly skipped
// as non-distinct candidates.
// Wave 818 additions: PAYOFF_CHARACTER_MOMENT_DROUGHT_RUN (run-based × purpose ===
// 'character_moment' absence — completing 2 of 3 slots for this purpose value alongside the
// zone-cluster mode added in Wave 804; peak mode conventionally skipped for this categorical
// field), PAYOFF_TURNING_POINT_ZONE_CLUSTER (distribution/timing × purpose === 'turning_point'
// × structural thirds — this purpose value has never been referenced anywhere in this pass;
// none of the three shared-library trio modes has ever been applied to it),
// PAYOFF_TURNING_POINT_DROUGHT_RUN (run-based × purpose === 'turning_point' absence —
// completing 2 of 3 slots for this purpose value alongside the zone-cluster mode added in this
// same wave; peak mode conventionally skipped for this categorical field).
//
// Wave 832 additions: PAYOFF_INTRODUCE_CONFLICT_ZONE_CLUSTER (distribution/timing × purpose ===
// 'introduce_conflict' × structural thirds — this purpose value has never been referenced
// anywhere in this pass; a virgin field), PAYOFF_INTRODUCE_CONFLICT_DROUGHT_RUN (run-based ×
// purpose === 'introduce_conflict' absence — completing 2 of 3 slots for this purpose value
// alongside the zone-cluster mode added in this same wave; peak mode conventionally skipped for
// this categorical field), PAYOFF_POSITIVE_EMOTION_ZONE_CLUSTER (distribution/timing ×
// emotionalShift === 'positive' × structural thirds — mirrors the completed negative-valence
// trio; the positive valence has never been isolated by any of the three shared-library trio
// modes in this pass).
//
// Wave 846 additions: PAYOFF_POSITIVE_EMOTION_DROUGHT_RUN (run-based × emotionalShift ===
// 'positive' absence — completes 2 of 3 slots for this valence alongside the zone-cluster mode
// added in Wave 832; peak mode conventionally skipped for this categorical field),
// PAYOFF_ESTABLISH_WORLD_ZONE_CLUSTER (distribution/timing × purpose === 'establish_world' ×
// structural thirds — this purpose value has only ever appeared inside incidental function-
// concentration checks; none of the three shared-library trio modes has ever isolated it as its
// own standalone signal), PAYOFF_CLIMAX_ZONE_CLUSTER (distribution/timing × purpose === 'climax'
// × structural thirds — likewise only ever touched via an incidental `isClimaticScene`
// disjunction; a virgin standalone signal).
//
// Wave 860 additions: PAYOFF_CLIMAX_DROUGHT_RUN (run-based x purpose === 'climax'
// absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode
// added in Wave 846; peak mode conventionally skipped for this categorical field),
// PAYOFF_ESTABLISH_WORLD_DROUGHT_RUN (run-based x purpose === 'establish_world' absence --
// completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in
// Wave 846; peak mode conventionally skipped for this categorical field),
// PAYOFF_RESOLUTION_ZONE_CLUSTER (distribution/timing x purpose === 'resolution' x
// structural thirds -- this purpose value is only ever touched by RESOLUTION_CRAMMED_AT_END
// and PAYOFF_POST_CLIMAX_CLUSTER, both of which audit the temporal position of payoffSetupIds
// resolution, not scenes whose `purpose` field equals 'resolution'; none of the three
// shared-library trio modes has ever isolated the purpose value itself as a standalone signal).
//
// Wave 874 additions: PAYOFF_RESOLUTION_DROUGHT_RUN (run-based x purpose === 'resolution'
// absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode
// added in Wave 860; distinct from RESOLUTION_CRAMMED_AT_END/PAYOFF_POST_CLIMAX_CLUSTER, which
// audit payoffSetupIds temporal position rather than sustained absence of this purpose value;
// peak mode conventionally skipped for this categorical field), PAYOFF_COMPLICATE_ZONE_CLUSTER
// (distribution/timing x purpose === 'complicate' x structural thirds -- this purpose value has
// never been referenced anywhere in this pass; a virgin field), PAYOFF_COMPLICATE_DROUGHT_RUN
// (run-based x purpose === 'complicate' absence -- completes 2 of 3 slots for this purpose
// value alongside the zone-cluster mode added in this same wave; peak mode conventionally
// skipped for this categorical field).
//
// Wave 888 additions: no purpose value had ever been audited by the distinct 4-zone
// checkZoneImbalance mode in this pass (only seededClueIds, visualBeats, unresolvedClues, and
// dialogueHighlights had). This wave applies it to three purpose values with complete
// 3-zone/run-based trios: PAYOFF_CLIMAX_ZONE_IMBALANCE (purpose === 'climax'),
// PAYOFF_ESTABLISH_WORLD_ZONE_IMBALANCE (purpose === 'establish_world'), and
// PAYOFF_RESOLUTION_ZONE_IMBALANCE (purpose === 'resolution' -- distinct from
// RESOLUTION_CRAMMED_AT_END/PAYOFF_POST_CLIMAX_CLUSTER, which audit payoffSetupIds temporal
// position rather than this purpose enum value).
//
// Wave 902 additions: continuing the checkZoneImbalance rollout begun in Wave 888, this wave
// applies the 4-zone bloat+empty-zone mode to three more purpose values that each already have a
// complete 3-zone/run-based trio (checkZoneCluster + checkDroughtRun) but have never been audited
// by it: PAYOFF_TURNING_POINT_ZONE_IMBALANCE (purpose === 'turning_point'),
// PAYOFF_COMPLICATE_ZONE_IMBALANCE (purpose === 'complicate'), and
// PAYOFF_INTRODUCE_CONFLICT_ZONE_IMBALANCE (purpose === 'introduce_conflict').
//
// Wave 916 additions: purpose === 'revelation' has never been referenced anywhere in this pass
// (the pre-existing PAYOFF_REVELATION_ZONE_CLUSTER/DROUGHT_RUN and related rules audit the separate
// revelation string|null field, not this purpose enum value) -- a genuinely virgin field. This
// wave adds PAYOFF_REVELATION_PURPOSE_ZONE_CLUSTER and PAYOFF_REVELATION_PURPOSE_DROUGHT_RUN (peak
// mode conventionally skipped for this categorical field), plus PAYOFF_CHARACTER_MOMENT_ZONE_
// IMBALANCE, continuing the checkZoneImbalance rollout: purpose === 'character_moment' already has
// a complete 3-zone/run-based trio but has never been audited by the 4-zone bloat+empty-zone mode.
//
// Wave 930 additions: continuing the checkZoneImbalance rollout, this wave applies the 4-zone
// bloat+empty-zone mode to three more signals that each already have a complete 3-zone/run-based
// trio but had never been audited by it: PAYOFF_STAKES_ZONE_IMBALANCE (purpose === 'raise_stakes'),
// PAYOFF_REVELATION_PURPOSE_ZONE_IMBALANCE (purpose === 'revelation', whose trio was completed in
// Wave 916), and PAYOFF_NEGATIVE_EMOTION_ZONE_IMBALANCE (emotionalShift === 'negative', a valence
// signal with a complete 3-zone/run trio).
// Wave 944 additions: extending the checkZoneImbalance rollout to three more trio-complete signals
// spanning three distinct signal classes: PAYOFF_POSITIVE_EMOTION_ZONE_IMBALANCE (emotionalShift ===
// 'positive', the positive-valence mirror of Wave 930's negative one), PAYOFF_SUSPENSE_ZONE_IMBALANCE
// (suspenseDelta > 0 — tension-delta magnitude), and PAYOFF_RELATIONSHIP_ZONE_IMBALANCE
// (relationshipShifts.length > 0 — relationship-shift array field).
// Wave 958 additions: continuing the non-purpose 4-zone rollout with three more trio-complete signals
// spanning three distinct classes: PAYOFF_CURIOSITY_ZONE_IMBALANCE (curiosityDelta > 0 — the question-
// raising delta beside Wave 944's suspense one), PAYOFF_REVELATION_ZONE_IMBALANCE (revelation != null —
// the revelation string field, distinct from the purpose-enum PAYOFF_REVELATION_PURPOSE one), and
// PAYOFF_TURN_ZONE_IMBALANCE (dramaticTurn !== 'nothing' — the dramatic-turn categorical signal).
// Wave 972 additions: auditing the three remaining trio-complete signals in this pass, spanning three
// distinct classes: PAYOFF_CLOCK_ZONE_IMBALANCE (clockRaised boolean — whether a ticking clock is
// introduced at all), PAYOFF_CLOCK_DELTA_ZONE_IMBALANCE (clockDelta !== 0 — the numeric delta,
// distinct from the boolean field above), and PAYOFF_HIGHLIGHT_ZONE_IMBALANCE (dialogueHighlights
// array, distinct from all previously audited arrays in this pass).
// Wave 986 additions: zone-imbalance is now fully exhausted in this pass (the only remaining
// cluster+drought pair, PAYOFF_STAGING, has inconsistent predicates — >=2 vs >0 visualBeats — so
// it was skipped, same as in prior waves). This wave pivots entirely to the sequence/aftermath
// mode with three fresh trigger/aftermath pairings, none of which reuse a combination already
// covered by SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID, CLOCK_STAGING_AFTERMATH_VOID, or PAYOFF_TURN_
// HIGHLIGHT_AFTERMATH_VOID: PAYOFF_STAKES_CURIOSITY_AFTERMATH_VOID (raise_stakes → curiosityDelta),
// PAYOFF_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID (heavy unresolvedClues debt → suspenseDelta), and
// PAYOFF_REVELATION_RELATIONSHIP_AFTERMATH_VOID (revelation != null → relationshipShifts).
// Wave 1000 additions: PAYOFF_STAGING re-checked and re-excluded (same predicate mismatch, >=2 vs
// >0 visualBeats), confirming zone-imbalance remains exhausted. Every existing aftermath-void
// trigger in this pass (seed, clock, turn, stakes, open-thread, revelation) has so far been paired
// with exactly one consequence channel — this wave gives three of them a second channel:
// PAYOFF_CLOCK_CURIOSITY_AFTERMATH_VOID (clockRaised, previously only paired with visualBeats, now
// paired with curiosityDelta), PAYOFF_TURN_SUSPENSE_AFTERMATH_VOID (dramaticTurn, previously only
// paired with dialogueHighlights, now paired with suspenseDelta), and PAYOFF_SEED_EMOTIONAL_
// AFTERMATH_VOID (seededClueIds, previously only paired with dialogueHighlights, now paired with
// emotionalShift).
// Wave 1014 additions: this wave gives three more triggers a second consequence channel:
// PAYOFF_STAKES_SUSPENSE_AFTERMATH_VOID (raise_stakes, previously only paired with curiosityDelta,
// now paired with suspenseDelta), PAYOFF_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID (heavy
// unresolvedClues debt, previously only paired with suspenseDelta, now paired with emotionalShift),
// and PAYOFF_REVELATION_CURIOSITY_AFTERMATH_VOID (revelation, previously only paired with
// relationshipShifts, now paired with curiosityDelta).
// Wave 1028 additions: three more triggers get a third consequence channel: PAYOFF_STAKES_
// EMOTIONAL_AFTERMATH_VOID (raise_stakes, previously paired with curiosityDelta/suspenseDelta, now
// paired with emotionalShift), PAYOFF_CLOCK_RELATIONAL_AFTERMATH_VOID (clockRaised, previously
// paired with visualBeats/curiosityDelta, now paired with relationshipShifts), and PAYOFF_
// REVELATION_EMOTIONAL_AFTERMATH_VOID (revelation, previously paired with relationshipShifts/
// curiosityDelta, now paired with emotionalShift).
// Wave 1042 additions: three less-saturated triggers each get a curiosityDelta channel for the
// first time: PAYOFF_SEED_CURIOSITY_AFTERMATH_VOID (seededClueIds, previously paired with
// dialogueHighlights/emotionalShift), PAYOFF_TURN_CURIOSITY_AFTERMATH_VOID (dramaticTurn,
// previously paired with dialogueHighlights/suspenseDelta), and PAYOFF_OPEN_THREAD_CURIOSITY_
// AFTERMATH_VOID (heavy unresolvedClues debt, previously paired with suspenseDelta/emotionalShift).
// Wave 1056 additions: three triggers each get a fourth consequence channel, none reusing a
// combination already covered above: PAYOFF_SEED_SUSPENSE_AFTERMATH_VOID (seededClueIds,
// previously paired with dialogueHighlights/emotionalShift/curiosityDelta, now also paired with
// suspenseDelta), PAYOFF_CLOCK_EMOTIONAL_AFTERMATH_VOID (clockRaised, previously paired with
// visualBeats/curiosityDelta/relationshipShifts, now also paired with emotionalShift), and
// PAYOFF_TURN_RELATIONAL_AFTERMATH_VOID (dramaticTurn, previously paired with
// dialogueHighlights/suspenseDelta/curiosityDelta, now also paired with relationshipShifts).

import type { PassInput, PassResult, RevisionIssue } from './types.ts';
import { rewritePass } from '../rewrite.ts';
import { checkZoneImbalance, checkCoOccurrenceDecoupled, checkAftermathVoid, checkPeakUncaused, checkDroughtRun, checkZoneCluster, FOUR_ZONE_NAMES } from './lib/checks.ts';

export async function payoffPass(input: PassInput): Promise<PassResult> {
  const { fountain, records, structure, approvedSpans } = input;
  const issues: RevisionIssue[] = [];

  // ── Collect all clue plant/payoff timeline ────────────────────────────────
  // Use seededClueIds / payoffSetupIds (per-scene fields) for accurate timing.
  // unresolvedClues is a global-filtered view; it can't reliably detect WHEN a payoff occurs.
  const clueInfo: Map<string, { plantedAt: number; slug: string }> = new Map();
  const payoffInfo: Map<string, number> = new Map();

  for (const r of records) {
    for (const clueId of (r.seededClueIds ?? r.unresolvedClues)) {
      if (!clueInfo.has(clueId)) {
        clueInfo.set(clueId, { plantedAt: r.sceneIdx, slug: r.slug });
      }
    }
    for (const setupId of (r.payoffSetupIds ?? [])) {
      if (!payoffInfo.has(setupId)) {
        payoffInfo.set(setupId, r.sceneIdx);
      }
    }
  }

  // ── Orphan clues (never paid off) ────────────────────────────────────────
  for (const [clueId, info] of clueInfo) {
    if (!payoffInfo.has(clueId) && (structure.actPosition === 'act3' || structure.completionPercent >= 70)) {
      issues.push({
        location: `Scene ${info.plantedAt} (${info.slug})`,
        rule: 'ORPHAN_CLUE',
        description: `Clue "${clueId}" was planted in Scene ${info.plantedAt} but never paid off — a broken promise to the audience`,
        severity: 'critical',
        suggestedFix: `Add a scene in Act 3 that reveals the significance of "${clueId}" and closes the loop`,
      });
    }
  }

  // ── Clue paid off too quickly (same scene or very next scene) ───────────
  for (const [clueId, payoffScene] of payoffInfo) {
    const info = clueInfo.get(clueId);
    if (info) {
      const gap = payoffScene - info.plantedAt;
      if (gap === 0) {
        issues.push({
          location: `Scene ${payoffScene}`,
          rule: 'PAYOFF_TOO_QUICK',
          description: `Clue "${clueId}" is planted and paid off in the same scene — the audience has no time to form a question`,
          severity: 'major',
          suggestedFix: `Move the payoff of "${clueId}" at least 3 scenes later to create a proper anticipation arc`,
        });
      } else if (gap === 1) {
        issues.push({
          location: `Scene ${payoffScene}`,
          rule: 'PAYOFF_TOO_QUICK',
          description: `Clue "${clueId}" is planted and paid off in consecutive scenes — no suspense window for the audience`,
          severity: 'minor',
          suggestedFix: `Move the payoff of "${clueId}" at least 2-3 scenes later to build anticipation`,
        });
      }
    }
  }

  // ── Dangling payoffs (PAYOFF_SETUP with no matching clue ever seeded) ────
  for (const [setupId, payoffScene] of payoffInfo) {
    if (!clueInfo.has(setupId)) {
      issues.push({
        location: `Scene ${payoffScene}`,
        rule: 'DANGLING_PAYOFF',
        description: `A payoff for "${setupId}" arrives in Scene ${payoffScene} but no matching setup was ever seeded — the audience will feel disoriented`,
        severity: 'major',
        suggestedFix: `Add a SEED_CLUE for "${setupId}" earlier in the story, or remove the payoff if it references something never established`,
      });
    }
  }

  // ── Open clue count in structure ─────────────────────────────────────────
  if (structure.openClues > 0 && structure.actPosition === 'epilogue') {
    issues.push({
      location: 'Final scenes',
      rule: 'OPEN_CLUES_AT_END',
      description: `${structure.openClues} unresolved clue(s) remain at story end — loose threads weaken the ending`,
      severity: 'major',
      suggestedFix: 'Resolve all planted clues before the final scene, or consciously mark them as thematic open questions',
    });
  }

  // ── No clues planted at all (no setup/payoff engine) ─────────────────────
  if (clueInfo.size === 0 && records.length >= 5) {
    issues.push({
      location: 'Setup/payoff layer',
      rule: 'NO_SETUPS',
      description: 'No clues or setups are planted in the story — the screenplay has no setup/payoff architecture',
      severity: 'major',
      suggestedFix: 'Plant at least one object, phrase, or secret in Act 1 that pays off in Act 3',
    });
  }

  // ── Setup without consequence (Wave 140) ──────────────────────────────────
  // Clues that appear multiple times (2+) but never cause narrative consequence:
  // no relationship shifts, no emotional peaks, no high suspense delta.
  // These are red herrings that aren't actually red herrings — they're just noise.
  const clueAppearances: Map<string, number[]> = new Map();
  for (const r of records) {
    for (const clueId of (r.seededClueIds ?? r.unresolvedClues)) {
      if (!clueAppearances.has(clueId)) {
        clueAppearances.set(clueId, []);
      }
      clueAppearances.get(clueId)!.push(r.sceneIdx);
    }
  }

  for (const [clueId, appearanceScenes] of clueAppearances) {
    // Only flag if clue appears 2+ times
    if (appearanceScenes.length >= 2) {
      // Check if any appearance scene has narrative consequence
      const hasConsequence = appearanceScenes.some(sceneIdx => {
        const r = records[sceneIdx];
        if (!r) return false;
        // Consequence = relationship shift, high suspense delta, or emotional peak
        const hasRelationshipShift = (r.relationshipShifts ?? []).length > 0;
        const hasEmotionalPeak = r.emotionalShift !== 'neutral' && r.suspenseDelta > 1.5;
        const isClimaticScene = r.purpose === 'climax' || r.suspenseDelta > 2;
        return hasRelationshipShift || hasEmotionalPeak || isClimaticScene;
      });

      if (!hasConsequence) {
        const clueInfo_obj = clueInfo.get(clueId);
        const plantLocation = clueInfo_obj ? `Scene ${clueInfo_obj.plantedAt}` : 'Act 1';
        issues.push({
          location: `Clue appearances: Scenes ${appearanceScenes.join(', ')}`,
          rule: 'SETUP_WITHOUT_CONSEQUENCE',
          description: `Clue "${clueId}" appears ${appearanceScenes.length} times (planted at ${plantLocation}) but never drives a character decision or relationship shift — it's narrative noise, not meaningful setup`,
          severity: 'major',
          suggestedFix: `Either remove recurring mentions of "${clueId}" or add a scene where it causes a character to act or react with emotional stakes`,
        });
      }
    }
  }

  // ── Consequence-delayed payoff (Wave 140) ────────────────────────────────
  // Payoff occurs too far after setup (>6 scenes), breaking the audience's
  // memory arc and reducing the dramatic impact of the payoff.
  for (const [clueId, payoffScene] of payoffInfo) {
    const info = clueInfo.get(clueId);
    if (info) {
      const gap = payoffScene - info.plantedAt;
      // 6+ scene gap means audience likely forgot the setup
      if (gap >= 6 && structure.completionPercent >= 70) {
        issues.push({
          location: `Clue payoff at Scene ${payoffScene}`,
          rule: 'PAYOFF_MEMORY_GAP',
          description: `Clue "${clueId}" planted in Scene ${info.plantedAt} is paid off ${gap} scenes later in Scene ${payoffScene} — the audience has likely forgotten the setup by the time the payoff arrives`,
          severity: 'minor',
          suggestedFix: `Add a callback or reminder of "${clueId}" 1-2 scenes before its payoff to rebuild audience memory`,
        });
      }
    }
  }

  // ── Wave 154: Clustered payoffs, premature resolution, setup imbalance ───────

  // CLUSTERED_PAYOFFS: 3+ distinct setups all paid off in a single scene. When
  // too many loops close at once, the audience can't register each resolution —
  // the payoffs blur together and individual impact is lost.
  if (payoffInfo.size >= 3) {
    const payoffsByScene = new Map<number, string[]>();
    for (const [setupId, payoffScene] of payoffInfo) {
      if (!payoffsByScene.has(payoffScene)) payoffsByScene.set(payoffScene, []);
      payoffsByScene.get(payoffScene)!.push(setupId);
    }
    for (const [scene, setupIds] of payoffsByScene) {
      if (setupIds.length >= 3) {
        issues.push({
          location: `Scene ${scene}`,
          rule: 'CLUSTERED_PAYOFFS',
          description: `${setupIds.length} separate setups (${setupIds.slice(0, 3).join(', ')}${setupIds.length > 3 ? '…' : ''}) all pay off in Scene ${scene} — resolutions blur together and lose individual impact`,
          severity: 'minor',
          suggestedFix: 'Distribute payoffs across multiple scenes so each resolution lands distinctly. A cascade of simultaneous reveals reads as contrived convenience',
        });
        break; // one flag per pass
      }
    }
  }

  // PAYOFF_BEFORE_CLIMAX: Every planted clue is resolved before the final 20% of
  // the story. When all loops close early, the climax has no open questions left
  // to drive it — the ending becomes a formality rather than a culmination.
  if (clueInfo.size >= 2 && payoffInfo.size >= clueInfo.size && records.length >= 8) {
    const climaxZoneStart = Math.floor(records.length * 0.8);
    const allResolvedEarly = [...payoffInfo.values()].every(scene => scene < climaxZoneStart);
    // Only fire if every clue was actually paid off and they all landed before the climax zone
    const allCluesResolved = [...clueInfo.keys()].every(id => payoffInfo.has(id));
    if (allResolvedEarly && allCluesResolved && (structure.actPosition === 'act3' || structure.completionPercent >= 70)) {
      const lastPayoff = Math.max(...payoffInfo.values());
      issues.push({
        location: `Last payoff at Scene ${lastPayoff} (climax zone starts Scene ${climaxZoneStart})`,
        rule: 'PAYOFF_BEFORE_CLIMAX',
        description: `All ${clueInfo.size} setups are resolved by Scene ${lastPayoff}, before the climax zone (Scene ${climaxZoneStart}+) — the climax has no unanswered questions left to drive it`,
        severity: 'major',
        suggestedFix: 'Hold at least one significant payoff for the climax itself. The biggest reveal or resolution should coincide with the story\'s peak, not precede it',
      });
    }
  }

  // SETUP_FRONT_GAP: Clues are planted but none appear in the first 25% of the
  // story. Late-seeded setups can't build the long-arc anticipation that makes
  // payoffs satisfying — the best setups are planted before the audience knows
  // they matter.
  if (clueInfo.size >= 2 && records.length >= 8) {
    const act1End = Math.floor(records.length * 0.25);
    const earliestPlant = Math.min(...[...clueInfo.values()].map(c => c.plantedAt));
    if (earliestPlant >= act1End) {
      issues.push({
        location: `Earliest clue planted at Scene ${earliestPlant} (Act 1 ends ~Scene ${act1End})`,
        rule: 'SETUP_FRONT_GAP',
        description: `No clues are planted in Act 1 (first ${act1End} scenes) — the earliest setup appears at Scene ${earliestPlant}. Late seeding can't build the long-arc anticipation that makes payoffs feel earned`,
        severity: 'minor',
        suggestedFix: 'Plant at least one clue in Act 1, ideally disguised as an incidental detail, so its later payoff rewards the attentive viewer',
      });
    }
  }

  // ── Wave 167: Payoff-before-setup, setup clustering, payoff rate decline ─────

  // PAYOFF_BEFORE_SETUP: A clue payoff occurs in an earlier scene than where the
  // clue was seeded. The audience receives the answer before the question is posed.
  for (const [clueId, payoffScene] of payoffInfo) {
    const info = clueInfo.get(clueId);
    if (info && payoffScene < info.plantedAt) {
      issues.push({
        location: `Scene ${payoffScene} (payoff) / Scene ${info.plantedAt} (setup)`,
        rule: 'PAYOFF_BEFORE_SETUP',
        description: `Clue "${clueId}" is paid off at Scene ${payoffScene} but not seeded until Scene ${info.plantedAt} — the audience receives the answer before the question is asked`,
        severity: 'critical',
        suggestedFix: `Move the seed for "${clueId}" to a scene before Scene ${payoffScene}, or move its payoff to after Scene ${info.plantedAt}`,
      });
    }
  }

  // SETUP_CLUSTERING: 70%+ of all planted clues are concentrated in a single act
  // zone (each 25% segment). Good setup/payoff architecture seeds mysteries
  // throughout the story, not in one burst that leaves other acts informationally thin.
  if (clueInfo.size >= 4 && records.length >= 8) {
    const zoneCounts = [0, 0, 0, 0]; // act1 / act2a / act2b / act3
    for (const info of clueInfo.values()) {
      const pct = info.plantedAt / records.length;
      const zone = pct < 0.25 ? 0 : pct < 0.5 ? 1 : pct < 0.75 ? 2 : 3;
      zoneCounts[zone]++;
    }
    const maxCount = Math.max(...zoneCounts);
    if (maxCount / clueInfo.size > 0.7) {
      const zoneNames = ['Act 1', 'early Act 2', 'late Act 2', 'Act 3'];
      const zoneIdx = zoneCounts.indexOf(maxCount);
      issues.push({
        location: `${zoneNames[zoneIdx]} (${Math.round(zoneIdx * 25)}%–${Math.round((zoneIdx + 1) * 25)}%)`,
        rule: 'SETUP_CLUSTERING',
        description: `${maxCount} of ${clueInfo.size} clues (${Math.round(maxCount / clueInfo.size * 100)}%) are planted in ${zoneNames[zoneIdx]} — setup is concentrated rather than distributed. The audience receives all the questions in one burst.`,
        severity: 'minor',
        suggestedFix: 'Spread clue planting across all acts. Early setups build long-arc suspense; mid-story setups raise stakes; late setups create urgency before the climax.',
      });
    }
  }

  // PAYOFF_RATE_DECLINE: Act 2 delivers 2+ payoffs but Act 3 delivers none — dramatic
  // resolutions cluster in the middle act, leaving the climax and finale informationally
  // empty. The story's biggest emotional moments should resolve its planted threads.
  if (records.length >= 8 && payoffInfo.size >= 2) {
    const act2Start = Math.floor(records.length * 0.25);
    const act3Start = Math.floor(records.length * 0.75);
    const act2Payoffs = [...payoffInfo.values()].filter(s => s >= act2Start && s < act3Start).length;
    const act3Payoffs = [...payoffInfo.values()].filter(s => s >= act3Start).length;
    const act3Scenes = records.length - act3Start;
    if (act2Payoffs >= 2 && act3Payoffs === 0 && act3Scenes >= 2) {
      issues.push({
        location: `Act 3 (Scenes ${act3Start}–${records.length - 1})`,
        rule: 'PAYOFF_RATE_DECLINE',
        description: `Act 2 delivers ${act2Payoffs} payoffs but Act 3 delivers none — dramatic resolutions cluster in the middle act, leaving the finale without any story-thread closure`,
        severity: 'major',
        suggestedFix: 'Move at least one significant payoff into Act 3. The story\'s biggest reveal should coincide with its climax, not precede it by an entire act',
      });
    }
  }

  // ── Wave 181: Flat payoffs, clue glut, scrambled setup/payoff order ──────────

  // FLAT_PAYOFF: Two or more payoff scenes land with no emotional weight —
  // neutral emotion, low suspense, no relationship shift. A loop closing should
  // carry a charge (relief, dread, vindication); a payoff that resolves
  // mechanically squanders the anticipation the setup built. Distinct from
  // SETUP_WITHOUT_CONSEQUENCE (which judges the clue's plant scenes).
  {
    const flatPayoffs: string[] = [];
    for (const [setupId, payoffScene] of payoffInfo) {
      const r = records[payoffScene];
      if (!r) continue;
      const isFlat =
        r.emotionalShift === 'neutral' &&
        r.suspenseDelta < 1.5 &&
        (r.relationshipShifts?.length ?? 0) === 0;
      if (isFlat) flatPayoffs.push(setupId);
    }
    if (flatPayoffs.length >= 2) {
      issues.push({
        location: `Payoffs: ${flatPayoffs.slice(0, 3).join(', ')}${flatPayoffs.length > 3 ? '…' : ''}`,
        rule: 'FLAT_PAYOFF',
        description: `${flatPayoffs.length} payoffs resolve with no emotional weight — neutral emotion, low suspense, no relationship shift. The loops close mechanically, squandering the anticipation their setups built.`,
        severity: 'major',
        suggestedFix: 'Stage each payoff for impact: the moment a planted thread resolves should land a charge — relief, dread, vindication, or cost. If a resolution carries no feeling, the setup wasn\'t worth planting.',
      });
    }
  }

  // CLUE_GLUT: At some point the audience is tracking five or more open clues at
  // once (planted but not yet paid off). Too many simultaneous unresolved threads
  // overload working memory — the viewer stops tracking and the mysteries blur.
  if (clueInfo.size >= 5) {
    let maxOpen = 0;
    let glutScene = -1;
    for (let s = 0; s < records.length; s++) {
      let planted = 0;
      let paid = 0;
      for (const [id, info] of clueInfo) {
        if (info.plantedAt <= s) planted++;
        const ps = payoffInfo.get(id);
        if (ps !== undefined && ps <= s) paid++;
      }
      const open = planted - paid;
      if (open > maxOpen) { maxOpen = open; glutScene = s; }
    }
    if (maxOpen >= 5) {
      issues.push({
        location: `Around Scene ${glutScene}`,
        rule: 'CLUE_GLUT',
        description: `By Scene ${glutScene} the audience is tracking ${maxOpen} open clues at once — too many simultaneous unresolved threads overload working memory, and the mysteries start to blur together.`,
        severity: 'minor',
        suggestedFix: 'Resolve or consolidate some threads before opening new ones. Pay off an early clue to free up the audience\'s attention before planting the next, so each mystery has room to register.',
      });
    }
  }

  // SETUP_PAYOFF_ORDER_SCRAMBLED: Across 3+ resolved clue→payoff pairs, the
  // order of payoffs largely reverses the order of setups — what's planted first
  // pays off last and vice versa. A heavily scrambled order is hard to track;
  // audiences follow nested or sequential setups, not a fully inverted stack.
  {
    const pairs: Array<{ plant: number; payoff: number }> = [];
    for (const [id, info] of clueInfo) {
      const ps = payoffInfo.get(id);
      if (ps !== undefined && ps >= info.plantedAt) pairs.push({ plant: info.plantedAt, payoff: ps });
    }
    if (pairs.length >= 3) {
      pairs.sort((a, b) => a.plant - b.plant);
      let inversions = 0;
      let total = 0;
      for (let i = 0; i < pairs.length; i++) {
        for (let j = i + 1; j < pairs.length; j++) {
          total++;
          if (pairs[j].payoff < pairs[i].payoff) inversions++;
        }
      }
      if (total > 0 && inversions / total > 0.5) {
        issues.push({
          location: 'Setup/payoff ordering',
          rule: 'SETUP_PAYOFF_ORDER_SCRAMBLED',
          description: `Across ${pairs.length} resolved threads, ${Math.round(inversions / total * 100)}% of setup/payoff pairs are inverted — what's planted earliest pays off latest and vice versa. The order is scrambled enough that the audience can't track which answer belongs to which question.`,
          severity: 'minor',
          suggestedFix: 'Resolve threads in an order the audience can follow — sequential (first in, first out) or cleanly nested (last in, first out). A fully inverted payoff stack reads as chaos rather than craft.',
        });
      }
    }
  }

  // ── Wave 206: Setup burst, mid-story payoff void, clue drought ──────────────

  // SETUP_BURST: A single scene plants 4+ distinct clues at once. The mirror of
  // CLUSTERED_PAYOFFS on the setup side — too many questions raised in one beat
  // overloads the audience and reads as a clumsy info-dump rather than organic
  // seeding. Good setup distributes its questions so each one registers.
  {
    for (const r of records) {
      const seeded206 = new Set((r.seededClueIds ?? r.unresolvedClues) ?? []);
      if (seeded206.size >= 4) {
        issues.push({
          location: `Scene ${r.sceneIdx} (${r.slug})`,
          rule: 'SETUP_BURST',
          severity: 'minor',
          description: `Scene ${r.sceneIdx} plants ${seeded206.size} distinct clues at once — too many questions raised in a single beat overloads the audience and reads as an info-dump rather than organic seeding.`,
          suggestedFix: 'Distribute the setups across several scenes so each planted question has room to register. A scene that seeds four mysteries simultaneously teaches the audience to stop tracking any of them.',
        });
        break; // one flag per pass
      }
    }
  }

  // MIDSTORY_PAYOFF_VOID: Payoffs land in both Act 1 (first 25%) and Act 3 (final
  // 25%) but none in the entire middle 50% — a "barbell" resolution distribution.
  // The middle act delivers no thread closure, so the long conflict zone feels
  // like dead air between the opening hook and the finale. Distinct from
  // PAYOFF_RATE_DECLINE (Act 2 has payoffs, Act 3 none). Requires 8+ scenes, 2+ payoffs.
  if (records.length >= 8 && payoffInfo.size >= 2) {
    const midStart206 = Math.floor(records.length * 0.25);
    const midEnd206 = Math.floor(records.length * 0.75);
    const payoffScenes206 = [...payoffInfo.values()];
    const inAct1_206 = payoffScenes206.some(s => s < midStart206);
    const inAct3_206 = payoffScenes206.some(s => s >= midEnd206);
    const inMiddle206 = payoffScenes206.some(s => s >= midStart206 && s < midEnd206);
    if (inAct1_206 && inAct3_206 && !inMiddle206) {
      issues.push({
        location: `Middle (Scenes ${midStart206}–${midEnd206 - 1})`,
        rule: 'MIDSTORY_PAYOFF_VOID',
        severity: 'minor',
        description: `Payoffs land in Act 1 and Act 3 but none in the entire middle 50% (Scenes ${midStart206}–${midEnd206 - 1}) — the conflict zone delivers no thread closure, leaving a long stretch of dead air between the opening hook and the finale.`,
        suggestedFix: 'Resolve at least one planted thread in the middle act. A mid-story payoff rewards the audience\'s patience, raises new questions, and keeps the long second act from feeling like stalling.',
      });
    }
  }

  // CLUE_DROUGHT: The longest interior gap between consecutive setup/payoff events
  // spans 5+ scenes (4+ scenes with no plant and no payoff between two events).
  // The setup/payoff engine goes idle for a long stretch in the middle of an
  // otherwise active mystery architecture — momentum stalls between the events
  // that bracket the gap. Requires 8+ scenes and 3+ total clue events.
  if (records.length >= 8) {
    const eventScenes206 = new Set<number>();
    for (const info of clueInfo.values()) eventScenes206.add(info.plantedAt);
    for (const s of payoffInfo.values()) eventScenes206.add(s);
    const sorted206 = [...eventScenes206].sort((a, b) => a - b);
    if (sorted206.length >= 3) {
      let maxGap206 = 0;
      let gapStart206 = -1;
      let gapEnd206 = -1;
      for (let i = 1; i < sorted206.length; i++) {
        const gap206 = sorted206[i] - sorted206[i - 1];
        if (gap206 > maxGap206) {
          maxGap206 = gap206;
          gapStart206 = sorted206[i - 1];
          gapEnd206 = sorted206[i];
        }
      }
      if (maxGap206 >= 5) {
        issues.push({
          location: `Scenes ${gapStart206}–${gapEnd206}`,
          rule: 'CLUE_DROUGHT',
          severity: 'minor',
          description: `The setup/payoff engine goes idle for ${maxGap206 - 1} consecutive scenes (between Scene ${gapStart206} and Scene ${gapEnd206}) — no clue is planted and no thread resolves across the longest interior gap. The mystery architecture stalls in the middle of an otherwise active story.`,
          suggestedFix: 'Seed a small clue or resolve a minor thread within the dead stretch. A drip of setup/payoff activity keeps the mystery engine warm so the audience stays engaged between major beats.',
        });
      }
    }
  }

  // ── Wave 219: Tension-debt physics — concurrent open threads, end-loaded resolution,
  //    anticipation-window trend. These model the setup/payoff ledger as a running debt
  //    curve rather than as isolated plant/pay events. ──

  // CONCURRENT_THREAD_OVERLOAD (major): the running count of simultaneously-open threads
  // (planted but not yet paid off) peaks above 5. Distinct from CLUE_GLUT (cumulative
  // total): a story can plant many clues safely if it closes them as it goes, but holding
  // 6+ unresolved questions open AT ONCE overloads the audience's working memory — they
  // lose track of which thread is which, and each individual payoff loses its charge.
  if (clueInfo.size >= 6 && records.length >= 8) {
    let open219 = 0, peak219 = 0, peakScene219 = 0;
    for (let s = 0; s < records.length; s++) {
      for (const info of clueInfo.values()) if (info.plantedAt === s) open219++;
      for (const ps of payoffInfo.values()) if (ps === s) open219--;
      if (open219 > peak219) { peak219 = open219; peakScene219 = s; }
    }
    if (peak219 > 5) {
      issues.push({
        location: `Scene ${peakScene219} (peak open threads)`,
        rule: 'CONCURRENT_THREAD_OVERLOAD',
        severity: 'major',
        description: `At Scene ${peakScene219} the story holds ${peak219} planted-but-unresolved threads open simultaneously — the audience is asked to track ${peak219} live questions at once. Beyond roughly five concurrent threads, individual mysteries blur together and each eventual payoff loses its charge.`,
        suggestedFix: 'Close some threads before opening new ones: pay off or fold together a few of the early clues so the concurrent open-thread count stays manageable. Suspense comes from a few sharp questions held in focus, not from a dozen blurred ones.',
      });
    }
  }

  // RESOLUTION_CRAMMED_AT_END (major): 60%+ of all payoffs land in the final 15% of the
  // story. Distinct from CLUSTERED_PAYOFFS (3+ in a single scene) and PAYOFF_RATE_DECLINE
  // (Act 3 has zero): this catches resolution that is technically distributed across the
  // last few scenes but still crammed into the ending — a story that defers nearly all its
  // bookkeeping to a closing info-dump rather than pacing reveals across the arc.
  if (payoffInfo.size >= 4 && records.length >= 8) {
    const endZoneStart219 = Math.floor(records.length * 0.85);
    const latePayoffs219 = [...payoffInfo.values()].filter(s => s >= endZoneStart219).length;
    const lateShare219 = latePayoffs219 / payoffInfo.size;
    if (lateShare219 >= 0.6) {
      issues.push({
        location: `Final 15% (Scenes ${endZoneStart219}–${records.length - 1})`,
        rule: 'RESOLUTION_CRAMMED_AT_END',
        severity: 'major',
        description: `${latePayoffs219} of ${payoffInfo.size} payoffs (${Math.round(lateShare219 * 100)}%) land in the final 15% of the story — resolution is crammed into the ending rather than paced across the arc. A closing run of back-to-back reveals reads as an info-dump and denies most payoffs the scene-space to land.`,
        suggestedFix: 'Pull several payoffs earlier so reveals are distributed: let mid-story scenes close some loops while the ending reserves only the one or two largest. A satisfying climax resolves the central thread, not the entire backlog at once.',
      });
    }
  }

  // ANTICIPATION_WINDOW_DECAY (minor): setup→payoff gaps shrink across the story — the
  // later-planted clues are paid off on far shorter fuses than the earlier ones. The story
  // gives its opening setups long, satisfying anticipation arcs but resolves its late
  // setups almost reflexively, so the back half never plants anything with room to breathe.
  {
    const resolved219 = [...clueInfo.entries()]
      .filter(([id]) => payoffInfo.has(id))
      .map(([id, info]) => ({ plant: info.plantedAt, gap: (payoffInfo.get(id) ?? info.plantedAt) - info.plantedAt }))
      .filter(x => x.gap > 0)
      .sort((a, b) => a.plant - b.plant);
    if (resolved219.length >= 4) {
      const half219 = Math.floor(resolved219.length / 2);
      const earlyHalf219 = resolved219.slice(0, half219);
      const lateHalf219 = resolved219.slice(resolved219.length - half219);
      const avgGap219 = (arr: Array<{ gap: number }>) => arr.reduce((s, x) => s + x.gap, 0) / arr.length;
      const earlyAvg219 = avgGap219(earlyHalf219);
      const lateAvg219 = avgGap219(lateHalf219);
      if (earlyAvg219 > 0 && lateAvg219 < 0.5 * earlyAvg219) {
        issues.push({
          location: 'Anticipation-window trend',
          rule: 'ANTICIPATION_WINDOW_DECAY',
          severity: 'minor',
          description: `Setup→payoff gaps shrink across the story: early clues wait ${earlyAvg219.toFixed(1)} scenes for their payoff, late clues only ${lateAvg219.toFixed(1)}. The back half resolves its setups almost reflexively, so nothing planted late gets the long fuse that makes a payoff feel earned.`,
          suggestedFix: 'Give late setups room to breathe too: plant at least one back-half clue several scenes before it pays off, rather than seeding and resolving in quick succession. A late long-fuse setup keeps the anticipation engine running into the climax.',
        });
      }
    }
  }

  // ── Wave 233: Payoff orphan rate, post-climax cluster, gap uniformity ────────

  // PAYOFF_ORPHAN_RATE (minor, clues≥4): More than 50% of planted clues are
  // never paid off — the setup engine leaks. The audience is asked to hold
  // mysteries that the story never resolves. Distinct from ORPHAN_CLUE (flags
  // each individual orphan) — this fires when the RATE of abandonment is high,
  // indicating a systemic failure of the payoff architecture.
  if (clueInfo.size >= 4) {
    const orphanCount233 = [...clueInfo.keys()].filter(id => !payoffInfo.has(id)).length;
    const orphanRate233 = orphanCount233 / clueInfo.size;
    if (orphanRate233 > 0.5) {
      issues.push({
        location: 'Setup/payoff ledger',
        rule: 'PAYOFF_ORPHAN_RATE',
        severity: 'minor',
        description: `${orphanCount233} of ${clueInfo.size} planted clues (${Math.round(orphanRate233 * 100)}%) are never paid off — the majority of the story's setup investments go unrewarded. A high orphan rate depletes the audience's trust in the setup engine.`,
        suggestedFix: 'Either pay off the orphaned clues, or fold them into a shared payoff scene that resolves multiple threads at once. The audience remembers what the story promised — they need resolution, not abandonment.',
      });
    }
  }

  // PAYOFF_POST_CLIMAX_CLUSTER (minor, payoffs≥3, n≥8): 2+ payoffs land after
  // the climax zone (final 20% of the story). Payoffs in the falling action arrive
  // after dramatic energy has already dissipated — they feel like afterthoughts
  // rather than earned revelations. Distinct from RESOLUTION_CRAMMED_AT_END (which
  // checks the final 15% for >60% of all payoffs) — this fires on any 2+ late
  // post-climax payoffs regardless of total proportion.
  if (payoffInfo.size >= 3 && records.length >= 8) {
    const postClimaxStart233 = Math.floor(records.length * 0.8);
    const postPayoffs233 = [...payoffInfo.values()].filter(s => s >= postClimaxStart233).length;
    if (postPayoffs233 >= 2) {
      issues.push({
        location: `Final 20% (Scenes ${postClimaxStart233}–${records.length - 1})`,
        rule: 'PAYOFF_POST_CLIMAX_CLUSTER',
        severity: 'minor',
        description: `${postPayoffs233} payoffs land after Scene ${postClimaxStart233} (post-climax zone) — reveals that arrive in the falling action feel like afterthoughts. The dramatic energy is already spent when these payoffs land.`,
        suggestedFix: 'Move late payoffs earlier — into the climax or its approach. Resolution in the falling action delays satisfaction without building tension; the audience needs rewards to land while they still care.',
      });
    }
  }

  // SETUP_PAYOFF_GAP_UNIFORMITY (minor, ≥4 resolved setups): All resolved
  // setup→payoff gaps are within 1 scene of each other. Every clue has the
  // same fuse — the story resolves its mysteries on a metronomic schedule.
  // The audience can predict exactly when the next reveal arrives. Some clues
  // should have short fuses (quick gratification) and others long fuses
  // (sustained anticipation). Uniform gaps make every reveal feel scheduled.
  {
    const resolvedGaps233 = [...clueInfo.entries()]
      .filter(([id]) => payoffInfo.has(id))
      .map(([id, info]) => (payoffInfo.get(id) ?? info.plantedAt) - info.plantedAt)
      .filter(g => g > 0);
    if (resolvedGaps233.length >= 4) {
      const minGap233 = Math.min(...resolvedGaps233);
      const maxGap233 = Math.max(...resolvedGaps233);
      const avgGap233 = resolvedGaps233.reduce((a, b) => a + b, 0) / resolvedGaps233.length;
      if (maxGap233 - minGap233 <= 1 && avgGap233 <= 4) {
        issues.push({
          location: 'Setup/payoff timing',
          rule: 'SETUP_PAYOFF_GAP_UNIFORMITY',
          severity: 'minor',
          description: `All ${resolvedGaps233.length} resolved setups have gap lengths within 1 scene of each other (range: ${minGap233}–${maxGap233} scenes, avg ${avgGap233.toFixed(1)}) — every clue has the same fuse. The audience can predict exactly when the next reveal arrives.`,
          suggestedFix: 'Vary the fuse lengths: give some clues a 1–2 scene payoff (quick gratification) and others a 5+ scene arc (sustained anticipation). Variety in gap length makes each payoff feel perfectly timed rather than metronomic.',
        });
      }
    }
  }
  // ── Wave 247: Setup Act 3 surge, payoff single-scene dump, setup desert Act 2b ──

  // SETUP_ACT3_SURGE (minor, clues≥3, n≥8): 40%+ of all planted clues are
  // seeded in Act 3 (last 25%). New clues planted in the climax act create
  // obligations the story can never fulfill — seeds without growing room.
  // A clue planted in Act 3 can pay off at most 1-2 scenes later; the audience
  // has no time to carry it. Distinct from LATE_CLUE_PLANTING (which fires on
  // individual clues planted late) — this fires when the PROPORTION of late
  // planting is high, indicating a systemic Act 3 exposition habit.
  if (clueInfo.size >= 3 && records.length >= 8) {
    const act3Start247 = Math.floor(records.length * 0.75);
    const act3Clues247 = [...clueInfo.values()].filter(c => c.plantedAt >= act3Start247).length;
    if (act3Clues247 / clueInfo.size >= 0.4) {
      issues.push({
        location: `Act 3 setup layer (Scenes ${act3Start247}–${records.length - 1})`,
        rule: 'SETUP_ACT3_SURGE',
        severity: 'minor',
        description: `${act3Clues247} of ${clueInfo.size} planted clues (${Math.round(act3Clues247 / clueInfo.size * 100)}%) are seeded in Act 3 — the story is planting new obligations in its climax act. Clues seeded after the 75% mark have no growing room; the audience barely has time to register them before the resolution arrives.`,
        suggestedFix: 'Move Act 3 clue plants into Act 1 or Act 2, where they have time to settle into the audience\'s memory before the payoff arrives. A well-timed clue is planted early enough to be almost forgotten — and then remembered at exactly the right moment.',
      });
    }
  }

  // PAYOFF_SINGLE_SCENE_DUMP (minor, payoffs≥4): More than 50% of all payoffs
  // land in a single scene — the story fires all its setups simultaneously.
  // One revelation per scene creates organic discovery; a simultaneous dump
  // overwhelms the audience. Each payoff dilutes all the others when they
  // arrive together; distributed revelations let each one land with full weight.
  if (payoffInfo.size >= 4) {
    const payoffByScene247 = new Map<number, number>();
    for (const sceneIdx247 of payoffInfo.values()) {
      payoffByScene247.set(sceneIdx247, (payoffByScene247.get(sceneIdx247) ?? 0) + 1);
    }
    const [maxScene247, maxCount247] = [...payoffByScene247.entries()].sort((a, b) => b[1] - a[1])[0];
    if (maxCount247 / payoffInfo.size > 0.5) {
      issues.push({
        location: `Scene ${maxScene247} (payoff dump)`,
        rule: 'PAYOFF_SINGLE_SCENE_DUMP',
        severity: 'minor',
        description: `${maxCount247} of ${payoffInfo.size} payoffs (${Math.round(maxCount247 / payoffInfo.size * 100)}%) land in a single scene (Scene ${maxScene247}) — the story fires all its setups simultaneously. Each reveal dilutes the others when they arrive together; none can land with full weight.`,
        suggestedFix: 'Distribute payoffs across 3-4 separate scenes. Give each revelation room to breathe: a scene to absorb it, a character reaction, a shift in what the audience now knows. A payoff dump feels like a delivery, not a discovery.',
      });
    }
  }

  // SETUP_DESERT_ACT2B (minor, clues≥3, n≥10): No planted clues appear in
  // the second half of Act 2 (50%–75% of the story). The run-up to the climax
  // stops seeding new threads — the story enters Act 3 without fresh lines to
  // pull. Act 2b is where the protagonist should be generating new information
  // and obligations for the climax to resolve. A clue desert here means Act 3
  // has nothing new to harvest.
  if (clueInfo.size >= 3 && records.length >= 10) {
    const act2bStart247 = Math.floor(records.length * 0.5);
    const act2bEnd247 = Math.floor(records.length * 0.75);
    const hasAct2bClue247 = [...clueInfo.values()].some(
      c => c.plantedAt >= act2bStart247 && c.plantedAt < act2bEnd247,
    );
    if (!hasAct2bClue247) {
      issues.push({
        location: `Act 2b (Scenes ${act2bStart247}–${act2bEnd247 - 1}) — setup layer`,
        rule: 'SETUP_DESERT_ACT2B',
        severity: 'minor',
        description: `No clues are planted in the second half of Act 2 (Scenes ${act2bStart247}–${act2bEnd247 - 1}). The run-up to the climax generates no new threads. Act 3 has nothing fresh to resolve — only the setups established earlier, which are already in the audience's fading memory.`,
        suggestedFix: 'Plant at least one clue in Act 2b: a detail planted close enough to the climax to feel urgent, far enough to be surprising when it pays off. The Act 2b setup is the fuel for Act 3\'s discoveries.',
      });
    }
  }
  // ── End Wave 247 ─────────────────────────────────────────────────────────────

  // ── End Wave 233 ─────────────────────────────────────────────────────────────

  // ── Wave 261: Payoff precedes setup, payoff gap excessive, payoff front-loaded ──

  // PAYOFF_PRECEDES_SETUP (major): A setup is paid off in an EARLIER scene than the
  // one where its clue is first planted — the resolution arrives before the audience
  // has been shown the thread. This is a causal/continuity inversion: the answer is
  // delivered before the question is posed. Distinct from DANGLING_PAYOFF (no setup
  // anywhere) and PAYOFF_TOO_QUICK (positive gap of 0–1); this fires on a negative
  // gap, where plant and payoff are out of order.
  {
    let precedesFired261 = false;
    for (const [setupId, payoffScene] of payoffInfo) {
      const info261 = clueInfo.get(setupId);
      if (info261 && payoffScene < info261.plantedAt) {
        issues.push({
          location: `Payoff Scene ${payoffScene} → setup Scene ${info261.plantedAt}`,
          rule: 'PAYOFF_PRECEDES_SETUP',
          severity: 'major',
          description: `The payoff for "${setupId}" lands in Scene ${payoffScene}, but its setup isn't planted until Scene ${info261.plantedAt} — the resolution arrives before the audience is shown the thread. The answer is delivered before the question is posed, inverting cause and effect.`,
          suggestedFix: `Reorder the timeline so "${setupId}" is seeded before it pays off. Either move the setup scene earlier than Scene ${payoffScene}, or move the payoff later than Scene ${info261.plantedAt}. A payoff only lands when the audience has already been holding the question.`,
        });
        precedesFired261 = true;
        break;
      }
    }
    void precedesFired261;
  }

  // PAYOFF_GAP_EXCESSIVE (minor, n≥10): A clue's plant-to-payoff gap spans 60% or
  // more of the entire story — so much time passes that the audience has likely
  // forgotten the setup by the time it pays off. A long fuse builds anticipation
  // only if the clue is occasionally reinforced; an unreinforced clue stretched
  // across most of the runtime simply fades. Distinct from SETUP_PAYOFF_GAP_
  // UNIFORMITY (metronomic gaps) and PAYOFF_TOO_QUICK (gap too small); this fires
  // on a single over-long fuse.
  if (records.length >= 10) {
    const gapThreshold261 = records.length * 0.6;
    for (const [setupId, payoffScene] of payoffInfo) {
      const info261b = clueInfo.get(setupId);
      if (info261b) {
        const gap261 = payoffScene - info261b.plantedAt;
        if (gap261 >= gapThreshold261) {
          issues.push({
            location: `Clue "${setupId}" (Scene ${info261b.plantedAt} → Scene ${payoffScene})`,
            rule: 'PAYOFF_GAP_EXCESSIVE',
            severity: 'minor',
            description: `The clue "${setupId}" is planted in Scene ${info261b.plantedAt} and not paid off until Scene ${payoffScene} — a gap of ${gap261} scenes, spanning ${Math.round(gap261 / records.length * 100)}% of the story. Across that span the audience has likely forgotten the setup, so the payoff lands without the flash of recognition that makes it satisfying.`,
            suggestedFix: `Reinforce "${setupId}" at least once in the middle stretch — a callback, a reminder, a recontextualisation — so the thread stays warm in the audience's memory. A long fuse only works if it visibly keeps burning.`,
          });
          break;
        }
      }
    }
  }

  // PAYOFF_FRONT_LOADED (minor, payoffs≥3, n≥8): More than 60% of all payoffs land
  // in the first half of the story — the resolution engine discharges early and the
  // back half has little left to pay off. The audience's investments are cashed out
  // before the climax, draining the late story of the recognition-and-reward beats
  // that make a finale satisfying. Distinct from PAYOFF_POST_CLIMAX_CLUSTER (its
  // late-skewed inverse) and PAYOFF_SINGLE_SCENE_DUMP (one-scene concentration).
  if (payoffInfo.size >= 3 && records.length >= 8) {
    const midpoint261 = Math.floor(records.length * 0.5);
    const firstHalfPayoffs261 = [...payoffInfo.values()].filter(s => s < midpoint261).length;
    const frontRatio261 = firstHalfPayoffs261 / payoffInfo.size;
    if (frontRatio261 > 0.6) {
      issues.push({
        location: 'Payoff distribution',
        rule: 'PAYOFF_FRONT_LOADED',
        severity: 'minor',
        description: `${firstHalfPayoffs261} of ${payoffInfo.size} payoffs (${Math.round(frontRatio261 * 100)}%) land in the first half of the story — the resolution engine discharges early. The audience's investments are cashed out before the climax, leaving the finale with little to reward and the back half informationally spent.`,
        suggestedFix: 'Reserve at least one or two major payoffs for the climax and its approach. The most satisfying reveals are the ones the audience has waited longest for — hold the biggest threads until the end rather than resolving them in Act 1 and Act 2a.',
      });
    }
  }

  // ── Wave 275: Act 2a payoff void, late-majority clue seeding, setup/payoff act skew ──

  // PAYOFF_ACT2A_VOID (minor, n≥10, payoffs≥3): No payoffs land in Act 2a (25%–50%
  // of the story). The early conflict zone delivers no thread closure — a long stretch
  // of pure escalation without any payoff depletes the audience's patience. At least one
  // resolution mid-first-half resets the tension baseline and proves the setup engine active.
  if (records.length >= 10 && payoffInfo.size >= 3) {
    const act2aStart275 = Math.floor(records.length * 0.25);
    const act2aEnd275 = Math.floor(records.length * 0.5);
    const hasAct2aPayoff275 = [...payoffInfo.values()].some(s => s >= act2aStart275 && s < act2aEnd275);
    if (!hasAct2aPayoff275) {
      issues.push({
        location: `Act 2a (Scenes ${act2aStart275}–${act2aEnd275 - 1})`,
        rule: 'PAYOFF_ACT2A_VOID',
        severity: 'minor',
        description: `No setups are paid off in Act 2a (Scenes ${act2aStart275}–${act2aEnd275 - 1}) — the early conflict zone delivers no thread closure. A long stretch of pure escalation without any payoff depletes the audience's patience before the midpoint.`,
        suggestedFix: 'Resolve at least one planted thread in Act 2a to reward the audience\'s investment and signal that the setup engine is active. A mid-first-half payoff resets the tension baseline and earns the right to raise it again.',
      });
    }
  }

  // CLUE_SEED_LATE_MAJORITY (minor, n≥10, clues≥4): More than 60% of planted clues
  // are seeded in the second half of the story (after the midpoint). Distinct from
  // SETUP_ACT3_SURGE (last 25% only) — this fires on any second-half majority including
  // Act 2b-heavy planting. Late-seeded clues can't build the long anticipation arcs that
  // make payoffs feel earned; the audience carries them only briefly before resolution.
  if (records.length >= 10 && clueInfo.size >= 4) {
    const midpoint275 = Math.floor(records.length * 0.5);
    const lateClues275 = [...clueInfo.values()].filter(c => c.plantedAt >= midpoint275).length;
    if (lateClues275 / clueInfo.size > 0.6) {
      issues.push({
        location: 'Setup distribution',
        rule: 'CLUE_SEED_LATE_MAJORITY',
        severity: 'minor',
        description: `${lateClues275} of ${clueInfo.size} planted clues (${Math.round(lateClues275 / clueInfo.size * 100)}%) are seeded in the second half of the story — the majority of the setup engine's work starts after the midpoint. Late-seeded clues can't build the long anticipation arcs that make payoffs feel earned.`,
        suggestedFix: 'Move at least two clue plants into the first half. Setups planted early can pay off at any point, building sustained anticipation; setups planted late arrive too close to their resolutions to create genuine surprise.',
      });
    }
  }

  // SETUP_PAYOFF_ACT_SKEW (minor, n≥8, clues≥3, payoffs≥2): The act that concentrates
  // the most setups has zero payoffs in it, AND the act that concentrates the most payoffs
  // has zero setups — the planting and harvesting engines operate in completely separate act
  // zones. A story where all setups live in one act and all payoffs in another lacks the
  // interleaved cause-and-effect texture that creates organic narrative momentum.
  if (records.length >= 8 && clueInfo.size >= 3 && payoffInfo.size >= 2) {
    const zoneSetups275 = [0, 0, 0, 0];
    const zonePayoffs275 = [0, 0, 0, 0];
    for (const info of clueInfo.values()) {
      const pct275 = info.plantedAt / records.length;
      const zone275 = pct275 < 0.25 ? 0 : pct275 < 0.5 ? 1 : pct275 < 0.75 ? 2 : 3;
      zoneSetups275[zone275]++;
    }
    for (const ps275 of payoffInfo.values()) {
      const pct275b = ps275 / records.length;
      const zone275b = pct275b < 0.25 ? 0 : pct275b < 0.5 ? 1 : pct275b < 0.75 ? 2 : 3;
      zonePayoffs275[zone275b]++;
    }
    const topSetup275 = zoneSetups275.indexOf(Math.max(...zoneSetups275));
    const topPayoff275 = zonePayoffs275.indexOf(Math.max(...zonePayoffs275));
    if (topSetup275 !== topPayoff275 && zonePayoffs275[topSetup275] === 0 && zoneSetups275[topPayoff275] === 0) {
      const zoneNames275 = ['Act 1', 'Act 2a', 'Act 2b', 'Act 3'];
      issues.push({
        location: 'Setup/payoff act distribution',
        rule: 'SETUP_PAYOFF_ACT_SKEW',
        severity: 'minor',
        description: `The act with the most setups (${zoneNames275[topSetup275]}: ${zoneSetups275[topSetup275]} setups) has zero payoffs, and the act with the most payoffs (${zoneNames275[topPayoff275]}: ${zonePayoffs275[topPayoff275]} payoffs) has zero setups — the planting and harvesting engines operate in completely separate acts. Setup and payoff divorced from each other reduce the sense of earned resolution.`,
        suggestedFix: 'Introduce at least one payoff in the act where most setups are planted, or plant at least one clue in the act where most payoffs arrive. Interleaving setups and payoffs within the same act zone creates a more organic sense of cause-and-effect progression.',
      });
    }
  }

  // ── Wave 289: PAYOFF_REVELATION_DISCONNECT ───────────────────────────────
  // Payoffs fire (payoffSetupIds non-empty) but none of the payoff scenes
  // have a revelation and none of the adjacent scenes (±1) have a revelation
  // either. Payoffs should be moments of discovery — the audience should
  // learn something when a planted thread is resolved. A payoff without a
  // revelation is a closure without insight. Requires 8+ records and 3+
  // payoff scenes.
  if (records.length >= 8 && payoffInfo.size >= 3) {
    const revelationSceneIdxs289 = new Set<number>(
      (records as any[]).filter(r => r.revelation !== null).map(r => r.sceneIdx),
    );
    const payoffSceneIdxs289 = new Set<number>([...payoffInfo.values()]);
    const anyRevealed289 = [...payoffSceneIdxs289].some(idx =>
      revelationSceneIdxs289.has(idx) ||
      revelationSceneIdxs289.has(idx - 1) ||
      revelationSceneIdxs289.has(idx + 1),
    );
    if (!anyRevealed289) {
      issues.push({
        location: 'Payoff scenes — no adjacent revelations',
        rule: 'PAYOFF_REVELATION_DISCONNECT',
        severity: 'minor',
        description: `${payoffInfo.size} payoff scene(s) fire but none of them (or their adjacent scenes) contain a revelation. Payoffs should be moments of discovery — the audience should learn or understand something new when a planted thread resolves. A payoff without insight is closure without meaning.`,
        suggestedFix: 'Tie each payoff to a revelation: the fulfilled setup reveals a character\'s true motive, confirms a fear, or recontextualizes an earlier event. Even a small revelation — "now we know why that mattered" — elevates a mechanical closure to a resonant one.',
      });
    }
  }

  // ── Wave 289: CLUE_DENSITY_FRONT_COLLAPSE ────────────────────────────────
  // All planted clues appear in the first 20% of the story. The entire
  // setup engine exhausts itself in the opening and then falls silent.
  // Audiences can only hold a limited number of active setups in memory;
  // front-loading all seeds means they fade before they can pay off.
  // Requires 8+ records and 3+ seeded clues.
  if (records.length >= 8 && clueInfo.size >= 3) {
    const cutoff289 = Math.floor(records.length * 0.20);
    const earlyClues289 = [...clueInfo.values()].filter(c => c.plantedAt <= cutoff289).length;
    if (earlyClues289 === clueInfo.size) {
      issues.push({
        location: `Opening 20% (scenes 0–${cutoff289}) — all clue plants`,
        rule: 'CLUE_DENSITY_FRONT_COLLAPSE',
        severity: 'minor',
        description: `All ${clueInfo.size} planted clues appear in the first 20% of the story (scenes 0–${cutoff289}) and no new clues are seeded after that. Front-collapsing the entire setup engine means audiences carry all threads for the rest of the story — or forget them entirely before they pay off.`,
        suggestedFix: 'Distribute clue plants across all four acts: plant 2–3 clues in Act 1, introduce new threads at the midpoint and Act 2b, and reserve one "late plant" for Act 3 that pays off in the climax. This keeps the audience actively processing setups throughout, not just in the opening.',
      });
    }
  }

  // ── Wave 289: PAYOFF_SUSPENSE_MISMATCH ───────────────────────────────────
  // Payoff scenes have an average suspenseDelta ≤ 0 despite 3+ payoffs firing.
  // Payoffs should generate suspense — the moment a planted thread resolves
  // should feel like the stakes rising, not falling. Flat or declining suspense
  // at the moment of payoff means the resolution lands without tension, and the
  // audience feels cheated rather than rewarded. Requires 8+ records and 3+
  // payoff scenes with suspenseDelta data.
  if (records.length >= 8 && payoffInfo.size >= 3) {
    const payoffSuspenseScenes289 = [...payoffInfo.values()]
      .map(idx => (records as any[]).find(r => r.sceneIdx === idx))
      .filter(Boolean);
    if (payoffSuspenseScenes289.length >= 3) {
      const avgPayoffSuspense289 = payoffSuspenseScenes289.reduce((acc: number, r: any) => acc + (r.suspenseDelta ?? 0), 0) / payoffSuspenseScenes289.length;
      if (avgPayoffSuspense289 <= 0) {
        issues.push({
          location: 'Payoff scenes — suspense mismatch',
          rule: 'PAYOFF_SUSPENSE_MISMATCH',
          severity: 'minor',
          description: `${payoffSuspenseScenes289.length} payoff scenes have an average suspenseDelta of ${avgPayoffSuspense289.toFixed(2)} — resolutions arrive without generating tension. Payoffs should be moments of heightened stakes: the audience should feel the cost of the resolution, not just the closure. Flat or declining suspense at payoff time makes the resolution feel deflating rather than cathartic.`,
          suggestedFix: 'Raise the stakes at each payoff: ensure the resolution is contested (the protagonist must work for it), costly (something is lost even in victory), or revelatory (the payoff recontextualizes what came before). A payoff that arrives without friction is a debt repaid without drama.',
        });
      }
    }
  }

  // ── Wave 303: CLUE_REPLANT ────────────────────────────────────────────────
  // The same clue ID is seeded in two or more different scenes. Planting a
  // setup the audience has already received reads as either a continuity
  // artifact or the writer not trusting the first plant — and a re-plant
  // dilutes the original's precision, since the audience can no longer
  // anchor the payoff to a single moment. (clueInfo records only the first
  // plant, so this scans the raw records.) Requires 6+ records.
  if (records.length >= 6) {
    const plantScenes303 = new Map<string, number[]>();
    for (const r of records as any[]) {
      for (const clueId of (r.seededClueIds ?? []) as string[]) {
        const arr = plantScenes303.get(clueId) ?? [];
        arr.push(r.sceneIdx);
        plantScenes303.set(clueId, arr);
      }
    }
    const replanted303 = [...plantScenes303.entries()].filter(([, scenes]) => scenes.length >= 2);
    if (replanted303.length > 0) {
      const [clueId303, scenes303] = replanted303[0];
      issues.push({
        location: `Clue "${clueId303}" planted at scenes ${scenes303.join(', ')}`,
        rule: 'CLUE_REPLANT',
        severity: 'minor',
        description: `The clue "${clueId303}" is seeded in ${scenes303.length} separate scenes (${scenes303.join(', ')})${replanted303.length > 1 ? `, and ${replanted303.length - 1} other clue(s) are also replanted` : ''}. Planting a setup the audience already holds reads as a continuity artifact or as the writer not trusting the first plant — and it blurs the payoff's anchor, since the resolution can no longer point back to a single charged moment.`,
        suggestedFix: 'Keep one plant per clue and make it count. If the audience needs a reminder of an early setup, use a glancing callback (a character touching the object, a half-reference in dialogue) rather than a full re-plant — reminders refresh memory without resetting the anticipation clock.',
      });
    }
  }

  // ── Wave 303: PAYOFF_DOUBLE_FIRE ─────────────────────────────────────────
  // The same setup ID is paid off in two or more different scenes — a thread
  // resolved twice. The second resolution is dramatically inert (the loop is
  // already closed) and signals a continuity error in the story's ledger.
  // (payoffInfo records only the first payoff, so this scans the raw
  // records.) Requires 6+ records.
  if (records.length >= 6) {
    const payoffScenes303 = new Map<string, number[]>();
    for (const r of records as any[]) {
      for (const setupId of (r.payoffSetupIds ?? []) as string[]) {
        const arr = payoffScenes303.get(setupId) ?? [];
        arr.push(r.sceneIdx);
        payoffScenes303.set(setupId, arr);
      }
    }
    const doubled303 = [...payoffScenes303.entries()].filter(([, scenes]) => scenes.length >= 2);
    if (doubled303.length > 0) {
      const [setupId303, dScenes303] = doubled303[0];
      issues.push({
        location: `Setup "${setupId303}" paid off at scenes ${dScenes303.join(', ')}`,
        rule: 'PAYOFF_DOUBLE_FIRE',
        severity: 'minor',
        description: `The setup "${setupId303}" is paid off in ${dScenes303.length} separate scenes (${dScenes303.join(', ')})${doubled303.length > 1 ? `, and ${doubled303.length - 1} other setup(s) also fire twice` : ''}. A thread can only resolve once — the second payoff arrives after the loop is closed, carries no anticipation, and reads as a continuity error in the story's setup ledger.`,
        suggestedFix: 'Give each setup exactly one payoff scene. If the resolution genuinely has two stages (a partial reveal, then the full truth), model them as two distinct setups — the partial answer becoming its own plant for the final one — so each payoff closes a live loop.',
      });
    }
  }

  // ── Wave 303: THREAD_CONVERGENCE_ABSENT ──────────────────────────────────
  // The story fires 4+ payoffs and every one resolves in isolation — no
  // scene ever pays off two threads together. Serially-resolved threads read
  // as episodic housekeeping; braided resolutions, where one scene answers
  // multiple plants at once, are what make a climax feel like everything
  // coming together. Inverse of CLUSTERED_PAYOFFS (too many in one scene).
  // Requires 8+ records and 4+ distinct payoff scenes.
  if (records.length >= 8) {
    const payoffCounts303 = (records as any[]).map(r => ((r.payoffSetupIds ?? []) as string[]).length);
    const payoffSceneCount303 = payoffCounts303.filter(c => c > 0).length;
    const totalPayoffs303 = payoffCounts303.reduce((a, b) => a + b, 0);
    if (totalPayoffs303 >= 4 && payoffSceneCount303 === totalPayoffs303) {
      issues.push({
        location: 'Payoff distribution',
        rule: 'THREAD_CONVERGENCE_ABSENT',
        severity: 'minor',
        description: `All ${totalPayoffs303} payoffs resolve one per scene — no scene ever closes two threads together. Strictly serial resolution reads as episodic housekeeping: each loop is filed away on its own, and the story never delivers the moment where separate threads turn out to be one knot. Convergence is what makes a climax feel like everything coming together.`,
        suggestedFix: 'Braid at least two threads into a single resolution scene — ideally at or near the climax, where one event answers multiple plants at once (the hidden letter that both unmasks the traitor and explains the locked door). Convergent payoffs multiply each other\'s impact; serial ones merely add.',
      });
    }
  }

  // ── Wave 317: PAYOFF_EMOTION_DECOUPLED, UNRESOLVED_CLUE_RATIO_HIGH, PAYOFF_CURIOSITY_MISMATCH ──

  // PAYOFF_EMOTION_DECOUPLED (minor, n≥8, ≥3 payoff scenes): All scenes
  // containing a payoff (payoffSetupIds.length > 0) have emotionalShift ===
  // 'neutral'. A payoff that lands in an emotionally flat scene converts the
  // plot resolution into pure information — the audience gets the answer but
  // not the feeling. Distinct from PAYOFF_SUSPENSE_MISMATCH (which checks
  // suspenseDelta); this audits the emotional register, a different signal.
  if (records.length >= 8) {
    const payoffScenes317e = (records as any[]).filter(r => ((r.payoffSetupIds ?? []) as string[]).length > 0);
    if (payoffScenes317e.length >= 3 && payoffScenes317e.every(r => r.emotionalShift === 'neutral')) {
      issues.push({
        location: 'Payoff scenes — emotional register',
        rule: 'PAYOFF_EMOTION_DECOUPLED',
        severity: 'minor',
        description: `All ${payoffScenes317e.length} payoff scenes are emotionally neutral — setups are resolved without an emotional response. A payoff scene is a promise redeemed; if the protagonist (and audience) feel nothing in the moment of resolution, the whole setup/payoff machine has produced information rather than experience.`,
        suggestedFix: 'Ensure each payoff lands in a scene with a genuine emotional shift: relief, grief, triumph, horror. The resolution should cost or reward something felt, not just something known. If a payoff scene is flat, the setup it closes never carried real stakes.',
      });
    }
  }

  // UNRESOLVED_CLUE_RATIO_HIGH (minor, ≥4 seeded clues, n≥8): The final
  // scene's unresolvedClues contains 40%+ of all planted clue IDs. The story
  // ends with a majority of its mystery architecture open — not a deliberate
  // single-thread mystery but unfinished structural work. Distinct from
  // OPEN_CLUES_AT_END (uses structure.openClues + actPosition === 'epilogue')
  // and ORPHAN_CLUE (per-clue, requires completionPercent ≥ 70): this uses
  // the raw records and fires at a systemic 40% threshold.
  if (clueInfo.size >= 4 && records.length >= 8) {
    const finalRec317 = (records as any[])[records.length - 1];
    const finalUnresolved317 = (finalRec317?.unresolvedClues ?? []) as string[];
    const allClueIds317 = new Set(clueInfo.keys());
    const openAtEnd317 = finalUnresolved317.filter((id: string) => allClueIds317.has(id)).length;
    if (openAtEnd317 / clueInfo.size >= 0.4) {
      issues.push({
        location: `Final scene — ${openAtEnd317} of ${clueInfo.size} clues unresolved`,
        rule: 'UNRESOLVED_CLUE_RATIO_HIGH',
        severity: 'minor',
        description: `${openAtEnd317} of ${clueInfo.size} planted clue IDs (${Math.round(openAtEnd317 / clueInfo.size * 100)}%) remain unresolved in the final scene — the story ends with most of its mystery architecture open. Unless this is a deliberate serial structure, these are obligations to the audience left unfulfilled. A well-completed story resolves its planted threads before the ending.`,
        suggestedFix: 'Audit each unresolved clue and either write its payoff scene or cut the setup if it no longer serves the story. If open threads are intentional (anthology, sequel setup), mark them as deliberate thematic questions rather than unanswered plot clues.',
      });
    }
  }

  // PAYOFF_CURIOSITY_MISMATCH (minor, n≥8, ≥3 payoff scenes): Scenes with
  // payoffs have average curiosityDelta ≤ 0. A payoff scene should sustain or
  // intensify curiosity — through partial revelation, a new question opened by
  // the answer, or dramatic irony revealed — not simply extinguish it. A payoff
  // that leaves the audience no more curious is a full stop where a pivot turn
  // should be. Distinct from PAYOFF_SUSPENSE_MISMATCH (suspenseDelta) and
  // PAYOFF_EMOTION_DECOUPLED (emotionalShift).
  if (records.length >= 8) {
    const payoffScenes317c = (records as any[]).filter(r => ((r.payoffSetupIds ?? []) as string[]).length > 0);
    if (payoffScenes317c.length >= 3) {
      const avgPayoffCuriosity317 = payoffScenes317c.reduce((acc: number, r: any) => acc + (r.curiosityDelta ?? 0), 0) / payoffScenes317c.length;
      if (avgPayoffCuriosity317 <= 0) {
        issues.push({
          location: 'Payoff scenes — curiosity register',
          rule: 'PAYOFF_CURIOSITY_MISMATCH',
          severity: 'minor',
          description: `${payoffScenes317c.length} payoff scenes average a curiosityDelta of ${avgPayoffCuriosity317.toFixed(2)} — resolutions arrive without reopening curiosity. A payoff that answers and closes without raising a new question or revealing a deeper layer kills the audience's forward hunger at exactly the moment it should pivot. The best payoffs land like a new setup.`,
          suggestedFix: 'Let each payoff open something: the answer to one question should raise another, or the resolution should make the audience wonder "what does this mean for X?" Every payoff is an opportunity to deepen the mystery even as it resolves the immediate thread.',
        });
      }
    }
  }

  // ── Wave 328: PAYOFF_RELATIONSHIP_DECOUPLED, CLUE_SEED_CURIOSITY_FLAT, CLUE_SEED_EMOTION_FLAT ──

  // PAYOFF_RELATIONSHIP_DECOUPLED (minor, n≥8, ≥3 payoff scenes): No scene
  // containing a payoff also carries a relationship shift. Payoffs resolve plot
  // threads but never move a bond — the setup/payoff machine runs in a lane
  // separate from the characters. The most resonant payoffs change a
  // relationship as they close a loop. Completes the payoff-channel trilogy with
  // PAYOFF_EMOTION_DECOUPLED (emotion) and PAYOFF_CURIOSITY_MISMATCH (curiosity).
  if (records.length >= 8) {
    const payoffScenes328 = (records as any[]).filter(r => ((r.payoffSetupIds ?? []) as string[]).length > 0);
    if (payoffScenes328.length >= 3) {
      const anyRelShift328 = payoffScenes328.some(r => ((r.relationshipShifts ?? []) as any[]).length > 0);
      if (!anyRelShift328) {
        issues.push({
          location: 'Payoff scenes — relational impact',
          rule: 'PAYOFF_RELATIONSHIP_DECOUPLED',
          severity: 'minor',
          description: `None of the ${payoffScenes328.length} payoff scenes also carries a relationship shift — resolutions close plot threads but never move a bond. The setup/payoff machine runs in a lane separate from the characters; the audience gets the answer to the plot question without feeling its effect on anyone. The most resonant payoffs change a relationship in the act of closing a loop.`,
          suggestedFix: 'Tie payoffs to relationships: let the resolution of a thread also shift trust, power, or intimacy between characters. The clue that exposes the traitor should also break the friendship; the secret that comes out should also heal or sever a bond. Plot resolution and relational change should arrive together.',
        });
      }
    }
  }

  // CLUE_SEED_CURIOSITY_FLAT (minor, n≥8, ≥3 seed scenes): Scenes that plant a
  // clue (seededClueIds.length > 0) have an average curiosityDelta ≤ 0. A clue
  // planted in a scene that raises no curiosity does not register as a question
  // — the audience needs to feel "what is that for?" at the moment of planting,
  // or the seed passes unnoticed and its later payoff lands without setup.
  // Distinct from the payoff-side curiosity check: this audits the seed side.
  if (records.length >= 8) {
    const seedScenes328 = (records as any[]).filter(r => ((r.seededClueIds ?? []) as string[]).length > 0);
    if (seedScenes328.length >= 3) {
      const avgSeedCur328 = seedScenes328.reduce((acc: number, r: any) => acc + (r.curiosityDelta ?? 0), 0) / seedScenes328.length;
      if (avgSeedCur328 <= 0) {
        issues.push({
          location: 'Clue-seeding scenes — curiosity register',
          rule: 'CLUE_SEED_CURIOSITY_FLAT',
          severity: 'minor',
          description: `${seedScenes328.length} clue-seeding scenes average a curiosityDelta of ${avgSeedCur328.toFixed(2)} — clues are planted in scenes that raise no curiosity. A seed only works if the audience registers it as a question ("what is that for?"); planted in a flat scene, the clue passes unnoticed, and its later payoff lands without the setup that should have charged it.`,
          suggestedFix: 'Plant clues so they prick curiosity: give the planted detail a beat of attention — a character notices it, a camera-worthy oddity, a line that half-explains and half-mystifies. The seed the audience wonders about is the seed they will remember when it pays off.',
        });
      }
    }
  }

  // CLUE_SEED_EMOTION_FLAT (minor, n≥8, ≥3 seed scenes): Every scene that plants
  // a clue is emotionally neutral. Clues attached to a charged moment lodge in
  // memory; clues dropped in affectless scenes are forgotten before they can pay
  // off. Distinct from SETUP_WITHOUT_CONSEQUENCE (repeated clues lacking any
  // downstream effect) and CLUE_SEED_CURIOSITY_FLAT (curiosity channel): this
  // audits the emotional charge of the planting scenes.
  if (records.length >= 8) {
    const seedScenes328e = (records as any[]).filter(r => ((r.seededClueIds ?? []) as string[]).length > 0);
    if (seedScenes328e.length >= 3 && seedScenes328e.every(r => r.emotionalShift === 'neutral')) {
      issues.push({
        location: 'Clue-seeding scenes — emotional register',
        rule: 'CLUE_SEED_EMOTION_FLAT',
        severity: 'minor',
        description: `All ${seedScenes328e.length} clue-seeding scenes are emotionally neutral — every clue is planted in an affectless scene. Memory is emotional: a clue attached to a charged moment lodges and resurfaces when it pays off, while a clue dropped in a flat scene is forgotten before it can matter. Neutral planting wastes the setup half of the setup/payoff contract.`,
        suggestedFix: 'Plant at least some clues inside emotionally charged scenes, where the audience is already leaning in: the keepsake mentioned during a goodbye, the detail glimpsed in a moment of fear. The feeling makes the fact stick, so the payoff later has something to land against.',
      });
    }
  }

  // ── Wave 342: CLUE_SEED_RELATIONSHIP_DECOUPLED, PAYOFF_DRAMATIC_TURN_DECOUPLED, SETUP_PAYOFF_DEAD_RUN ──

  // CLUE_SEED_RELATIONSHIP_DECOUPLED (minor, n≥8, ≥3 seed scenes): No scene that
  // plants a clue (seededClueIds.length > 0) also carries a relationship shift. Clues
  // are planted in a lane wholly separate from the characters' bonds — the setup
  // machinery never rides on a relational moment. Clues lodge best when planted during
  // a beat the audience is already invested in: the keepsake handed over as a friendship
  // forms, the lie told as trust frays. Completes the seed-side trilogy with
  // CLUE_SEED_CURIOSITY_FLAT (curiosity) and CLUE_SEED_EMOTION_FLAT (emotion); distinct
  // from PAYOFF_RELATIONSHIP_DECOUPLED, which audits the payoff side.
  if (records.length >= 8) {
    const seedScenes342 = (records as any[]).filter(r => ((r.seededClueIds ?? []) as string[]).length > 0);
    if (seedScenes342.length >= 3) {
      const anySeedRel342 = seedScenes342.some(r => ((r.relationshipShifts ?? []) as any[]).length > 0);
      if (!anySeedRel342) {
        issues.push({
          location: 'Clue-seeding scenes — relational impact',
          rule: 'CLUE_SEED_RELATIONSHIP_DECOUPLED',
          severity: 'minor',
          description: `None of the ${seedScenes342.length} clue-seeding scenes also carries a relationship shift — clues are planted in a lane wholly separate from the characters' bonds. The setup machinery never rides on a relational moment, so the seeds drop in scenes the audience has no emotional reason to remember. A clue lodges best when planted during a beat the audience is already invested in.`,
          suggestedFix: 'Plant some clues inside relational moments: the object passed between characters as trust forms, the detail glimpsed during an argument, the secret half-told as a bond strains. When the seed is bound to a relationship the audience cares about, the planting scene earns its place and the later payoff has something to land against.',
        });
      }
    }
  }

  // PAYOFF_DRAMATIC_TURN_DECOUPLED (minor, n≥8, ≥3 payoff scenes): No payoff scene
  // (payoffSetupIds non-empty) carries a dramatic turn (dramaticTurn !== 'nothing').
  // Resolutions close threads but never pivot the story — the setup/payoff machine
  // runs without ever producing a reversal, recognition, or twist at the moment a loop
  // closes. The most powerful payoffs ARE turns: the answer that flips the situation,
  // the revelation that recasts everything. Distinct from PAYOFF_REVELATION_DISCONNECT
  // (revelation field within a ±1 window) — this audits the dramaticTurn field on the
  // payoff scene itself — and from the emotion/curiosity/suspense/relationship payoff
  // channels.
  if (records.length >= 8) {
    const payoffScenes342 = (records as any[]).filter(r => ((r.payoffSetupIds ?? []) as string[]).length > 0);
    if (payoffScenes342.length >= 3) {
      const anyTurn342 = payoffScenes342.some(r => (r.dramaticTurn ?? 'nothing') !== 'nothing');
      if (!anyTurn342) {
        issues.push({
          location: 'Payoff scenes — dramatic pivot',
          rule: 'PAYOFF_DRAMATIC_TURN_DECOUPLED',
          severity: 'minor',
          description: `None of the ${payoffScenes342.length} payoff scenes carries a dramatic turn — resolutions close threads but never pivot the story. The setup/payoff machine runs without ever producing a reversal, recognition, or twist at the moment a loop closes, so each payoff lands as a tidy completion rather than a hinge. The most powerful payoffs are turns: the answer that flips the situation, the revelation that recasts everything that came before.`,
          suggestedFix: 'Let at least one major payoff also turn the story: design the resolution of a thread so that the answer reverses the protagonist\'s situation, exposes a deception, or reframes the goal. A payoff that doubles as a pivot pays off the planting and propels the next act in the same beat.',
        });
      }
    }
  }

  // SETUP_PAYOFF_DEAD_RUN (minor, n≥10): Six or more consecutive scenes carry no
  // seeded clue and no payoff, in a story that otherwise uses the setup/payoff machine
  // (≥3 continuity-active scenes overall). For a long stretch the plot's connective
  // tissue vanishes: nothing is planted and nothing is harvested, so the audience's
  // sense of an interlocking design goes quiet. Distinct from the zone-specific voids
  // (ACT2A_PAYOFF_VOID — payoff-only, act-bounded) and THREAD_CONVERGENCE_ABSENT
  // (isolation of payoffs): this flags a contiguous run with no continuity activity of
  // either kind.
  if (records.length >= 10) {
    const isContinuityActive342 = (r: any): boolean =>
      ((r.seededClueIds ?? []) as string[]).length > 0 || ((r.payoffSetupIds ?? []) as string[]).length > 0;
    const totalActive342 = (records as any[]).filter(isContinuityActive342).length;
    if (totalActive342 >= 3) {
      let deadRun342 = 0;
      let deadStart342 = 0;
      let maxDead342 = 0;
      let maxStart342 = 0;
      for (let i342 = 0; i342 < records.length; i342++) {
        if (!isContinuityActive342((records as any[])[i342])) {
          if (deadRun342 === 0) deadStart342 = i342;
          deadRun342++;
          if (deadRun342 > maxDead342) { maxDead342 = deadRun342; maxStart342 = deadStart342; }
        } else {
          deadRun342 = 0;
        }
      }
      if (maxDead342 >= 6) {
        const s342 = (records as any[])[maxStart342].sceneIdx;
        const e342 = (records as any[])[maxStart342 + maxDead342 - 1].sceneIdx;
        issues.push({
          location: `Scenes ${s342}–${e342} — no setup or payoff`,
          rule: 'SETUP_PAYOFF_DEAD_RUN',
          severity: 'minor',
          description: `${maxDead342} consecutive scenes (${s342}–${e342}) plant no clue and resolve no thread, in a story that otherwise uses the setup/payoff machine. For this whole stretch the plot's connective tissue vanishes — nothing is seeded and nothing harvested — so the audience's sense of an interlocking design goes quiet and the middle of the story drifts free of the structure built around it.`,
          suggestedFix: 'Thread continuity through the dead run: plant a small clue, pay off an earlier one, or fold a long fuse partway toward its resolution. The setup/payoff weave is what makes a story feel designed rather than episodic; a long stretch with neither leaves the audience watching events instead of a plot.',
        });
      }
    }
  }

  // ── Wave 356: CLUE_SEED_DRAMATIC_TURN_DECOUPLED, PAYOFF_CLOCK_DECOUPLED, LATE_CLUE_PLANT ──

  // CLUE_SEED_DRAMATIC_TURN_DECOUPLED (minor, n≥8, ≥3 seed scenes): No scene that plants
  // a clue (seededClueIds non-empty) also carries a dramatic turn. Clues are always
  // planted in still water, never in the churn of a pivot — so the seeds drop in moments
  // the audience has the least reason to attend to. A clue glimpsed during a reversal or
  // recognition rides the scene's charge into memory. Completes the seed-side channel set
  // with CLUE_SEED_CURIOSITY_FLAT, CLUE_SEED_EMOTION_FLAT, and CLUE_SEED_RELATIONSHIP_
  // DECOUPLED; distinct from PAYOFF_DRAMATIC_TURN_DECOUPLED (the payoff side).
  if (records.length >= 8) {
    const seedScenes356 = (records as any[]).filter(r => ((r.seededClueIds ?? []) as string[]).length > 0);
    if (seedScenes356.length >= 3 && !seedScenes356.some(r => (r.dramaticTurn ?? 'nothing') !== 'nothing')) {
      issues.push({
        location: 'Clue-seeding scenes — dramatic pivot',
        rule: 'CLUE_SEED_DRAMATIC_TURN_DECOUPLED',
        severity: 'minor',
        description: `None of the ${seedScenes356.length} clue-seeding scenes also carries a dramatic turn — clues are always planted in still water, never in the churn of a pivot. The seeds drop in moments the audience has the least reason to attend to, so they pass unregistered and their later payoffs land without the setup having truly taken hold. A clue glimpsed during a reversal rides the scene's charge into memory.`,
        suggestedFix: 'Plant at least some clues inside turning-point scenes: a detail noticed in the chaos of a reversal, an object that changes meaning the moment a recognition lands. The audience\'s attention is highest at a pivot — a seed dropped there is a seed they will remember when it pays off.',
      });
    }
  }

  // PAYOFF_CLOCK_DECOUPLED (minor, n≥8, ≥3 payoff scenes, ≥2 clock scenes): The story
  // raises clocks (clockRaised) and resolves planted threads (payoffSetupIds), but no
  // payoff ever lands in a clock scene — resolutions never arrive under time pressure.
  // A payoff that resolves against a ticking clock carries doubled tension: the audience
  // feels both the satisfaction of the answer and the danger of the deadline. When the
  // two systems never coincide, payoffs land in calm water and forfeit that charge.
  // Distinct from CLOCK_WITHOUT_CONFRONTATION / CONFLICT_CLOCK_DECOUPLED (conflict pass)
  // and PAYOFF_SUSPENSE_MISMATCH (suspenseDelta on payoff scenes, not clock co-occurrence).
  if (records.length >= 8) {
    const payoffScenes356 = (records as any[]).filter(r => ((r.payoffSetupIds ?? []) as string[]).length > 0);
    const clockScenes356 = (records as any[]).filter(r => r.clockRaised === true);
    if (payoffScenes356.length >= 3 && clockScenes356.length >= 2 && !payoffScenes356.some(r => r.clockRaised === true)) {
      issues.push({
        location: 'Payoff scenes — time pressure',
        rule: 'PAYOFF_CLOCK_DECOUPLED',
        severity: 'minor',
        description: `The story raises ${clockScenes356.length} clocks and lands ${payoffScenes356.length} payoffs, but no payoff arrives in a clock scene — resolutions never land under time pressure. A payoff that resolves against a ticking clock carries doubled tension: the satisfaction of the answer and the danger of the deadline at once. When the deadline machine and the payoff machine never meet, the resolutions land in calm water and forfeit that charge.`,
        suggestedFix: 'Stage at least one major payoff under a live clock: let the thread resolve at the moment the deadline bites, so the answer and the urgency hit together. The convergence of "we finally know" and "we are almost out of time" is one of the most powerful beats available — use it at least once.',
      });
    }
  }

  // LATE_CLUE_PLANT (minor, n≥10, ≥1 late seed): A clue is seeded in the final 15% of
  // the story, leaving no room to set it up properly before it would need to pay off. A
  // seed planted this late either dangles unresolved or pays off almost immediately,
  // robbing it of the delay that makes a payoff satisfying. Distinct from CLUE_SEED_LATE_
  // MAJORITY (>60% of clues in the whole second half — a proportion) and ORPHAN_CLUE /
  // DANGLING_PAYOFF (resolution-state checks): this flags the specific timing error of
  // planting in the closing stretch.
  if (records.length >= 10) {
    const lateStart356 = Math.floor(records.length * 0.85);
    const lateSeedScenes356 = (records as any[]).filter((r, i) => i >= lateStart356 && ((r.seededClueIds ?? []) as string[]).length > 0);
    if (lateSeedScenes356.length >= 1) {
      issues.push({
        location: `Final 15% (Scenes ${lateStart356}–${records.length - 1}) — late clue plant`,
        rule: 'LATE_CLUE_PLANT',
        severity: 'minor',
        description: `${lateSeedScenes356.length} clue-seeding scene(s) fall in the final 15% of the story (Scenes ${lateStart356}–${records.length - 1}) — a clue planted this late has no room to be set up before it would need to pay off. Such a seed either dangles unresolved or pays off almost immediately, robbing it of the delay between planting and harvest that makes a payoff satisfying.`,
        suggestedFix: 'Move late clue plants earlier so they have room to breathe before their payoff, or cut them if they are not paid off at all. The pleasure of a payoff is proportional to how long the seed has been quietly waiting; a clue introduced in the closing stretch cannot earn that.',
      });
    }
  }

  // ── Wave 370: PAYOFF_CURIOSITY_PEAK_DECOUPLED, PAYOFF_ACT3_ABSENT, CLUE_SEED_MIDPOINT_VOID ──

  // PAYOFF_CURIOSITY_PEAK_DECOUPLED (minor, n≥8, maxCuriosity>1, ≥2 payoff scenes):
  // The single highest-curiosityDelta scene carries no payoff, even though the story
  // resolves planted threads elsewhere. The moment the audience is most urgently
  // wondering is not where any thread snaps shut — peak intrigue and the satisfaction of
  // resolution never coincide. A payoff landing at the curiosity peak doubles its force:
  // the answer arrives exactly when the audience most wants it. Distinct from PAYOFF_
  // CURIOSITY_MISMATCH (which averages curiosityDelta across payoff scenes — this isolates
  // the single peak-curiosity scene and checks whether a payoff lands there).
  if (records.length >= 8) {
    const payoffScenes370 = (records as any[]).filter(r => ((r.payoffSetupIds ?? []) as string[]).length > 0);
    const maxCur370 = Math.max(...(records as any[]).map(r => r.curiosityDelta ?? 0));
    if (payoffScenes370.length >= 2 && maxCur370 > 1) {
      const peakCur370 = (records as any[]).find(r => (r.curiosityDelta ?? 0) === maxCur370);
      if (peakCur370 && ((peakCur370.payoffSetupIds ?? []) as string[]).length === 0) {
        issues.push({
          location: `Scene ${peakCur370.sceneIdx} — peak curiosity (${maxCur370.toFixed(2)})`,
          rule: 'PAYOFF_CURIOSITY_PEAK_DECOUPLED',
          severity: 'minor',
          description: `The story's highest-curiosityDelta scene (Scene ${peakCur370.sceneIdx}, curiosityDelta ${maxCur370.toFixed(2)}) carries no payoff, even though ${payoffScenes370.length} other scenes resolve planted threads. The moment the audience is most urgently wondering is not where anything snaps shut — peak intrigue and the satisfaction of resolution never meet, so the most charged delivery slot for a payoff is left empty.`,
          suggestedFix: 'Land a payoff at the peak-curiosity scene: when the audience is most desperate to know, that is the moment to resolve a planted thread — or to pay one off in a way that opens the next question. A payoff that arrives at the crest of curiosity hits with doubled force.',
        });
      }
    }
  }

  // PAYOFF_ACT3_ABSENT (minor, n≥10, ≥3 payoffs in Acts 1–2): No payoff lands in Act 3
  // (the final 25% of scenes), even though three or more planted threads resolve earlier.
  // Every loop the story closes is closed before the finale, so the climax and resolution
  // arrive with no payoff left to deliver — the ending has nothing to pay off because the
  // accounting was all settled in advance. Distinct from PAYOFF_BEFORE_CLIMAX (which
  // requires EVERY clue resolved before the final 20% and gates on act position) and
  // PAYOFF_FRONT_LOADED (>60% of payoffs in the first half): this fires on the binary
  // absence of any payoff in the final quarter while payoffs exist earlier.
  if (records.length >= 10) {
    const act3Start370 = Math.floor(records.length * 0.75);
    const earlyPayoffs370 = (records as any[]).filter((r, i) => i < act3Start370 && ((r.payoffSetupIds ?? []) as string[]).length > 0);
    const act3Payoffs370 = (records as any[]).filter((r, i) => i >= act3Start370 && ((r.payoffSetupIds ?? []) as string[]).length > 0);
    if (earlyPayoffs370.length >= 3 && act3Payoffs370.length === 0) {
      issues.push({
        location: `Act 3 (Scenes ${act3Start370}–${records.length - 1}) — no payoffs`,
        rule: 'PAYOFF_ACT3_ABSENT',
        severity: 'minor',
        description: `${earlyPayoffs370.length} payoffs land in Acts 1–2 but none in Act 3 (Scenes ${act3Start370}–${records.length - 1}) — every loop the story closes is closed before the finale. The climax and resolution arrive with no thread left to pay off, so the ending settles nothing the audience has been waiting for; the satisfaction of resolution is spent before the moment it should peak.`,
        suggestedFix: 'Reserve at least one significant payoff for Act 3: hold a planted thread closed until the climax or resolution so the ending delivers the click of completion at the story\'s peak. A finale with no payoffs left is a finale the audience has no structural reason to anticipate.',
      });
    }
  }

  // CLUE_SEED_MIDPOINT_VOID (minor, n≥10, ≥3 seed scenes): No clue is planted in the
  // midpoint zone (40%–60%), even though clues are seeded both before it and after it.
  // The setup engine goes quiet at the exact structural pivot — the moment a strong
  // midpoint should be planting the seeds that reframe the second half. Distinct from
  // SETUP_DESERT_ACT2B (the 50%–75% zone), SETUP_FRONT_GAP (the first 25%), and CLUE_
  // DROUGHT (a max-gap measure anywhere): this isolates the central 40%–60% window and
  // requires seeds on both sides, catching a setup gap that straddles the pivot.
  if (records.length >= 10) {
    const midStart370 = Math.floor(records.length * 0.4);
    const midEnd370 = Math.floor(records.length * 0.6);
    const seedScenes370 = (records as any[])
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => ((r.seededClueIds ?? []) as string[]).length > 0);
    if (seedScenes370.length >= 3) {
      const inMid370 = seedScenes370.some(({ i }) => i >= midStart370 && i < midEnd370);
      const beforeMid370 = seedScenes370.some(({ i }) => i < midStart370);
      const afterMid370 = seedScenes370.some(({ i }) => i >= midEnd370);
      if (!inMid370 && beforeMid370 && afterMid370) {
        issues.push({
          location: `Midpoint zone (Scenes ${midStart370}–${midEnd370 - 1}) — no clue seeded`,
          rule: 'CLUE_SEED_MIDPOINT_VOID',
          severity: 'minor',
          description: `No clue is planted in the midpoint zone (Scenes ${midStart370}–${midEnd370 - 1}), though clues are seeded both before and after it — the setup engine goes silent at the exact structural pivot. The midpoint is where a strong story plants the seeds that reframe the second half; a setup void there means the pivot reorganizes the plot without planting anything the back half can harvest.`,
          suggestedFix: 'Plant a clue at the midpoint: let the pivot that reframes the story also seed the detail its second half will pay off. The midpoint reversal is most powerful when it both turns the plot and quietly lays the groundwork for what the turn makes possible.',
        });
      }
    }
  }

  // ── Wave 384: PAYOFF_SUSPENSE_PEAK_DECOUPLED, CLUE_SEED_CLOCK_DECOUPLED, CLUE_SEED_FRONT_LOADED ──

  // PAYOFF_SUSPENSE_PEAK_DECOUPLED (minor, n≥8, maxSuspense>1, ≥2 payoff scenes): The
  // single highest-suspenseDelta scene carries no payoff, even though the story resolves
  // planted threads elsewhere. The peak-tension moment — when the audience is most gripped —
  // is not where any thread snaps shut, so the most charged delivery slot for a payoff goes
  // unused. The suspense mirror of PAYOFF_CURIOSITY_PEAK_DECOUPLED; distinct from PAYOFF_
  // SUSPENSE_MISMATCH (which averages suspenseDelta across payoff scenes — this isolates the
  // single peak-suspense scene).
  if (records.length >= 8) {
    const payoffScenes384 = (records as any[]).filter(r => ((r.payoffSetupIds ?? []) as string[]).length > 0);
    const maxSusp384 = Math.max(...(records as any[]).map(r => r.suspenseDelta ?? 0));
    if (payoffScenes384.length >= 2 && maxSusp384 > 1) {
      const peakSusp384 = (records as any[]).find(r => (r.suspenseDelta ?? 0) === maxSusp384);
      if (peakSusp384 && ((peakSusp384.payoffSetupIds ?? []) as string[]).length === 0) {
        issues.push({
          location: `Scene ${peakSusp384.sceneIdx} — peak suspense (${maxSusp384.toFixed(2)})`,
          rule: 'PAYOFF_SUSPENSE_PEAK_DECOUPLED',
          severity: 'minor',
          description: `The story's highest-suspenseDelta scene (Scene ${peakSusp384.sceneIdx}, suspenseDelta ${maxSusp384.toFixed(2)}) carries no payoff, even though ${payoffScenes384.length} other scenes resolve planted threads. The moment the audience is most gripped is not where anything snaps shut — peak tension and the satisfaction of resolution never meet, so the most charged delivery slot for a payoff is left empty.`,
          suggestedFix: 'Land a payoff at the peak-tension scene: resolving a long-planted thread at the moment of maximum suspense doubles its force — the audience gets the answer and the danger at once. The scene that grips hardest is the most powerful place to pay something off.',
        });
      }
    }
  }

  // CLUE_SEED_CLOCK_DECOUPLED (minor, n≥8, ≥3 seed scenes, ≥2 clock scenes): No scene
  // that plants a clue also raises a clock, even though the story has both. Clues are never
  // planted under time pressure, so the seed and the urgency engine never coincide — a clue
  // glimpsed in the scramble of a deadline rides the scene's tension into memory, but here
  // every seed drops in calm water. The seed-side sibling of PAYOFF_CLOCK_DECOUPLED (which
  // audits payoffs against clocks); distinct from CLUE_SEED_SUSPENSE_VOID (causality.ts, the
  // suspenseDelta channel) — this targets the clockRaised field's co-occurrence.
  if (records.length >= 8) {
    const seedScenes384 = (records as any[]).filter(r => ((r.seededClueIds ?? []) as string[]).length > 0);
    const clockScenes384 = (records as any[]).filter(r => r.clockRaised === true);
    if (seedScenes384.length >= 3 && clockScenes384.length >= 2 && !seedScenes384.some(r => r.clockRaised === true)) {
      issues.push({
        location: 'Clue-seeding scenes × clock scenes — decoupled',
        rule: 'CLUE_SEED_CLOCK_DECOUPLED',
        severity: 'minor',
        description: `The story plants clues in ${seedScenes384.length} scenes and raises clocks in ${clockScenes384.length}, but no clue is seeded in a clock scene — foreshadowing never happens under time pressure. The seed engine and the urgency engine never coincide, so the story forfeits the charge of a clue glimpsed in the scramble of a deadline, where the scene's tension would burn it into the audience's memory.`,
        suggestedFix: 'Plant at least one clue inside a clock-raising scene: a detail noticed in the rush before a deadline rides the urgency into memory and pays off harder later. The intersection of "remember this" and "we are almost out of time" makes a seed both more vivid and more ominous.',
      });
    }
  }

  // CLUE_SEED_FRONT_LOADED (minor, n≥10, clues≥4): More than 60% of planted clues are
  // seeded in the first half of the story. The setup engine front-loads its work, so the
  // back half introduces few new threads and the midpoint-onward stretch coasts on early
  // plants. The mirror of CLUE_SEED_LATE_MAJORITY (>60% in the second half); distinct from
  // CLUE_DENSITY_FRONT_COLLAPSE (ALL clues in the first 20% — a stricter, narrower window)
  // and SETUP_FRONT_GAP (no clues in the first 25%).
  if (records.length >= 10 && clueInfo.size >= 4) {
    const midpoint384 = Math.floor(records.length * 0.5);
    const earlyClues384 = [...clueInfo.values()].filter(c => c.plantedAt < midpoint384).length;
    if (earlyClues384 / clueInfo.size > 0.6) {
      issues.push({
        location: 'Setup distribution',
        rule: 'CLUE_SEED_FRONT_LOADED',
        severity: 'minor',
        description: `${earlyClues384} of ${clueInfo.size} planted clues (${Math.round(earlyClues384 / clueInfo.size * 100)}%) are seeded in the first half of the story — the setup engine front-loads its work. The back half introduces few new threads, so the midpoint-onward stretch coasts on early plants and the audience stops actively processing new setups precisely when the story should be deepening.`,
        suggestedFix: 'Move some clue plants into the second half: a new thread seeded at the midpoint or in Act 2b keeps the audience processing fresh setups and gives the climax something recently planted to pay off. A setup engine that goes quiet after the midpoint leaves the back half with nothing new to anticipate.',
      });
    }
  }

  // ── Wave 398: CLUE_SEED_SUSPENSE_FLAT, PAYOFF_MIDPOINT_VOID, CLUE_SEED_REVELATION_DECOUPLED ──

  // CLUE_SEED_SUSPENSE_FLAT (minor, n≥8, ≥3 seed scenes, overall suspense present):
  // All clue-seeding scenes have suspenseDelta ≤ 0 — the story plants its evidence only
  // in moments that generate no dramatic tension. A seed dropped into a low-stakes moment
  // risks reading as mundane set dressing; planted under pressure, the same detail reads
  // as charged and memorable. Average mode × suspense channel × seed subset. Distinct from
  // CLUE_SEED_CURIOSITY_FLAT (curiosityDelta channel), CLUE_SEED_EMOTION_FLAT (emotional-
  // shift channel), and CLUE_SEED_RELATIONSHIP_DECOUPLED (relationship channel): this
  // audits the suspense signal for the seed-scene subset.
  if (records.length >= 8) {
    const seedRecs398a = (records as any[]).filter(r => ((r.seededClueIds ?? []) as any[]).length > 0);
    if (seedRecs398a.length >= 3) {
      const anyOverallSuspense398a = (records as any[]).some(r => (r.suspenseDelta ?? 0) > 0);
      if (anyOverallSuspense398a) {
        const allSeedsSuspFlat398a = seedRecs398a.every(r => (r.suspenseDelta ?? 0) <= 0);
        if (allSeedsSuspFlat398a) {
          issues.push({
            location: 'Clue-seeding scenes — suspense decoupled',
            rule: 'CLUE_SEED_SUSPENSE_FLAT',
            severity: 'minor',
            description: `All ${seedRecs398a.length} clue-seeding scenes have suspenseDelta ≤ 0 — the story plants its evidence in moments that generate no dramatic tension. A seed dropped into a low-stakes moment risks reading as mundane set dressing; planted under pressure, the same detail reads as charged and memorable. The suspense engine and the foreshadowing engine never share a scene.`,
            suggestedFix: 'Plant at least one key clue inside a tense scene: a discovery made under threat, a clue glimpsed while something else is going wrong, or a detail revealed by a character under pressure. Suspense makes a planted seed feel dangerous and therefore worth remembering.',
          });
        }
      }
    }
  }

  // PAYOFF_MIDPOINT_VOID (minor, n≥8, ≥3 total payoffs, payoffs on both sides of zone):
  // No payoff lands in the 40%–60% pivot zone while payoffs exist both before and after it.
  // The structural midpoint is where momentum pivots; closing a loop here acknowledges the
  // turn and signals escalation for the back half. A payoff-free midzone leaves the pivot
  // narratively neutral — the story turns structurally but settles nothing. Zone presence/
  // absence mode × payoff channel × midpoint position. Distinct from PAYOFF_ACT2A_VOID
  // (25%–50% zone — broader and offset), MIDSTORY_PAYOFF_VOID (entire 25%–75% mid-half),
  // and CLUE_SEED_MIDPOINT_VOID (same zone × seed channel rather than payoff channel).
  if (records.length >= 8) {
    const payoffScenes398b = (records as any[]).filter(r => ((r.payoffSetupIds ?? []) as any[]).length > 0);
    if (payoffScenes398b.length >= 3) {
      const mid40398b = Math.floor(records.length * 0.4);
      const mid60398b = Math.ceil(records.length * 0.6);
      const midPayoffs398b = (records as any[]).slice(mid40398b, mid60398b)
        .filter(r => ((r.payoffSetupIds ?? []) as any[]).length > 0).length;
      const earlyPayoffs398b = (records as any[]).slice(0, mid40398b)
        .filter(r => ((r.payoffSetupIds ?? []) as any[]).length > 0).length;
      const latePayoffs398b = (records as any[]).slice(mid60398b)
        .filter(r => ((r.payoffSetupIds ?? []) as any[]).length > 0).length;
      if (midPayoffs398b === 0 && earlyPayoffs398b > 0 && latePayoffs398b > 0) {
        issues.push({
          location: `Payoff distribution — midpoint zone void (scenes ${mid40398b}–${mid60398b - 1})`,
          rule: 'PAYOFF_MIDPOINT_VOID',
          severity: 'minor',
          description: `No payoff lands in the 40%–60% pivot zone (scenes ${mid40398b}–${mid60398b - 1}), though payoffs exist in the first half (${earlyPayoffs398b}) and the second half (${latePayoffs398b}). The structural midpoint is where momentum pivots; closing a loop here acknowledges the turn and signals escalation ahead. A payoff-free midzone leaves the pivot narratively neutral — the story turns structurally but settles nothing in the moment.`,
          suggestedFix: 'Schedule one payoff inside the midpoint zone: a clue resolved at the pivot point gives the audience a sense of completion that resets expectations for the escalating back half. It also distinguishes Act 2a from Act 2b — one half builds, the midpoint closes, the other half escalates.',
        });
      }
    }
  }

  // CLUE_SEED_REVELATION_DECOUPLED (minor, n≥8, ≥2 seed scenes, ≥2 revelation scenes):
  // No clue-seeding scene coincides with a revelation — the story plants evidence and
  // makes disclosures in entirely separate moments. A scene where a clue is planted
  // alongside a revelation charges both: the disclosure makes the seed feel significant,
  // and the seed recontextualizes what was just revealed. Co-occurrence mode ×
  // seededClueIds × revelation channels. Distinct from CLUE_SEED_DRAMATIC_TURN_DECOUPLED
  // (dramaticTurn signal), CLUE_SEED_CLOCK_DECOUPLED (clock signal), and PAYOFF_
  // REVELATION_DISCONNECT (payoff side of revelation — this audits the seed side).
  if (records.length >= 8) {
    const seedRecs398c = (records as any[]).filter(r => ((r.seededClueIds ?? []) as any[]).length > 0);
    const revelRecs398c = (records as any[]).filter(r => r.revelation === true);
    if (seedRecs398c.length >= 2 && revelRecs398c.length >= 2) {
      const anySeedWithRevel398c = seedRecs398c.some(r => r.revelation === true);
      if (!anySeedWithRevel398c) {
        issues.push({
          location: 'Clue-seeding scenes — revelation decoupled',
          rule: 'CLUE_SEED_REVELATION_DECOUPLED',
          severity: 'minor',
          description: `The story has ${seedRecs398c.length} clue-seeding scene(s) and ${revelRecs398c.length} revelation scene(s), but none coincide — evidence is planted and disclosures are made in entirely separate moments. A clue planted alongside a revelation charges both: the disclosure makes the seed feel significant, and the seed recontextualizes what was just revealed. Keeping the two channels in separate scenes misses the compound effect of a scene that does both.`,
          suggestedFix: 'In at least one revelation scene, plant a clue within or immediately after the disclosure: as one secret is revealed, let it expose or imply another. A revelation that generates a new mystery — rather than simply closing one — keeps the audience actively processing rather than passively receiving.',
        });
      }
    }
  }

  // ── Wave 412: CLUE_SEED_CURIOSITY_PEAK_DECOUPLED, CLUE_SEED_SUSPENSE_PEAK_DECOUPLED, PAYOFF_RELATIONSHIP_PEAK_DECOUPLED ──

  // CLUE_SEED_CURIOSITY_PEAK_DECOUPLED (minor, n≥8, maxCuriosity>1, ≥2 seed scenes): The single
  // highest-curiosityDelta scene plants no clue, even though the story seeds clues elsewhere. The
  // moment the audience is most urgently wondering is not where the story plants anything to
  // wonder about later — peak intrigue and the act of foreshadowing never coincide. A clue
  // planted at the curiosity peak rides the audience's heightened attention, so the seed lands
  // when they are most likely to register and remember it. The seed-side mirror of PAYOFF_
  // CURIOSITY_PEAK_DECOUPLED; distinct from CLUE_SEED_CURIOSITY_FLAT (which averages curiosityDelta
  // across seed scenes — this isolates the single peak-curiosity scene and checks for a seed there).
  if (records.length >= 8) {
    const seedScenes412a = (records as any[]).filter(r => ((r.seededClueIds ?? []) as string[]).length > 0);
    const maxCur412a = Math.max(...(records as any[]).map(r => r.curiosityDelta ?? 0));
    if (seedScenes412a.length >= 2 && maxCur412a > 1) {
      const peakCur412a = (records as any[]).find(r => (r.curiosityDelta ?? 0) === maxCur412a);
      if (peakCur412a && ((peakCur412a.seededClueIds ?? []) as string[]).length === 0) {
        issues.push({
          location: `Scene ${peakCur412a.sceneIdx} — peak curiosity (${maxCur412a.toFixed(2)})`,
          rule: 'CLUE_SEED_CURIOSITY_PEAK_DECOUPLED',
          severity: 'minor',
          description: `The story's highest-curiosityDelta scene (Scene ${peakCur412a.sceneIdx}, curiosityDelta ${maxCur412a.toFixed(2)}) plants no clue, even though ${seedScenes412a.length} other scenes seed threads. The moment the audience is most urgently wondering is not where the story plants anything for them to wonder about later — peak intrigue and foreshadowing never coincide, so the seed that would benefit most from the audience's heightened attention is never dropped there.`,
          suggestedFix: 'Plant a clue at the peak-curiosity scene: when the audience is most alert and leaning in, slip in the detail you want them to carry. A seed dropped at the crest of curiosity is the one most likely to lodge — they are already scrutinizing the scene for answers, so the planted thread registers without being underlined.',
        });
      }
    }
  }

  // CLUE_SEED_SUSPENSE_PEAK_DECOUPLED (minor, n≥8, maxSuspense>1, ≥2 seed scenes): The single
  // highest-suspenseDelta scene plants no clue, even though the story seeds clues elsewhere. The
  // tensest moment in the story is not where any thread is planted — peak danger and foreshadowing
  // never share a scene. A clue planted under maximum tension reads as charged and dangerous, so
  // the audience remembers it as something that mattered in a moment that mattered. The seed-side
  // mirror of PAYOFF_SUSPENSE_PEAK_DECOUPLED; distinct from CLUE_SEED_SUSPENSE_FLAT (which audits
  // whether ALL seed scenes are tension-free on average — this isolates the single peak-suspense
  // scene and checks whether a seed lands there).
  if (records.length >= 8) {
    const seedScenes412b = (records as any[]).filter(r => ((r.seededClueIds ?? []) as string[]).length > 0);
    const maxSusp412b = Math.max(...(records as any[]).map(r => r.suspenseDelta ?? 0));
    if (seedScenes412b.length >= 2 && maxSusp412b > 1) {
      const peakSusp412b = (records as any[]).find(r => (r.suspenseDelta ?? 0) === maxSusp412b);
      if (peakSusp412b && ((peakSusp412b.seededClueIds ?? []) as string[]).length === 0) {
        issues.push({
          location: `Scene ${peakSusp412b.sceneIdx} — peak suspense (${maxSusp412b.toFixed(2)})`,
          rule: 'CLUE_SEED_SUSPENSE_PEAK_DECOUPLED',
          severity: 'minor',
          description: `The story's highest-suspenseDelta scene (Scene ${peakSusp412b.sceneIdx}, suspenseDelta ${maxSusp412b.toFixed(2)}) plants no clue, even though ${seedScenes412b.length} other scenes seed threads. The tensest moment in the story is not where any thread is planted — peak danger and foreshadowing never share a scene, so the seed that would feel most charged is never dropped where the pressure could brand it into the audience's memory.`,
          suggestedFix: 'Plant a clue at the peak-suspense scene: a detail glimpsed under threat, an object that matters seen in the middle of the danger. Tension makes a seed feel dangerous and therefore worth remembering — the audience encodes what they see in the scenes that frighten them most, so the highest-suspense beat is the most retentive place to foreshadow.',
        });
      }
    }
  }

  // PAYOFF_RELATIONSHIP_PEAK_DECOUPLED (minor, n≥8, ≥2 payoff scenes, peak relational shift > 0.4):
  // The scene carrying the story's single largest relational shift (the biggest rupture or repair)
  // resolves no planted setup, even though the story pays off threads elsewhere. The most
  // consequential relational moment and the satisfaction of a structural payoff never coincide:
  // the audience's biggest emotional-relational beat is not also the moment a long-running thread
  // snaps shut. A payoff that lands at the peak relational shift makes the structural and the
  // human climax the same beat. Single-peak isolation × relationship magnitude × payoff channel.
  // Distinct from PAYOFF_RELATIONSHIP_DECOUPLED (co-occurrence: NO payoff scene moves ANY bond —
  // this fires even when some payoffs move bonds, as long as the single biggest shift is not a
  // payoff) and from the curiosity/suspense peak-decoupled checks (different signal channels).
  if (records.length >= 8) {
    const payoffScenes412c = (records as any[]).filter(r => ((r.payoffSetupIds ?? []) as string[]).length > 0);
    if (payoffScenes412c.length >= 2) {
      let peakRelRec412c: any = null;
      let peakRelMag412c = 0;
      for (const r of records as any[]) {
        for (const s of (r.relationshipShifts ?? []) as Array<{ amount: number }>) {
          if (Math.abs(s.amount) > peakRelMag412c) {
            peakRelMag412c = Math.abs(s.amount);
            peakRelRec412c = r;
          }
        }
      }
      if (peakRelRec412c && peakRelMag412c > 0.4 && ((peakRelRec412c.payoffSetupIds ?? []) as string[]).length === 0) {
        issues.push({
          location: `Scene ${peakRelRec412c.sceneIdx} — peak relational shift (magnitude ${peakRelMag412c.toFixed(2)})`,
          rule: 'PAYOFF_RELATIONSHIP_PEAK_DECOUPLED',
          severity: 'minor',
          description: `The story's largest relational shift (magnitude ${peakRelMag412c.toFixed(2)} at Scene ${peakRelRec412c.sceneIdx}) carries no payoff, even though ${payoffScenes412c.length} other scenes resolve planted threads. The most consequential relational moment — the biggest rupture or repair in the story — is not also the moment a long-running thread snaps shut, so the human climax and the structural climax land in separate scenes and neither amplifies the other.`,
          suggestedFix: 'Land a payoff at the peak relational shift: arrange for the scene where a bond most decisively breaks or mends to also be the scene where a planted setup pays off. When the relational and structural climaxes coincide, the resolution of the plot thread and the resolution of the relationship reinforce each other — the audience feels both completions in a single beat.',
        });
      }
    }
  }

  // ── Wave 426: PAYOFF_AFTERMATH_QUESTION_VOID, PAYOFF_CONSECUTIVE_RUN, PAYOFF_RELATIONSHIP_VALENCE_UNIFORM ──

  // PAYOFF_AFTERMATH_QUESTION_VOID (sequence/aftermath, n≥10, ≥2 qualifying payoff scenes): Every
  // payoff scene that has at least two scenes after it is followed by two scenes that BOTH raise no
  // curiosity (curiosityDelta ≤ 0) AND plant no new clue (seededClueIds empty). A payoff closes a
  // loop, and the moment a question is answered the audience's forward pull momentarily slackens —
  // the story must immediately re-engage, opening a fresh question or planting a new thread in the
  // wake of the resolution. When every payoff is followed by a curiosity-flat, seed-empty stretch,
  // the story deflates a little with each closure and never rebuilds the pull it just spent.
  // Distinctness: this is the only sequence/aftermath check on the payoff channel. PAYOFF_CURIOSITY_
  // MISMATCH audits curiosity WITHIN payoff scenes (average), not the scenes AFTER. SETUP_PAYOFF_
  // DEAD_RUN catches a 6+ scene gap with no seed/payoff anywhere (connective tissue), not the
  // specific two-scene aftermath of each payoff. PAYOFF_FRONT_LOADED is a zone-timing measure.
  if (records.length >= 10) {
    const n426a = records.length;
    const qualifyingPayoffs426: any[] = [];
    for (let i = 0; i < n426a - 2; i++) {
      if ((((records as any[])[i].payoffSetupIds ?? []) as string[]).length > 0) {
        qualifyingPayoffs426.push(records[i]);
      }
    }
    if (qualifyingPayoffs426.length >= 2) {
      const allDeadEnded426 = qualifyingPayoffs426.every((r: any) => {
        const i = r.sceneIdx;
        // sceneIdx is the array index in these records; guard against gaps anyway.
        const a = (records as any[])[i + 1];
        const b = (records as any[])[i + 2];
        if (!a || !b) return false;
        const aFlat = (a.curiosityDelta ?? 0) <= 0 && ((a.seededClueIds ?? []) as string[]).length === 0;
        const bFlat = (b.curiosityDelta ?? 0) <= 0 && ((b.seededClueIds ?? []) as string[]).length === 0;
        return aFlat && bFlat;
      });
      if (allDeadEnded426) {
        issues.push({
          location: `${qualifyingPayoffs426.length} payoff scene(s) — aftermath`,
          rule: 'PAYOFF_AFTERMATH_QUESTION_VOID',
          severity: 'minor',
          description: `Every payoff scene with room after it (${qualifyingPayoffs426.length} in total) is followed by two scenes that raise no curiosity and plant no new clue. Each resolution closes a loop and then lets the air out: the moment a question is answered the audience's forward pull slackens, and nothing in the next two scenes re-engages it. The story deflates a little with every payoff and never rebuilds the pull it just spent.`,
          suggestedFix: 'Re-engage immediately after each payoff: in the scene that closes a thread or the one right after, open a new question, plant a fresh clue, or expose a consequence that complicates what was just resolved. A payoff should feel like one wave receding as the next rises — not the tide going out.',
        });
      }
    }
  }

  // PAYOFF_CONSECUTIVE_RUN (run-based, n≥8): Three or more consecutive scenes each fire at least
  // one payoff — a "resolution avalanche" where the story spends a back-to-back stretch closing
  // threads with no scene of rebuild or new tension between them. Payoffs land hardest when they
  // are spaced so each closure can register and the story can re-pressurize before the next; firing
  // them in an unbroken run blurs the individual satisfactions together and burns through the
  // story's stored questions all at once, leaving the remainder of the script with nothing left to
  // resolve.
  // Distinctness: CLUSTERED_PAYOFFS counts 3+ setups resolved in a SINGLE scene (intra-scene
  // density); this counts payoffs firing across 3+ CONSECUTIVE scenes (inter-scene run). THREAD_
  // CONVERGENCE_ABSENT is the opposite failure (payoffs resolving in isolation, never adjacent).
  // PAYOFF_FRONT_LOADED is a zone-proportion measure, not a local consecutive run.
  if (records.length >= 8) {
    const hasPayoff426 = (r: any) => (((r.payoffSetupIds ?? []) as string[]).length) > 0;
    let runStart426 = -1;
    let runLen426 = 0;
    let bestStart426 = -1;
    for (let i = 0; i < records.length; i++) {
      if (hasPayoff426((records as any[])[i])) {
        if (runLen426 === 0) runStart426 = i;
        runLen426++;
        if (runLen426 >= 3 && bestStart426 < 0) bestStart426 = runStart426;
      } else {
        runLen426 = 0;
      }
    }
    if (bestStart426 >= 0) {
      // Recompute the actual length of the run that triggered (for the message).
      let len426 = 0;
      for (let i = bestStart426; i < records.length && hasPayoff426((records as any[])[i]); i++) len426++;
      issues.push({
        location: `Scenes ${bestStart426}–${bestStart426 + len426 - 1} — consecutive payoffs`,
        rule: 'PAYOFF_CONSECUTIVE_RUN',
        severity: 'minor',
        description: `Scenes ${bestStart426}–${bestStart426 + len426 - 1} each fire a payoff — ${len426} consecutive scenes of resolution with no rebuild between them. A back-to-back run of closures blurs the individual satisfactions together and spends the story's stored questions all at once; payoffs land hardest when they are spaced so each can register and the story can re-pressurize before the next arrives.`,
        suggestedFix: 'Interleave the payoffs with rebuilds: between two resolutions, give the story a scene that raises a new stake, deepens a complication, or opens a fresh question. Spreading closures across the act lets each one breathe and keeps the engine from emptying its tank in a single stretch.',
      });
    }
  }

  // PAYOFF_RELATIONSHIP_VALENCE_UNIFORM (valence, n≥8, ≥3 relational-moving payoff shifts): Among
  // the payoff scenes that DO move a bond (a relationshipShift with |amount| ≥ 0.3), every such
  // shift carries the same sign — the story's resolutions are ruptures-only or repairs-only. When
  // every thread that closes also breaks a bond (and none mends one), or vice versa, the resolution
  // phase has a monotone relational color: the audience experiences the payoffs as a uniform wave of
  // loss or a uniform wave of reconciliation, with no counterpoint. A resonant payoff structure pays
  // some threads off as repairs and others as ruptures, so the ending's relational texture is mixed.
  // Distinctness: PAYOFF_RELATIONSHIP_DECOUPLED fires when NO payoff scene moves ANY bond (the
  // machine is decoupled from relationships entirely); this fires precisely when payoffs DO move
  // bonds, but all in one direction. PAYOFF_RELATIONSHIP_PEAK_DECOUPLED is a single-peak isolation
  // check (the biggest shift isn't a payoff), not a valence/direction check across all payoff shifts.
  if (records.length >= 8) {
    const payoffRelShifts426: number[] = [];
    for (const r of records as any[]) {
      if ((((r.payoffSetupIds ?? []) as string[]).length) > 0) {
        for (const s of (r.relationshipShifts ?? []) as Array<{ amount: number }>) {
          if (Math.abs(s.amount) >= 0.3) payoffRelShifts426.push(s.amount);
        }
      }
    }
    if (payoffRelShifts426.length >= 3) {
      const allPositive426 = payoffRelShifts426.every(a => a >= 0.3);
      const allNegative426 = payoffRelShifts426.every(a => a <= -0.3);
      if (allPositive426 || allNegative426) {
        const dir426 = allPositive426 ? 'repairs' : 'ruptures';
        issues.push({
          location: `${payoffRelShifts426.length} relational shifts on payoff scenes`,
          rule: 'PAYOFF_RELATIONSHIP_VALENCE_UNIFORM',
          severity: 'minor',
          description: `All ${payoffRelShifts426.length} relationship shifts that occur on payoff scenes are ${dir426} (same sign). The story's resolutions move bonds in only one direction — every thread that closes also ${allPositive426 ? 'mends' : 'breaks'} a relationship, and none does the reverse. The resolution phase reads as a monotone wave of ${allPositive426 ? 'reconciliation' : 'loss'} with no counterpoint, flattening the relational texture of the ending.`,
          suggestedFix: `Vary the relational valence of the payoffs: let at least one thread close in a way that ${allPositive426 ? 'costs a bond — a victory that estranges, a truth that wounds' : 'mends a bond — a reconciliation, a debt forgiven, an alliance sealed'}. An ending whose resolutions cut both ways feels truer than one where every closure pulls the same emotional direction.`,
        });
      }
    }
  }

  // ── Wave 440: PAYOFF_BACKLOADED, PAYOFF_EMOTIONAL_RECOIL_ABSENT, PAYOFF_SUSPENSE_RECOIL_ABSENT ──

  // PAYOFF_BACKLOADED (minor, ≥3 payoffs, n≥8, >70% in second half): More than 70% of all
  // payoffs land in the second half of the story while the first half has fewer than 30%.
  // The distribution mirror of PAYOFF_FRONT_LOADED (which fires when >60% land in the first
  // half). When almost all resolutions are withheld until the second half, the first half of
  // the story functions entirely as setup with no earned satisfaction — no thread closes, no
  // investment is returned, and the audience receives no confirmation that the payoff machine
  // is working. A story with no payoffs in the first half also denies itself the narrative
  // technique of the early payoff that reframes the setup: the mid-story twist that pays off
  // something the audience didn't know was a setup until it resolved. Distribution/timing ×
  // underweight/bloat mode. Distinct from PAYOFF_FRONT_LOADED (Wave 261: >60% in first half
  // — the opposite imbalance), PAYOFF_ACT3_ABSENT (Wave 370: zero payoffs in Act 3 final 25%
  // — a zone void, not a proportion), ACT_2A_PAYOFF_VOID (Wave 275: zero payoffs in Act 2a
  // 25–50% zone — a zone void), and UNRESOLVED_CLUE_RATIO_HIGH (Wave 317: percentage of clue
  // IDs still open at the end — a different measure of unresolved threads by identity, not
  // scene-timing distribution).
  if (payoffInfo.size >= 3 && records.length >= 8) {
    const midpoint440a = Math.floor(records.length / 2);
    const firstHalfPayoffs440a = [...payoffInfo.values()].filter(s => s < midpoint440a).length;
    const backRatio440a = 1 - firstHalfPayoffs440a / payoffInfo.size;
    if (backRatio440a > 0.70) {
      const backHalfCount440a = payoffInfo.size - firstHalfPayoffs440a;
      issues.push({
        location: `Payoff distribution (${backHalfCount440a} of ${payoffInfo.size} in second half)`,
        rule: 'PAYOFF_BACKLOADED',
        severity: 'minor',
        description: `${backHalfCount440a} of ${payoffInfo.size} payoffs (${Math.round(backRatio440a * 100)}%) land in the second half of the story — the resolution engine is severely back-loaded. The first half resolves almost nothing: the audience plants questions throughout setup with no payoffs returned until after the midpoint, receiving no confirmation that the payoff machine is working and no early reframings of threads they didn't know were setups. A first half with no payoffs treats every seed as pure promise deferred, and the second half must work through all of it.`,
        suggestedFix: 'Move at least one payoff into the first half: a minor thread that resolves early to prove the machine is running, to reward the audience\'s attention, and to set up the richer payoffs that follow. An early payoff that reframes what came before it ("that wasn\'t setup, it was this all along") is especially powerful — it rewards re-reading while keeping the first-half investment active.',
      });
    }
  }

  // PAYOFF_EMOTIONAL_RECOIL_ABSENT (minor, n≥8, ≥2 qualifying payoff scenes): No payoff scene
  // (with at least 2 scenes remaining after it) is followed by a negative emotional shift
  // (emotionalShift = 'negative') in the next two scenes. When threads close, the closures
  // should sometimes produce grief, loss, disillusionment, or emotional cost in the scenes that
  // follow: a truth revealed that wounds, a victory that costs something, a question answered
  // that opens a worse one. When every payoff's aftermath stays emotionally neutral or positive,
  // resolutions feel consequence-free — the story ties its threads and moves on without
  // emotional weight. The absence of negative emotional recoil after payoffs teaches the audience
  // that closures are clean events rather than moments of genuine reckoning. Sequence/aftermath
  // mode × negative-emotion channel. Distinct from PAYOFF_EMOTION_DECOUPLED (Wave 317: the
  // payoff SCENES themselves are all emotionally neutral — this fires even when payoff scenes
  // have positive emotion, as long as the aftermath lacks negative recoil), PAYOFF_AFTERMATH_
  // QUESTION_VOID (Wave 426: aftermath lacks curiosity or seeds — curiosity/seed channel, not
  // emotional channel), and PAYOFF_SUSPENSE_RECOIL_ABSENT (Wave 440, same wave: suspense
  // channel of the aftermath window). This is the first check to audit the negative-emotion
  // dimension of the 2-scene aftermath following payoffs.
  if (records.length >= 8) {
    const qualPayoffs440b: number[] = [];
    for (let i = 0; i < records.length - 2; i++) {
      if ((((records as any[])[i].payoffSetupIds ?? []) as string[]).length > 0) {
        qualPayoffs440b.push(i);
      }
    }
    if (qualPayoffs440b.length >= 2) {
      const anyNegRecoil440b = qualPayoffs440b.some(idx => {
        for (let off = 1; off <= 2; off++) {
          if (idx + off < records.length && (records as any[])[idx + off].emotionalShift === 'negative') return true;
        }
        return false;
      });
      if (!anyNegRecoil440b) {
        issues.push({
          location: `All ${qualPayoffs440b.length} qualifying payoff scene(s) — no negative emotional aftermath`,
          rule: 'PAYOFF_EMOTIONAL_RECOIL_ABSENT',
          severity: 'minor',
          description: `None of the story's ${qualPayoffs440b.length} payoff scenes (that have at least 2 scenes following them) is followed by a negative emotional shift within the next two scenes. When threads close, some resolutions should produce grief, loss, disillusionment, or emotional cost: a truth that wounds, a victory that costs something, an answer that opens a worse question. When every payoff's aftermath stays emotionally neutral or positive, the resolutions feel consequence-free — the story ties its bows without emotional weight, and the audience learns that closures are clean transactions rather than moments of genuine reckoning.`,
          suggestedFix: 'Let at least one payoff produce negative emotional fallout in the scene or two that follow: a revelation that changes how the protagonist sees themselves, a victory won at a cost that the audience feels, an answer that makes the problem look worse rather than better. The best payoffs earn their emotional cost — the closure that brings grief lands harder than the one that simply concludes.',
        });
      }
    }
  }

  // PAYOFF_SUSPENSE_RECOIL_ABSENT (minor, n≥8, ≥2 qualifying payoff scenes): No payoff scene
  // (with at least 2 scenes remaining after it) is followed by a positive suspenseDelta in the
  // next two scenes. When threads close, the resolution should often create new pressure:
  // completing one arc exposes a deeper problem, the answer reveals a new danger, the closed
  // loop unmasks what was hidden behind it. When every payoff's aftermath is suspense-flat, the
  // resolutions feel hermetically sealed — they close the old without creating pressure for the
  // new. The story's threads resolve but generate no forward momentum in the tension channel,
  // so payoffs feel like endpoints rather than turning points. Sequence/aftermath mode × suspense
  // channel. Distinct from PAYOFF_SUSPENSE_MISMATCH (Wave 289: the payoff scenes' own average
  // suspenseDelta ≤ 0 — the suspense IN the payoff scene, not its aftermath), PAYOFF_AFTERMATH_
  // QUESTION_VOID (Wave 426: curiosity/seed channel aftermath), PAYOFF_EMOTIONAL_RECOIL_ABSENT
  // (Wave 440, same wave: negative-emotion aftermath channel). This completes the aftermath-
  // channel family: curiosity/seed (Wave 426), negative emotion (this wave), suspense (this wave).
  if (records.length >= 8) {
    const qualPayoffs440c: number[] = [];
    for (let i = 0; i < records.length - 2; i++) {
      if ((((records as any[])[i].payoffSetupIds ?? []) as string[]).length > 0) {
        qualPayoffs440c.push(i);
      }
    }
    if (qualPayoffs440c.length >= 2) {
      const anySuspRecoil440c = qualPayoffs440c.some(idx => {
        for (let off = 1; off <= 2; off++) {
          if (idx + off < records.length && ((records as any[])[idx + off].suspenseDelta ?? 0) > 0) return true;
        }
        return false;
      });
      if (!anySuspRecoil440c) {
        issues.push({
          location: `All ${qualPayoffs440c.length} qualifying payoff scene(s) — no suspense recoil`,
          rule: 'PAYOFF_SUSPENSE_RECOIL_ABSENT',
          severity: 'minor',
          description: `None of the story's ${qualPayoffs440c.length} payoff scenes (that have at least 2 scenes following them) is followed by a positive suspenseDelta within the next two scenes — resolutions never generate new pressure downstream. When threads close, the resolution should often precipitate new tension: the answer reveals a worse problem, the closed loop exposes a deeper danger, the completed arc unmasks something lurking behind it. When every payoff's aftermath is suspense-flat, the resolutions feel like endpoints rather than turning points — they close the old without opening the new pressure that would keep the audience leaning forward.`,
          suggestedFix: 'Let at least one payoff create new pressure in the scene or two that follow: resolve one thread in a way that immediately exposes a deeper problem, use the answer to a question to reveal that the stakes were higher than the audience knew, or let the closing of one loop open a worse one. The payoff that generates suspense in its aftermath is more powerful than the one that simply concludes — it tells the audience that resolutions are not safe harbours but transitions to the next danger.',
        });
      }
    }
  }

  // ── Wave 454: PAYOFF_CAUSELESS, CLUE_SEED_CAUSELESS, CLUE_SEED_CONSECUTIVE_RUN ──

  // PAYOFF_CAUSELESS — Backward-cause × payoff signal (n≥8, ≥2 payoffs, all payoffs
  // lack an upstream trigger in the prior 3 scenes). When no payoff is preceded by a
  // revelation, a dramatic turn, or a high-suspense push in the 3 scenes before it,
  // resolutions arrive without any narrative momentum building toward them: threads
  // close because the plot requires it, not because something happened to make the
  // audience feel the resolution was earned. Backward-cause mode × payoff signal.
  // Distinct from PAYOFF_REVELATION_DISCONNECT (Wave 289: co-occurrence — payoffs fire
  // without revelations in the SAME or nearby scene; this is backward-cause checking the
  // PRIOR 3 scenes for ANY escalating trigger: revelation OR dramatic turn OR suspense peak),
  // PAYOFF_PRECEDES_SETUP (Wave 261: temporal ordering — payoff before setup causality;
  // this is about upstream momentum, not ordering), and all aftermath checks (Waves 426/440:
  // look FORWARD from payoff, not backward at what preceded it).
  if (records.length >= 8) {
    const payoffIdxs454a = (records as any[])
      .map((r, i) => (((r.payoffSetupIds ?? []) as string[]).length > 0 ? i : -1))
      .filter(i => i >= 0);
    if (payoffIdxs454a.length >= 2) {
      const hasUpstreamTrigger454a = (idx: number): boolean => {
        for (let off = 1; off <= 3; off++) {
          if (idx - off < 0) continue;
          const prev = (records as any[])[idx - off];
          if ((prev.revelation ?? null) === true) return true;
          if ((prev.dramaticTurn ?? 'nothing') !== 'nothing') return true;
          if ((prev.suspenseDelta ?? 0) > 1) return true;
        }
        return false;
      };
      const allCauseless454a = payoffIdxs454a.every(idx => !hasUpstreamTrigger454a(idx));
      if (allCauseless454a) {
        issues.push({
          location: `All ${payoffIdxs454a.length} payoff scene(s) — no upstream narrative trigger`,
          rule: 'PAYOFF_CAUSELESS',
          severity: 'minor',
          description: `None of the story's ${payoffIdxs454a.length} payoff scenes is preceded by a revelation, a dramatic turn, or a high-suspense moment (suspenseDelta > 1) in the prior three scenes — resolutions arrive without any narrative escalation building toward them. Payoffs feel earned when the three preceding scenes have been building pressure, revealing new information, or pivoting the story: the audience senses the resolution is inevitable because something caused it. When every payoff fires into narrative dead air, the thread closures feel mechanically obligatory rather than dramatically necessary — they conclude because the plot requires them to, not because the story has generated the momentum that makes their arrival feel right.`,
          suggestedFix: `Before at least one payoff scene, build upstream momentum in the prior two or three scenes: surface a revelation that makes the resolution inevitable, include a dramatic turn that recontextualizes the thread, or raise suspense so that the payoff arrives as release rather than random event. The three scenes before a payoff are the runway — give the resolution somewhere to land from.`,
        });
      }
    }
  }

  // CLUE_SEED_CAUSELESS — Backward-cause × clue-seed signal (n≥8, ≥3 seed scenes, all
  // seeds lack upstream momentum in prior 2 scenes). When no clue-seeding scene is preceded
  // by a curiosity rise, an emotional charge, or a revelation in the 2 scenes before it,
  // evidence is planted into narrative dead air: the audience has no reason to notice or
  // retain the clue because nothing has heightened their attention immediately before it.
  // Distinct from PAYOFF_CAUSELESS (Wave 454, above: backward-cause × payoff — different
  // target signal and different upstream triggers checked), CLUE_SEED_CURIOSITY_FLAT (Wave
  // 328: the seed scene's own curiosityDelta ≤ 0 — a co-occurrence check on the scene itself;
  // this is backward-cause checking the PRIOR scenes for evidence-priming momentum),
  // CLUE_SEED_REVELATION_DECOUPLED (Wave 398: co-occurrence — seed and revelation never
  // in the same scene; this checks whether upstream revelation preceded the seed by 1-2 scenes).
  if (records.length >= 8) {
    const seedIdxs454b = (records as any[])
      .map((r, i) => (((r.seededClueIds ?? []) as string[]).length > 0 ? i : -1))
      .filter(i => i >= 0);
    if (seedIdxs454b.length >= 3) {
      const hasUpstreamMomentum454b = (idx: number): boolean => {
        for (let off = 1; off <= 2; off++) {
          if (idx - off < 0) continue;
          const prev = (records as any[])[idx - off];
          if ((prev.curiosityDelta ?? 0) > 0) return true;
          if ((prev.emotionalShift ?? 'neutral') !== 'neutral') return true;
          if ((prev.revelation ?? null) === true) return true;
        }
        return false;
      };
      const allSeedCauseless454b = seedIdxs454b.every(idx => !hasUpstreamMomentum454b(idx));
      if (allSeedCauseless454b) {
        issues.push({
          location: `All ${seedIdxs454b.length} clue-seeding scene(s) — no upstream priming`,
          rule: 'CLUE_SEED_CAUSELESS',
          severity: 'minor',
          description: `None of the story's ${seedIdxs454b.length} clue-seeding scenes is preceded by a curiosity rise, an emotional shift, or a revelation in the prior two scenes — evidence is planted into narrative dead air. Clues land best when the audience is already heightened: a curiosity rise makes them lean in and notice new information, a preceding revelation primes them to receive more, an emotional charge makes them alert. When every clue is planted without any upstream priming, the audience has no reason to register the evidence at the moment of planting — the seed fails to take root because the soil has not been prepared.`,
          suggestedFix: `Before at least one clue-seeding scene, prime the audience with a curiosity rise, a revelation, or an emotional moment in the scene or two before it. When a clue is planted immediately after the audience has been made alert — a revelation that raises a new question, an emotional peak that has them leaning in — the evidence is more likely to register and be retained. Even a small curiosity push in the preceding scene can function as a priming signal that makes the clue feel significant rather than incidental.`,
        });
      }
    }
  }

  // CLUE_SEED_CONSECUTIVE_RUN — Run-based × clue-seed signal (n≥10, ≥3 seed scenes,
  // max consecutive seed run ≥ 3). Three or more consecutive scenes each planting a new
  // clue creates an "evidence avalanche" — the audience is overwhelmed with simultaneous
  // information before they can form emotional attachment to any individual thread. The most
  // memorable clues are those planted in isolation, given room to register before the next
  // one arrives. Run-based mode × clue-seed signal.
  // Distinct from PAYOFF_CONSECUTIVE_RUN (Wave 426: run-based × payoff signal — a parallel
  // check for resolution clustering on the payoff side of the machine; this checks the planting
  // side), CLUSTERED_PAYOFFS (Wave 154: many payoffs in ONE scene — single-scene bloat, not a
  // consecutive-scene run), SETUP_PAYOFF_DEAD_RUN (Wave 342: run-based × both signals absent
  // — a dead stretch with no seeds or payoffs; this fires on the opposite problem, a live stretch
  // with seeds in every consecutive scene), and LATE_MAJORITY_CLUE_SEEDING (Wave 275:
  // distribution/timing — >60% of seeds in second half, a global distribution check).
  if (records.length >= 10) {
    const isSeedScene454c = (records as any[]).map(r => (((r.seededClueIds ?? []) as string[]).length > 0));
    const totalSeeds454c = isSeedScene454c.filter(Boolean).length;
    if (totalSeeds454c >= 3) {
      let maxSeedRun454c = 0, curSeedRun454c = 0;
      let maxSeedRunStart454c = -1, curSeedRunStart454c = -1;
      for (let i = 0; i < records.length; i++) {
        if (isSeedScene454c[i]) {
          if (curSeedRun454c === 0) curSeedRunStart454c = i;
          if (++curSeedRun454c > maxSeedRun454c) {
            maxSeedRun454c = curSeedRun454c;
            maxSeedRunStart454c = curSeedRunStart454c;
          }
        } else { curSeedRun454c = 0; }
      }
      if (maxSeedRun454c >= 3) {
        issues.push({
          location: `Scenes ${maxSeedRunStart454c + 1}–${maxSeedRunStart454c + maxSeedRun454c}: consecutive clue-seeding run`,
          rule: 'CLUE_SEED_CONSECUTIVE_RUN',
          severity: 'minor',
          description: `A run of ${maxSeedRun454c} consecutive scenes each plant a new clue — an evidence avalanche that delivers multiple new threads to the audience simultaneously without space to absorb them. The most memorable clues are planted in isolation: given a scene to breathe in, allowed to register before the next mystery arrives. When three or more seeds land back-to-back, the audience's finite attention is divided across all of them simultaneously, reducing each thread's individual impact. A concentrated seed-run also signals structural front-loading — the planting machinery is overactive in one zone while other zones have nothing to wonder about.`,
          suggestedFix: `Spread the clue-seeding across the run — intersperse at least one non-seed scene between consecutive plants. Use the non-seed scene to give the most recent clue room to breathe: a character reaction, a quiet beat where the implication lands, or simply a scene that does not introduce new evidence. An isolated clue — placed alone, given space — registers more deeply and generates more sustained curiosity than a cluster of three planted in rapid succession.`,
        });
      }
    }
  }

  // ── Wave 468: PAYOFF_REVELATION_AFTERMATH_ABSENT, SEED_SUSPENSE_AFTERMATH_ABSENT, SEED_EMOTIONAL_AFTERMATH_ABSENT ──

  // PAYOFF_REVELATION_AFTERMATH_ABSENT (minor, n≥8, ≥2 payoff scenes): No payoff scene is
  // followed by a revelation in the next two scenes — resolutions never open a new truth
  // downstream. The ideal payoff is doubly charged: it closes an old thread AND opens a door
  // to the next discovery. When every resolution is followed by two scenes with no revelation,
  // the closing of threads is inert — the payoff completes the past but generates nothing for
  // the future. Sequence/aftermath mode × revelation channel × payoff trigger. Completes the
  // payoff-aftermath channel family alongside PAYOFF_AFTERMATH_QUESTION_VOID (Wave 426: curiosity
  // and seed signals in aftermath), PAYOFF_EMOTIONAL_RECOIL_ABSENT (Wave 440: negative emotional
  // channel in aftermath), and PAYOFF_SUSPENSE_RECOIL_ABSENT (Wave 440: suspense channel in
  // aftermath): this adds the revelation channel. Distinct from PAYOFF_REVELATION_DISCONNECT
  // (Wave 289: co-occurrence — payoffs fire without revelations in the same or nearby scene; this
  // checks the 2 scenes AFTER the payoff, not the payoff scene itself or the scenes before it).
  if (records.length >= 8) {
    const payoffIdxs468a = (records as any[])
      .map((r, i) => (((r.payoffSetupIds ?? []) as string[]).length > 0 ? i : -1))
      .filter(i => i >= 0);
    if (payoffIdxs468a.length >= 2) {
      const anyRevAftermath468a = payoffIdxs468a.some(idx => {
        const window468a = (records as any[]).slice(idx + 1, idx + 3);
        return window468a.some((a: any) =>
          a.revelation !== null && a.revelation !== undefined && a.revelation !== '',
        );
      });
      if (!anyRevAftermath468a) {
        issues.push({
          location: `All ${payoffIdxs468a.length} payoff scene(s) — no revelation in the next two scenes`,
          rule: 'PAYOFF_REVELATION_AFTERMATH_ABSENT',
          severity: 'minor',
          description: `None of the story's ${payoffIdxs468a.length} payoff scenes is followed by a revelation in the next two scenes — resolutions never open a new truth downstream. The most resonant payoffs are doubly charged: they close an old thread and simultaneously unlock a new discovery. When every resolution is followed by two scenes with no revelation, the closing of threads is inert — the payoff completes the past without generating anything for the audience to carry forward. A payoff that immediately precedes a disclosure feels like the world rearranging itself after the resolution: answering one question reveals the next.`,
          suggestedFix: "After at least one payoff, let the next scene or the one after it surface a revelation: a truth the resolution exposes, a consequence that discloses something previously hidden, or a new discovery triggered by the thread closing. A payoff followed by a revelation creates a chain — 'so that's what that meant, and now we see this' — that makes the audience feel the story is a coherent system rather than a list of events.",
        });
      }
    }
  }

  // SEED_SUSPENSE_AFTERMATH_ABSENT (minor, n≥8, ≥2 seed scenes): No clue-seeding scene is
  // followed by a suspense rise (suspenseDelta > 0) in the next two scenes — planted threads
  // never escalate the danger downstream. A clue planted should raise the temperature: the
  // audience now holds a new unknown, and the scenes after the planting should reflect the
  // danger that new thread implies. When every seed is followed by two scenes of flat or
  // falling suspense, evidence is planted without consequence — the thread enters the story
  // without raising what it should raise. Sequence/aftermath mode × suspense channel × seed
  // trigger. Distinct from CLUE_SEED_SUSPENSE_FLAT (Wave 398: the seed scene's own
  // suspenseDelta ≤ 0 — same-scene co-occurrence, not aftermath), PAYOFF_SUSPENSE_RECOIL_
  // ABSENT (Wave 440: payoff trigger, not seed trigger), and REVELATION_SUSPENSE_AFTERMATH_
  // FLAT (pacing.ts Wave 467: revelation trigger, not seed trigger). First aftermath check
  // for the clue-seeding signal, beginning the seed aftermath family.
  if (records.length >= 8) {
    const seedIdxs468b = (records as any[])
      .map((r, i) => (((r.seededClueIds ?? []) as string[]).length > 0 ? i : -1))
      .filter(i => i >= 0);
    if (seedIdxs468b.length >= 2) {
      const anySuspAftermath468b = seedIdxs468b.some(idx => {
        const window468b = (records as any[]).slice(idx + 1, idx + 3);
        return window468b.some((a: any) => (a.suspenseDelta ?? 0) > 0);
      });
      if (!anySuspAftermath468b) {
        issues.push({
          location: `All ${seedIdxs468b.length} seed scene(s) — no suspense rise in the next two scenes`,
          rule: 'SEED_SUSPENSE_AFTERMATH_ABSENT',
          severity: 'minor',
          description: `None of the story's ${seedIdxs468b.length} clue-seeding scenes is followed by a suspense rise (suspenseDelta > 0) in the next two scenes — planted threads never escalate the danger downstream. A new unknown introduced to the audience should make the situation more dangerous: the scenes after the planting should reflect the threat that the new thread implies. When every seed is followed by two scenes of flat or falling suspense, evidence is planted without consequence — the thread enters the story without raising the temperature it should.`,
          suggestedFix: 'After at least one clue-seeding scene, let the next scene escalate tension: the planted thread has implications that make the situation more dangerous, or a character who receives the clue is put under immediate pressure by it. A seed that raises suspense in the following scene teaches the audience that new information carries risk — they should be nervous when a new clue appears, not relaxed.',
        });
      }
    }
  }

  // SEED_EMOTIONAL_AFTERMATH_ABSENT (minor, n≥8, ≥2 seed scenes): No clue-seeding scene is
  // followed by an emotional shift (emotionalShift ≠ 'neutral') in the next two scenes — the
  // discovery of a new thread produces no felt reaction from any character. A clue that elicits
  // no emotional response exists as pure information: it enters the story's logical record but
  // not its characters' inner lives. When the scenes after a plant are emotionally neutral,
  // planted threads feel like file entries rather than story events — the audience is asked to
  // hold a question that no character appears to feel the weight of. Sequence/aftermath mode ×
  // emotional channel × seed trigger. Distinct from CLUE_SEED_EMOTION_FLAT (Wave 328: the seed
  // scene's own emotionalShift is neutral — the seed scene itself carries no charge; this checks
  // whether the characters respond emotionally IN THE AFTERMATH of the plant, not whether the
  // seed scene is itself emotional), SEED_SUSPENSE_AFTERMATH_ABSENT (Wave 468, above: suspense
  // channel in the seed aftermath window — different channel, same trigger), and PAYOFF_EMOTIONAL_
  // RECOIL_ABSENT (Wave 440: payoff trigger, not seed trigger): this completes the seed-aftermath
  // family alongside SEED_SUSPENSE_AFTERMATH_ABSENT.
  if (records.length >= 8) {
    const seedIdxs468c = (records as any[])
      .map((r, i) => (((r.seededClueIds ?? []) as string[]).length > 0 ? i : -1))
      .filter(i => i >= 0);
    if (seedIdxs468c.length >= 2) {
      const anyEmoAftermath468c = seedIdxs468c.some(idx => {
        const window468c = (records as any[]).slice(idx + 1, idx + 3);
        return window468c.some((a: any) => (a as any).emotionalShift !== 'neutral');
      });
      if (!anyEmoAftermath468c) {
        issues.push({
          location: `All ${seedIdxs468c.length} seed scene(s) — no emotional shift in the next two scenes`,
          rule: 'SEED_EMOTIONAL_AFTERMATH_ABSENT',
          severity: 'minor',
          description: `None of the story's ${seedIdxs468c.length} clue-seeding scenes is followed by an emotional shift (emotionalShift ≠ 'neutral') in the next two scenes — planted threads produce no felt reaction from any character. A new unknown should register emotionally: the character who encounters it should show dread, curiosity, relief, or alarm in the scenes that follow. When every seed is followed by two emotionally neutral scenes, the clue exists purely as information — the audience is asked to hold a thread that no character appears to feel the weight of. Threads the characters visibly react to are threads the audience remembers.`,
          suggestedFix: 'After at least one clue-seeding scene, let a character react emotionally in the next scene or the one after: the evidence they encounter leaves them shaken, hopeful, afraid, or resolute. The emotional response does not need to be dramatic — even quiet unease or grim recognition tells the audience that what was just planted matters. A thread the characters respond to emotionally is far more memorable than one they catalogue without reaction.',
        });
      }
    }
  }

  // ── Wave 482: SEED_CURIOSITY_AFTERMATH_ABSENT, SEED_ACT3_VOID, PAYOFF_AFTERMATH_RELATIONSHIP_VOID ──

  // SEED_CURIOSITY_AFTERMATH_ABSENT (sequence/aftermath × curiosity × seed trigger, n≥8,
  // ≥2 seed scenes not in last 2 positions): No clue-seeding scene is followed by a curiosity
  // rise (curiosityDelta > 0) in either of the next two scenes — planted threads open no
  // forward questions in the audience. A new clue should activate the audience's "what does
  // this mean?" reflex: the scenes after the planting should register the new unknown as a
  // question that pulls them forward. When every seed scene is followed by two scenes of flat
  // or falling curiosity, the planted threads are filed away rather than ignited — the audience
  // holds new information without being made to wonder about it. Sequence/aftermath mode ×
  // curiosity channel × seed trigger. Distinct from CLUE_SEED_CURIOSITY_FLAT (Wave 328: the
  // seed scene's own curiosityDelta ≤ 0 — same-scene charge, not aftermath), SEED_SUSPENSE_
  // AFTERMATH_ABSENT (Wave 468: suspense channel, same trigger), SEED_EMOTIONAL_AFTERMATH_ABSENT
  // (Wave 468: emotional channel, same trigger): this completes the three-channel seed-aftermath
  // family (suspense / emotional / curiosity).
  if (records.length >= 8) {
    const seedIdxs482a = (records as any[])
      .map((r, i) => (((r.seededClueIds ?? []) as string[]).length > 0 ? i : -1))
      .filter(i => i >= 0 && i < records.length - 1);
    if (seedIdxs482a.length >= 2) {
      const anyCurioAftermath482a = seedIdxs482a.some(idx => {
        const window482a = (records as any[]).slice(idx + 1, idx + 3);
        return window482a.some((a: any) => (a.curiosityDelta ?? 0) > 0);
      });
      if (!anyCurioAftermath482a) {
        issues.push({
          location: `All ${seedIdxs482a.length} seed scene(s) — no curiosity rise in the next two scenes`,
          rule: 'SEED_CURIOSITY_AFTERMATH_ABSENT',
          severity: 'minor',
          description: `None of the story's ${seedIdxs482a.length} clue-seeding scenes is followed by a curiosity rise (curiosityDelta > 0) in the next two scenes — planted threads open no forward questions in the audience. A new clue should activate the "what does this mean?" reflex: the scenes that follow the plant should register the new unknown as a pull forward. When every seed is followed by two scenes of flat or falling curiosity, the evidence is archived rather than ignited — the audience stores the information without being made to wonder about its implications. A thread that doesn't raise curiosity in its wake is a thread the audience will forget.`,
          suggestedFix: 'After at least one seed scene, let the next scene or the one after raise a direct question the audience is now burning to answer: a character discovers a partial connection, a detail the clue introduced reappears unexpectedly, or a new scene reveals that the planted evidence has implications beyond what was first apparent. The curiosity rise signals to the audience that the thread they just received is alive and pulling — not merely filed.',
        });
      }
    }
  }

  // SEED_ACT3_VOID (zone presence/absence × seed × Act 3, n≥10, ≥4 seed scenes, none in
  // final 25%): Four or more clue-seeding scenes exist but not one falls in Act 3 — the
  // story's final act receives no new planted threads, planting nothing new while it resolves
  // what was planted earlier. Act 3 can legitimately deliver dense payoffs without adding new
  // seeds — but when the story has planted four or more clues and every one was introduced in
  // Acts 1 and 2, the final act operates on a closed information set. A seed planted late in
  // Act 3 — an unexpected detail that recontextualises what came before — is one of the most
  // effective ways to make a final act feel structurally alive rather than merely closing.
  // Zone presence/absence mode × seed channel × Act 3 zone. Distinct from CLUE_SEED_MIDPOINT_
  // VOID (Wave 370: 40–60% zone void — different zone), LATE_CLUE_PLANT (Wave 356: a clue IN
  // the final 15% — the opposite problem, too late to pay off; this checks for complete Act 3
  // absence, not for an excessively late plant), SEED_BACKLOADED (Wave 384: >60% in first half —
  // distribution proportion check, not zone-void), PAYOFF_ACT3_ABSENT (Wave 370: payoff void in
  // Act 3 — same zone but payoff channel, not seed channel).
  if (records.length >= 10) {
    const act3Start482b = Math.floor(records.length * 0.75);
    const allSeedRecs482b = (records as any[]).filter(r => ((r.seededClueIds ?? []) as string[]).length > 0);
    if (allSeedRecs482b.length >= 4) {
      const act3Seeds482b = allSeedRecs482b.filter(r => {
        const pos482b = (records as any[]).indexOf(r);
        return pos482b >= act3Start482b;
      });
      if (act3Seeds482b.length === 0) {
        issues.push({
          location: `Seeds — none in Act 3 (Scenes ${act3Start482b}–${records.length - 1})`,
          rule: 'SEED_ACT3_VOID',
          severity: 'minor',
          description: `The story has ${allSeedRecs482b.length} clue-seeding scenes — not one falls in Act 3 (Scene ${act3Start482b} onward). The final act operates on a closed information set: it resolves threads planted in Acts 1–2 but introduces nothing new. A seed planted in Act 3 — an unexpected detail that recontextualises what came before — gives the final act structural life beyond mere closure. The audience's forward pull in Act 3 is not only sustained by approaching the climax but by the possibility that the story still has something to reveal about its own setup. Without any late seeding, Act 3 can feel like an engine that is only winding down.`,
          suggestedFix: `Plant at least one new clue or detail in Act 3 (Scene ${act3Start482b} or later) — not so late that it cannot be addressed, but late enough to complicate the closure. An Act 3 seed might be a detail that reframes the resolution — a truth that makes the payoffs mean something different than the audience expected. The payoff of an Act 3 seed is double: it delivers new information AND changes the meaning of the threads that preceded it.`,
        });
      }
    }
  }

  // PAYOFF_AFTERMATH_RELATIONSHIP_VOID (sequence/aftermath × relationship × payoff trigger,
  // n≥8, ≥3 qualifying payoff scenes): Three or more payoff scenes exist, yet not one is
  // followed by a relationship shift (non-empty relationshipShifts) in either of the next two
  // scenes — every resolution lands without changing how any two characters feel about each
  // other. Payoffs are not merely logical closures: a thread resolved should ripple through
  // the story's relational web. When a secret is revealed, the friendship that held that secret
  // should shift. When a planted object reappears, the person who hid it should face someone
  // whose trust is now recalibrated. When resolutions consistently produce no relational
  // aftermath, the story treats its characters as informational agents rather than people who
  // feel the weight of each thread closing. Sequence/aftermath mode × relationship channel ×
  // payoff trigger. Distinct from PAYOFF_RELATIONSHIP_DECOUPLED (Wave 328: no payoff scene
  // itself moves a bond — same-scene co-occurrence, not aftermath), PAYOFF_EMOTIONAL_RECOIL_
  // ABSENT (Wave 440: negative-emotion aftermath, not relational), PAYOFF_REVELATION_AFTERMATH_
  // ABSENT (Wave 468: revelation aftermath), PAYOFF_AFTERMATH_QUESTION_VOID (Wave 426: curiosity/
  // seed aftermath): this is the fifth payoff-aftermath check, completing the family with the
  // relational channel.
  if (records.length >= 8) {
    const payoffIdxs482c = (records as any[])
      .map((r, i) => (((r.payoffSetupIds ?? []) as string[]).length > 0 ? i : -1))
      .filter(i => i >= 0 && i < records.length - 1);
    if (payoffIdxs482c.length >= 3) {
      const anyRelAftermath482c = payoffIdxs482c.some(idx => {
        const window482c = (records as any[]).slice(idx + 1, idx + 3);
        return window482c.some((a: any) => ((a.relationshipShifts ?? []) as any[]).length > 0);
      });
      if (!anyRelAftermath482c) {
        issues.push({
          location: `All ${payoffIdxs482c.length} payoff scene(s) — no relationship shift in the next two scenes`,
          rule: 'PAYOFF_AFTERMATH_RELATIONSHIP_VOID',
          severity: 'minor',
          description: `None of the story's ${payoffIdxs482c.length} payoff scenes is followed by a relationship shift in the next two scenes — every resolution lands without changing how any two characters feel about each other. A closed thread should ripple: the revealed secret should strain the friendship that maintained it, the reappearing object should force a reckoning between characters who saw it differently, the fulfilled promise should change what one character owes another. When resolutions consistently produce no relational aftermath, the story treats its threads as information to be processed rather than events that alter people.`,
          suggestedFix: 'After at least one payoff scene, let the next scene or two register the relational cost or gain of that resolution: the trust that shifts when a secret closes, the alliance that reforms when a thread resolves, the bond that breaks when a callback reveals who a character really is. The relational aftermath of a payoff is what makes the resolution feel earned rather than merely complete.',
        });
      }
    }
  }

  // ── Wave 496: PAYOFF_TEMPORAL_CLUSTER, SEED_DRAMATIC_TURN_AFTERMATH_ABSENT, PAYOFF_CLOCK_AFTERMATH_ABSENT ──

  // PAYOFF_TEMPORAL_CLUSTER (distribution/timing × payoff × thirds, n≥9, ≥4 payoff scenes):
  // More than 75% of all payoff scenes fall within a single structural third — the resolution
  // engine is zone-ghettoized. When closures cluster in one third, the story delivers all its
  // thread resolutions in a burst and goes silent on payoffs in the other two-thirds. The first
  // and second thirds need payoffs to deliver early gratification and maintain the audience's
  // thread-tracking investment; the final third needs payoffs to make the climax feel earned.
  // When one third monopolizes resolution, the others feel either like pure setup (no closure
  // ever arrives there) or pure climax (no setup work remains). Distribution/timing mode ×
  // payoff channel × thirds partition. Distinct from PAYOFF_FRONT_LOADED (Wave 261: >70% in
  // first HALF — binary partition; this uses thirds so a middle-third or closing-third cluster
  // can also fire, which PAYOFF_FRONT_LOADED cannot detect) and PAYOFF_BACKLOADED (Wave 440:
  // >70% in second half — same binary limitation), PAYOFF_CONSECUTIVE_RUN (Wave 426: run-based,
  // not zone-distribution), PAYOFF_ACT3_ABSENT (zone-void, not ratio).
  if (records.length >= 9) {
    const allPayoffPositions496a = (records as any[])
      .map((r, pos) => ({ pos, hasPayoff: ((r.payoffSetupIds ?? []) as string[]).length > 0 }))
      .filter(x => x.hasPayoff)
      .map(x => x.pos);
    if (allPayoffPositions496a.length >= 4) {
      const third496a = Math.floor(records.length / 3);
      const z1Count496a = allPayoffPositions496a.filter(p => p < third496a).length;
      const z2Count496a = allPayoffPositions496a.filter(p => p >= third496a && p < 2 * third496a).length;
      const z3Count496a = allPayoffPositions496a.filter(p => p >= 2 * third496a).length;
      const maxZ496a = Math.max(z1Count496a, z2Count496a, z3Count496a);
      if (maxZ496a / allPayoffPositions496a.length > 0.75) {
        const zoneName496a = z1Count496a === maxZ496a ? 'opening' : z2Count496a === maxZ496a ? 'middle' : 'closing';
        issues.push({
          location: `${maxZ496a}/${allPayoffPositions496a.length} payoff scene(s) in the ${zoneName496a} third`,
          rule: 'PAYOFF_TEMPORAL_CLUSTER',
          severity: 'minor',
          description: `${maxZ496a} of ${allPayoffPositions496a.length} payoff scenes (${(maxZ496a / allPayoffPositions496a.length * 100).toFixed(0)}%) fall within the ${zoneName496a} third — the resolution engine is architecturally ghettoized into one structural zone. The audience's thread-tracking investment depends on receiving payoffs throughout the story: early payoffs deliver the gratification that rewards the audience for tracking threads, mid-story payoffs demonstrate the relevance of planted setups, and late payoffs make the climax feel like the convergence of everything that was seeded. When one third captures almost all resolutions, the other two-thirds are either pure setup (no closure arrives) or pure conclusion (no setup remains to build on).`,
          suggestedFix: `Redistribute payoffs across all three structural thirds — move at least one or two resolutions into the zones currently empty of closure. A payoff that fires early in the story rewards the audience for holding threads from Act 1 and signals that the setup-and-payoff engine is actively working; a mid-story payoff is a breath of satisfaction in the complication zone that recharges patience for the remaining threads. Concentration in any one third creates a lopsided rhythm.`,
        });
      }
    }
  }

  // SEED_DRAMATIC_TURN_AFTERMATH_ABSENT (sequence/aftermath × dramatic turn × seed trigger,
  // n≥8, ≥3 qualifying seed scenes not in last 2 positions, ≥2 dramatic-turn scenes overall):
  // Every clue-seeding scene is followed by 2 scenes with no dramatic turn — planted threads
  // never precipitate a story pivot. A seed placed just before a dramatic turn carries double
  // energy: the new clue transforms the protagonist's understanding at exactly the moment the
  // story changes direction, making both the turn and the thread more resonant. When every seed
  // is followed by 2 calm scenes, the planting happens in slack narrative space where the
  // thread is received without structural consequence. Sequence/aftermath mode × dramatic-turn
  // channel × seed trigger. Distinct from CLUE_SEED_DRAMATIC_TURN_DECOUPLED (Wave 342: no seed
  // scene itself coincides with a turn — same-scene co-occurrence; this audits the 2 scenes
  // AFTER the seed), SEED_SUSPENSE_AFTERMATH_ABSENT (Wave 468: suspense channel), SEED_EMOTIONAL_
  // AFTERMATH_ABSENT (Wave 468: emotional channel), SEED_CURIOSITY_AFTERMATH_ABSENT (Wave 482:
  // curiosity channel): this adds dramatic-turn to the seed-aftermath family.
  if (records.length >= 8) {
    const turnScenes496b = (records as any[]).filter(r =>
      (r.dramaticTurn ?? 'nothing') !== 'nothing' && r.dramaticTurn !== '',
    );
    const qualSeedIdxs496b = (records as any[])
      .map((r, i) => (((r.seededClueIds ?? []) as string[]).length > 0 && i < records.length - 2 ? i : -1))
      .filter(i => i >= 0);
    if (qualSeedIdxs496b.length >= 3 && turnScenes496b.length >= 2) {
      const anyTurnAfterSeed496b = qualSeedIdxs496b.some(idx => {
        const window496b = (records as any[]).slice(idx + 1, idx + 3);
        return window496b.some((r: any) => (r.dramaticTurn ?? 'nothing') !== 'nothing' && r.dramaticTurn !== '');
      });
      if (!anyTurnAfterSeed496b) {
        issues.push({
          location: `All ${qualSeedIdxs496b.length} seed scene(s) — no dramatic turn within 2 scenes`,
          rule: 'SEED_DRAMATIC_TURN_AFTERMATH_ABSENT',
          severity: 'minor',
          description: `None of the story's ${qualSeedIdxs496b.length} clue-seeding scenes is followed by a dramatic turn in the next two scenes, even though ${turnScenes496b.length} turns exist elsewhere in the story. A seed placed just before a dramatic turn carries double energy: the clue recontextualises what the audience sees at exactly the moment the story changes direction, making both the thread and the pivot more resonant. When every seed is followed by two calm non-pivot scenes, the planting occurs in slack narrative space — received without structural consequence and quickly absorbed as routine information rather than as a thread attached to the story's changing direction.`,
          suggestedFix: `Let at least one clue-seeding scene be followed within two scenes by a dramatic turn — the thread planted now becomes part of what the pivot reveals, demands, or reframes. A seed that feeds into a turning point is a seed the audience cannot forget: when the turn arrives, the earlier plant is activated in retroactive significance, and the thread's existence changes the meaning of the pivot itself.`,
        });
      }
    }
  }

  // PAYOFF_CLOCK_AFTERMATH_ABSENT (sequence/aftermath × clock × payoff trigger, n≥8,
  // ≥3 qualifying payoff scenes not in last 2 positions, ≥2 clock scenes overall):
  // Every payoff scene is followed by 2 scenes with no clock event — thread closures never
  // tighten the story's deadline. A well-placed payoff should do more than close a thread: it
  // should accelerate the story's urgency. A revelation paid off just before a clock raise
  // converts a moment of narrative satisfaction into a moment of escalating pressure — the
  // closure is the fuse. When every payoff lands without a clock consequence in the scenes
  // that follow, resolutions function as releases of tension rather than as catalysts for
  // the next escalation. Sequence/aftermath mode × clock channel × payoff trigger. Distinct
  // from PAYOFF_CLOCK_DECOUPLED (Wave 356: no payoff coincides with a clock IN the same
  // scene — co-occurrence; this audits the 2 scenes FOLLOWING each payoff), PAYOFF_SUSPENSE_
  // RECOIL_ABSENT (Wave 440: suspense channel), PAYOFF_REVELATION_AFTERMATH_ABSENT (Wave 468:
  // revelation channel), PAYOFF_AFTERMATH_RELATIONSHIP_VOID (Wave 482: relational channel):
  // this adds clock to the payoff-aftermath family.
  if (records.length >= 8) {
    const clockScenes496c = (records as any[]).filter(r =>
      r.clockRaised === true || (r.clockDelta ?? 0) > 0,
    );
    const qualPayoffIdxs496c = (records as any[])
      .map((r, i) => (((r.payoffSetupIds ?? []) as string[]).length > 0 && i < records.length - 2 ? i : -1))
      .filter(i => i >= 0);
    if (qualPayoffIdxs496c.length >= 3 && clockScenes496c.length >= 2) {
      const anyClockAfterPayoff496c = qualPayoffIdxs496c.some(idx => {
        const window496c = (records as any[]).slice(idx + 1, idx + 3);
        return window496c.some((r: any) => r.clockRaised === true || (r.clockDelta ?? 0) > 0);
      });
      if (!anyClockAfterPayoff496c) {
        issues.push({
          location: `All ${qualPayoffIdxs496c.length} payoff scene(s) — no clock raise within 2 scenes`,
          rule: 'PAYOFF_CLOCK_AFTERMATH_ABSENT',
          severity: 'minor',
          description: `None of the story's ${qualPayoffIdxs496c.length} payoff scenes is followed by a clock raise (clockRaised or positive clockDelta) in the next two scenes, even though ${clockScenes496c.length} clock events exist elsewhere. Thread closures never tighten the story's deadline — payoffs function only as releases of tension, not as catalysts for the next urgency. The most effective payoffs are ones that close something behind the protagonist while opening something more dangerous ahead: the closed thread was the only option that bought time, and now that it is resolved, the clock becomes more audible. When every resolution is followed by clock silence, payoffs function as the story exhaling rather than as accelerants for the next act.`,
          suggestedFix: `Let at least one payoff scene be followed within two scenes by a clock raise — the closed thread reveals that the deadline is now tighter, the paid-off setup removes a buffer the protagonist was relying on, or the resolution unlocks a new escalation that demands immediate action. A payoff that feeds a clock raise converts audience satisfaction into forward dread, which is dramatically richer than satisfaction alone.`,
        });
      }
    }
  }

  // ── Wave 510: SEED_REVELATION_AFTERMATH_ABSENT, PAYOFF_SEED_AFTERMATH_ABSENT, SEED_DROUGHT_RUN ──

  // SEED_REVELATION_AFTERMATH_ABSENT (sequence/aftermath × revelation × seed trigger, n≥8,
  // ≥3 qualifying seed scenes not in last 2 positions, ≥2 revelation scenes overall):
  // Every seed scene is followed by 2 scenes with no revelation — planted clues never convert
  // into disclosures downstream. A seed followed soon by a revelation creates compound narrative
  // energy: the planted evidence becomes the foundation for the truth that surfaces, making both
  // the plant and the disclosure more resonant. When every seed is followed by revelation silence,
  // the evidence-planting and disclosure engines operate as separate machines that never cross-feed.
  // Sequence/aftermath mode × revelation channel × seed trigger. Distinct from SEED_SUSPENSE_
  // AFTERMATH_ABSENT (Wave 468: suspense channel), SEED_EMOTIONAL_AFTERMATH_ABSENT (Wave 468:
  // emotional channel), SEED_CURIOSITY_AFTERMATH_ABSENT (Wave 482: curiosity channel), SEED_
  // DRAMATIC_TURN_AFTERMATH_ABSENT (Wave 496: dramatic-turn channel): adds revelation, completing
  // the five-channel seed-aftermath family.
  if (records.length >= 8) {
    const revScenes510a = (records as any[]).filter(r =>
      r.revelation !== null && r.revelation !== undefined && r.revelation !== '',
    );
    const qualSeedIdxs510a = (records as any[])
      .map((r, i) => (((r.seededClueIds ?? []) as string[]).length > 0 && i < records.length - 2 ? i : -1))
      .filter(i => i >= 0);
    if (qualSeedIdxs510a.length >= 3 && revScenes510a.length >= 2) {
      const anyRevAfterSeed510a = qualSeedIdxs510a.some(idx => {
        const window510a = (records as any[]).slice(idx + 1, idx + 3);
        return window510a.some((r: any) => r.revelation !== null && r.revelation !== undefined && r.revelation !== '');
      });
      if (!anyRevAfterSeed510a) {
        issues.push({
          location: `All ${qualSeedIdxs510a.length} seed scene(s) — no revelation within 2 scenes`,
          rule: 'SEED_REVELATION_AFTERMATH_ABSENT',
          severity: 'minor',
          description: `None of the story's ${qualSeedIdxs510a.length} clue-seeding scenes is followed by a revelation in the next two scenes, even though ${revScenes510a.length} revelation scenes exist elsewhere. When a planted thread surfaces as a revelation shortly after it is seeded, the audience sees the evidence convert into knowledge, making both the plant and the disclosure more resonant — the planted clue becomes the evidence base for the truth that surfaces. When every seed is followed by revelation silence, the evidence-planting engine and the disclosure engine operate as entirely separate machines: the audience accumulates threads without seeing them quickly convert into knowledge, and the causal connection between planted evidence and surfaced truth is harder to register.`,
          suggestedFix: `Let at least one seed be followed within two scenes by a revelation that picks up the planted thread — the clue seeded in the earlier scene surfaces as the disclosure in the next scene or two, converting held evidence into narrative consequence. The revelation doesn't need to exhaust the thread; a partial disclosure that confirms the audience's suspicion while deepening the question is sufficient. What matters is that the seed and its downstream truth are causally visible within a short window.`,
        });
      }
    }
  }

  // PAYOFF_SEED_AFTERMATH_ABSENT (sequence/aftermath × seed × payoff trigger, n≥8,
  // ≥3 qualifying payoff scenes not in last 2 positions, ≥2 seed scenes overall):
  // Every payoff scene is followed by 2 scenes with no new seed — resolutions never generate
  // new threads downstream. A resolved thread should reveal what now needs tracking: the payoff
  // opens a gap that gets filled by a fresh seed in the following scenes, converting closure
  // into re-engagement. When every payoff is followed by seeding silence, resolutions are
  // pure exhaust — they close loops without reactivating the engine that generated them.
  // Sequence/aftermath mode × seed channel × payoff trigger. Distinct from PAYOFF_AFTERMATH_
  // QUESTION_VOID (Wave 426: combined curiosity AND seed absence — a harder condition), PAYOFF_
  // REVELATION_AFTERMATH_ABSENT (Wave 468: revelation channel), PAYOFF_CLOCK_AFTERMATH_ABSENT
  // (Wave 496: clock channel): first seed-channel entry in the payoff-aftermath family.
  if (records.length >= 8) {
    const seedScenes510b = (records as any[]).filter(r =>
      ((r.seededClueIds ?? []) as string[]).length > 0,
    );
    const qualPayoffIdxs510b = (records as any[])
      .map((r, i) => (((r.payoffSetupIds ?? []) as string[]).length > 0 && i < records.length - 2 ? i : -1))
      .filter(i => i >= 0);
    if (qualPayoffIdxs510b.length >= 3 && seedScenes510b.length >= 2) {
      const anySeedAfterPayoff510b = qualPayoffIdxs510b.some(idx => {
        const window510b = (records as any[]).slice(idx + 1, idx + 3);
        return window510b.some((r: any) => ((r.seededClueIds ?? []) as string[]).length > 0);
      });
      if (!anySeedAfterPayoff510b) {
        issues.push({
          location: `All ${qualPayoffIdxs510b.length} payoff scene(s) — no new seed within 2 scenes`,
          rule: 'PAYOFF_SEED_AFTERMATH_ABSENT',
          severity: 'minor',
          description: `None of the story's ${qualPayoffIdxs510b.length} payoff scenes is followed by a clue seed (seededClueIds) in the next two scenes, even though ${seedScenes510b.length} seed scenes exist elsewhere — every thread closure is met by planting silence. Resolutions are pure exhaust: they close loops without reactivating the engine that generated them. A resolved thread should reveal what now needs tracking: the evidence that paid off exposes a layer the protagonist hadn't suspected, and that layer plants the next thread in the scenes that follow. When every payoff is followed by seeding silence, the story only ever winds down — it never converts closure into the forward pressure of new questions.`,
          suggestedFix: `Let at least one payoff fire a new clue in the one or two scenes that follow: the closed thread reveals a new complication that the protagonist now needs to track. The new seed doesn't need to be unrelated to the payoff — it can be the consequence of the resolved thread, a new question that the answer to the old one has opened. A payoff that re-seeds the story converts resolution into momentum rather than into conclusion.`,
        });
      }
    }
  }

  // SEED_DROUGHT_RUN (run-based × seed × consecutive absence, n≥8, ≥3 seed scenes elsewhere):
  // 5+ consecutive scenes with no seededClueIds while seed scenes exist elsewhere in the story.
  // The thread-planting engine goes dark for a sustained stretch, leaving the audience without new
  // mysteries to track and severing the connective tissue between character action and unresolved
  // questions. Run-based mode × seed channel. Distinct from SETUP_PAYOFF_DEAD_RUN (Wave 342:
  // requires BOTH seeds and payoffs absent simultaneously — a harder condition; a drought of
  // seeding during active payoffs still fires here), CLUE_SEED_CONSECUTIVE_RUN (Wave 454:
  // consecutive seed PRESENCE — the flood mirror of this drought check).
  if (records.length >= 8) {
    const seedScenesElsewhere510c = (records as any[]).filter(r =>
      ((r.seededClueIds ?? []) as string[]).length > 0,
    );
    if (seedScenesElsewhere510c.length >= 3) {
      let maxDroughtRun510c = 0;
      let curDroughtRun510c = 0;
      for (const r of records as any[]) {
        if (((r.seededClueIds ?? []) as string[]).length === 0) {
          curDroughtRun510c++;
          if (curDroughtRun510c > maxDroughtRun510c) maxDroughtRun510c = curDroughtRun510c;
        } else {
          curDroughtRun510c = 0;
        }
      }
      if (maxDroughtRun510c >= 5) {
        issues.push({
          location: `${maxDroughtRun510c} consecutive scenes — seed drought`,
          rule: 'SEED_DROUGHT_RUN',
          severity: 'minor',
          description: `The script has a run of ${maxDroughtRun510c} consecutive scenes without any clue seeding (seededClueIds empty) while ${seedScenesElsewhere510c.length} seed scenes exist elsewhere — the thread-planting engine goes dark for a sustained stretch. During a five-or-more scene drought, the audience is given no new mysteries to track: the story continues to develop without adding to the question-debt that keeps viewers invested between moments of explicit payoff. The connective tissue between action and unresolved question vanishes from the drought zone, and those scenes risk reading as pure event — things happening without the added layer of what this will mean for what the audience doesn't yet understand.`,
          suggestedFix: `Plant at least one new clue within the drought run — a detail, a contradiction, a behaviour that registers as evidence for a question the audience hasn't yet been able to formulate. The seed doesn't need to be prominent; a small plant embedded in an action scene is enough to signal that the question-debt is still accumulating and that the scenes the audience is watching now will pay off later.`,
        });
      }
    }
  }

  // ── Wave 524 checks ──────────────────────────────────────────────────────
  {
    // SEED_SUSPENSE_AFTERMATH_ABSENT — sequence/aftermath × suspense × seed trigger.
    // n≥8, ≥3 qualifying seed scenes (seededClueIds non-empty, not in last 2 positions),
    // ≥2 suspense scenes (suspenseDelta > 0) elsewhere. Every seed is followed by 2 scenes
    // with suspenseDelta ≤ 0 → fire. Planting a clue never raises tension in what immediately
    // follows. Foreshadowing should generate pressure alongside anticipation; when seeds plant
    // questions but produce no tension in their aftermath, the planted threads feel like
    // informational deposits rather than pressure-building investments.
    // Distinct from: SEED_CURIOSITY_AFTERMATH_ABSENT (Wave 482: curiosity channel), SEED_
    // REVELATION_AFTERMATH_ABSENT (Wave 510: revelation channel), SEED_DRAMATIC_TURN_AFTERMATH_
    // ABSENT (Wave 496: dramatic-turn channel). Adds suspense to the seed-aftermath family.
    const n524a = records.length;
    if (n524a >= 8) {
      const qualSeeds524a = (records as any[]).filter((r, pos) =>
        ((r.seededClueIds ?? []) as string[]).length > 0 && pos < n524a - 2,
      );
      const suspScenes524a = (records as any[]).filter(r => (r.suspenseDelta ?? 0) > 0);
      if (qualSeeds524a.length >= 3 && suspScenes524a.length >= 2) {
        const allSeedNoSuspAftermath524a = qualSeeds524a.every((r: any) => {
          const pos = (records as any[]).indexOf(r);
          for (let off = 1; off <= 2; off++) {
            const nxt = (records as any[])[pos + off];
            if (nxt && (nxt.suspenseDelta ?? 0) > 0) return false;
          }
          return true;
        });
        if (allSeedNoSuspAftermath524a) {
          issues.push({
            location: `${qualSeeds524a.length} seed scene(s) — no suspense rise in any aftermath window`,
            rule: 'SEED_SUSPENSE_AFTERMATH_ABSENT',
            severity: 'minor',
            description: `Every clue-planting scene in the story (${qualSeeds524a.length} scene(s) with seededClueIds) is followed by two scenes where suspense does not rise (suspenseDelta ≤ 0), despite ${suspScenes524a.length} suspense-raising scenes existing elsewhere. Planting a clue should activate tension alongside anticipation: the audience knows something is hidden, and knowing that something is hidden should make them feel the pressure of what it might mean. When every seed's aftermath is tension-free, the planted threads operate purely as information deposits — they set up future answers but generate no immediate pressure that makes the audience feel the weight of what they have just been shown.`,
            suggestedFix: `After at least one seed scene, let the following scene carry a positive suspenseDelta — a threat that now feels more real because of what was just planted, a new obstacle that the seed complicates, or a deadline that the newly planted clue makes more urgent. A seed followed by a suspense rise is a double investment: the audience gains both a question to carry and a pressure to feel while carrying it.`,
          });
        }
      }
    }
  }

  {
    // SEED_EMOTION_AFTERMATH_ABSENT — sequence/aftermath × emotion × seed trigger.
    // n≥8, ≥3 qualifying seed scenes (seededClueIds non-empty, not in last 2 positions),
    // ≥2 emotional scenes (non-neutral emotionalShift) elsewhere. Every seed is followed
    // by 2 emotionally neutral scenes → fire. Clue-planting never generates felt consequence:
    // the audience sees evidence planted but the characters who planted it (or the ones around
    // them) never feel anything in response.
    // Distinct from: all existing seed-aftermath checks (curiosity/revelation/dramatic-turn/
    // suspense channels), PAYOFF_AFTERMATH_EMOTION_FLAT in pacing.ts (payoff trigger not seed).
    // Adds emotion to the seed-aftermath family, completing the set on the emotional channel.
    const n524b = records.length;
    if (n524b >= 8) {
      const qualSeeds524b = (records as any[]).filter((r, pos) =>
        ((r.seededClueIds ?? []) as string[]).length > 0 && pos < n524b - 2,
      );
      const emotScenes524b = (records as any[]).filter(r => (r.emotionalShift ?? 'neutral') !== 'neutral');
      if (qualSeeds524b.length >= 3 && emotScenes524b.length >= 2) {
        const allSeedNoEmoAftermath524b = qualSeeds524b.every((r: any) => {
          const pos = (records as any[]).indexOf(r);
          for (let off = 1; off <= 2; off++) {
            const nxt = (records as any[])[pos + off];
            if (nxt && (nxt.emotionalShift ?? 'neutral') !== 'neutral') return false;
          }
          return true;
        });
        if (allSeedNoEmoAftermath524b) {
          issues.push({
            location: `${qualSeeds524b.length} seed scene(s) — no emotional beat in any aftermath window`,
            rule: 'SEED_EMOTION_AFTERMATH_ABSENT',
            severity: 'minor',
            description: `Every clue-planting scene in the story (${qualSeeds524b.length} scene(s) with seededClueIds) is followed by two emotionally neutral scenes, despite ${emotScenes524b.length} emotional scene(s) existing elsewhere. Planting a clue is a protagonist act — they have gathered evidence, noticed a detail, or prepared a contingency — and that act should generate a felt consequence: relief at having planted a safeguard, unease at what the evidence implies, or excitement at the thread that has now been opened. When every seed's aftermath is emotionally flat, foreshadowing reads as pure procedural action rather than as a moment that matters to the characters living inside it.`,
            suggestedFix: `After at least one seed scene, introduce an emotional beat in the following scene — a character registering the weight of what was just planted. The feeling need not be large; even a brief moment of unease, hope, or resolve in the scene immediately after a seed confirms that the planted thread is alive in the character's emotional world, not just in the audience's information queue.`,
          });
        }
      }
    }
  }

  {
    // PAYOFF_RELATIONAL_AFTERMATH_ABSENT — sequence/aftermath × relational shift × payoff trigger.
    // n≥8, ≥3 qualifying payoffs (payoffSetupIds non-empty, not in last 2 positions),
    // ≥2 relational scenes (non-empty relationshipShifts) elsewhere. Every payoff is followed
    // by 2 scenes with no relationship shift → fire. Thread resolutions never move bonds in
    // their aftermath: when a planted promise is delivered, the characters' relationships remain
    // entirely unchanged in the scenes that follow.
    // Distinct from: PAYOFF_REVELATION_AFTERMATH_ABSENT (revelation channel), PAYOFF_SEED_
    // AFTERMATH_ABSENT (seed channel), PAYOFF_CLOCK_AFTERMATH_ABSENT (clock channel). First
    // relational-channel entry in the payoff-aftermath family; distinct from PAYOFF_RELATIONAL_
    // DECOUPLED if it exists (same-scene) and from all aftermath checks with seed/revelation
    // triggers.
    const n524c = records.length;
    if (n524c >= 8) {
      const qualPayoffs524c = (records as any[]).filter((r, pos) =>
        ((r.payoffSetupIds ?? []) as string[]).length > 0 && pos < n524c - 2,
      );
      const relScenes524c = (records as any[]).filter(r =>
        ((r.relationshipShifts ?? []) as any[]).length > 0,
      );
      if (qualPayoffs524c.length >= 3 && relScenes524c.length >= 2) {
        const allPayoffNoRelAftermath524c = qualPayoffs524c.every((r: any) => {
          const pos = (records as any[]).indexOf(r);
          for (let off = 1; off <= 2; off++) {
            const nxt = (records as any[])[pos + off];
            if (nxt && ((nxt.relationshipShifts ?? []) as any[]).length > 0) return false;
          }
          return true;
        });
        if (allPayoffNoRelAftermath524c) {
          issues.push({
            location: `${qualPayoffs524c.length} payoff scene(s) — no relational shift in any aftermath window`,
            rule: 'PAYOFF_RELATIONAL_AFTERMATH_ABSENT',
            severity: 'minor',
            description: `Every planted promise delivered in the story (${qualPayoffs524c.length} payoff scene(s)) is followed by two scenes in which no relationship moves, despite ${relScenes524c.length} relational scene(s) existing elsewhere. A thread resolution should move bonds in what follows: the delivered promise changes what the characters now know about each other (or what they owe each other), and that change should surface in the relational landscape of the immediately following scenes. When every payoff's aftermath is relationally frozen, resolutions feel purely thematic — they answer questions but do not move the people inside the story closer together or further apart.`,
            suggestedFix: `After at least one payoff scene, introduce a relationship shift in the following scene — a bond that warms because a planted promise was honored, or fractures because a planted threat was realized. The relational consequence need not be large; even a small shift in the scene after a payoff confirms that the delivery mattered to the people involved and gives the payoff a second layer beyond its informational closure.`,
          });
        }
      }
    }
  }

  {
    // PAYOFF_DRAMATIC_TURN_AFTERMATH_ABSENT — sequence/aftermath × dramatic turn × payoff trigger.
    // n≥8, ≥3 qualifying payoffs (payoffSetupIds non-empty, not in last 2 positions),
    // ≥2 dramatic-turn scenes (dramaticTurn !== 'nothing') elsewhere. Every payoff is followed
    // by 2 scenes with no dramatic turn → fire. Thread resolution should energize the story into
    // a new pivot; when no payoff is followed by a turn in its aftermath, closures produce no
    // momentum — the story resolves questions but never redirects.
    // Distinct from: PAYOFF_DRAMATIC_TURN_DECOUPLED (Wave 342: co-occurrence, same scene),
    // PAYOFF_REVELATION_AFTERMATH_ABSENT (revelation channel), PAYOFF_SEED_AFTERMATH_ABSENT (seed
    // channel), PAYOFF_CLOCK_AFTERMATH_ABSENT (clock channel). Completes the payoff-aftermath
    // family with the dramatic-turn channel.
    const n538a = records.length;
    if (n538a >= 8) {
      const qualPayoffs538a = (records as any[]).filter((r, pos) =>
        ((r.payoffSetupIds ?? []) as string[]).length > 0 && pos < n538a - 2,
      );
      const turnScenes538a = (records as any[]).filter(r => (r.dramaticTurn ?? 'nothing') !== 'nothing');
      if (qualPayoffs538a.length >= 3 && turnScenes538a.length >= 2) {
        const allPayoffNoTurnAftermath538a = qualPayoffs538a.every((r: any) => {
          const pos = (records as any[]).indexOf(r);
          for (let off = 1; off <= 2; off++) {
            const nxt = (records as any[])[pos + off];
            if (nxt && (nxt.dramaticTurn ?? 'nothing') !== 'nothing') return false;
          }
          return true;
        });
        if (allPayoffNoTurnAftermath538a) {
          issues.push({
            location: `${qualPayoffs538a.length} payoff scene(s) — no dramatic turn in any aftermath window`,
            rule: 'PAYOFF_DRAMATIC_TURN_AFTERMATH_ABSENT',
            severity: 'minor',
            description: `Every planted promise delivered in the story (${qualPayoffs538a.length} payoff scene(s)) is followed by two scenes in which no dramatic turn occurs, despite ${turnScenes538a.length} pivot scene(s) existing elsewhere. A thread resolution should channel its release energy into a new directional shift: the delivered promise changes what the characters know or can do, and that change should propel the story into a new pivot within the following two scenes. When every payoff's aftermath is pivot-free, closures operate as terminal events — they answer the story's questions but generate no forward momentum, making the resolution phase feel like a gradual winding-down rather than a continuing engine.`,
            suggestedFix: `After at least one payoff scene, introduce a dramatic turn within the following scene — a reversal, discovery, or shift in direction enabled or triggered by the promise that was just delivered. The turn need not be large; even a small pivot that redefines what the characters want next confirms that the payoff changed the story's trajectory rather than simply closing a loop.`,
          });
        }
      }
    }
  }

  {
    // SEED_RELATIONSHIP_AFTERMATH_ABSENT — sequence/aftermath × relationship × seed trigger.
    // n≥8, ≥3 qualifying seed scenes (seededClueIds non-empty, not in last 2 positions),
    // ≥2 relational scenes (non-empty relationshipShifts) elsewhere. Every seed is followed
    // by 2 scenes with no relationship shift → fire. Planting a clue is a discovery that
    // should reshape the relational landscape; when no seed leads to a bond shift in its
    // aftermath, the planted threads live in informational isolation, disconnected from the
    // human relationships they should be straining.
    // Distinct from: CLUE_SEED_RELATIONSHIP_DECOUPLED (Wave 342: co-occurrence, same scene),
    // SEED_DRAMATIC_TURN_AFTERMATH_ABSENT (Wave 496: dramatic-turn channel), SEED_CURIOSITY_
    // AFTERMATH_ABSENT (Wave 482: curiosity channel), SEED_REVELATION_AFTERMATH_ABSENT (Wave 510:
    // revelation channel). Adds the relationship channel to the seed-aftermath family.
    const n538b = records.length;
    if (n538b >= 8) {
      const qualSeeds538b = (records as any[]).filter((r, pos) =>
        ((r.seededClueIds ?? []) as string[]).length > 0 && pos < n538b - 2,
      );
      const relScenes538b = (records as any[]).filter(r =>
        ((r.relationshipShifts ?? []) as any[]).length > 0,
      );
      if (qualSeeds538b.length >= 3 && relScenes538b.length >= 2) {
        const allSeedNoRelAftermath538b = qualSeeds538b.every((r: any) => {
          const pos = (records as any[]).indexOf(r);
          for (let off = 1; off <= 2; off++) {
            const nxt = (records as any[])[pos + off];
            if (nxt && ((nxt.relationshipShifts ?? []) as any[]).length > 0) return false;
          }
          return true;
        });
        if (allSeedNoRelAftermath538b) {
          issues.push({
            location: `${qualSeeds538b.length} seed scene(s) — no relational shift in any aftermath window`,
            rule: 'SEED_RELATIONSHIP_AFTERMATH_ABSENT',
            severity: 'minor',
            description: `Every clue-planting scene in the story (${qualSeeds538b.length} scene(s) with seededClueIds) is followed by two scenes in which no relationship moves, despite ${relScenes538b.length} relational scene(s) existing elsewhere. Planting a clue is an act of discovery — a character notices, hides, or weaponizes information — and that act should strain the bonds between characters in what immediately follows: the person who planted the seed is now carrying a secret, and that secret should surface as tension, distance, or betrayal in the relational landscape of the next scenes. When every seed's aftermath is relationally frozen, the planted threads feel like pure information deposits that exist in a vacuum, disconnected from the human relationships they should be pressurising.`,
            suggestedFix: `After at least one seed scene, introduce a relationship shift in the following scene — a character who now knows something pulling away from one who doesn't, or a new alliance forming around the shared discovery. The relational consequence need not be large; even a subtle shift in the scene after a seed confirms that the planted information is alive in the story's relational economy, not just in its information queue.`,
          });
        }
      }
    }
  }

  {
    // SEED_CLOCK_AFTERMATH_ABSENT — sequence/aftermath × clock × seed trigger.
    // n≥8, ≥3 qualifying seed scenes (seededClueIds non-empty, not in last 2 positions),
    // ≥2 clock scenes (clockRaised=true) elsewhere. Every seed is followed by 2 scenes
    // with no clock raise → fire. Planting a clue should activate urgency alongside
    // anticipation; when no seed is followed by a ticking-clock escalation, the clue-planting
    // engine and the deadline engine never compound, missing the most powerful form of
    // foreshadowing: evidence that carries an expiry date.
    // Distinct from: CLUE_SEED_CLOCK_DECOUPLED (Wave 384: co-occurrence, same scene), SEED_
    // DRAMATIC_TURN_AFTERMATH_ABSENT (Wave 496: turn channel), SEED_RELATIONSHIP_AFTERMATH_ABSENT
    // (Wave 538: relationship channel). Adds the clock channel to the seed-aftermath family.
    const n538c = records.length;
    if (n538c >= 8) {
      const qualSeeds538c = (records as any[]).filter((r, pos) =>
        ((r.seededClueIds ?? []) as string[]).length > 0 && pos < n538c - 2,
      );
      const clockScenes538c = (records as any[]).filter(r => r.clockRaised === true);
      if (qualSeeds538c.length >= 3 && clockScenes538c.length >= 2) {
        const allSeedNoClockAftermath538c = qualSeeds538c.every((r: any) => {
          const pos = (records as any[]).indexOf(r);
          for (let off = 1; off <= 2; off++) {
            const nxt = (records as any[])[pos + off];
            if (nxt && nxt.clockRaised === true) return false;
          }
          return true;
        });
        if (allSeedNoClockAftermath538c) {
          issues.push({
            location: `${qualSeeds538c.length} seed scene(s) — no clock raise in any aftermath window`,
            rule: 'SEED_CLOCK_AFTERMATH_ABSENT',
            severity: 'minor',
            description: `Every clue-planting scene in the story (${qualSeeds538c.length} scene(s) with seededClueIds) is followed by two scenes in which no deadline is activated (clockRaised stays false), despite ${clockScenes538c.length} clock-raising scene(s) existing elsewhere. Planting a clue should couple with urgency: once evidence is hidden in the story, the clock that makes that evidence matter should start ticking nearby. When seeds and clock raises always occur in separate pockets of the narrative, the planted threads lack expiry dates — the audience knows a secret exists but feels no time pressure around it, producing curiosity without the tension that makes that curiosity urgent.`,
            suggestedFix: `After at least one seed scene, let the following scene raise a deadline or escalate an existing clock — a threat that becomes more pressing because of what was just discovered, or a new ticking fuse lit by the information that was just planted. The coupling creates foreshadowing with teeth: the audience now carries both a hidden question and a ticking pressure that makes resolving that question feel urgent.`,
          });
        }
      }
    }
  }

  {
    // PAYOFF_DROUGHT_RUN — run-based × payoff × consecutive absence.
    // n≥10, ≥4 payoff scenes. Longest consecutive run of scenes with no payoff ≥5 → fire.
    // The payoff engine should deliver at a rate that keeps open loops from going stale;
    // a drought of 5+ consecutive non-payoff scenes in a story that otherwise resolves
    // threads signals that the delivery engine has stalled — the audience forgets which
    // promises were made while the silence accumulates.
    // Distinct from: PAYOFF_CONSECUTIVE_RUN (Wave 426: run-based × consecutive presence —
    // the inverse, a "resolution avalanche" of 3+ payoffs in a row), SEED_DROUGHT_RUN (Wave
    // 510: same drought mode but seed trigger), SETUP_PAYOFF_DEAD_RUN (Wave 342: requires
    // both seeds AND payoffs simultaneously absent — this fires on the payoff axis alone).
    const n552a = records.length;
    if (n552a >= 10) {
      const isPayoff552a = new Set(
        (records as any[])
          .filter(r => ((r.payoffSetupIds ?? []) as string[]).length > 0)
          .map(r => r.sceneIdx),
      );
      if (isPayoff552a.size >= 4) {
        let maxRun552a = 0;
        let curRun552a = 0;
        for (const r of records as any[]) {
          if (isPayoff552a.has(r.sceneIdx)) {
            curRun552a = 0;
          } else {
            curRun552a++;
            if (curRun552a > maxRun552a) maxRun552a = curRun552a;
          }
        }
        if (maxRun552a >= 5) {
          issues.push({
            location: `${maxRun552a} consecutive scene(s) with no payoff`,
            rule: 'PAYOFF_DROUGHT_RUN',
            severity: 'minor',
            description: `Despite ${isPayoff552a.size} payoff scene(s) distributed across the story, there is a run of ${maxRun552a} consecutive scenes in which no planted promise is delivered. A payoff drought of this length allows open loops to go cold: the audience remembers that a clue was planted, but the sustained silence makes them uncertain whether the story is still tracking that thread or has quietly abandoned it. The planted-promise engine should fire at a frequency that keeps open loops alive in the audience's working memory, not in clusters separated by long stretches where nothing is resolved.`,
            suggestedFix: `Break the ${maxRun552a}-scene payoff drought by delivering at least one planted promise within the run — even a minor thread resolved mid-drought keeps the delivery engine active and reassures the audience that the story is still tracking its promises. If the drought is intentional (a deliberate deferral building pressure), add a scene mid-run that explicitly echoes an unresolved clue, confirming the thread is still live rather than forgotten.`,
          });
        }
      }
    }
  }

  {
    // SEED_RELATIONSHIP_VALENCE_UNIFORM — valence × relationship × seed trigger.
    // n≥8, ≥2 seed scenes that each also carry a relationship shift (seededClueIds non-empty
    // AND non-empty relationshipShifts). Every relational shift amount across all such scenes
    // shares one sign (all > 0 or all < 0) → fire. When the clue-planting engine is
    // coupled to relational shifts, those shifts should have mixed valences: some truths draw
    // characters together while others drive them apart. Monotone valence robs the seeded
    // threads of their full dramatic range.
    // Distinct from: PAYOFF_RELATIONSHIP_VALENCE_UNIFORM (Wave 426: payoff trigger vs. seed
    // trigger here), CLUE_SEED_RELATIONSHIP_DECOUPLED (Wave 342: co-occurrence mode, fires
    // when NO seed scene has any relShift — opposite condition), SEED_RELATIONSHIP_AFTERMATH_
    // ABSENT (Wave 538: aftermath mode, fires when no relShift appears in the 2 scenes after
    // any seed — a different structural position).
    const n552b = records.length;
    if (n552b >= 8) {
      const seedRelRecs552b = (records as any[]).filter(r =>
        ((r.seededClueIds ?? []) as string[]).length > 0 &&
        ((r.relationshipShifts ?? []) as any[]).length > 0,
      );
      if (seedRelRecs552b.length >= 2) {
        const amounts552b = seedRelRecs552b.flatMap((r: any) =>
          ((r.relationshipShifts ?? []) as Array<{ amount: number }>).map(s => s.amount),
        );
        const allPos552b = amounts552b.every(a => a > 0);
        const allNeg552b = amounts552b.every(a => a < 0);
        if (allPos552b || allNeg552b) {
          const valence552b = allPos552b ? 'positive (repair-only)' : 'negative (rupture-only)';
          issues.push({
            location: `${seedRelRecs552b.length} seed-with-relationship scene(s) — all ${valence552b}`,
            rule: 'SEED_RELATIONSHIP_VALENCE_UNIFORM',
            severity: 'minor',
            description: `Every scene that both plants a clue and moves a relationship (${seedRelRecs552b.length} scene(s) with seededClueIds and non-empty relationshipShifts) carries relational shifts in the same direction (${valence552b}). Planted clues are discoveries — information that should have asymmetric effects on the bonds around them: some truths draw characters together (shared secrets, confirmed loyalties) while others fracture alliances (betrayals exposed, vulnerabilities weaponised). When every seed-with-relationship scene skews one way, the clue-planting engine is locked into a single relational gear, robbing the planted threads of their full emotional range and making the story's information-and-relationship engines predictably coupled.`,
            suggestedFix: `Introduce at least one seed scene whose relational consequence runs ${allPos552b ? 'negative' : 'positive'} — a planted clue that ${allPos552b ? 'fractures a bond (a discovery that implies betrayal, a secret that creates distance, evidence of hidden disloyalty)' : 'repairs or deepens a bond (a shared discovery that creates alliance, a truth that confirms loyalty, evidence of hidden protection)'}. The mix of relational valences gives the planted-thread engine both emotional colors, so that each new clue carries genuine uncertainty about what it will do to the relationships around it.`,
          });
        }
      }
    }
  }

  {
    // PAYOFF_EMOTIONAL_VALENCE_UNIFORM — valence × emotional × payoff trigger.
    // n≥8, ≥3 payoff scenes, ≥2 with non-neutral emotionalShift. Every non-neutral payoff
    // scene shares the same emotional valence (all 'positive' or all 'negative') → fire.
    // When resolutions always produce relief or always produce grief, the payoff engine is
    // emotionally monotone: the audience can predict the feeling-tone of each closure before
    // it arrives, draining the scenes of affective surprise.
    // Distinct from: PAYOFF_EMOTION_DECOUPLED (Wave 317: co-occurrence mode — fires when ALL
    // payoffs are emotionally neutral; this check fires when emotion IS present but one-signed),
    // PAYOFF_RELATIONSHIP_VALENCE_UNIFORM (Wave 426: valence × relationship channel vs. emotion
    // channel here), SEED_RELATIONSHIP_VALENCE_UNIFORM (Wave 552: seed trigger vs. payoff trigger
    // here, and relationship channel vs. emotion channel).
    const n552c = records.length;
    if (n552c >= 8) {
      const payoffRecs552c = (records as any[]).filter(r =>
        ((r.payoffSetupIds ?? []) as string[]).length > 0,
      );
      if (payoffRecs552c.length >= 3) {
        const nonNeutral552c = payoffRecs552c.filter(
          (r: any) => r.emotionalShift !== 'neutral' && r.emotionalShift != null,
        );
        if (nonNeutral552c.length >= 2) {
          const allPositive552c = nonNeutral552c.every((r: any) => r.emotionalShift === 'positive');
          const allNegative552c = nonNeutral552c.every((r: any) => r.emotionalShift === 'negative');
          if (allPositive552c || allNegative552c) {
            const val552c = allPositive552c ? 'positive' : 'negative';
            issues.push({
              location: `${nonNeutral552c.length} emotionally-charged payoff scene(s) — all ${val552c}`,
              rule: 'PAYOFF_EMOTIONAL_VALENCE_UNIFORM',
              severity: 'minor',
              description: `Every payoff scene with a non-neutral emotional charge (${nonNeutral552c.length} scene(s)) carries a ${val552c} emotional shift — delivered promises produce only ${val552c === 'positive' ? 'relief, triumph, or joy' : 'grief, loss, or defeat'}. Resolutions should have emotionally diverse consequences: some threads pay off with earned relief (a feared truth proved false, a loyalty confirmed), while others land with painful recognition (a feared truth confirmed, a sacrifice seen too late to matter). When all emotionally-charged closures skew ${val552c}, the audience loses the element of surprise in the resolution phase — each new payoff arrives pre-announced by its predictable feeling-tone, and the cumulative effect is a resolution engine that feels rigged to one emotional outcome.`,
              suggestedFix: `Introduce at least one payoff scene whose emotional charge runs ${val552c === 'positive' ? 'negative' : 'positive'} — a delivered promise that lands with ${val552c === 'positive' ? 'grief, loss, or painful confirmation of a feared truth (a clue that was right all along, a loyalty that turned out to be conditional)' : 'relief, vindication, or earned joy (a feared betrayal revealed as misdirection, a thread that resolves with unexpected grace)'}. The contrast gives the resolution engine both registers, so each closure carries genuine uncertainty about whether the delivery will hurt or heal.`,
            });
          }
        }
      }
    }
  }

  // ── Wave 566: PAYOFF_CLOCK_PEAK_DECOUPLED, SEED_EMOTIONAL_VALENCE_UNIFORM,
  //              CLUE_SEED_TEMPORAL_CLUSTER ──────────────────────────────────────────────────────
  {
    // PAYOFF_CLOCK_PEAK_DECOUPLED — single-peak isolation × clockDelta × payoff.
    // n≥8, ≥2 payoff scenes, maxClockDelta > 1. The single highest-clockDelta scene (the story's
    // maximum-urgency moment) carries no payoff, even though planted threads resolve elsewhere. The
    // peak-deadline beat — when time pressure is at its most acute — is not where any thread snaps
    // shut, so the most charged delivery slot for a payoff goes unused. Resolving a long-planted
    // thread at the moment the clock is loudest doubles the force: the audience gets the answer and
    // the urgency at once. When the clock peak and the payoff engine never meet, the story forfeits
    // the compound impact of a promise delivered against a ticking deadline.
    // Distinct from: PAYOFF_SUSPENSE_PEAK_DECOUPLED / PAYOFF_CURIOSITY_PEAK_DECOUPLED / PAYOFF_
    // RELATIONSHIP_PEAK_DECOUPLED (Waves 384/412: same single-peak mode, but the suspense, curiosity,
    // and relationship channels — this adds the clock channel, completing the payoff peak-decoupled
    // family), PAYOFF_CLOCK_DECOUPLED (co-occurrence — fires when NO payoff scene raises a clock, an
    // aggregate same-scene check, not single-peak isolation), PAYOFF_CLOCK_AFTERMATH_ABSENT (aftermath
    // mode — what follows a payoff). First clock-channel entry in the payoff peak-decoupled family.
    const n566a = records.length;
    if (n566a >= 8) {
      const payoffScenes566a = (records as any[]).filter(r => ((r.payoffSetupIds ?? []) as string[]).length > 0);
      const maxClock566a = Math.max(...(records as any[]).map(r => r.clockDelta ?? 0));
      if (payoffScenes566a.length >= 2 && maxClock566a > 1) {
        const peakClock566a = (records as any[]).find(r => (r.clockDelta ?? 0) === maxClock566a);
        if (peakClock566a && ((peakClock566a.payoffSetupIds ?? []) as string[]).length === 0) {
          issues.push({
            location: `Scene ${peakClock566a.sceneIdx} — peak clockDelta (${maxClock566a})`,
            rule: 'PAYOFF_CLOCK_PEAK_DECOUPLED',
            severity: 'minor',
            description: `The story's highest-clockDelta scene (Scene ${peakClock566a.sceneIdx}, clockDelta ${maxClock566a}) carries no payoff, even though ${payoffScenes566a.length} other scenes resolve planted threads. The moment of maximum deadline pressure — when the clock is loudest and the audience most feels time running out — is not where any thread snaps shut. The peak-urgency beat and the satisfaction of resolution never meet, so the most charged delivery slot for a payoff is left empty. A promise delivered at the moment the clock is at its most acute lands with doubled force: the audience receives the answer and the urgency in a single beat.`,
            suggestedFix: 'Land a payoff at the peak-clock scene: resolving a long-planted thread at the moment of maximum deadline pressure fuses urgency with satisfaction — the audience gets the delivery and the ticking clock at once. The scene where time is most acutely running out is one of the most powerful places in the story to pay something off, because the resolution arrives under pressure rather than in calm.',
          });
        }
      }
    }
  }

  {
    // SEED_EMOTIONAL_VALENCE_UNIFORM — valence × emotional × seed trigger.
    // n≥8, ≥2 seed scenes carrying a non-neutral emotionalShift. Every emotionally-charged seed
    // scene shares the same valence (all 'positive' or all 'negative') → fire. When clue-planting is
    // coupled to emotion, those emotions should run in both directions: some discoveries land with
    // dread or unease (a clue that implies danger), while others land with hope or relief (a clue
    // that promises a way forward). Monotone emotional valence locks the foreshadowing engine into a
    // single feeling-tone — every planted thread arrives pre-colored with the same affect, draining
    // the seeds of their full dramatic range and making the audience able to predict the emotional
    // register of each new clue before its content registers.
    // Distinct from: PAYOFF_EMOTIONAL_VALENCE_UNIFORM (Wave 552: payoff trigger vs. seed trigger
    // here), SEED_RELATIONSHIP_VALENCE_UNIFORM (Wave 552: relationship channel vs. emotion channel
    // here), SEED_EMOTION_AFTERMATH_ABSENT (Wave 524: aftermath mode, fires when seeds produce NO
    // emotion in the 2 following scenes — this check fires when emotion IS present in the seed scenes
    // but is one-signed), CLUE_SEED_EMOTION_FLAT (co-occurrence — fires when seed scenes are
    // emotionally neutral; this fires when they are emotional but monotone). Completes the valence
    // family across both triggers (seed, payoff) and both channels (relationship, emotion).
    const n566b = records.length;
    if (n566b >= 8) {
      const seedEmoRecs566b = (records as any[]).filter(r =>
        ((r.seededClueIds ?? []) as string[]).length > 0 &&
        r.emotionalShift !== 'neutral' && r.emotionalShift != null,
      );
      if (seedEmoRecs566b.length >= 2) {
        const allPos566b = seedEmoRecs566b.every((r: any) => r.emotionalShift === 'positive');
        const allNeg566b = seedEmoRecs566b.every((r: any) => r.emotionalShift === 'negative');
        if (allPos566b || allNeg566b) {
          const val566b = allPos566b ? 'positive' : 'negative';
          issues.push({
            location: `${seedEmoRecs566b.length} emotionally-charged seed scene(s) — all ${val566b}`,
            rule: 'SEED_EMOTIONAL_VALENCE_UNIFORM',
            severity: 'minor',
            description: `Every clue-planting scene that carries a non-neutral emotional charge (${seedEmoRecs566b.length} scene(s) with seededClueIds and ${val566b} emotionalShift) skews the same way — foreshadowing always arrives wrapped in ${val566b === 'positive' ? 'hope, relief, or anticipation' : 'dread, unease, or foreboding'}. Planted clues are discoveries, and discoveries should land with asymmetric emotional effects: some seeds promise danger (a detail glimpsed that implies threat), others promise possibility (a clue that hints at a way through). When every emotionally-charged seed runs ${val566b}, the foreshadowing engine is locked into one feeling-tone, and the audience learns to read every new clue's emotional register before its content arrives — the planted threads lose the uncertainty that makes foreshadowing suspenseful rather than merely decorative.`,
            suggestedFix: `Introduce at least one seed scene whose emotional charge runs ${allPos566b ? 'negative' : 'positive'} — a planted clue that lands with ${allPos566b ? 'dread or foreboding (a detail that implies a hidden threat, evidence of something gone wrong)' : 'hope or relief (a clue that hints at an unexpected resource, a sign that a feared outcome may be avoidable)'}. The mix of emotional valences gives the foreshadowing engine both registers, so each new clue carries genuine uncertainty about whether what it portends will be welcome or feared.`,
          });
        }
      }
    }
  }

  {
    // CLUE_SEED_TEMPORAL_CLUSTER — distribution/timing × seed × structural thirds.
    // n≥9, ≥3 seed scenes (seededClueIds non-empty), >75% of them fall in a single structural third
    // → fire. The story's foreshadowing is ghettoized into one structural zone — the opening, middle,
    // or closing third carries the overwhelming majority of all clue-planting while the other
    // two-thirds plant almost nothing. A thirds-based cluster is finer-grained than the binary
    // half-partition checks: a script can split its seeds evenly across the two halves and still
    // concentrate three-quarters of them in, say, the middle third, leaving both the opening and the
    // climax approach without fresh foreshadowing. When seeds cluster in one zone, the planting engine
    // fires in a single burst rather than threading anticipation continuously through the story — the
    // audience receives a concentrated dose of "remember this" and then a long stretch with no new
    // promises to carry forward.
    // Distinct from: CLUE_SEED_FRONT_LOADED (Wave 384: binary first-half >X% concentration — this
    // uses three zones and can fire on a middle- or closing-third cluster the half-check would miss),
    // CLUE_SEED_LATE_MAJORITY (binary second-half majority — same half-partition limitation), CLUE_
    // SEED_MIDPOINT_VOID (zone presence/absence — fires on ABSENCE from the middle, this fires on
    // OVER-concentration in any single third), PAYOFF_TEMPORAL_CLUSTER (Wave 496: same thirds mode
    // and >75% threshold but on the payoff channel — this is the seed-channel sibling). First
    // thirds-based distribution check on the seed channel in this pass.
    const n566c = records.length;
    if (n566c >= 9) {
      const seedPositions566c = (records as any[])
        .map((r, pos) => ({ r, pos }))
        .filter(({ r }) => ((r.seededClueIds ?? []) as string[]).length > 0)
        .map(({ pos }) => pos);
      if (seedPositions566c.length >= 3) {
        const third566c = Math.floor(n566c / 3);
        const firstZone566c = seedPositions566c.filter(p => p < third566c).length;
        const lastZone566c = seedPositions566c.filter(p => p >= 2 * third566c).length;
        const midZone566c = seedPositions566c.length - firstZone566c - lastZone566c;
        const maxZone566c = Math.max(firstZone566c, midZone566c, lastZone566c);
        if (maxZone566c / seedPositions566c.length > 0.75) {
          const zoneName566c =
            maxZone566c === firstZone566c ? 'opening' : maxZone566c === lastZone566c ? 'closing' : 'middle';
          issues.push({
            location: `seed distribution: ${firstZone566c} opening / ${midZone566c} middle / ${lastZone566c} closing third — ${Math.round((maxZone566c / seedPositions566c.length) * 100)}% in the ${zoneName566c} third`,
            rule: 'CLUE_SEED_TEMPORAL_CLUSTER',
            severity: 'minor',
            description: `${Math.round((maxZone566c / seedPositions566c.length) * 100)}% of the story's ${seedPositions566c.length} clue-planting scenes are concentrated in the ${zoneName566c} structural third, leaving the other two-thirds with almost no foreshadowing. Unlike a front-vs-back skew, this is a single-zone cluster: the seeds are planted almost entirely within one third of the runtime while the rest of the story plants nothing. When foreshadowing is ghettoized into one zone, the planting engine fires in a single concentrated burst rather than threading anticipation continuously through the narrative — the audience receives a dose of "remember this" all at once and then carries it through long stretches with no new promises being made. The most propulsive mysteries plant clues across all three structural zones so the audience always has fresh threads to track.`,
            suggestedFix: `Redistribute some of the ${zoneName566c} third's seeds into the other two zones so foreshadowing threads through the full arc rather than bursting in one stretch. Each structural third can carry its own planted promise: an early seed that establishes a question, a middle seed that complicates it, and a late seed that sets up the climax's final turn. Spreading clue-planting across the thirds keeps the audience continuously anticipating rather than front-loading or burying the story's promises in a single zone.`,
          });
        }
      }
    }
  }

  // ── Wave 580: ─────────────────────────────────────────────────────────────

  // SEED_OPENING_ZONE_ABSENT — zone presence/absence × seed × opening structural third.
  // n≥9, ≥4 seed scenes (seededClueIds non-empty), none fall in the opening structural third
  // (positions < ⌊n/3⌋) → fire. The setup act plants no foreshadowing — all clue-seeding is
  // deferred past the opening, missing the prime window where audiences form expectations. The
  // opening third is where the audience's curiosity architecture is established; seeds planted
  // there become questions carried through the entire story. When the opening third plants
  // nothing, the audience arrives at complication and climax without any pre-established
  // promises to look forward to resolving.
  // Distinct from: CLUE_SEED_FRONT_LOADED (Wave 384: >60% of seeds in first HALF — fires when
  // TOO MUCH is planted early, opposite direction), CLUE_DENSITY_FRONT_COLLAPSE (Wave 289: all
  // seeds in first 20% — over-concentration at the very start, opposite direction), CLUE_SEED_
  // MIDPOINT_VOID (Wave 370: absence from 40–60% pivot zone — different zone), SEED_ACT3_VOID
  // (Wave 482: absence from final 25%), CLUE_SEED_TEMPORAL_CLUSTER (Wave 566: over-concentration
  // in any single third — fires when seeds are too concentrated, not absent). First zone-absence
  // check on the seed channel's opening zone.
  {
    const n580a = records.length;
    if (n580a >= 9) {
      const seedPositions580a = (records as any[])
        .map((r: any, pos: number) => ({ r, pos }))
        .filter(({ r }) => ((r.seededClueIds ?? []) as any[]).length > 0)
        .map(({ pos }) => pos);
      if (seedPositions580a.length >= 4) {
        const openingEnd580a = Math.floor(n580a / 3);
        const hasSeedInOpening580a = seedPositions580a.some(p => p < openingEnd580a);
        if (!hasSeedInOpening580a) {
          issues.push({
            location: `${seedPositions580a.length} seed scenes — none in the opening third (scenes 1–${openingEnd580a})`,
            rule: 'SEED_OPENING_ZONE_ABSENT',
            severity: 'minor',
            description: `The story has ${seedPositions580a.length} clue-planting scenes, but none of them fall in the opening structural third (scenes 1–${openingEnd580a}). All foreshadowing is deferred past the setup act — the opening gives the audience no planted questions to carry into the complication. The opening third is the prime window for foreshadowing: seeds planted early become promises the audience tracks through the entire story, building the anticipation that makes eventual payoffs satisfying. When the opening plants nothing, the audience enters the complication and climax without any established threads to resolve, and the payoffs that arrive later must earn their satisfaction without the foundation of early-planted anticipation.`,
            suggestedFix: `Plant at least one clue in the opening structural third — introduce an object, a detail, a behavior, or a fragment of information whose significance is not yet clear but which will matter later. It need not be obvious; the subtlest seeds can be the most satisfying when they pay off. The goal is to give the audience at least one "I should remember this" moment before the opening third ends, so the complication and climax have something they are delivering on rather than introducing from scratch.`,
          });
        }
      }
    }
  }

  // PAYOFF_SEED_DECOUPLED — co-occurrence/decoupling × payoff × seed (same-scene).
  // n≥8, ≥3 payoff scenes (payoffSetupIds non-empty), ≥3 seed scenes (seededClueIds non-empty);
  // no single scene carries both simultaneously → fire. The compound effect of simultaneously
  // resolving one thread and planting another creates the most propulsive narrative beats: the
  // audience receives satisfaction and immediately a new hook, so closure and curiosity coexist.
  // When payoffs and seeds never share a scene, every resolution is a pure dead-end and every
  // seed is an unattached beginning — completion and continuation engines run in separate lanes.
  // Distinct from: PAYOFF_AFTERMATH_QUESTION_VOID (Wave 426: no seed in the 2 scenes AFTER a
  // payoff — aftermath mode, not same-scene co-occurrence), PAYOFF_SEED_AFTERMATH_ABSENT (Wave
  // 510: no seed scene in the 2 scenes following a payoff — also aftermath mode), CLUE_SEED_
  // DRAMATIC_TURN_DECOUPLED (co-occurrence × seed × turn — different second signal). First co-
  // occurrence check for the payoff × seed cross-channel pair (same-scene coincidence mode).
  {
    const n580b = records.length;
    if (n580b >= 8) {
      const payoffCount580b = (records as any[]).filter((r: any) =>
        ((r.payoffSetupIds ?? []) as any[]).length > 0,
      ).length;
      const seedCount580b = (records as any[]).filter((r: any) =>
        ((r.seededClueIds ?? []) as any[]).length > 0,
      ).length;
      if (payoffCount580b >= 3 && seedCount580b >= 3) {
        const anyOverlap580b = (records as any[]).some((r: any) =>
          ((r.payoffSetupIds ?? []) as any[]).length > 0 &&
          ((r.seededClueIds ?? []) as any[]).length > 0,
        );
        if (!anyOverlap580b) {
          issues.push({
            location: `${payoffCount580b} payoff scenes and ${seedCount580b} seed scenes never coincide`,
            rule: 'PAYOFF_SEED_DECOUPLED',
            severity: 'minor',
            description: `The story has ${payoffCount580b} scenes that resolve planted setups and ${seedCount580b} scenes that plant new clues, but no scene does both simultaneously. Scenes where a resolution and a new seed coincide are among the story's most propulsive beats: they close one open loop while immediately opening another, so the audience receives satisfaction and forward-pull in the same moment. When payoffs and seeds never share a scene, every resolution is a pure dead-end and every seed is an unattached beginning — the story's completion and curiosity engines run in entirely separate lanes. The audience leaves each payoff scene with one fewer thing to wonder about and no new replacement, and each seed scene introduces a thread with no sense of closure happening nearby.`,
            suggestedFix: `Find at least one payoff scene where a new clue can be planted alongside the resolution — let the answer to one question immediately raise another. A character who resolves a confrontation and then discovers an incriminating object; a scene that delivers on a long-fused threat and simultaneously reveals that a trusted ally had advance knowledge. The seed need not be elaborate; even a brief new detail planted in the same scene as a payoff gives the audience a replacement hook while the satisfaction of the closed loop is still active.`,
          });
        }
      }
    }
  }

  // PAYOFF_CONSECUTIVE_VALENCE_RUN — run-based × payoff × emotional valence.
  // n≥8, ≥4 payoff scenes; 3+ consecutive payoff scenes (payoffSetupIds non-empty and
  // non-neutral emotionalShift) all carrying the same valence (all 'positive' or all
  // 'negative') → fire. A local run of same-valence payoffs creates a monotone delivery
  // stretch: the audience receives consecutive resolutions all wrapped in the same emotional
  // register, each closure feeling like a copy of the last. Resolutions should vary: some
  // bring relief (positive), some bring grief or loss (negative), and some land in neutral.
  // Distinct from: PAYOFF_EMOTIONAL_VALENCE_UNIFORM (Wave 552: globally ALL payoffs share
  // one sign — fires when there is no emotional variety across the entire script; this fires
  // on a LOCAL consecutive run even when the script has overall variety), PAYOFF_CONSECUTIVE_
  // RUN (Wave 426: 3+ consecutive payoffs regardless of emotional content — detects resolution
  // avalanche, not valence monotone), SEED_EMOTIONAL_VALENCE_UNIFORM (Wave 566: global
  // valence monotone on the seed trigger), PAYOFF_RELATIONSHIP_VALENCE_UNIFORM (Wave 426:
  // relationship channel, not emotional channel). First run-based × valence check in payoff.ts.
  {
    const n580c = records.length;
    if (n580c >= 8) {
      const payoffTotal580c = (records as any[]).filter((r: any) =>
        ((r.payoffSetupIds ?? []) as any[]).length > 0,
      ).length;
      if (payoffTotal580c >= 4) {
        let maxRun580c = 0;
        let curRun580c = 0;
        let runVal580c = '';
        for (const r of records as any[]) {
          const isPayoff = ((r.payoffSetupIds ?? []) as any[]).length > 0;
          const emo = r.emotionalShift ?? 'neutral';
          if (isPayoff && emo !== 'neutral') {
            if (emo === runVal580c) {
              curRun580c++;
            } else {
              curRun580c = 1;
              runVal580c = emo;
            }
            if (curRun580c > maxRun580c) maxRun580c = curRun580c;
          } else {
            curRun580c = 0;
            runVal580c = '';
          }
        }
        if (maxRun580c >= 3) {
          issues.push({
            location: `${maxRun580c} consecutive emotionally-charged payoff scenes share the same valence`,
            rule: 'PAYOFF_CONSECUTIVE_VALENCE_RUN',
            severity: 'minor',
            description: `The story contains a run of ${maxRun580c} or more consecutive payoff scenes that all carry the same emotional valence — resolutions arriving in an unbroken same-register sequence. Closures derive their individual weight from variety: relief after grief, loss after satisfaction, neutral between charged beats. When three or more consecutive emotionally-charged payoffs all share one sign, the stretch of resolutions becomes predictable — the audience knows not just that something will be resolved but exactly how it will feel, so each closure in the run feels like a copy of the last rather than a new kind of arrival. Individual deliveries blur into an undifferentiated sequence even when they resolve distinct threads.`,
            suggestedFix: `Break the same-valence run by inserting at least one payoff with a different emotional register — resolve a thread with loss rather than relief, or a neutral satisfying closure between charged ones. The variety need not be dramatic; a single payoff of opposite or neutral valence in the middle of the run restores the sense that each thread will resolve differently. If the same-valence run is intentional (a sequence of devastating losses in a tragedy's climax, or consecutive triumphs in a finale), that sustained register should be a deliberate tonal choice — and the preceding and following scenes should frame it as such rather than letting it read as default.`,
          });
        }
      }
    }
  }

  // ── Wave 594: SEED_PURPOSE_MONOTONE, PAYOFF_PURPOSE_MONOTONE,
  //              CLUE_SEED_ZONE_IMBALANCE ────────────────────────────────────────────────────

  // SEED_PURPOSE_MONOTONE — Average/aggregate × seed × scene-purpose.
  // n≥8, ≥4 seed scenes (seededClueIds non-empty). More than 70% of seed scenes share the
  // identical `purpose` value → fire. Clue-planting is confined to one narrative function —
  // e.g. every seed lands during a 'complicate' beat and never during 'establish_world' or
  // 'raise_stakes' — rather than being woven across the story's varied structural functions.
  // Foreshadowing that only ever arrives through one kind of scene reads as a device tied to a
  // single beat-type rather than a technique available anywhere in the story's structure.
  // Distinct from: every other seed check in this pass, which audits seed scenes against a
  // signal-delta channel (curiosity/suspense/emotion/relationship) or a structural position
  // (zone/run), never against the scene's own declared purpose. First — and only — dedicated
  // purpose-distribution check in this file; `purpose` otherwise appears just once, as an
  // incidental OR-condition inside an unrelated check.
  if (records.length >= 8) {
    const seedRecs594a = records.filter(r => (r.seededClueIds ?? []).length > 0);
    if (seedRecs594a.length >= 4) {
      const purposeCounts594a = new Map<string, number>();
      for (const r of seedRecs594a) purposeCounts594a.set(r.purpose, (purposeCounts594a.get(r.purpose) ?? 0) + 1);
      const [domPurpose594a, domCount594a] = [...purposeCounts594a.entries()].sort((a, b) => b[1] - a[1])[0];
      if (domCount594a / seedRecs594a.length > 0.70) {
        issues.push({
          location: `${domCount594a} of ${seedRecs594a.length} seed scene(s) share purpose "${domPurpose594a}"`,
          rule: 'SEED_PURPOSE_MONOTONE',
          severity: 'minor',
          description: `${Math.round((domCount594a / seedRecs594a.length) * 100)}% of the story's ${seedRecs594a.length} clue-planting scenes (${domCount594a} of them) share the single scene purpose "${domPurpose594a}". Foreshadowing is confined to one narrative function rather than woven across the story's varied structural beats — the audience learns, even if only subconsciously, which kind of scene tends to carry a planted thread, and clue-planting outside that beat-type starts to feel less likely. The most versatile foreshadowing arrives through many different kinds of scenes: a quiet character moment, a raised-stakes confrontation, a piece of exposition.`,
          suggestedFix: `Plant at least one clue in a scene serving a different structural purpose than "${domPurpose594a}" — a seed dropped during a raise_stakes confrontation reads very differently than one delivered during quiet exposition. Spreading seeds across purposes keeps foreshadowing feeling available anywhere in the story rather than tied to a single recurring beat-type.`,
        });
      }
    }
  }

  // PAYOFF_PURPOSE_MONOTONE — Average/aggregate × payoff × scene-purpose.
  // The payoff-channel mirror of SEED_PURPOSE_MONOTONE: n≥8, ≥4 payoff scenes (payoffSetupIds
  // non-empty), >70% sharing the identical purpose value → fire. Thread-resolutions are confined
  // to one narrative function — e.g. every payoff lands during 'climax' beats and never during a
  // quieter character moment — rather than resolving across the story's full structural range.
  // Distinct from SEED_PURPOSE_MONOTONE by channel (payoff, not seed); follows this file's existing
  // convention of mirrored seed/payoff pairs (SEED_DROUGHT_RUN/PAYOFF_DROUGHT_RUN, SEED_EMOTIONAL_
  // VALENCE_UNIFORM/PAYOFF_EMOTIONAL_VALENCE_UNIFORM). Distinct from PAYOFF_EMOTIONAL_VALENCE_
  // UNIFORM (categorical emotional sign, not scene purpose) and from RESOLUTION_CRAMMED_AT_END
  // (temporal position, not purpose distribution).
  if (records.length >= 8) {
    const payoffRecs594b = records.filter(r => (r.payoffSetupIds ?? []).length > 0);
    if (payoffRecs594b.length >= 4) {
      const purposeCounts594b = new Map<string, number>();
      for (const r of payoffRecs594b) purposeCounts594b.set(r.purpose, (purposeCounts594b.get(r.purpose) ?? 0) + 1);
      const [domPurpose594b, domCount594b] = [...purposeCounts594b.entries()].sort((a, b) => b[1] - a[1])[0];
      if (domCount594b / payoffRecs594b.length > 0.70) {
        issues.push({
          location: `${domCount594b} of ${payoffRecs594b.length} payoff scene(s) share purpose "${domPurpose594b}"`,
          rule: 'PAYOFF_PURPOSE_MONOTONE',
          severity: 'minor',
          description: `${Math.round((domCount594b / payoffRecs594b.length) * 100)}% of the story's ${payoffRecs594b.length} payoff scenes (${domCount594b} of them) share the single scene purpose "${domPurpose594b}". Thread-resolution is confined to one narrative function rather than distributed across the story's structural range — every callback lands the same way, in the same kind of beat, rather than resolving through the story's varied structural functions.`,
          suggestedFix: `Resolve at least one setup in a scene serving a different structural purpose than "${domPurpose594b}" — a payoff delivered mid-conversation in a character moment reads differently than one delivered at the climax. Distributing payoffs across purposes keeps resolutions from feeling procedurally identical.`,
        });
      }
    }
  }

  // CLUE_SEED_ZONE_IMBALANCE — Underweight/bloat × seed × four structural zones.
  // Built on checkZoneImbalance from the shared check-template library (server/nvm/revision/
  // passes/lib/checks.ts, audit M2.2). n≥10, ≥4 seed scenes total, divided across four equal
  // structural zones (Act 1/2a/2b/3). Fires only when at least one zone has ZERO seeds while
  // another holds ≥50% of the total — the co-presence of a void AND a bloat, not concentration
  // alone. Distinct from SETUP_CLUSTERING (a pure >70%-concentration ratio with no requirement
  // that any zone be literally empty — a story with seeds spread [1,1,1,7] would trip that check
  // without ever having a void zone) and CLUE_SEED_TEMPORAL_CLUSTER (uses thirds, not quarters,
  // and likewise has no zero-zone requirement). First check in this pass requiring simultaneous
  // void-and-bloat rather than concentration alone.
  {
    const r594c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.seededClueIds ?? []).length > 0,
    });
    if (r594c.fires) {
      const emptyNames594c = r594c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName594c = FOUR_ZONE_NAMES[r594c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames594c} empty; ${bloatName594c} has ${r594c.counts[r594c.bloatZoneIdx]}/${r594c.totalCount} seeds`,
        rule: 'CLUE_SEED_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r594c.totalCount} seeded clues are unevenly distributed across its four structural zones: ${bloatName594c} contains ${r594c.counts[r594c.bloatZoneIdx]} of them (${Math.round((r594c.counts[r594c.bloatZoneIdx] / r594c.totalCount) * 100)}%) while ${emptyNames594c} contains none. Clue-planting simultaneously bloats in one zone and vanishes from another: the audience receives a concentrated burst of new threads in one structural quarter while another quarter offers nothing new to wonder about.`,
        suggestedFix: `Redistribute seeds: move at least one clue-plant from ${bloatName594c} into the empty zone(s) — ${emptyNames594c} — so every structural quarter carries some foreshadowing. The goal is not perfect uniformity, but that no zone is completely seed-free while another carries more than half the total load.`,
      });
    }
  }

  // ── Wave 608: PAYOFF_DIALOGUE_HIGHLIGHT_DECOUPLED, VISUAL_STAGING_ZONE_IMBALANCE,
  //              SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID ──────────────────────────────────────

  // PAYOFF_DIALOGUE_HIGHLIGHT_DECOUPLED — Co-occurrence/decoupling × payoffSetupIds ×
  // dialogueHighlights. Built on checkCoOccurrenceDecoupled from the shared checks library. n≥8,
  // ≥2 payoff scenes, ≥2 scenes carrying a curated dialogue highlight. Zero overlap → fire. A
  // thread resolving and a line the story itself judged worth highlighting never happen in the
  // same scene — every payoff lands in a scene with no standout dialogue, and every memorable
  // line lands while no thread is being paid off. First use of the dialogueHighlights field
  // anywhere in this 104-rule pass. Distinct from every other co-occurrence check in this file
  // (PAYOFF_REVELATION_DECOUPLED and siblings), none of which pair the payoff channel with a
  // dialogue-side signal.
  {
    const r608a = checkCoOccurrenceDecoupled({
      records, minRecords: 8, minACount: 2, minBCount: 2,
      isA: r => (r.payoffSetupIds ?? []).length > 0,
      isB: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r608a.fires) {
      issues.push({
        location: `${r608a.aCount} payoff scene(s), ${r608a.bCount} dialogue-highlight scene(s) — zero overlap`,
        rule: 'PAYOFF_DIALOGUE_HIGHLIGHT_DECOUPLED',
        severity: 'minor',
        description: `The ${r608a.aCount} scenes where a planted thread pays off never coincide with the ${r608a.bCount} scenes flagged as containing a standout line of dialogue — every payoff lands without a line worth remembering attached to it, and every memorable line lands while nothing is being resolved. A payoff's emotional weight is often carried by the line that names what it means; when the two channels never touch, resolutions land as plot mechanics rather than moments.`,
        suggestedFix: `Let at least one payoff scene carry a line worth remembering — a character naming what the resolved thread cost, or what it means now that it's answered. Tying the story's most memorable dialogue to its resolutions gives the payoff a voice instead of leaving it to structural bookkeeping alone.`,
      });
    }
  }

  // VISUAL_STAGING_ZONE_IMBALANCE — Underweight/bloat × visualBeats × four structural zones.
  // Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 scenes with substantial
  // physical staging (visualBeats.length≥2), divided into four equal structural zones. Fires only
  // when one zone has zero visually dense scenes while another holds ≥50% of the total. First use
  // of the visualBeats field anywhere in this pass — every existing check here audits the
  // seed/payoff/revelation economy through non-visual record channels; this is the first to audit
  // how physical staging — as opposed to the promise-and-payment machinery — is spread across the
  // four structural quarters. Distinct from CLUE_SEED_ZONE_IMBALANCE (Wave 594: same template,
  // seededClueIds channel rather than visualBeats).
  {
    const r608b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r608b.fires) {
      const emptyNames608b = r608b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName608b = FOUR_ZONE_NAMES[r608b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames608b} empty; ${bloatName608b} has ${r608b.counts[r608b.bloatZoneIdx]}/${r608b.totalCount} visually dense scenes`,
        rule: 'VISUAL_STAGING_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r608b.totalCount} physically staged scenes are unevenly distributed across its four structural zones: ${bloatName608b} contains ${r608b.counts[r608b.bloatZoneIdx]} of them (${Math.round((r608b.counts[r608b.bloatZoneIdx] / r608b.totalCount) * 100)}%) while ${emptyNames608b} contains none. Physical staging bloats in one structural quarter and vanishes from another, giving the story's balance between staged and unstaged scenes an uneven rhythm relative to its setup/payoff economy.`,
        suggestedFix: `Redistribute physical staging: bring at least one heavily staged scene into ${emptyNames608b}, or thin out ${bloatName608b}'s concentration by letting one of its visually dense scenes lean more on dialogue instead. A more even spread keeps physical presence active throughout the story's promise-and-payment arc.`,
      });
    }
  }

  // SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID — Sequence/aftermath × seed trigger →
  // dialogueHighlights absence. Built on checkAftermathVoid from the shared checks library. n≥8,
  // ≥2 qualifying seed scenes (pos<n-2), ≥3 scenes anywhere with a dialogue highlight, a 2-scene
  // lookahead window. Fires when every seed's two-scene aftermath contains no highlighted
  // dialogue, while highlighted dialogue does occur elsewhere in the story. Every clue-planting
  // scene passes into an aftermath with no memorable verbal moment — the planted material gets no
  // nearby voice giving it texture. Distinct from SEED_REVELATION_AFTERMATH_ABSENT (Wave 510) and
  // SEED_SUSPENSE_AFTERMATH_ABSENT (Wave 524), which use different aftermath channels, and from
  // PAYOFF_DIALOGUE_HIGHLIGHT_DECOUPLED above (same dialogueHighlights field, but that check is
  // same-scene co-occurrence with the payoff channel, not a windowed check on the seed channel).
  {
    const r608c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 3, window: 2,
      isTrigger: r => (r.seededClueIds ?? []).length > 0,
      isAftermath: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r608c.fires) {
      issues.push({
        location: `${r608c.triggerCount} seed scene(s) — no highlighted dialogue within 2 scenes of any`,
        rule: 'SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r608c.triggerCount} clue-planting scenes is followed by two scenes with no highlighted dialogue, even though ${r608c.aftermathCount} such scenes exist elsewhere in the script. Seeds are the story's long-horizon deposits; when their immediate aftermath never carries a memorable line, the planted material gets no verbal texture nearby — it lives purely as structural bookkeeping until the eventual payoff.`,
        suggestedFix: `After at least one seed, let one of the following two scenes carry a line worth remembering — a character circling the planted material, an oblique reference that will read differently in retrospect, or a reaction that gives the seed emotional presence before its payoff arrives.`,
      });
    }
  }

  // ── Wave 622: VISUAL_BEAT_OPEN_THREAD_DECOUPLED, CLOCK_STAGING_AFTERMATH_VOID,
  //              PAYOFF_OPEN_THREAD_ZONE_IMBALANCE ──────────────────────────────────────────

  // VISUAL_BEAT_OPEN_THREAD_DECOUPLED — Co-occurrence/decoupling × visualBeats × unresolvedClues.
  // Built on checkCoOccurrenceDecoupled from the shared checks library. n≥6, ≥2 visually-staged
  // scenes (visualBeats.length≥2), ≥2 scenes carrying outstanding clue-debt. Zero overlap → fire.
  // First pairing of these two fields in this 107-rule pass. Physical staging and open narrative
  // debt never occupy the same scene — a mystery hanging open never gets a physical anchor, and
  // every heavily staged scene carries no unresolved tension.
  {
    const r622a = checkCoOccurrenceDecoupled({
      records, minRecords: 6, minACount: 2, minBCount: 2,
      isA: r => (r.visualBeats ?? []).length >= 2,
      isB: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r622a.fires) {
      issues.push({
        location: `${r622a.aCount} visually-staged scene(s), ${r622a.bCount} open-thread scene(s) — zero overlap`,
        rule: 'VISUAL_BEAT_OPEN_THREAD_DECOUPLED',
        severity: 'minor',
        description: `The ${r622a.aCount} scenes leaning heavily on physical staging never coincide with the ${r622a.bCount} scenes carrying outstanding clue-debt — physical presence and unresolved mystery run on separate tracks. A scene rich in staging is a natural place to give an open thread a physical anchor — an object tied to the mystery, a space the audience will recognize later — but that opportunity is never taken.`,
        suggestedFix: `Let at least one heavily staged scene also carry open clue-debt — the physical details a character examines or handles tied to what's still unresolved, giving the mystery a tangible presence in the world rather than existing only as a dangling narrative thread.`,
      });
    }
  }

  // CLOCK_STAGING_AFTERMATH_VOID — Sequence/aftermath × clockRaised trigger → visualBeats
  // absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2 qualifying
  // clockRaised scenes (pos<n-2), ≥3 scenes anywhere with substantial physical staging, a 2-scene
  // lookahead window. Fires when every clock-raising scene's two-scene aftermath contains no
  // visually dense scene, while such scenes do occur elsewhere. First pairing of clockRaised with
  // visualBeats in this pass — a tightening deadline should register physically somewhere nearby
  // (a character moving faster, checking a clock, packing in haste), not only as narrated urgency.
  {
    const r622b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 3, window: 2,
      isTrigger: r => r.clockRaised === true,
      isAftermath: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r622b.fires) {
      issues.push({
        location: `${r622b.triggerCount} clock-raising scene(s) — no visually dense scene within 2 scenes of any`,
        rule: 'CLOCK_STAGING_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r622b.triggerCount} clock-raising scenes is followed by two scenes with no substantial physical staging, even though ${r622b.aftermathCount} such scenes exist elsewhere in the script. A tightening deadline often shows up physically — hurried movement, a glance at the time, hasty preparation — and when that aftermath consistently stays unstaged, the mounting time pressure is only ever mentioned, never seen.`,
        suggestedFix: `After at least one clock-raising scene, let one of the following two scenes carry substantial physical staging — the deadline's pressure made visible through a character's rushed action rather than only through dialogue about time.`,
      });
    }
  }

  // PAYOFF_OPEN_THREAD_ZONE_IMBALANCE — Underweight/bloat × unresolvedClues × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 debt-carrying
  // scenes total, divided across four equal structural zones. Fires only when one zone has zero
  // such scenes while another holds ≥50% of the total. Waves 594 and 608 applied this template to
  // seededClueIds and visualBeats respectively; unresolvedClues — the carried-forward debt of
  // clues not yet paid off — has never itself been audited for structural distribution in this
  // file, despite being the file's most natural complement to the payoff channel.
  {
    const r622c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r622c.fires) {
      const emptyNames622c = r622c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName622c = FOUR_ZONE_NAMES[r622c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames622c} empty; ${bloatName622c} has ${r622c.counts[r622c.bloatZoneIdx]}/${r622c.totalCount} debt-carrying scenes`,
        rule: 'PAYOFF_OPEN_THREAD_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r622c.totalCount} scenes carrying outstanding clue-debt are unevenly distributed across its four structural zones: ${bloatName622c} contains ${r622c.counts[r622c.bloatZoneIdx]} of them (${Math.round((r622c.counts[r622c.bloatZoneIdx] / r622c.totalCount) * 100)}%) while ${emptyNames622c} contains none. Outstanding narrative debt bloats in one structural quarter and vanishes from another, giving the story's sense of active mystery an uneven structural rhythm.`,
        suggestedFix: `Redistribute open threads: let at least one clue remain unresolved into the empty zone(s) — ${emptyNames622c} — so every structural quarter carries some sense of active, unanswered mystery.`,
      });
    }
  }

  // ── Wave 636: PAYOFF_HIGHLIGHT_OPEN_THREAD_DECOUPLED, PAYOFF_TURN_HIGHLIGHT_AFTERMATH_VOID,
  //              PAYOFF_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE ─────────────────────────────────

  // PAYOFF_HIGHLIGHT_OPEN_THREAD_DECOUPLED — Co-occurrence/decoupling × dialogueHighlights ×
  // unresolvedClues. Built on checkCoOccurrenceDecoupled from the shared checks library. n≥6, ≥2
  // scenes carrying a dialogue highlight, ≥2 scenes carrying outstanding clue-debt. Zero overlap
  // → fire. First pairing of these two fields in this 110-rule pass. A line the story flags as
  // memorable never lands while a thread sits unresolved — the payoff economy's two most useful
  // signals never intersect.
  {
    const r636a = checkCoOccurrenceDecoupled({
      records, minRecords: 6, minACount: 2, minBCount: 2,
      isA: r => (r.dialogueHighlights ?? []).length > 0,
      isB: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r636a.fires) {
      issues.push({
        location: `${r636a.aCount} dialogue-highlight scene(s), ${r636a.bCount} open-thread scene(s) — zero overlap`,
        rule: 'PAYOFF_HIGHLIGHT_OPEN_THREAD_DECOUPLED',
        severity: 'minor',
        description: `The ${r636a.aCount} scenes flagged as containing a standout line of dialogue never coincide with the ${r636a.bCount} scenes carrying outstanding clue-debt — the story's most memorable dialogue and its open setups run on separate tracks. A revealing line often lands hardest when a character is actively holding an unresolved question.`,
        suggestedFix: `Let at least one standout line of dialogue land in a scene that is also carrying open clue-debt — a character voicing suspicion or naming what's still unresolved, tying the story's most memorable dialogue to its live setups.`,
      });
    }
  }

  // PAYOFF_TURN_HIGHLIGHT_AFTERMATH_VOID — Sequence/aftermath × dramaticTurn trigger →
  // dialogueHighlights absence. Built on checkAftermathVoid from the shared checks library. n≥8,
  // ≥2 qualifying dramatic-turn scenes (pos<n-2), ≥3 scenes anywhere with a dialogue highlight, a
  // 2-scene lookahead window. Fires when every turn's two-scene aftermath contains no highlighted
  // dialogue, while such scenes do occur elsewhere. First pairing of these two fields in this
  // pass — a structural pivot should give a character something worth saying about it soon after.
  {
    const r636b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 3, window: 2,
      isTrigger: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
      isAftermath: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r636b.fires) {
      issues.push({
        location: `${r636b.triggerCount} dramatic-turn scene(s) — no highlighted dialogue within 2 scenes of any`,
        rule: 'PAYOFF_TURN_HIGHLIGHT_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r636b.triggerCount} dramatic-turn scenes is followed by two scenes with no highlighted dialogue, even though ${r636b.aftermathCount} such scenes exist elsewhere in the script. A pivot's consequences are often best confirmed through a character's voice; when that aftermath is always verbally unremarkable, the turn registers structurally but no line commits to what it means.`,
        suggestedFix: `After at least one dramatic turn, let one of the following two scenes carry a line worth remembering — a character naming what changed or what it will cost, giving the pivot a voice, not just a structural marker.`,
      });
    }
  }

  // PAYOFF_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE — Underweight/bloat × dialogueHighlights × four
  // structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 scenes
  // carrying a dialogue highlight, divided across four equal structural zones. Fires only when
  // one zone has zero such scenes while another holds ≥50% of the total. Waves 594/608/622
  // applied this template to seededClueIds, visualBeats, and unresolvedClues respectively;
  // dialogueHighlights itself has never been zone-audited in this file.
  {
    const r636c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r636c.fires) {
      const emptyNames636c = r636c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName636c = FOUR_ZONE_NAMES[r636c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames636c} empty; ${bloatName636c} has ${r636c.counts[r636c.bloatZoneIdx]}/${r636c.totalCount} dialogue-highlight scenes`,
        rule: 'PAYOFF_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r636c.totalCount} dialogue-highlight scenes are unevenly distributed across its four structural zones: ${bloatName636c} contains ${r636c.counts[r636c.bloatZoneIdx]} of them (${Math.round((r636c.counts[r636c.bloatZoneIdx] / r636c.totalCount) * 100)}%) while ${emptyNames636c} contains none. Memorable dialogue bloats in one structural quarter and vanishes from another, giving the story's verbal rhythm around its seed/payoff economy an uneven pulse.`,
        suggestedFix: `Redistribute standout dialogue: bring at least one memorable line into ${emptyNames636c}, so every structural quarter carries some verbal high point, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // ── Wave 650: PAYOFF_STAGING_PEAK_UNCAUSED, PAYOFF_HIGHLIGHT_DROUGHT_RUN,
  //              PAYOFF_OPEN_THREAD_ZONE_CLUSTER ────────────────────────────────────────────

  // PAYOFF_STAGING_PEAK_UNCAUSED — Single-peak isolation/backward-cause × visualBeats magnitude.
  // Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 visually-staged scenes, a
  // 2-scene lookback. Finds the single scene with the densest physical staging; fires when
  // neither that scene nor either of the two before it contains a dramatic turn or revelation.
  // First checkPeakUncaused use in this pass via the shared library — distinct from the existing
  // PEAK_*_DECOUPLED family (curiosity/suspense/relationship/clock), which each check whether the
  // peak scene itself lacks a channel, not whether a physical-staging peak is backward-caused.
  {
    const r650a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.visualBeats ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r650a.fires) {
      issues.push({
        location: `scene ${r650a.peakIdx + 1} — peak physical-staging density (${r650a.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'PAYOFF_STAGING_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for physical staging (scene ${r650a.peakIdx + 1}, with ${r650a.peakMagnitude} staged beats) has no dramatic turn or revelation in itself or the two scenes before it. The moment where physical action concentrates most heavily arrives without any structural pivot or disclosure driving it — the peak of staged action and the payoff engine's sense of causal escalation never coincide.`,
        suggestedFix: `Give scene ${r650a.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most physically active moment is earned by a shift in the plot rather than arriving in a causal vacuum.`,
      });
    }
  }

  // PAYOFF_HIGHLIGHT_DROUGHT_RUN — Run-based × dialogueHighlights absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 highlighted-dialogue scenes overall,
  // fires when the longest consecutive run of scenes with no highlighted dialogue reaches 6. This
  // pass already hand-rolls drought-run logic for seed (SEED_DROUGHT_RUN) and payoff
  // (PAYOFF_DROUGHT_RUN), but never via the shared helper and never on the dialogueHighlights
  // channel — a long unbroken stretch with nothing verbally memorable leaves the payoff engine's
  // most quotable resolutions with no verbal high point to punctuate them.
  {
    const r650b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r650b.fires) {
      issues.push({
        location: `longest stretch with no highlighted dialogue: ${r650b.longestRun} consecutive scenes`,
        rule: 'PAYOFF_HIGHLIGHT_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r650b.longestRun} consecutive scenes with no highlighted dialogue at all, even though ${r650b.presentCount} scenes elsewhere carry a standout line. A long unbroken stretch with nothing verbally memorable leaves the payoff engine's resolutions landing on unremarkable dialogue for an extended run.`,
        suggestedFix: `Give at least one scene within the ${r650b.longestRun}-scene stretch a standout line of dialogue — a character's reaction to a resolving thread voiced memorably, keeping the verbal register alive throughout.`,
      });
    }
  }

  // PAYOFF_OPEN_THREAD_ZONE_CLUSTER — Distribution/timing × unresolvedClues × structural thirds.
  // Built on checkZoneCluster from the shared checks library. n≥9, ≥3 open-thread scenes, fires
  // when >75% of them fall in a single structural third. First checkZoneCluster use in this pass
  // — distinct from the hand-rolled PAYOFF_TEMPORAL_CLUSTER and CLUE_SEED_TEMPORAL_CLUSTER, which
  // track the payoff and clue-seed channels rather than outstanding clue-debt.
  {
    const r650c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r650c.fires) {
      const zoneName650c = r650c.zoneNames[r650c.maxZoneIdx];
      issues.push({
        location: `${zoneName650c} third — ${r650c.maxZoneCount}/${r650c.count} open-thread scenes`,
        rule: 'PAYOFF_OPEN_THREAD_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r650c.maxZoneCount} of the story's ${r650c.count} scenes carrying outstanding clue-debt (${Math.round((r650c.maxZoneCount / r650c.count) * 100)}%) cluster in the ${zoneName650c} third. Open questions concentrate almost exclusively in that stretch of the story rather than persisting throughout, leaving other structural thirds with no live mystery for the payoff engine to eventually resolve.`,
        suggestedFix: `Let a clue remain unresolved into a scene outside the ${zoneName650c} third — spreading open threads across the story gives every structural third some outstanding debt for a later payoff to satisfy.`,
      });
    }
  }

  // ── Wave 664: PAYOFF_RELATIONSHIP_PEAK_UNCAUSED, PAYOFF_CLOCK_DROUGHT_RUN,
  //              PAYOFF_STAGING_ZONE_CLUSTER ─────────────────────────────────────────────────

  // PAYOFF_RELATIONSHIP_PEAK_UNCAUSED — Single-peak isolation/backward-cause × relationshipShifts-
  // count magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 scenes
  // carrying a relationship shift, a 2-scene lookback. Finds the single scene with the most
  // simultaneous bond changes; fires when neither that scene nor either of the two before it
  // contains a dramatic turn or revelation. Distinct from PAYOFF_RELATIONSHIP_PEAK_DECOUPLED
  // (Wave 412), which anchors on the scene with the single largest shift AMOUNT and checks
  // whether it carries a payoff — a different magnitude metric and a different question entirely.
  {
    const r664a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.relationshipShifts ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r664a.fires) {
      issues.push({
        location: `scene ${r664a.peakIdx + 1} — peak relationship-shift density (${r664a.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'PAYOFF_RELATIONSHIP_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for relationship shifts (scene ${r664a.peakIdx + 1}, with ${r664a.peakMagnitude} simultaneous bond changes) has no dramatic turn or revelation in itself or the two scenes before it. The moment where relational upheaval concentrates most heavily arrives without any structural pivot or disclosure driving it — an uncaused spike that undercuts the sense that the story's payoff engine is causally connected.`,
        suggestedFix: `Give scene ${r664a.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most relationally dense moment is earned by a shift in circumstance rather than arriving in a causal vacuum.`,
      });
    }
  }

  // PAYOFF_CLOCK_DROUGHT_RUN — Run-based × clockRaised absence. Built on checkDroughtRun from the
  // shared checks library. n≥10, ≥3 clock-raised scenes overall, fires when the longest
  // consecutive run of scenes with no clock raised reaches 6. This pass already drought-audits
  // seed/payoff/highlight channels; clockRaised itself has never been drought-audited.
  {
    const r664b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.clockRaised === true,
    });
    if (r664b.fires) {
      issues.push({
        location: `longest stretch with no clock raised: ${r664b.longestRun} consecutive scenes`,
        rule: 'PAYOFF_CLOCK_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r664b.longestRun} consecutive scenes with no clock raised at all, even though ${r664b.presentCount} scenes elsewhere do establish time pressure. A long unbroken stretch with no deadline in play leaves the story's resolutions arriving without any urgency pressing toward them.`,
        suggestedFix: `Raise a clock somewhere within the ${r664b.longestRun}-scene stretch — a deadline, a closing window, a ticking consequence — so the story's payoffs feel pressed for rather than arriving at leisure.`,
      });
    }
  }

  // PAYOFF_STAGING_ZONE_CLUSTER — Distribution/timing × visualBeats × structural thirds. Built on
  // checkZoneCluster from the shared checks library. n≥9, ≥3 visually-staged scenes, fires when
  // >75% of them fall in a single structural third. Wave 650 applied the zone-cluster mode to
  // unresolvedClues; visualBeats itself has only been backward-cause peak-audited, never
  // cluster-audited on the thirds granularity.
  {
    const r664c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r664c.fires) {
      const zoneName664c = r664c.zoneNames[r664c.maxZoneIdx];
      issues.push({
        location: `${zoneName664c} third — ${r664c.maxZoneCount}/${r664c.count} visually dense scenes`,
        rule: 'PAYOFF_STAGING_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r664c.maxZoneCount} of the story's ${r664c.count} visually dense scenes (${Math.round((r664c.maxZoneCount / r664c.count) * 100)}%) cluster in the ${zoneName664c} third. Physical staging concentrates almost exclusively in that stretch rather than surfacing throughout, leaving other structural thirds with no physically embodied resolution.`,
        suggestedFix: `Give at least one scene outside the ${zoneName664c} third substantial physical staging — spreading embodied resolution across the story lets each structural third carry its own physical weight.`,
      });
    }
  }

  // ── Wave 678: PAYOFF_CLOCK_DELTA_PEAK_UNCAUSED, PAYOFF_TURN_DROUGHT_RUN,
  //              PAYOFF_NEGATIVE_EMOTION_ZONE_CLUSTER ──────────────────────────────────────

  // PAYOFF_CLOCK_DELTA_PEAK_UNCAUSED — Single-peak isolation/backward-cause × clockDelta
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 scenes with
  // clockDelta>0, a 2-scene lookback. Finds the single scene with the highest clockDelta; fires
  // when neither that scene nor either of the two before it contains a dramatic turn or
  // revelation. Distinct from PAYOFF_CLOCK_PEAK_DECOUPLED (Wave 566), which checks whether the
  // peak-clockDelta scene carries a payoff; this instead asks whether that scene is structurally
  // caused by a dramatic turn or revelation.
  {
    const r678a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => r.clockDelta ?? 0,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r678a.fires) {
      issues.push({
        location: `scene ${r678a.peakIdx + 1} — peak clockDelta (${r678a.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'PAYOFF_CLOCK_DELTA_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The scene with the story's single highest clockDelta (scene ${r678a.peakIdx + 1}, at ${r678a.peakMagnitude}) has no dramatic turn or revelation in itself or the two scenes before it. The moment time pressure compresses most sharply arrives without any structural pivot or disclosure driving it — the peak of urgency carries no causal weight behind it.`,
        suggestedFix: `Give scene ${r678a.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's sharpest deadline compression is earned by a shift in the plot rather than arriving in a causal vacuum.`,
      });
    }
  }

  // PAYOFF_TURN_DROUGHT_RUN — Run-based × dramaticTurn presence absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 dramatic-turn scenes overall, fires
  // when the longest consecutive run of scenes with no dramatic turn reaches 6. dramaticTurn
  // anchors several decoupled and aftermath-absent checks here, but has never been
  // drought-audited.
  {
    const r678b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
    });
    if (r678b.fires) {
      issues.push({
        location: `longest stretch with no dramatic turn: ${r678b.longestRun} consecutive scenes`,
        rule: 'PAYOFF_TURN_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r678b.longestRun} consecutive scenes with no dramatic turn at all, even though ${r678b.presentCount} scenes elsewhere do carry a structural pivot. A long stretch with no reversal or twist leaves the story's resolutions arriving without any structural pivot preceding them for an extended run.`,
        suggestedFix: `Give at least one scene within the ${r678b.longestRun}-scene stretch a dramatic turn — even a modest reversal keeps the payoff engine structurally punctuated throughout that stretch.`,
      });
    }
  }

  // PAYOFF_NEGATIVE_EMOTION_ZONE_CLUSTER — Distribution/timing × emotionalShift === 'negative' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // negative-emotion scenes, fires when >75% of them fall in a single structural third.
  // emotionalShift anchors PAYOFF_EMOTIONAL_VALENCE_UNIFORM and several decoupled checks, but has
  // never been cluster-audited.
  {
    const r678c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.emotionalShift === 'negative',
    });
    if (r678c.fires) {
      const zoneName678c = r678c.zoneNames[r678c.maxZoneIdx];
      issues.push({
        location: `${zoneName678c} third — ${r678c.maxZoneCount}/${r678c.count} negative-emotion scenes`,
        rule: 'PAYOFF_NEGATIVE_EMOTION_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r678c.maxZoneCount} of the story's ${r678c.count} negative-emotion scenes (${Math.round((r678c.maxZoneCount / r678c.count) * 100)}%) cluster in the ${zoneName678c} third. Emotional pain concentrates almost exclusively in that stretch of the story rather than surfacing throughout, leaving other structural thirds with no sense of cost weighing against the resolutions landing there.`,
        suggestedFix: `Let at least one scene outside the ${zoneName678c} third carry a negative emotional shift — spreading emotional cost across the story keeps every structural third's resolutions honestly weighted.`,
      });
    }
  }

  // ── Wave 692: PAYOFF_SEED_PEAK_UNCAUSED, PAYOFF_SETUP_PEAK_UNCAUSED, PAYOFF_STAKES_ZONE_CLUSTER ──

  // PAYOFF_SEED_PEAK_UNCAUSED — Single-peak isolation/backward-cause × seededClueIds magnitude.
  // Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 seed scenes, a 2-scene
  // lookback. Finds the single scene with the most simultaneous clues planted; fires when neither
  // that scene nor either of the two before it contains a dramatic turn or revelation. Wave 594's
  // SEED_STAGING_ZONE_IMBALANCE already four-zone-audits this channel's bloat/empty distribution;
  // the backward-cause peak mode has never been applied to it.
  {
    const r692a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.seededClueIds ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r692a.fires) {
      issues.push({
        location: `scene ${r692a.peakIdx + 1} — peak seed density (${r692a.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'PAYOFF_SEED_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for planting new clues (scene ${r692a.peakIdx + 1}, with ${r692a.peakMagnitude} clues seeded at once) has no dramatic turn or revelation in itself or the two scenes before it. The moment where foreshadowing concentrates most heavily arrives without any structural pivot or disclosure driving it — an uncaused spike that undercuts the sense that the payoff engine's setups are causally earned.`,
        suggestedFix: `Give scene ${r692a.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most seed-dense moment is earned by a shift in circumstance rather than arriving in a causal vacuum.`,
      });
    }
  }

  // PAYOFF_SETUP_PEAK_UNCAUSED — Single-peak isolation/backward-cause × payoffSetupIds magnitude.
  // Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 payoff scenes, a 2-scene
  // lookback. Finds the single scene with the most simultaneous thread resolutions; fires when
  // neither that scene nor either of the two before it contains a dramatic turn or revelation.
  // This pass's most heavily used field anchors the hand-rolled PAYOFF_TEMPORAL_CLUSTER
  // (distribution/timing) and PAYOFF_DROUGHT_RUN (run-based), but the backward-cause peak mode
  // has never been applied to it.
  {
    const r692b = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.payoffSetupIds ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r692b.fires) {
      issues.push({
        location: `scene ${r692b.peakIdx + 1} — peak payoff density (${r692b.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'PAYOFF_SETUP_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for thread resolution (scene ${r692b.peakIdx + 1}, with ${r692b.peakMagnitude} payoffs resolving at once) has no dramatic turn or revelation in itself or the two scenes before it. The moment where the most convergent resolution lands arrives without any structural pivot or disclosure driving it — the peak of narrative payoff carries no causal weight behind it.`,
        suggestedFix: `Give scene ${r692b.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most convergent resolution is earned by a shift in the plot rather than arriving in a causal vacuum.`,
      });
    }
  }

  // PAYOFF_STAKES_ZONE_CLUSTER — Distribution/timing × purpose === 'raise_stakes' × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 stakes-raising
  // scenes, fires when >75% of them fall in a single structural third. `purpose` has only ever
  // been used to tally counts inside unrelated aggregate checks; never the standalone subject of
  // its own check.
  {
    const r692c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'raise_stakes',
    });
    if (r692c.fires) {
      const zoneName692c = r692c.zoneNames[r692c.maxZoneIdx];
      issues.push({
        location: `${zoneName692c} third — ${r692c.maxZoneCount}/${r692c.count} stakes-raising scenes`,
        rule: 'PAYOFF_STAKES_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r692c.maxZoneCount} of the story's ${r692c.count} scenes purposed to raise stakes (${Math.round((r692c.maxZoneCount / r692c.count) * 100)}%) cluster in the ${zoneName692c} third. Escalation concentrates almost exclusively in that stretch of the story rather than compounding throughout, leaving other structural thirds with no mounting pressure feeding the payoff engine.`,
        suggestedFix: `Purpose at least one scene outside the ${zoneName692c} third to raise stakes — spreading escalation across the story lets every structural third carry its own share of pressure toward eventual resolution.`,
      });
    }
  }

  // ── Wave 706: PAYOFF_STAGING_DROUGHT_RUN, PAYOFF_HIGHLIGHT_ZONE_CLUSTER,
  //              PAYOFF_OPEN_THREAD_PEAK_UNCAUSED ──────────────────────────────────────────────

  // PAYOFF_STAGING_DROUGHT_RUN — Run-based × visualBeats absence. Built on checkDroughtRun from
  // the shared checks library. n≥10, ≥3 physically-staged scenes overall, fires when the longest
  // consecutive run of scenes with zero visual beats reaches 6. Waves 650/664 applied the
  // backward-cause peak and zone-cluster modes to visualBeats; the drought-run mode has never
  // been applied to it, completing the trio.
  {
    const r706a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.visualBeats ?? []).length > 0,
    });
    if (r706a.fires) {
      issues.push({
        location: `longest stretch with zero visual staging: ${r706a.longestRun} consecutive scenes`,
        rule: 'PAYOFF_STAGING_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r706a.longestRun} consecutive scenes with no visual staging beats at all, even though ${r706a.presentCount} scenes elsewhere do carry physical staging. A long unbroken stretch of pure dialogue or exposition with nothing physically shown leaves the payoff engine without any embodied resolution to anchor it.`,
        suggestedFix: `Add a physical staging beat somewhere within the ${r706a.longestRun}-scene stretch — a gesture, an object, a piece of blocking — so the payoff engine stays visually grounded throughout.`,
      });
    }
  }

  // PAYOFF_HIGHLIGHT_ZONE_CLUSTER — Distribution/timing × dialogueHighlights × structural thirds.
  // Built on checkZoneCluster from the shared checks library. n≥9, ≥3 highlighted-dialogue scenes,
  // fires when >75% of them fall in a single structural third. Wave 650 applied the drought-run
  // mode to dialogueHighlights; the zone-cluster mode has never been applied to it.
  {
    const r706b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r706b.fires) {
      const zoneName706b = r706b.zoneNames[r706b.maxZoneIdx];
      issues.push({
        location: `${zoneName706b} third — ${r706b.maxZoneCount}/${r706b.count} highlighted-dialogue scenes`,
        rule: 'PAYOFF_HIGHLIGHT_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r706b.maxZoneCount} of the story's ${r706b.count} scenes carrying a standout line of dialogue (${Math.round((r706b.maxZoneCount / r706b.count) * 100)}%) cluster in the ${zoneName706b} third. Memorable dialogue concentrates almost exclusively in that stretch rather than landing throughout, leaving other structural thirds with nothing verbally memorable to punctuate their resolutions.`,
        suggestedFix: `Give at least one scene outside the ${zoneName706b} third a standout line of dialogue — spreading memorable dialogue across the story lets each structural third carry its own verbal high point.`,
      });
    }
  }

  // PAYOFF_OPEN_THREAD_PEAK_UNCAUSED — Single-peak isolation/backward-cause × unresolvedClues
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 scenes carrying
  // outstanding clue-debt, a 2-scene lookback. Finds the single scene with the most simultaneous
  // open threads; fires when neither that scene nor either of the two before it contains a
  // dramatic turn or revelation. Wave 650 applied the zone-cluster mode to unresolvedClues; the
  // backward-cause peak mode has never been applied to it.
  {
    const r706c = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.unresolvedClues ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r706c.fires) {
      issues.push({
        location: `scene ${r706c.peakIdx + 1} — peak open-thread density (${r706c.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'PAYOFF_OPEN_THREAD_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for outstanding clue-debt (scene ${r706c.peakIdx + 1}, with ${r706c.peakMagnitude} open threads) has no dramatic turn or revelation in itself or the two scenes before it. The moment where unresolved mystery concentrates most heavily arrives without any structural pivot or disclosure driving it — the peak of accumulated question carries no causal weight behind it.`,
        suggestedFix: `Give scene ${r706c.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most mystery-dense moment is earned by a shift in the plot rather than arriving in a causal vacuum.`,
      });
    }
  }

  // ── Wave 720: PAYOFF_HIGHLIGHT_PEAK_UNCAUSED, PAYOFF_OPEN_THREAD_DROUGHT_RUN,
  //              PAYOFF_RELATIONSHIP_DROUGHT_RUN ───────────────────────────────────────────────

  // PAYOFF_HIGHLIGHT_PEAK_UNCAUSED — Single-peak isolation/backward-cause × dialogueHighlights
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 scenes carrying
  // a dialogue highlight, a 2-scene lookback. Finds the single scene with the most highlighted
  // lines; fires when neither that scene nor either of the two before it contains a dramatic turn
  // or revelation. Waves 650/706 applied the drought-run and zone-cluster modes to
  // dialogueHighlights; the backward-cause peak mode has never been applied to it, completing the
  // trio.
  {
    const r720a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.dialogueHighlights ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r720a.fires) {
      issues.push({
        location: `scene ${r720a.peakIdx + 1} — peak highlighted-dialogue density (${r720a.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'PAYOFF_HIGHLIGHT_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for highlighted dialogue (scene ${r720a.peakIdx + 1}, with ${r720a.peakMagnitude} standout lines) has no dramatic turn or revelation in itself or the two scenes before it. The moment where the script's most memorable dialogue concentrates arrives without any structural pivot or disclosure driving it — the peak of verbal craft and the payoff engine's sense of causal escalation never coincide.`,
        suggestedFix: `Give scene ${r720a.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most quotable moment is earned by a shift in the plot rather than arriving in a causal vacuum.`,
      });
    }
  }

  // PAYOFF_OPEN_THREAD_DROUGHT_RUN — Run-based × unresolvedClues absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 open-thread scenes overall, fires
  // when the longest consecutive run of scenes with zero outstanding clue-debt reaches 6. Waves
  // 650/706 applied the zone-cluster and backward-cause peak modes to unresolvedClues; the
  // drought-run mode has never been applied to it, completing the trio.
  {
    const r720b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r720b.fires) {
      issues.push({
        location: `longest stretch with no outstanding clue-debt: ${r720b.longestRun} consecutive scenes`,
        rule: 'PAYOFF_OPEN_THREAD_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r720b.longestRun} consecutive scenes with no outstanding clue-debt at all, even though ${r720b.presentCount} scenes elsewhere do carry open mysteries. A long stretch where nothing is left unresolved leaves the payoff engine with no live mystery to work against for an extended run.`,
        suggestedFix: `Seed a new thread somewhere within the ${r720b.longestRun}-scene stretch so the payoff engine has some outstanding mystery to eventually resolve throughout that stretch.`,
      });
    }
  }

  // PAYOFF_RELATIONSHIP_DROUGHT_RUN — Run-based × relationshipShifts absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 relationship-shift scenes overall,
  // fires when the longest consecutive run of scenes with zero bond changes reaches 6. Wave 664
  // applied the backward-cause peak mode to relationshipShifts; the drought-run mode has never
  // been applied to it.
  {
    const r720c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r720c.fires) {
      issues.push({
        location: `longest stretch with no relationship shift: ${r720c.longestRun} consecutive scenes`,
        rule: 'PAYOFF_RELATIONSHIP_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r720c.longestRun} consecutive scenes with no relationship shift at all, even though ${r720c.presentCount} scenes elsewhere do move a bond. A long unbroken stretch where no relationship moves leaves the payoff engine's interpersonal dimension dormant for an extended run.`,
        suggestedFix: `Let a bond shift somewhere within the ${r720c.longestRun}-scene stretch — even a small movement keeps the payoff engine tied to changing interpersonal stakes throughout.`,
      });
    }
  }

  // ── Wave 734: PAYOFF_RELATIONSHIP_ZONE_CLUSTER, PAYOFF_SEED_ZONE_CLUSTER,
  //              PAYOFF_CLOCK_DELTA_DROUGHT_RUN ────────────────────────────────────────────

  // PAYOFF_RELATIONSHIP_ZONE_CLUSTER — Distribution/timing × relationshipShifts × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 relationship-shift
  // scenes, fires when more than 75% of those scenes cluster in a single third. Waves 664/720
  // applied the backward-cause peak and run-based drought modes to relationshipShifts; the
  // zone-cluster mode has never been applied to it, completing the trio.
  {
    const r734a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r734a.fires) {
      issues.push({
        location: `${r734a.zoneNames[r734a.maxZoneIdx]} third — ${r734a.maxZoneCount} of ${r734a.count} relationship-shift scenes`,
        rule: 'PAYOFF_RELATIONSHIP_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r734a.maxZoneCount / r734a.count) * 100)}% of the story's relationship-shift scenes cluster in the ${r734a.zoneNames[r734a.maxZoneIdx]} third. When every bond change lands in the same structural window, the payoff engine has no relational movement to cash in as a resolution anywhere else in the story.`,
        suggestedFix: `Move at least one relationship shift outside the ${r734a.zoneNames[r734a.maxZoneIdx]} third so the payoff engine has relational movement to resolve more evenly across the story.`,
      });
    }
  }

  // PAYOFF_SEED_ZONE_CLUSTER — Distribution/timing × seededClueIds × structural thirds. Built on
  // checkZoneCluster from the shared checks library. n≥9, ≥3 seed scenes, fires when more than 75%
  // of those scenes cluster in a single third. seededClueIds already anchors the hand-rolled
  // SEED_DROUGHT_RUN (Wave 510) and the shared-library backward-cause peak mode (Wave 692); the
  // thirds-ratio zone-cluster mode has never been applied to it.
  {
    const r734b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.seededClueIds ?? []).length > 0,
    });
    if (r734b.fires) {
      issues.push({
        location: `${r734b.zoneNames[r734b.maxZoneIdx]} third — ${r734b.maxZoneCount} of ${r734b.count} seed scenes`,
        rule: 'PAYOFF_SEED_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r734b.maxZoneCount / r734b.count) * 100)}% of the story's clue-planting scenes cluster in the ${r734b.zoneNames[r734b.maxZoneIdx]} third. When every seed is planted in the same structural window, the payoff engine has nothing new to draw on once that window closes — resolutions elsewhere in the story are left resolving only what was set up early.`,
        suggestedFix: `Plant at least one clue outside the ${r734b.zoneNames[r734b.maxZoneIdx]} third so the payoff engine keeps fresh material to resolve throughout the story.`,
      });
    }
  }

  // PAYOFF_CLOCK_DELTA_DROUGHT_RUN — Run-based × clockDelta≠0 absence. Built on checkDroughtRun
  // from the shared checks library. n≥10, ≥3 clock-shifting scenes overall, fires when the
  // longest consecutive run of scenes with zero clock movement reaches 6. clockDelta has only ever
  // anchored single-peak-isolation checks (PAYOFF_CLOCK_PEAK_DECOUPLED, Wave 566;
  // PAYOFF_CLOCK_DELTA_PEAK_UNCAUSED, Wave 678); the run-based drought mode has never been applied
  // to it.
  {
    const r734c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.clockDelta ?? 0) !== 0,
    });
    if (r734c.fires) {
      issues.push({
        location: `longest stretch with no clock movement: ${r734c.longestRun} consecutive scenes`,
        rule: 'PAYOFF_CLOCK_DELTA_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r734c.longestRun} consecutive scenes with zero movement on the ticking clock at all, even though ${r734c.presentCount} scenes elsewhere do shift it. A long unbroken stretch where nothing tightens or loosens the deadline leaves payoffs landing without any accompanying pressure change for an extended run.`,
        suggestedFix: `Move the clock — tighten or ease the deadline — somewhere within the ${r734c.longestRun}-scene stretch so the payoff engine keeps a mechanical pressure acting alongside resolutions throughout that stretch.`,
      });
    }
  }

  // ── Wave 748: PAYOFF_CLOCK_DELTA_ZONE_CLUSTER, PAYOFF_TURN_ZONE_CLUSTER,
  //              PAYOFF_STAKES_DROUGHT_RUN ─────────────────────────────────────────────────

  // PAYOFF_CLOCK_DELTA_ZONE_CLUSTER — Distribution/timing × clockDelta≠0 presence × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 clock-shifting
  // scenes, fires when more than 75% of those scenes cluster in a single third. Waves 678/734
  // applied the backward-cause peak and run-based drought modes to clockDelta; the zone-cluster
  // mode has never been applied to it, completing the trio.
  {
    const r748a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.clockDelta ?? 0) !== 0,
    });
    if (r748a.fires) {
      issues.push({
        location: `${r748a.zoneNames[r748a.maxZoneIdx]} third — ${r748a.maxZoneCount} of ${r748a.count} clock-shifting scenes`,
        rule: 'PAYOFF_CLOCK_DELTA_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r748a.maxZoneCount / r748a.count) * 100)}% of the scenes that move the ticking clock cluster in the ${r748a.zoneNames[r748a.maxZoneIdx]} third. When every clock movement lands in the same structural window, the payoff engine has no accompanying pressure change to draw on when resolving threads elsewhere in the story.`,
        suggestedFix: `Move at least one clock-shifting beat outside the ${r748a.zoneNames[r748a.maxZoneIdx]} third so payoffs keep landing alongside changing pressure more evenly across the story.`,
      });
    }
  }

  // PAYOFF_TURN_ZONE_CLUSTER — Distribution/timing × dramaticTurn !== 'nothing' × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 turn scenes, fires
  // when more than 75% of those scenes cluster in a single third. Wave 678 applied the run-based
  // drought mode to this signal (PAYOFF_TURN_DROUGHT_RUN); the zone-cluster mode has never been
  // applied to it.
  {
    const r748b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
    });
    if (r748b.fires) {
      issues.push({
        location: `${r748b.zoneNames[r748b.maxZoneIdx]} third — ${r748b.maxZoneCount} of ${r748b.count} dramatic-turn scenes`,
        rule: 'PAYOFF_TURN_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r748b.maxZoneCount / r748b.count) * 100)}% of the story's dramatic turns cluster in the ${r748b.zoneNames[r748b.maxZoneIdx]} third. When every structural pivot lands in the same window, the payoff engine has no fresh reversal to draw on when resolving threads elsewhere in the story.`,
        suggestedFix: `Move at least one dramatic turn outside the ${r748b.zoneNames[r748b.maxZoneIdx]} third so the payoff engine keeps fresh reversals to resolve against more evenly across the story.`,
      });
    }
  }

  // PAYOFF_STAKES_DROUGHT_RUN — Run-based × purpose === 'raise_stakes' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 stakes-raising scenes overall, fires
  // when the longest consecutive run of scenes purposed otherwise reaches 6. Wave 692 applied the
  // zone-cluster mode to this signal (PAYOFF_STAKES_ZONE_CLUSTER); the drought-run mode has never
  // been applied to it.
  {
    const r748c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'raise_stakes',
    });
    if (r748c.fires) {
      issues.push({
        location: `longest stretch with no scene raising stakes: ${r748c.longestRun} consecutive scenes`,
        rule: 'PAYOFF_STAKES_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r748c.longestRun} consecutive scenes with no scene purposed to raise stakes, even though ${r748c.presentCount} scenes elsewhere do escalate. A long unbroken stretch with nothing pushing the stakes higher leaves the payoff engine resolving threads that were never re-tensioned for an extended run.`,
        suggestedFix: `Purpose at least one scene within the ${r748c.longestRun}-scene stretch to raise stakes — even a small escalation keeps the payoff engine resolving threads that still matter throughout that stretch.`,
      });
    }
  }

  // ── Wave 762: PAYOFF_CLOCK_ZONE_CLUSTER, PAYOFF_NEGATIVE_EMOTION_DROUGHT_RUN,
  //              PAYOFF_CURIOSITY_DROUGHT_RUN ───────────────────────────────────────────────

  // PAYOFF_CLOCK_ZONE_CLUSTER — Distribution/timing × clockRaised === true × structural thirds.
  // Built on checkZoneCluster from the shared checks library. n≥9, ≥3 clockRaised scenes, fires
  // when more than 75% of those scenes cluster in a single third. Wave 664 applied the run-based
  // drought mode to clockRaised (PAYOFF_CLOCK_DROUGHT_RUN); the zone-cluster mode has never been
  // applied to it.
  {
    const r762a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.clockRaised === true,
    });
    if (r762a.fires) {
      issues.push({
        location: `${r762a.zoneNames[r762a.maxZoneIdx]} third — ${r762a.maxZoneCount} of ${r762a.count} clockRaised scenes`,
        rule: 'PAYOFF_CLOCK_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r762a.maxZoneCount / r762a.count) * 100)}% of the story's clockRaised scenes cluster in the ${r762a.zoneNames[r762a.maxZoneIdx]} third. When every ticking-clock beat lands in the same structural window, the payoff engine has no accompanying urgency to draw on when resolving threads elsewhere in the story.`,
        suggestedFix: `Raise the clock in at least one scene outside the ${r762a.zoneNames[r762a.maxZoneIdx]} third so the payoff engine keeps urgency available more evenly across the story.`,
      });
    }
  }

  // PAYOFF_NEGATIVE_EMOTION_DROUGHT_RUN — Run-based × emotionalShift === 'negative' absence.
  // Built on checkDroughtRun from the shared checks library. n≥10, ≥3 negative-emotion scenes
  // overall, fires when the longest consecutive run of scenes with no negative shift reaches 6.
  // Wave 678 applied the zone-cluster mode to this signal (PAYOFF_NEGATIVE_EMOTION_ZONE_CLUSTER);
  // the drought-run mode has never been applied to it.
  {
    const r762b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.emotionalShift === 'negative',
    });
    if (r762b.fires) {
      issues.push({
        location: `longest stretch with no negative emotional shift: ${r762b.longestRun} consecutive scenes`,
        rule: 'PAYOFF_NEGATIVE_EMOTION_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r762b.longestRun} consecutive scenes with no negative emotional shift at all, even though ${r762b.presentCount} scenes elsewhere do carry a downturn. A long unbroken stretch with nothing costing the protagonist anything leaves the payoff engine resolving threads without a setback recently making the stakes feel real.`,
        suggestedFix: `Give at least one scene within the ${r762b.longestRun}-scene stretch a negative emotional beat so the payoff engine keeps resolving threads whose cost the audience can still feel.`,
      });
    }
  }

  // PAYOFF_CURIOSITY_DROUGHT_RUN — Run-based × curiosityDelta>0 absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 curiosity-positive scenes overall,
  // fires when the longest consecutive run of scenes with no curiosity rise reaches 6.
  // curiosityDelta has never anchored any of the three shared-library modes in this pass.
  {
    const r762c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r762c.fires) {
      issues.push({
        location: `longest stretch with no rising curiosity: ${r762c.longestRun} consecutive scenes`,
        rule: 'PAYOFF_CURIOSITY_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r762c.longestRun} consecutive scenes with no rise in curiosity at all, even though ${r762c.presentCount} scenes elsewhere do spark wonder. A long unbroken stretch with nothing new to wonder about leaves the payoff engine resolving old questions without planting new ones for an extended run.`,
        suggestedFix: `Raise curiosity somewhere within the ${r762c.longestRun}-scene stretch so the payoff engine keeps planting fresh questions alongside its resolutions throughout that stretch.`,
      });
    }
  }

  // ── Wave 776: PAYOFF_CURIOSITY_PEAK_UNCAUSED, PAYOFF_CURIOSITY_ZONE_CLUSTER,
  //              PAYOFF_SUSPENSE_ZONE_CLUSTER ──────────────────────────────────────

  // PAYOFF_CURIOSITY_PEAK_UNCAUSED — Backward-cause × curiosityDelta-as-magnitude × 2-scene
  // lookback. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 curiosity-
  // positive scenes, fires when the peak curiosity scene has no dramatic turn or revelation in
  // the 2 scenes preceding it. The existing PAYOFF_CURIOSITY_PEAK_DECOUPLED audits whether a
  // PAYOFF co-occurs AT the peak curiosity scene, not a preparing cause before it — the
  // backward-cause peak mode has never been applied to curiosityDelta itself.
  {
    const r776a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => Math.max(0, r.curiosityDelta ?? 0),
      hasCause: r => (r.dramaticTurn ?? 'nothing') !== 'nothing' || r.revelation != null,
    });
    if (r776a.fires) {
      issues.push({
        location: `scene ${r776a.peakIdx} (peak curiosityDelta ${r776a.peakMagnitude}) — no preparing cause nearby`,
        rule: 'PAYOFF_CURIOSITY_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single highest-curiosity scene (Scene ${r776a.peakIdx}, curiosityDelta ${r776a.peakMagnitude}) arrives with no dramatic turn or revelation in the 2 scenes leading into it, even though ${r776a.qualifyingCount} scenes elsewhere spark wonder. The moment the audience is most gripped by an open question lands out of nowhere — the payoff engine hasn't built toward the mystery it's about to pose.`,
        suggestedFix: `Add a dramatic turn or revelation in one of the 2 scenes before scene ${r776a.peakIdx} so the payoff engine earns its peak curiosity instead of springing it without preparation.`,
      });
    }
  }

  // PAYOFF_CURIOSITY_ZONE_CLUSTER — Distribution/timing × curiosityDelta>0 presence × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 curiosity-positive
  // scenes, fires when more than 75% of those scenes cluster in a single third. Completing the
  // trio for curiosityDelta; the zone-cluster mode has never been applied to it.
  {
    const r776b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r776b.fires) {
      issues.push({
        location: `${r776b.zoneNames[r776b.maxZoneIdx]} third — ${r776b.maxZoneCount} of ${r776b.count} curiosity-positive scenes`,
        rule: 'PAYOFF_CURIOSITY_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r776b.maxZoneCount / r776b.count) * 100)}% of the scenes where curiosity rises cluster in the ${r776b.zoneNames[r776b.maxZoneIdx]} third. When every spike in audience wonder lands in the same structural window, the payoff engine has no fresh question to plant anywhere else across the story.`,
        suggestedFix: `Raise curiosity in at least one scene outside the ${r776b.zoneNames[r776b.maxZoneIdx]} third so the payoff engine keeps planting fresh questions more evenly across the story.`,
      });
    }
  }

  // PAYOFF_SUSPENSE_ZONE_CLUSTER — Distribution/timing × suspenseDelta>0 presence × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 suspense-positive
  // scenes, fires when more than 75% of those scenes cluster in a single third. Every existing
  // suspense check in this pass is co-occurrence/decoupling or aftermath; none of the three
  // shared-library trio modes has ever been applied to suspenseDelta as a primary signal.
  {
    const r776c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r776c.fires) {
      issues.push({
        location: `${r776c.zoneNames[r776c.maxZoneIdx]} third — ${r776c.maxZoneCount} of ${r776c.count} suspense-positive scenes`,
        rule: 'PAYOFF_SUSPENSE_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r776c.maxZoneCount / r776c.count) * 100)}% of the scenes where tension rises cluster in the ${r776c.zoneNames[r776c.maxZoneIdx]} third. When every suspense spike lands in the same structural window, the payoff engine has no rising danger testing the audience's investment anywhere else across the story.`,
        suggestedFix: `Raise suspense in at least one scene outside the ${r776c.zoneNames[r776c.maxZoneIdx]} third so the payoff engine keeps rising danger testing the audience's investment more evenly across the story.`,
      });
    }
  }

  // ── Wave 790: PAYOFF_SUSPENSE_DROUGHT_RUN, PAYOFF_REVELATION_ZONE_CLUSTER,
  //              PAYOFF_REVELATION_DROUGHT_RUN ──────────────────────────────────────

  // PAYOFF_SUSPENSE_DROUGHT_RUN — Run-based × suspenseDelta>0 absence. Built on checkDroughtRun
  // from the shared checks library. n≥10, ≥3 suspense-positive scenes overall, fires when the
  // longest consecutive run of scenes with no rising tension reaches 6. Wave 776 applied the
  // zone-cluster mode to suspenseDelta; the run-based drought mode has never been applied to it,
  // completing 2 of 3 slots.
  {
    const r790a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r790a.fires) {
      issues.push({
        location: `longest stretch with no rising suspense: ${r790a.longestRun} consecutive scenes`,
        rule: 'PAYOFF_SUSPENSE_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r790a.longestRun} consecutive scenes with no rise in suspense at all, even though ${r790a.presentCount} scenes elsewhere do spike. A long unbroken stretch with nothing tightening the danger leaves the payoff engine without rising pressure testing the audience's investment for an extended run.`,
        suggestedFix: `Raise suspense somewhere within the ${r790a.longestRun}-scene stretch so the payoff engine keeps rising pressure testing the audience's investment throughout that stretch.`,
      });
    }
  }

  // PAYOFF_REVELATION_ZONE_CLUSTER — Distribution/timing × revelation × structural thirds. Built
  // on checkZoneCluster from the shared checks library. n≥9, ≥3 revelation scenes, fires when
  // more than 75% of those scenes cluster in a single third. Existing revelation checks are
  // co-occurrence/decoupling and aftermath; none of the three shared-library trio modes has ever
  // been applied to it.
  {
    const r790b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.revelation != null,
    });
    if (r790b.fires) {
      issues.push({
        location: `${r790b.zoneNames[r790b.maxZoneIdx]} third — ${r790b.maxZoneCount} of ${r790b.count} revelation scenes`,
        rule: 'PAYOFF_REVELATION_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r790b.maxZoneCount / r790b.count) * 100)}% of the story's revelation scenes cluster in the ${r790b.zoneNames[r790b.maxZoneIdx]} third. When every disclosure lands in the same structural window, the payoff engine has no fresh truth to resolve anywhere else across the story.`,
        suggestedFix: `Let a revelation land in at least one scene outside the ${r790b.zoneNames[r790b.maxZoneIdx]} third so the payoff engine keeps resolving new disclosures more evenly across the story.`,
      });
    }
  }

  // PAYOFF_REVELATION_DROUGHT_RUN — Run-based × revelation absence. Built on checkDroughtRun from
  // the shared checks library. n≥10, ≥3 revelation scenes overall, fires when the longest
  // consecutive run of scenes with no revelation reaches 6. Completing 2 of 3 slots for
  // revelation alongside the zone-cluster mode added in this same wave.
  {
    const r790c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.revelation != null,
    });
    if (r790c.fires) {
      issues.push({
        location: `longest stretch with no revelation: ${r790c.longestRun} consecutive scenes`,
        rule: 'PAYOFF_REVELATION_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r790c.longestRun} consecutive scenes with no revelation at all, even though ${r790c.presentCount} scenes elsewhere disclose a truth. A long unbroken stretch with nothing new coming to light leaves the payoff engine with no fresh disclosure to resolve for an extended run.`,
        suggestedFix: `Let a truth surface somewhere within the ${r790c.longestRun}-scene stretch so the payoff engine keeps resolving new disclosures throughout that stretch.`,
      });
    }
  }

  // ── Wave 804: PAYOFF_SUSPENSE_PEAK_UNCAUSED, PAYOFF_REVELATION_PEAK_UNCAUSED,
  //              PAYOFF_CHARACTER_MOMENT_ZONE_CLUSTER ──────────────────────────────────────

  // PAYOFF_SUSPENSE_PEAK_UNCAUSED — Backward-cause × suspenseDelta-as-magnitude × 2-scene
  // lookback. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 suspense-
  // positive scenes, fires when the peak suspense scene has no dramatic turn or revelation in the
  // 2 scenes preceding it. Completes the trio for suspenseDelta alongside the zone-cluster mode
  // (Wave 776) and the run-based drought mode (Wave 790) — the backward-cause peak mode has never
  // been applied to it.
  {
    const r804a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => Math.max(0, r.suspenseDelta ?? 0),
      hasCause: r => (r.dramaticTurn ?? 'nothing') !== 'nothing' || r.revelation != null,
    });
    if (r804a.fires) {
      issues.push({
        location: `scene ${r804a.peakIdx} (peak suspenseDelta ${r804a.peakMagnitude}) — no preparing cause nearby`,
        rule: 'PAYOFF_SUSPENSE_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single highest-suspense scene (Scene ${r804a.peakIdx}, suspenseDelta ${r804a.peakMagnitude}) arrives with no dramatic turn or revelation in the 2 scenes leading into it, even though ${r804a.qualifyingCount} scenes elsewhere carry tension. The moment the payoff engine is under the most pressure lands out of nowhere — nothing has built toward the danger testing which threads survive.`,
        suggestedFix: `Add a dramatic turn or revelation in one of the 2 scenes before scene ${r804a.peakIdx} so the peak tension reads as earned rather than arbitrary.`,
      });
    }
  }

  // PAYOFF_REVELATION_PEAK_UNCAUSED — Backward-cause × revelation-as-magnitude (0/1) × 2-scene
  // lookback. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 revelation
  // scenes, fires when the (first) revelation scene has no dramatic turn in itself or the 2
  // scenes preceding it. Completes the trio for revelation. hasCause deliberately omits
  // revelation to avoid circularity.
  {
    const r804b = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.revelation != null ? 1 : 0),
      hasCause: r => r.dramaticTurn !== 'nothing',
    });
    if (r804b.fires) {
      issues.push({
        location: `scene ${r804b.peakIdx + 1} — revelation with no dramatic turn nearby`,
        rule: 'PAYOFF_REVELATION_PEAK_UNCAUSED',
        severity: 'minor',
        description: `Scene ${r804b.peakIdx + 1} discloses a revelation with no dramatic turn in itself or the two scenes before it, even though ${r804b.qualifyingCount} scenes elsewhere disclose a truth. A revelation that lands without any preceding pivot reads as a coincidence rather than something the payoff engine's own turns forced into the open.`,
        suggestedFix: `Add a dramatic turn in scene ${r804b.peakIdx + 1} or one of the two scenes before it so the revelation reads as a consequence of the story's own turning points rather than arriving unprepared.`,
      });
    }
  }

  // PAYOFF_CHARACTER_MOMENT_ZONE_CLUSTER — Distribution/timing × purpose ===
  // 'character_moment' × structural thirds. Built on checkZoneCluster from the shared checks
  // library. n≥9, ≥3 character-moment scenes, fires when more than 75% of them fall in a single
  // structural third. This purpose value has never been referenced anywhere in this pass; none
  // of the three shared-library trio modes has ever been applied to it.
  {
    const r804c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'character_moment',
    });
    if (r804c.fires) {
      issues.push({
        location: `${r804c.zoneNames[r804c.maxZoneIdx]} third — ${r804c.maxZoneCount} of ${r804c.count} character-moment scenes`,
        rule: 'PAYOFF_CHARACTER_MOMENT_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r804c.maxZoneCount / r804c.count) * 100)}% of the story's character-moment scenes cluster in the ${r804c.zoneNames[r804c.maxZoneIdx]} third. When every beat of interior reflection lands in the same structural window, the payoff engine has no room to let a resolved thread register on the protagonist anywhere else in the story.`,
        suggestedFix: `Purpose at least one scene outside the ${r804c.zoneNames[r804c.maxZoneIdx]} third as a character moment so the payoff engine keeps room for interior reflection more evenly across the story.`,
      });
    }
  }

  // ── Wave 818: PAYOFF_CHARACTER_MOMENT_DROUGHT_RUN, PAYOFF_TURNING_POINT_ZONE_CLUSTER,
  //              PAYOFF_TURNING_POINT_DROUGHT_RUN ──────────────────────────────────────

  // PAYOFF_CHARACTER_MOMENT_DROUGHT_RUN — Run-based × purpose === 'character_moment' absence.
  // Built on checkDroughtRun from the shared checks library. n≥10, ≥3 character-moment scenes
  // overall, fires when the longest consecutive run of scenes with no character-moment purpose
  // reaches 6. Completing 2 of 3 slots for this purpose value alongside the zone-cluster mode
  // added in Wave 804 (peak mode conventionally skipped for this categorical field).
  {
    const r818a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'character_moment',
    });
    if (r818a.fires) {
      issues.push({
        location: `longest stretch with no character moment: ${r818a.longestRun} consecutive scenes`,
        rule: 'PAYOFF_CHARACTER_MOMENT_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r818a.longestRun} consecutive scenes with no character-moment purpose at all, even though ${r818a.presentCount} scenes elsewhere pause for interior reflection. A long unbroken stretch with nothing but resolution mechanics leaves the payoff engine without a beat to let a resolved thread register on the characters for an extended run.`,
        suggestedFix: `Purpose at least one scene within the ${r818a.longestRun}-scene stretch as a character moment so the payoff engine keeps room for interior reflection throughout that stretch.`,
      });
    }
  }

  // PAYOFF_TURNING_POINT_ZONE_CLUSTER — Distribution/timing × purpose === 'turning_point' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // turning-point scenes, fires when more than 75% of them fall in a single structural third.
  // This purpose value has never been referenced anywhere in this pass; none of the three
  // shared-library trio modes has ever been applied to it.
  {
    const r818b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'turning_point',
    });
    if (r818b.fires) {
      issues.push({
        location: `${r818b.zoneNames[r818b.maxZoneIdx]} third — ${r818b.maxZoneCount} of ${r818b.count} turning-point scenes`,
        rule: 'PAYOFF_TURNING_POINT_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r818b.maxZoneCount / r818b.count) * 100)}% of the story's turning-point scenes cluster in the ${r818b.zoneNames[r818b.maxZoneIdx]} third. When every scene purposed as a turning point lands in the same structural window, the payoff engine has no pivot to resolve threads against anywhere else in the story.`,
        suggestedFix: `Purpose at least one scene outside the ${r818b.zoneNames[r818b.maxZoneIdx]} third as a turning point so the payoff engine keeps a pivot to resolve threads against more evenly across the story.`,
      });
    }
  }

  // PAYOFF_TURNING_POINT_DROUGHT_RUN — Run-based × purpose === 'turning_point' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 turning-point scenes overall, fires
  // when the longest consecutive run of scenes with no turning-point purpose reaches 6.
  // Completing 2 of 3 slots for this purpose value alongside the zone-cluster mode added in this
  // same wave (peak mode conventionally skipped for this categorical field).
  {
    const r818c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'turning_point',
    });
    if (r818c.fires) {
      issues.push({
        location: `longest stretch with no turning point: ${r818c.longestRun} consecutive scenes`,
        rule: 'PAYOFF_TURNING_POINT_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r818c.longestRun} consecutive scenes with no turning-point purpose at all, even though ${r818c.presentCount} scenes elsewhere redirect events. A long unbroken stretch with no redirection leaves the payoff engine without a pivot to resolve threads against for an extended run.`,
        suggestedFix: `Purpose at least one scene within the ${r818c.longestRun}-scene stretch as a turning point so the payoff engine keeps a pivot to resolve threads against throughout that stretch.`,
      });
    }
  }

  // ── Wave 832: PAYOFF_INTRODUCE_CONFLICT_ZONE_CLUSTER, PAYOFF_INTRODUCE_CONFLICT_DROUGHT_RUN,
  //              PAYOFF_POSITIVE_EMOTION_ZONE_CLUSTER ──────────────────────────────────────

  // PAYOFF_INTRODUCE_CONFLICT_ZONE_CLUSTER — Distribution/timing × purpose ===
  // 'introduce_conflict' × structural thirds. Built on checkZoneCluster from the shared checks
  // library. n≥9, ≥3 conflict-introducing scenes, fires when more than 75% of them fall in a
  // single structural third. This purpose value has never been referenced anywhere in this pass —
  // a virgin field for all three shared-library trio modes.
  {
    const r832a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'introduce_conflict',
    });
    if (r832a.fires) {
      issues.push({
        location: `${r832a.zoneNames[r832a.maxZoneIdx]} third — ${r832a.maxZoneCount} of ${r832a.count} conflict-introducing scenes`,
        rule: 'PAYOFF_INTRODUCE_CONFLICT_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r832a.maxZoneCount / r832a.count) * 100)}% of the scenes purposed to introduce conflict cluster in the ${r832a.zoneNames[r832a.maxZoneIdx]} third. When every new front of conflict opens in the same structural window, the payoff engine loses fresh setups to resolve anywhere else across the story.`,
        suggestedFix: `Purpose at least one scene outside the ${r832a.zoneNames[r832a.maxZoneIdx]} third to introduce conflict so the payoff engine keeps fresh setups to resolve more evenly across the story.`,
      });
    }
  }

  // PAYOFF_INTRODUCE_CONFLICT_DROUGHT_RUN — Run-based × purpose === 'introduce_conflict' absence.
  // Built on checkDroughtRun from the shared checks library. n≥10, ≥3 conflict-introducing scenes
  // overall, fires when the longest consecutive run of scenes with no conflict-introducing
  // purpose reaches 6. Completing 2 of 3 slots for this purpose value alongside the zone-cluster
  // mode added in this same wave (peak mode conventionally skipped for this categorical field).
  {
    const r832b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'introduce_conflict',
    });
    if (r832b.fires) {
      issues.push({
        location: `longest stretch with no new conflict: ${r832b.longestRun} consecutive scenes`,
        rule: 'PAYOFF_INTRODUCE_CONFLICT_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r832b.longestRun} consecutive scenes with no conflict-introducing purpose at all, even though ${r832b.presentCount} scenes elsewhere open a new front. A long unbroken stretch with no fresh friction leaves the payoff engine with nothing new to resolve for an extended run.`,
        suggestedFix: `Purpose at least one scene within the ${r832b.longestRun}-scene stretch to introduce conflict so the payoff engine keeps fresh setups to resolve throughout that stretch.`,
      });
    }
  }

  // PAYOFF_POSITIVE_EMOTION_ZONE_CLUSTER — Distribution/timing × emotionalShift === 'positive' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // positive-emotion scenes, fires when more than 75% of them fall in a single structural third.
  // Mirrors the completed negative-valence trio; the positive valence has never been isolated by
  // any of the three shared-library trio modes in this pass.
  {
    const r832c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.emotionalShift === 'positive',
    });
    if (r832c.fires) {
      issues.push({
        location: `${r832c.zoneNames[r832c.maxZoneIdx]} third — ${r832c.maxZoneCount} of ${r832c.count} positive-emotion scenes`,
        rule: 'PAYOFF_POSITIVE_EMOTION_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r832c.maxZoneCount / r832c.count) * 100)}% of the story's positive-emotion scenes cluster in the ${r832c.zoneNames[r832c.maxZoneIdx]} third. When all the relief concentrates in one structural window, the payoff engine delivers its emotional reward in only one part of the story instead of throughout its full length.`,
        suggestedFix: `Introduce a positive-emotion scene outside the ${r832c.zoneNames[r832c.maxZoneIdx]} third so the payoff engine delivers its emotional reward more evenly across the story.`,
      });
    }
  }

  // ── Wave 846: PAYOFF_POSITIVE_EMOTION_DROUGHT_RUN, PAYOFF_ESTABLISH_WORLD_ZONE_CLUSTER,
  //              PAYOFF_CLIMAX_ZONE_CLUSTER ──────────────────────────────────────

  // PAYOFF_POSITIVE_EMOTION_DROUGHT_RUN — Run-based × emotionalShift === 'positive' absence.
  // Built on checkDroughtRun from the shared checks library. n≥10, ≥3 positive-emotion scenes
  // overall, fires when the longest consecutive run of scenes with no positive-emotion charge
  // reaches 6. Completing 2 of 3 slots for this valence alongside the zone-cluster mode added in
  // Wave 832 (peak mode conventionally skipped for this categorical field).
  {
    const r846a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.emotionalShift === 'positive',
    });
    if (r846a.fires) {
      issues.push({
        location: `longest stretch with no positive-emotion charge: ${r846a.longestRun} consecutive scenes`,
        rule: 'PAYOFF_POSITIVE_EMOTION_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r846a.longestRun} consecutive scenes with no positive-emotion charge at all, even though ${r846a.presentCount} scenes elsewhere carry one. A long unbroken stretch with no relief leaves the payoff engine without an emotional reward to deliver for an extended run.`,
        suggestedFix: `Give the story a moment of relief within the ${r846a.longestRun}-scene stretch so the payoff engine keeps an emotional reward to deliver throughout that stretch.`,
      });
    }
  }

  // PAYOFF_ESTABLISH_WORLD_ZONE_CLUSTER — Distribution/timing × purpose === 'establish_world' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // world-establishing scenes, fires when more than 75% of them fall in a single structural
  // third. This purpose value has only ever appeared inside incidental function-concentration
  // checks; none of the three shared-library trio modes has ever isolated it as its own
  // standalone signal.
  {
    const r846b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'establish_world',
    });
    if (r846b.fires) {
      issues.push({
        location: `${r846b.zoneNames[r846b.maxZoneIdx]} third — ${r846b.maxZoneCount} of ${r846b.count} world-establishing scenes`,
        rule: 'PAYOFF_ESTABLISH_WORLD_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r846b.maxZoneCount / r846b.count) * 100)}% of the scenes purposed to establish the world cluster in the ${r846b.zoneNames[r846b.maxZoneIdx]} third. When every act of world-building concentrates in one structural window, the payoff engine loses fresh ground to plant setups against anywhere else across the story.`,
        suggestedFix: `Purpose at least one scene outside the ${r846b.zoneNames[r846b.maxZoneIdx]} third to establish the world so the payoff engine keeps fresh ground to plant setups against more evenly across the story.`,
      });
    }
  }

  // PAYOFF_CLIMAX_ZONE_CLUSTER — Distribution/timing × purpose === 'climax' × structural thirds.
  // Built on checkZoneCluster from the shared checks library. n≥9, ≥3 climax-purposed scenes,
  // fires when more than 75% of them fall in a single structural third. Likewise only ever
  // touched via an incidental `isClimaticScene` disjunction; a virgin standalone signal.
  {
    const r846c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'climax',
    });
    if (r846c.fires) {
      issues.push({
        location: `${r846c.zoneNames[r846c.maxZoneIdx]} third — ${r846c.maxZoneCount} of ${r846c.count} climax-purposed scenes`,
        rule: 'PAYOFF_CLIMAX_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r846c.maxZoneCount / r846c.count) * 100)}% of the scenes purposed as the climax cluster in the ${r846c.zoneNames[r846c.maxZoneIdx]} third. When every peak moment concentrates in one structural window, the payoff engine delivers its biggest rewards in only one part of the story instead of throughout its full length.`,
        suggestedFix: `Reconsider whether every climax-purposed scene belongs in the ${r846c.zoneNames[r846c.maxZoneIdx]} third so the payoff engine delivers its rewards more evenly across the story.`,
      });
    }
  }

  // ── Wave 860: PAYOFF_CLIMAX_DROUGHT_RUN, PAYOFF_ESTABLISH_WORLD_DROUGHT_RUN,
  //              PAYOFF_RESOLUTION_ZONE_CLUSTER ──────────────────────────────

  // PAYOFF_CLIMAX_DROUGHT_RUN — Run-based × purpose === 'climax' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 climax-purposed scenes overall,
  // fires when the longest consecutive run of scenes with no climax purpose reaches 6.
  // Completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in
  // Wave 846 (peak mode conventionally skipped for this categorical field).
  {
    const r860a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'climax',
    });
    if (r860a.fires) {
      issues.push({
        location: `longest stretch with no climax-purposed scene: ${r860a.longestRun} consecutive scenes`,
        rule: 'PAYOFF_CLIMAX_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r860a.longestRun} consecutive scenes with no scene purposed as the climax, even though ${r860a.presentCount} scenes elsewhere are. A long unbroken stretch between peak moments leaves the payoff engine without a structural high point to build its rewards toward for an extended run.`,
        suggestedFix: `Purpose a scene within the ${r860a.longestRun}-scene stretch as the climax, or restructure so peak moments recur rather than clustering into a single distant point.`,
      });
    }
  }

  // PAYOFF_ESTABLISH_WORLD_DROUGHT_RUN — Run-based × purpose === 'establish_world' absence.
  // Built on checkDroughtRun from the shared checks library. n≥10, ≥3 world-establishing
  // scenes overall, fires when the longest consecutive run of scenes with no world-establishing
  // purpose reaches 6. Completes 2 of 3 slots for this purpose value alongside the zone-cluster
  // mode added in Wave 846 (peak mode conventionally skipped for this categorical field).
  {
    const r860b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'establish_world',
    });
    if (r860b.fires) {
      issues.push({
        location: `longest stretch with no world-establishing scene: ${r860b.longestRun} consecutive scenes`,
        rule: 'PAYOFF_ESTABLISH_WORLD_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r860b.longestRun} consecutive scenes with no scene purposed to establish the world, even though ${r860b.presentCount} scenes elsewhere are. A long unbroken stretch without new world-building leaves the payoff engine with no fresh ground to plant setups against for an extended run.`,
        suggestedFix: `Purpose a scene within the ${r860b.longestRun}-scene stretch to establish the world, so setups have fresh ground to plant against throughout the story rather than in one isolated pocket.`,
      });
    }
  }

  // PAYOFF_RESOLUTION_ZONE_CLUSTER — Distribution/timing × purpose === 'resolution' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // resolution-purposed scenes, fires when more than 75% of them fall in a single structural
  // third. Distinct from RESOLUTION_CRAMMED_AT_END and PAYOFF_POST_CLIMAX_CLUSTER, which both
  // audit the temporal position of payoffSetupIds resolution (when clues get paid off), not
  // scenes whose `purpose` field itself equals 'resolution'; none of the three shared-library
  // trio modes has ever isolated this purpose value as its own standalone signal.
  {
    const r860c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'resolution',
    });
    if (r860c.fires) {
      issues.push({
        location: `${r860c.zoneNames[r860c.maxZoneIdx]} third — ${r860c.maxZoneCount} of ${r860c.count} resolution-purposed scenes`,
        rule: 'PAYOFF_RESOLUTION_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r860c.maxZoneCount / r860c.count) * 100)}% of the scenes purposed as resolution cluster in the ${r860c.zoneNames[r860c.maxZoneIdx]} third. When every resolution beat concentrates in one structural window, the payoff engine has no room to let earlier threads settle before the ending absorbs them all at once.`,
        suggestedFix: `Purpose at least one resolution scene outside the ${r860c.zoneNames[r860c.maxZoneIdx]} third so closure is distributed across the story rather than concentrated in a single structural window.`,
      });
    }
  }

  // ── Wave 874: PAYOFF_RESOLUTION_DROUGHT_RUN, PAYOFF_COMPLICATE_ZONE_CLUSTER,
  //              PAYOFF_COMPLICATE_DROUGHT_RUN ──────────────────────────────────────

  // PAYOFF_RESOLUTION_DROUGHT_RUN — Run-based × purpose === 'resolution' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 resolution-purposed scenes overall,
  // fires when the longest consecutive run of scenes with no resolution purpose reaches 6.
  // Completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in
  // Wave 860. Distinct from RESOLUTION_CRAMMED_AT_END and PAYOFF_POST_CLIMAX_CLUSTER, which
  // both audit the temporal position of payoffSetupIds resolution rather than sustained absence
  // of the scene's `purpose` field; peak mode conventionally skipped for this categorical field.
  {
    const r874a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'resolution',
    });
    if (r874a.fires) {
      issues.push({
        location: `longest stretch with no resolution-purposed scene: ${r874a.longestRun} consecutive scenes`,
        rule: 'PAYOFF_RESOLUTION_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r874a.longestRun} consecutive scenes with no scene purposed to resolve the story, even though ${r874a.presentCount} scenes elsewhere are. A long unbroken stretch with nothing settled leaves the payoff engine's threads dangling for an extended run.`,
        suggestedFix: `Purpose a scene within the ${r874a.longestRun}-scene stretch to resolve part of the story, so the payoff engine keeps settling threads throughout the story rather than only at its very end.`,
      });
    }
  }

  // PAYOFF_COMPLICATE_ZONE_CLUSTER — Distribution/timing × purpose === 'complicate' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // complicating scenes, fires when more than 75% of them fall in a single structural third.
  // This purpose value has never been referenced anywhere in this pass — a virgin field for
  // all three shared-library trio modes.
  {
    const r874b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'complicate',
    });
    if (r874b.fires) {
      issues.push({
        location: `${r874b.zoneNames[r874b.maxZoneIdx]} third — ${r874b.maxZoneCount} of ${r874b.count} complicating scenes`,
        rule: 'PAYOFF_COMPLICATE_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r874b.maxZoneCount / r874b.count) * 100)}% of the scenes purposed to complicate the story cluster in the ${r874b.zoneNames[r874b.maxZoneIdx]} third. When every complication lands in the same structural window, the payoff engine stops planting fresh setups to resolve anywhere else across the story.`,
        suggestedFix: `Purpose at least one scene outside the ${r874b.zoneNames[r874b.maxZoneIdx]} third to complicate the story so the payoff engine keeps planting fresh setups more evenly across the story.`,
      });
    }
  }

  // PAYOFF_COMPLICATE_DROUGHT_RUN — Run-based × purpose === 'complicate' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 complicating scenes overall, fires
  // when the longest consecutive run of scenes with no complicating purpose reaches 6.
  // Completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in this
  // same wave (peak mode conventionally skipped for this categorical field).
  {
    const r874c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'complicate',
    });
    if (r874c.fires) {
      issues.push({
        location: `longest stretch with no complication: ${r874c.longestRun} consecutive scenes`,
        rule: 'PAYOFF_COMPLICATE_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r874c.longestRun} consecutive scenes with no complicating purpose at all, even though ${r874c.presentCount} scenes elsewhere deepen the trouble. A long unbroken stretch with nothing new complicating the situation leaves the payoff engine with no fresh setups planted for an extended run.`,
        suggestedFix: `Purpose at least one scene within the ${r874c.longestRun}-scene stretch to complicate the story so the payoff engine keeps planting fresh setups throughout that stretch.`,
      });
    }
  }

  // ── Wave 888: PAYOFF_CLIMAX_ZONE_IMBALANCE, PAYOFF_ESTABLISH_WORLD_ZONE_IMBALANCE,
  //              PAYOFF_RESOLUTION_ZONE_IMBALANCE ──────────────────────────────────────

  // PAYOFF_CLIMAX_ZONE_IMBALANCE — Underweight/bloat × purpose === 'climax' × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 climax-purposed
  // scenes total, divided across four equal structural zones. Fires only when one zone has zero
  // such scenes while another holds ≥50% of the total. Distinct from the existing 3-zone
  // PAYOFF_CLIMAX_ZONE_CLUSTER and run-based PAYOFF_CLIMAX_DROUGHT_RUN — the first application
  // of the 4-zone bloat+empty-zone mode to this purpose value.
  {
    const r888a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'climax',
    });
    if (r888a.fires) {
      const emptyNames888a = r888a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName888a = FOUR_ZONE_NAMES[r888a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames888a} empty; ${bloatName888a} has ${r888a.counts[r888a.bloatZoneIdx]}/${r888a.totalCount} climax-purposed scenes`,
        rule: 'PAYOFF_CLIMAX_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r888a.totalCount} climax-purposed scenes are unevenly distributed across its four structural zones: ${bloatName888a} contains ${r888a.counts[r888a.bloatZoneIdx]} of them (${Math.round((r888a.counts[r888a.bloatZoneIdx] / r888a.totalCount) * 100)}%) while ${emptyNames888a} contains none. Peak moments bloat in one structural quarter and vanish from another, giving the payoff engine's biggest rewards an uneven structural rhythm.`,
        suggestedFix: `Redistribute peak moments: move at least one climax-purposed scene into the empty zone(s) — ${emptyNames888a} — so the payoff engine delivers its biggest rewards more evenly across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // PAYOFF_ESTABLISH_WORLD_ZONE_IMBALANCE — Underweight/bloat × purpose === 'establish_world' ×
  // four structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4
  // world-establishing scenes total, divided across four equal structural zones. Fires only
  // when one zone has zero such scenes while another holds ≥50% of the total. Distinct from the
  // existing 3-zone PAYOFF_ESTABLISH_WORLD_ZONE_CLUSTER and run-based PAYOFF_ESTABLISH_WORLD_
  // DROUGHT_RUN — the first application of the 4-zone bloat+empty-zone mode to this purpose
  // value.
  {
    const r888b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'establish_world',
    });
    if (r888b.fires) {
      const emptyNames888b = r888b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName888b = FOUR_ZONE_NAMES[r888b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames888b} empty; ${bloatName888b} has ${r888b.counts[r888b.bloatZoneIdx]}/${r888b.totalCount} world-establishing scenes`,
        rule: 'PAYOFF_ESTABLISH_WORLD_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r888b.totalCount} world-establishing scenes are unevenly distributed across its four structural zones: ${bloatName888b} contains ${r888b.counts[r888b.bloatZoneIdx]} of them (${Math.round((r888b.counts[r888b.bloatZoneIdx] / r888b.totalCount) * 100)}%) while ${emptyNames888b} contains none. World-building bloats in one structural quarter and vanishes from another, giving the payoff engine's ground to plant setups against an uneven structural rhythm.`,
        suggestedFix: `Redistribute world-building beats: move at least one establish_world-purposed scene into the empty zone(s) — ${emptyNames888b} — so the payoff engine keeps fresh ground to plant setups against more evenly across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // PAYOFF_RESOLUTION_ZONE_IMBALANCE — Underweight/bloat × purpose === 'resolution' × four
  // structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4
  // resolution-purposed scenes total, divided across four equal structural zones. Fires only
  // when one zone has zero such scenes while another holds ≥50% of the total. Distinct from
  // RESOLUTION_CRAMMED_AT_END/PAYOFF_POST_CLIMAX_CLUSTER (which audit payoffSetupIds temporal
  // position rather than this purpose enum value) and from the existing 3-zone PAYOFF_
  // RESOLUTION_ZONE_CLUSTER and run-based PAYOFF_RESOLUTION_DROUGHT_RUN — the first application
  // of the 4-zone bloat+empty-zone mode to this purpose value.
  {
    const r888c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'resolution',
    });
    if (r888c.fires) {
      const emptyNames888c = r888c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName888c = FOUR_ZONE_NAMES[r888c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames888c} empty; ${bloatName888c} has ${r888c.counts[r888c.bloatZoneIdx]}/${r888c.totalCount} resolution-purposed scenes`,
        rule: 'PAYOFF_RESOLUTION_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r888c.totalCount} resolution-purposed scenes are unevenly distributed across its four structural zones: ${bloatName888c} contains ${r888c.counts[r888c.bloatZoneIdx]} of them (${Math.round((r888c.counts[r888c.bloatZoneIdx] / r888c.totalCount) * 100)}%) while ${emptyNames888c} contains none. Settling beats bloat in one structural quarter and vanish from another, giving the payoff engine's closure an uneven structural rhythm.`,
        suggestedFix: `Redistribute settling beats: move at least one resolution-purposed scene into the empty zone(s) — ${emptyNames888c} — so the payoff engine's threads keep settling more evenly across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // PAYOFF_TURNING_POINT_ZONE_IMBALANCE — Underweight/bloat × purpose === 'turning_point' × four
  // structural zones. Built on checkZoneImbalance from the shared checks library, continuing the
  // rollout begun in Wave 888. n≥10, ≥4 turning-point scenes total, divided across four equal
  // structural zones. Fires only when one zone has zero such scenes while another holds ≥50% of
  // the total. Distinct from the existing 3-zone PAYOFF_TURNING_POINT_ZONE_CLUSTER and run-based
  // PAYOFF_TURNING_POINT_DROUGHT_RUN — the first application of the 4-zone bloat+empty-zone mode
  // to this purpose value.
  {
    const r902a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'turning_point',
    });
    if (r902a.fires) {
      const emptyNames902a = r902a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName902a = FOUR_ZONE_NAMES[r902a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames902a} empty; ${bloatName902a} has ${r902a.counts[r902a.bloatZoneIdx]}/${r902a.totalCount} turning-point scenes`,
        rule: 'PAYOFF_TURNING_POINT_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r902a.totalCount} turning-point scenes are unevenly distributed across its four structural zones: ${bloatName902a} contains ${r902a.counts[r902a.bloatZoneIdx]} of them (${Math.round((r902a.counts[r902a.bloatZoneIdx] / r902a.totalCount) * 100)}%) while ${emptyNames902a} contains none. Pivots bloat in one structural quarter and vanish from another, giving the payoff engine's direction changes an uneven structural rhythm.`,
        suggestedFix: `Redistribute turning points: move at least one turning_point-purposed scene into the empty zone(s) — ${emptyNames902a} — so the payoff engine cashes in its pivots more evenly across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // PAYOFF_COMPLICATE_ZONE_IMBALANCE — Underweight/bloat × purpose === 'complicate' × four
  // structural zones. Built on checkZoneImbalance from the shared checks library, continuing the
  // rollout begun in Wave 888. n≥10, ≥4 complicating scenes total, divided across four equal
  // structural zones. Fires only when one zone has zero such scenes while another holds ≥50% of
  // the total. Distinct from the existing 3-zone PAYOFF_COMPLICATE_ZONE_CLUSTER and run-based
  // PAYOFF_COMPLICATE_DROUGHT_RUN — the first application of the 4-zone bloat+empty-zone mode to
  // this purpose value.
  {
    const r902b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'complicate',
    });
    if (r902b.fires) {
      const emptyNames902b = r902b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName902b = FOUR_ZONE_NAMES[r902b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames902b} empty; ${bloatName902b} has ${r902b.counts[r902b.bloatZoneIdx]}/${r902b.totalCount} complicating scenes`,
        rule: 'PAYOFF_COMPLICATE_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r902b.totalCount} complicating scenes are unevenly distributed across its four structural zones: ${bloatName902b} contains ${r902b.counts[r902b.bloatZoneIdx]} of them (${Math.round((r902b.counts[r902b.bloatZoneIdx] / r902b.totalCount) * 100)}%) while ${emptyNames902b} contains none. Complications bloat in one structural quarter and vanish from another, giving the payoff engine's fresh debts an uneven structural rhythm.`,
        suggestedFix: `Redistribute complications: move at least one complicate-purposed scene into the empty zone(s) — ${emptyNames902b} — so the payoff engine keeps opening fresh debts more evenly across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // PAYOFF_INTRODUCE_CONFLICT_ZONE_IMBALANCE — Underweight/bloat × purpose === 'introduce_conflict'
  // × four structural zones. Built on checkZoneImbalance from the shared checks library, continuing
  // the rollout begun in Wave 888. n≥10, ≥4 conflict-introducing scenes total, divided across four
  // equal structural zones. Fires only when one zone has zero such scenes while another holds ≥50%
  // of the total. Distinct from the existing 3-zone PAYOFF_INTRODUCE_CONFLICT_ZONE_CLUSTER and
  // run-based PAYOFF_INTRODUCE_CONFLICT_DROUGHT_RUN — the first application of the 4-zone
  // bloat+empty-zone mode to this purpose value.
  {
    const r902c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'introduce_conflict',
    });
    if (r902c.fires) {
      const emptyNames902c = r902c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName902c = FOUR_ZONE_NAMES[r902c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames902c} empty; ${bloatName902c} has ${r902c.counts[r902c.bloatZoneIdx]}/${r902c.totalCount} conflict-introducing scenes`,
        rule: 'PAYOFF_INTRODUCE_CONFLICT_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r902c.totalCount} conflict-introducing scenes are unevenly distributed across its four structural zones: ${bloatName902c} contains ${r902c.counts[r902c.bloatZoneIdx]} of them (${Math.round((r902c.counts[r902c.bloatZoneIdx] / r902c.totalCount) * 100)}%) while ${emptyNames902c} contains none. New conflicts bloat in one structural quarter and vanish from another, giving the payoff engine's fresh setups an uneven structural rhythm.`,
        suggestedFix: `Redistribute new conflicts: move at least one introduce_conflict-purposed scene into the empty zone(s) — ${emptyNames902c} — so the payoff engine keeps seeding fresh setups more evenly across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // PAYOFF_REVELATION_PURPOSE_ZONE_CLUSTER — Distribution/timing × purpose === 'revelation' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 scenes
  // purposed as a revelation, fires when more than 75% of them fall in a single structural third.
  // Named distinctly from PAYOFF_REVELATION_ZONE_CLUSTER, which audits the separate revelation
  // string|null field, not this purpose enum value — purpose === 'revelation' has never been
  // referenced anywhere in this pass; a virgin field for all three trio modes.
  {
    const r916a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'revelation',
    });
    if (r916a.fires) {
      issues.push({
        location: `${r916a.zoneNames[r916a.maxZoneIdx]} third — ${r916a.maxZoneCount} of ${r916a.count} revelation-purposed scenes`,
        rule: 'PAYOFF_REVELATION_PURPOSE_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r916a.maxZoneCount / r916a.count) * 100)}% of the scenes purposed as a revelation cluster in the ${r916a.zoneNames[r916a.maxZoneIdx]} third. When every purpose-built disclosure lands in the same structural window, the payoff engine gets no fresh information to cash in setups anywhere else in the story.`,
        suggestedFix: `Purpose at least one scene outside the ${r916a.zoneNames[r916a.maxZoneIdx]} third as a revelation so the payoff engine keeps discharging setups more evenly across the story.`,
      });
    }
  }

  // PAYOFF_REVELATION_PURPOSE_DROUGHT_RUN — Run-based × purpose === 'revelation' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 revelation-purposed scenes overall,
  // fires when the longest consecutive run of scenes purposed otherwise reaches 6. Completes 2 of
  // 3 slots for this purpose value alongside the zone-cluster mode added in this same wave (peak
  // mode conventionally skipped for this categorical field).
  {
    const r916b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'revelation',
    });
    if (r916b.fires) {
      issues.push({
        location: `longest stretch with no revelation-purposed scene: ${r916b.longestRun} consecutive scenes`,
        rule: 'PAYOFF_REVELATION_PURPOSE_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r916b.longestRun} consecutive scenes with no scene purposed as a revelation, even though ${r916b.presentCount} scenes elsewhere disclose information by purpose. A long unbroken stretch with nothing new purpose-built to come to light leaves the payoff engine with no fresh disclosure to discharge setups against for an extended run.`,
        suggestedFix: `Purpose a scene within the ${r916b.longestRun}-scene stretch as a revelation so the payoff engine keeps discharging setups throughout that stretch.`,
      });
    }
  }

  // PAYOFF_CHARACTER_MOMENT_ZONE_IMBALANCE — Underweight/bloat × purpose === 'character_moment' ×
  // four structural zones. Built on checkZoneImbalance from the shared checks library, continuing
  // the rollout begun in Wave 888. n≥10, ≥4 character-moment scenes total, divided across four
  // equal structural zones. Fires only when one zone has zero such scenes while another holds ≥50%
  // of the total. Distinct from the existing 3-zone PAYOFF_CHARACTER_MOMENT_ZONE_CLUSTER and
  // run-based PAYOFF_CHARACTER_MOMENT_DROUGHT_RUN — the first application of the 4-zone
  // bloat+empty-zone mode to this purpose value.
  {
    const r916c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'character_moment',
    });
    if (r916c.fires) {
      const emptyNames916c = r916c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName916c = FOUR_ZONE_NAMES[r916c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames916c} empty; ${bloatName916c} has ${r916c.counts[r916c.bloatZoneIdx]}/${r916c.totalCount} character-moment scenes`,
        rule: 'PAYOFF_CHARACTER_MOMENT_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r916c.totalCount} character-moment scenes are unevenly distributed across its four structural zones: ${bloatName916c} contains ${r916c.counts[r916c.bloatZoneIdx]} of them (${Math.round((r916c.counts[r916c.bloatZoneIdx] / r916c.totalCount) * 100)}%) while ${emptyNames916c} contains none. Quiet character beats bloat in one structural quarter and vanish from another, giving the payoff engine's emotional pauses an uneven structural rhythm.`,
        suggestedFix: `Redistribute character beats: move at least one character_moment-purposed scene into the empty zone(s) — ${emptyNames916c} — so the payoff engine's emotional pauses land more evenly across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // PAYOFF_STAKES_ZONE_IMBALANCE — Underweight/bloat × purpose === 'raise_stakes' × four structural
  // zones. Built on checkZoneImbalance from the shared checks library, continuing the rollout begun
  // in Wave 888. n≥10, ≥4 stakes-raising scenes total, divided across four equal structural zones.
  // Fires only when one zone has zero such scenes while another holds ≥50% of the total. Distinct
  // from the existing 3-zone PAYOFF_STAKES_ZONE_CLUSTER and run-based PAYOFF_STAKES_DROUGHT_RUN —
  // the first application of the 4-zone bloat+empty-zone mode to this purpose value.
  {
    const r930a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'raise_stakes',
    });
    if (r930a.fires) {
      const emptyNames930a = r930a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName930a = FOUR_ZONE_NAMES[r930a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames930a} empty; ${bloatName930a} has ${r930a.counts[r930a.bloatZoneIdx]}/${r930a.totalCount} stakes-raising scenes`,
        rule: 'PAYOFF_STAKES_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r930a.totalCount} stakes-raising scenes are unevenly distributed across its four structural zones: ${bloatName930a} contains ${r930a.counts[r930a.bloatZoneIdx]} of them (${Math.round((r930a.counts[r930a.bloatZoneIdx] / r930a.totalCount) * 100)}%) while ${emptyNames930a} contains none. Stakes bloat upward in one structural quarter and never rise at all in another, giving the payoff engine's escalating debts an uneven structural rhythm.`,
        suggestedFix: `Redistribute stakes-raising beats: move at least one raise_stakes-purposed scene into the empty zone(s) — ${emptyNames930a} — so the payoff engine keeps raising the price of its debts across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // PAYOFF_REVELATION_PURPOSE_ZONE_IMBALANCE — Underweight/bloat × purpose === 'revelation' × four
  // structural zones. Built on checkZoneImbalance from the shared checks library, closing the
  // 4-zone gap for this purpose value (its 3-zone/run trio was completed in Wave 916). n≥10, ≥4
  // revelation-purposed scenes total, divided across four equal structural zones. Fires only when
  // one zone has zero such scenes while another holds ≥50% of the total. Distinct from PAYOFF_
  // REVELATION_PURPOSE_ZONE_CLUSTER/DROUGHT_RUN (Wave 916) and from the revelation-string-field
  // rules — the first application of the 4-zone bloat+empty-zone mode to this purpose value.
  {
    const r930b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'revelation',
    });
    if (r930b.fires) {
      const emptyNames930b = r930b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName930b = FOUR_ZONE_NAMES[r930b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames930b} empty; ${bloatName930b} has ${r930b.counts[r930b.bloatZoneIdx]}/${r930b.totalCount} revelation-purposed scenes`,
        rule: 'PAYOFF_REVELATION_PURPOSE_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r930b.totalCount} revelation-purposed scenes are unevenly distributed across its four structural zones: ${bloatName930b} contains ${r930b.counts[r930b.bloatZoneIdx]} of them (${Math.round((r930b.counts[r930b.bloatZoneIdx] / r930b.totalCount) * 100)}%) while ${emptyNames930b} contains none. Purpose-built disclosures bloat in one structural quarter and vanish from another, so the payoff engine discharges setups in only part of the story.`,
        suggestedFix: `Redistribute disclosures: move at least one revelation-purposed scene into the empty zone(s) — ${emptyNames930b} — so the payoff engine keeps discharging setups across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // PAYOFF_NEGATIVE_EMOTION_ZONE_IMBALANCE — Underweight/bloat × emotionalShift === 'negative' ×
  // four structural zones. Built on checkZoneImbalance from the shared checks library, extending
  // the 4-zone mode to the emotionalShift valence signal. n≥10, ≥4 negative-shift scenes total,
  // divided across four equal structural zones. Fires only when one zone has zero such scenes while
  // another holds ≥50% of the total. Distinct from the existing 3-zone PAYOFF_NEGATIVE_EMOTION_
  // ZONE_CLUSTER and run-based PAYOFF_NEGATIVE_EMOTION_DROUGHT_RUN — the first application of the
  // 4-zone bloat+empty-zone mode to this valence signal.
  {
    const r930c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.emotionalShift === 'negative',
    });
    if (r930c.fires) {
      const emptyNames930c = r930c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName930c = FOUR_ZONE_NAMES[r930c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames930c} empty; ${bloatName930c} has ${r930c.counts[r930c.bloatZoneIdx]}/${r930c.totalCount} negative-shift scenes`,
        rule: 'PAYOFF_NEGATIVE_EMOTION_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r930c.totalCount} scenes with a negative emotional shift are unevenly distributed across its four structural zones: ${bloatName930c} contains ${r930c.counts[r930c.bloatZoneIdx]} of them (${Math.round((r930c.counts[r930c.bloatZoneIdx] / r930c.totalCount) * 100)}%) while ${emptyNames930c} contains none. Downturns bloat in one structural quarter and vanish from another, so the cost of the payoff engine's cashed-in debts lands in only part of the story.`,
        suggestedFix: `Redistribute downturns: place a negative emotional beat in at least one scene inside the empty zone(s) — ${emptyNames930c} — so the cost of paid-off setups is felt across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // PAYOFF_POSITIVE_EMOTION_ZONE_IMBALANCE — Underweight/bloat × emotionalShift === 'positive' ×
  // four structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4
  // positive-shift scenes total, divided across four equal structural zones. Fires only when one
  // zone has zero such scenes while another holds ≥50% of the total. Distinct from the existing
  // 3-zone PAYOFF_POSITIVE_EMOTION_ZONE_CLUSTER and run-based PAYOFF_POSITIVE_EMOTION_DROUGHT_RUN —
  // the first application of the 4-zone bloat+empty-zone mode to this valence signal, and the
  // positive-valence mirror of the Wave 930 PAYOFF_NEGATIVE_EMOTION_ZONE_IMBALANCE.
  {
    const r944a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.emotionalShift === 'positive',
    });
    if (r944a.fires) {
      const emptyNames944a = r944a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName944a = FOUR_ZONE_NAMES[r944a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames944a} empty; ${bloatName944a} has ${r944a.counts[r944a.bloatZoneIdx]}/${r944a.totalCount} positive-shift scenes`,
        rule: 'PAYOFF_POSITIVE_EMOTION_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r944a.totalCount} scenes with a positive emotional shift are unevenly distributed across its four structural zones: ${bloatName944a} contains ${r944a.counts[r944a.bloatZoneIdx]} of them (${Math.round((r944a.counts[r944a.bloatZoneIdx] / r944a.totalCount) * 100)}%) while ${emptyNames944a} contains none. Emotional rewards bloat in one structural quarter and never arrive in another, so the story's sense of payoff feels earned in only part of its span.`,
        suggestedFix: `Redistribute rewards: place a positive emotional beat in at least one scene inside the empty zone(s) — ${emptyNames944a} — so the story delivers emotional payoff across every structural quarter, not only the quarter currently carrying most of it.`,
      });
    }
  }

  // PAYOFF_SUSPENSE_ZONE_IMBALANCE — Underweight/bloat × (suspenseDelta > 0) × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 suspense-raising
  // scenes total, divided across four equal structural zones. Fires only when one zone has zero
  // such scenes while another holds ≥50% of the total. Distinct from the existing 3-zone PAYOFF_
  // SUSPENSE_ZONE_CLUSTER and run-based PAYOFF_SUSPENSE_DROUGHT_RUN — the first application of the
  // 4-zone bloat+empty-zone mode to the suspense-delta magnitude signal in this pass, keying on
  // tension change rather than categorical purpose or emotional valence.
  {
    const r944b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r944b.fires) {
      const emptyNames944b = r944b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName944b = FOUR_ZONE_NAMES[r944b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames944b} empty; ${bloatName944b} has ${r944b.counts[r944b.bloatZoneIdx]}/${r944b.totalCount} suspense-raising scenes`,
        rule: 'PAYOFF_SUSPENSE_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r944b.totalCount} suspense-raising scenes are unevenly distributed across its four structural zones: ${bloatName944b} contains ${r944b.counts[r944b.bloatZoneIdx]} of them (${Math.round((r944b.counts[r944b.bloatZoneIdx] / r944b.totalCount) * 100)}%) while ${emptyNames944b} contains none. Tension bloats in one structural quarter and flatlines in another, so the buildup that makes payoffs land is confined to part of the story.`,
        suggestedFix: `Redistribute suspense: move or add a scene that raises suspense (suspenseDelta > 0) into the empty zone(s) — ${emptyNames944b} — so tension keeps building toward payoff across every structural quarter, not only the quarter currently carrying most of it.`,
      });
    }
  }

  // PAYOFF_RELATIONSHIP_ZONE_IMBALANCE — Underweight/bloat × (relationshipShifts.length > 0) × four
  // structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 scenes
  // with a relationship shift total, divided across four equal structural zones. Fires only when
  // one zone has zero such scenes while another holds ≥50% of the total. Distinct from the existing
  // 3-zone PAYOFF_RELATIONSHIP_ZONE_CLUSTER and run-based PAYOFF_RELATIONSHIP_DROUGHT_RUN — the first
  // application of the 4-zone bloat+empty-zone mode to the relationship-shift array-field signal in
  // this pass, keying on bonds changing rather than purpose, valence, or delta magnitude.
  {
    const r944c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r944c.fires) {
      const emptyNames944c = r944c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName944c = FOUR_ZONE_NAMES[r944c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames944c} empty; ${bloatName944c} has ${r944c.counts[r944c.bloatZoneIdx]}/${r944c.totalCount} relationship-shift scenes`,
        rule: 'PAYOFF_RELATIONSHIP_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r944c.totalCount} scenes with a relationship shift are unevenly distributed across its four structural zones: ${bloatName944c} contains ${r944c.counts[r944c.bloatZoneIdx]} of them (${Math.round((r944c.counts[r944c.bloatZoneIdx] / r944c.totalCount) * 100)}%) while ${emptyNames944c} contains none. Bonds change in a bloated cluster in one structural quarter and stay static in another, so relational payoffs — the shifts that let earlier setups between characters pay off — are confined to part of the story.`,
        suggestedFix: `Redistribute relational change: give at least one scene inside the empty zone(s) — ${emptyNames944c} — a relationship shift so bonds keep evolving toward payoff across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // PAYOFF_CURIOSITY_ZONE_IMBALANCE — Underweight/bloat × (curiosityDelta > 0) × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 curiosity-raising
  // scenes total, divided across four equal structural zones. Fires only when one zone has zero such
  // scenes while another holds ≥50% of the total. Distinct from the existing 3-zone PAYOFF_CURIOSITY_
  // ZONE_CLUSTER and run-based PAYOFF_CURIOSITY_DROUGHT_RUN — the first application of the 4-zone
  // bloat+empty-zone mode to the curiosity-delta magnitude signal in this pass, keying on question-
  // raising change rather than the suspense delta audited in Wave 944.
  {
    const r958a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r958a.fires) {
      const emptyNames958a = r958a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName958a = FOUR_ZONE_NAMES[r958a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames958a} empty; ${bloatName958a} has ${r958a.counts[r958a.bloatZoneIdx]}/${r958a.totalCount} curiosity-raising scenes`,
        rule: 'PAYOFF_CURIOSITY_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r958a.totalCount} curiosity-raising scenes are unevenly distributed across its four structural zones: ${bloatName958a} contains ${r958a.counts[r958a.bloatZoneIdx]} of them (${Math.round((r958a.counts[r958a.bloatZoneIdx] / r958a.totalCount) * 100)}%) while ${emptyNames958a} contains none. New questions bloat in one structural quarter and never open in another, so the anticipation that makes a payoff satisfying is confined to part of the story.`,
        suggestedFix: `Redistribute curiosity: move or add a scene that raises curiosity (curiosityDelta > 0) into the empty zone(s) — ${emptyNames958a} — so anticipation keeps building toward payoff across every structural quarter, not only the quarter currently carrying most of it.`,
      });
    }
  }

  // PAYOFF_REVELATION_ZONE_IMBALANCE — Underweight/bloat × (revelation != null) × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 revelation scenes
  // total, divided across four equal structural zones. Fires only when one zone has zero such scenes
  // while another holds ≥50% of the total. Distinct from the existing 3-zone PAYOFF_REVELATION_ZONE_
  // CLUSTER and run-based PAYOFF_REVELATION_DROUGHT_RUN — the first application of the 4-zone bloat+
  // empty-zone mode to the revelation STRING field (revelation != null), and distinct from PAYOFF_
  // REVELATION_PURPOSE_ZONE_IMBALANCE, which audits the separate purpose === 'revelation' enum value.
  {
    const r958b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.revelation != null,
    });
    if (r958b.fires) {
      const emptyNames958b = r958b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName958b = FOUR_ZONE_NAMES[r958b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames958b} empty; ${bloatName958b} has ${r958b.counts[r958b.bloatZoneIdx]}/${r958b.totalCount} revelation scenes`,
        rule: 'PAYOFF_REVELATION_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r958b.totalCount} revelation scenes are unevenly distributed across its four structural zones: ${bloatName958b} contains ${r958b.counts[r958b.bloatZoneIdx]} of them (${Math.round((r958b.counts[r958b.bloatZoneIdx] / r958b.totalCount) * 100)}%) while ${emptyNames958b} contains none. Disclosures bloat in one structural quarter and never land in another, so the payoff of a well-timed reveal is confined to part of the story.`,
        suggestedFix: `Redistribute disclosures: land a revelation in at least one scene inside the empty zone(s) — ${emptyNames958b} — so reveals pay off across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // PAYOFF_TURN_ZONE_IMBALANCE — Underweight/bloat × (dramaticTurn !== 'nothing') × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 scenes with a
  // dramatic turn total, divided across four equal structural zones. Fires only when one zone has
  // zero such scenes while another holds ≥50% of the total. Uses the same dramaticTurn !== 'nothing'
  // predicate as the existing 3-zone PAYOFF_TURN_ZONE_CLUSTER and run-based PAYOFF_TURN_DROUGHT_RUN —
  // the first application of the 4-zone bloat+empty-zone mode to the dramatic-turn categorical signal.
  {
    const r958c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
    });
    if (r958c.fires) {
      const emptyNames958c = r958c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName958c = FOUR_ZONE_NAMES[r958c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames958c} empty; ${bloatName958c} has ${r958c.counts[r958c.bloatZoneIdx]}/${r958c.totalCount} dramatic-turn scenes`,
        rule: 'PAYOFF_TURN_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r958c.totalCount} scenes with a dramatic turn are unevenly distributed across its four structural zones: ${bloatName958c} contains ${r958c.counts[r958c.bloatZoneIdx]} of them (${Math.round((r958c.counts[r958c.bloatZoneIdx] / r958c.totalCount) * 100)}%) while ${emptyNames958c} contains none. Turns bloat in one structural quarter and never fire in another, so the payoff of a beat that flips the situation is confined to part of the story.`,
        suggestedFix: `Redistribute turns: give at least one scene inside the empty zone(s) — ${emptyNames958c} — a dramatic turn so situation-flipping payoffs land across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // PAYOFF_CLOCK_ZONE_IMBALANCE — Underweight/bloat × (clockRaised === true) × four structural zones.
  // Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 clock-raising scenes total,
  // divided across four equal structural zones. Fires only when one zone has zero such scenes while
  // another holds ≥50% of the total. Uses the same clockRaised === true predicate as the existing
  // 3-zone PAYOFF_CLOCK_ZONE_CLUSTER and run-based PAYOFF_CLOCK_DROUGHT_RUN — the first application of
  // the 4-zone bloat+empty-zone mode to the clockRaised BOOLEAN field, distinct from the numeric
  // clockDelta signal audited just below (whether a clock is introduced at all, not by how much it moves).
  {
    const r972a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.clockRaised === true,
    });
    if (r972a.fires) {
      const emptyNames972a = r972a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName972a = FOUR_ZONE_NAMES[r972a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames972a} empty; ${bloatName972a} has ${r972a.counts[r972a.bloatZoneIdx]}/${r972a.totalCount} clock-raising scenes`,
        rule: 'PAYOFF_CLOCK_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r972a.totalCount} clock-raising scenes are unevenly distributed across its four structural zones: ${bloatName972a} contains ${r972a.counts[r972a.bloatZoneIdx]} of them (${Math.round((r972a.counts[r972a.bloatZoneIdx] / r972a.totalCount) * 100)}%) while ${emptyNames972a} contains none. Ticking clocks bloat in one structural quarter and are never introduced in another, so the payoff of a beat that puts the story on a deadline is confined to part of the story.`,
        suggestedFix: `Redistribute ticking clocks: introduce a time pressure (clockRaised) in at least one scene inside the empty zone(s) — ${emptyNames972a} — so deadline payoffs land across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // PAYOFF_CLOCK_DELTA_ZONE_IMBALANCE — Underweight/bloat × (clockDelta !== 0) × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 clock-moving scenes
  // total, divided across four equal structural zones. Fires only when one zone has zero such scenes
  // while another holds ≥50% of the total. Uses the same clockDelta !== 0 predicate as the existing
  // 3-zone PAYOFF_CLOCK_DELTA_ZONE_CLUSTER and run-based PAYOFF_CLOCK_DELTA_DROUGHT_RUN — the first
  // application of the 4-zone bloat+empty-zone mode to this delta signal, distinct from the boolean
  // clockRaised field audited just above.
  {
    const r972b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.clockDelta ?? 0) !== 0,
    });
    if (r972b.fires) {
      const emptyNames972b = r972b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName972b = FOUR_ZONE_NAMES[r972b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames972b} empty; ${bloatName972b} has ${r972b.counts[r972b.bloatZoneIdx]}/${r972b.totalCount} clock-moving scenes`,
        rule: 'PAYOFF_CLOCK_DELTA_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r972b.totalCount} clock-moving scenes are unevenly distributed across its four structural zones: ${bloatName972b} contains ${r972b.counts[r972b.bloatZoneIdx]} of them (${Math.round((r972b.counts[r972b.bloatZoneIdx] / r972b.totalCount) * 100)}%) while ${emptyNames972b} contains none. Deadline pressure bloats in one structural quarter and never moves in another, so the tension a payoff resolves is confined to part of the story.`,
        suggestedFix: `Redistribute clock movement: move or add a scene that changes the clock (clockDelta ≠ 0) into the empty zone(s) — ${emptyNames972b} — so deadline pressure keeps building toward payoff across every structural quarter, not only the quarter currently carrying most of it.`,
      });
    }
  }

  // PAYOFF_HIGHLIGHT_ZONE_IMBALANCE — Underweight/bloat × (dialogueHighlights.length > 0) × four
  // structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 scenes
  // with a dialogue highlight total, divided across four equal structural zones. Fires only when one
  // zone has zero such scenes while another holds ≥50% of the total. Distinct from the existing
  // 3-zone PAYOFF_HIGHLIGHT_ZONE_CLUSTER and run-based PAYOFF_HIGHLIGHT_DROUGHT_RUN — the first
  // application of the 4-zone bloat+empty-zone mode to the dialogueHighlights array field, distinct
  // from all previously audited arrays in this pass.
  {
    const r972c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r972c.fires) {
      const emptyNames972c = r972c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName972c = FOUR_ZONE_NAMES[r972c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames972c} empty; ${bloatName972c} has ${r972c.counts[r972c.bloatZoneIdx]}/${r972c.totalCount} dialogue-highlight scenes`,
        rule: 'PAYOFF_HIGHLIGHT_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r972c.totalCount} scenes with a dialogue highlight are unevenly distributed across its four structural zones: ${bloatName972c} contains ${r972c.counts[r972c.bloatZoneIdx]} of them (${Math.round((r972c.counts[r972c.bloatZoneIdx] / r972c.totalCount) * 100)}%) while ${emptyNames972c} contains none. Memorable lines bloat in one structural quarter and never land in another, so the payoff of a line that lands is confined to part of the story.`,
        suggestedFix: `Redistribute highlights: give at least one scene inside the empty zone(s) — ${emptyNames972c} — a dialogue highlight so quotable payoffs land across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // PAYOFF_STAKES_CURIOSITY_AFTERMATH_VOID — with zone-imbalance now fully exhausted in this pass
  // (PAYOFF_STAGING was the only remaining cluster+drought pair, and its predicates disagree —
  // >=2 vs >0 visualBeats — so it was skipped), this wave pivots entirely to the sequence/
  // aftermath mode. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2 qualifying
  // stakes-raise scenes (purpose === 'raise_stakes', pos<n-2), ≥2 curiosity-raising scenes
  // anywhere, 2-scene lookahead. Fires when every stakes-raise's two-scene aftermath opens no new
  // curiosity, while curiosity does occur elsewhere. First use of raise_stakes as an aftermath-void
  // trigger in this pass — distinct from the seed/clock/turn triggers already paired with
  // dialogueHighlights and visualBeats.
  {
    const r986a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.purpose === 'raise_stakes',
      isAftermath: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r986a.fires) {
      issues.push({
        location: `${r986a.triggerCount} stakes-raise aftermath(s) — no curiosity raised within 2 scenes`,
        rule: 'PAYOFF_STAKES_CURIOSITY_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every stakes-raising scene (${r986a.triggerCount} escalations) is followed by two scenes that raise no new curiosity, even though ${r986a.aftermathCount} scenes elsewhere do open fresh questions. An escalation that earns no fresh question nearby leaves the payoff engine nothing new to seed and later collect on.`,
        suggestedFix: `In the two scenes following at least one stakes-raise, plant a new open question so escalation feeds the payoff engine rather than dead-ending in a learnable void.`,
      });
    }
  }

  // PAYOFF_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID — Sequence/aftermath × heavy unresolved-clue-debt
  // trigger → suspenseDelta absence. Built on checkAftermathVoid from the shared checks library.
  // n≥8, ≥2 qualifying heavy-debt scenes (unresolvedClues.length≥3, pos<n-2), ≥2 tension-raising
  // scenes anywhere, 2-scene lookahead. Fires when every heavy-debt scene's two-scene aftermath
  // raises no tension, while tension does rise elsewhere. First pairing of heavy clue-debt with
  // suspenseDelta as an aftermath-void combination in this pass — a predictable pattern where
  // accumulated unresolved material never translates into rising tension nearby undercuts the
  // payoff engine's ability to make that debt feel consequential.
  {
    const r986b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.unresolvedClues ?? []).length >= 3,
      isAftermath: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r986b.fires) {
      issues.push({
        location: `${r986b.triggerCount} heavy clue-debt scene(s) — no suspense raised within 2 scenes of any`,
        rule: 'PAYOFF_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every scene carrying heavy unresolved clue-debt (${r986b.triggerCount} instances) is followed by two full scenes with no rise in suspense, even though ${r986b.aftermathCount} such rises occur elsewhere in the story. Accumulated mystery that never tightens tension nearby reads as inert debt rather than a payoff the audience is anxious to see resolved.`,
        suggestedFix: `In the two scenes following at least one heavy clue-debt moment, raise the tension — a ticking complication or a near-miss — so unresolved threads feel consequential rather than sitting in a learnable lull.`,
      });
    }
  }

  // PAYOFF_REVELATION_RELATIONSHIP_AFTERMATH_VOID — Sequence/aftermath × revelation (string field)
  // trigger → relationshipShifts absence. Built on checkAftermathVoid from the shared checks
  // library. n≥8, ≥2 qualifying revelation scenes (revelation != null, pos<n-2), ≥2 relationship-
  // shift scenes anywhere, 2-scene lookahead. Fires when every revelation's two-scene aftermath
  // carries no relationship shift, while such shifts occur elsewhere. First use of the revelation
  // string field as an aftermath-void trigger in this pass, and the first pairing of any trigger
  // with relationshipShifts as the aftermath signal — a disclosure that never bears on how
  // characters treat each other nearby is a payoff the engine leaves uncollected.
  {
    const r986c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.revelation != null,
      isAftermath: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r986c.fires) {
      issues.push({
        location: `${r986c.triggerCount} revelation aftermath(s) — no relationship shift within 2 scenes`,
        rule: 'PAYOFF_REVELATION_RELATIONSHIP_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every revelation in the story (${r986c.triggerCount} disclosures) is followed by two scenes with no shift in any relationship, even though ${r986c.aftermathCount} such shifts occur elsewhere. A disclosure that never bears on how characters treat each other in the scenes right after it lands as information without interpersonal consequence.`,
        suggestedFix: `In the two scenes following at least one revelation, let the new information strain or shift a relationship so the disclosure pays off interpersonally rather than sitting inert.`,
      });
    }
  }

  // PAYOFF_CLOCK_CURIOSITY_AFTERMATH_VOID — Sequence/aftermath × clockRaised trigger →
  // curiosityDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying clock-raising scenes (pos<n-2), ≥2 curiosity-raising scenes anywhere, 2-scene
  // lookahead. Fires when every clock-raising scene's two-scene aftermath opens no new curiosity,
  // while curiosity does occur elsewhere. Distinct from CLOCK_STAGING_AFTERMATH_VOID (same trigger
  // paired with visualBeats) — this pairs clockRaised with curiosityDelta for the first time in
  // this pass.
  {
    const r1000a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.clockRaised === true,
      isAftermath: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r1000a.fires) {
      issues.push({
        location: `${r1000a.triggerCount} clock-raise aftermath(s) — no curiosity raised within 2 scenes`,
        rule: 'PAYOFF_CLOCK_CURIOSITY_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every scene that raises a ticking clock (${r1000a.triggerCount} instances) is followed by two scenes that raise no new curiosity, even though ${r1000a.aftermathCount} scenes elsewhere do open fresh questions. A deadline should usually provoke a new question — will it be met, what happens if it isn't; when every clock-raise's aftermath opens no curiosity, the payoff engine has nothing fresh to seed off the ticking pressure.`,
        suggestedFix: `In the two scenes following at least one clock-raising moment, plant a new open question tied to the deadline so time pressure feeds the payoff engine rather than dead-ending in a learnable void.`,
      });
    }
  }

  // PAYOFF_TURN_SUSPENSE_AFTERMATH_VOID — Sequence/aftermath × dramaticTurn trigger →
  // suspenseDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying dramatic-turn scenes (pos<n-2), ≥2 tension-raising scenes anywhere, 2-scene
  // lookahead. Fires when every turn's two-scene aftermath raises no tension, while tension does
  // rise elsewhere. Distinct from PAYOFF_TURN_HIGHLIGHT_AFTERMATH_VOID (same trigger paired with
  // dialogueHighlights) — this pairs dramaticTurn with suspenseDelta for the first time in this
  // pass.
  {
    const r1000b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
      isAftermath: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r1000b.fires) {
      issues.push({
        location: `${r1000b.triggerCount} dramatic-turn aftermath(s) — no suspense raised within 2 scenes`,
        rule: 'PAYOFF_TURN_SUSPENSE_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every dramatic-turn scene in the story (${r1000b.triggerCount} pivots) is followed by two scenes with no rise in tension, even though ${r1000b.aftermathCount} such rises occur elsewhere. A pivot that never tightens tension in the scenes right after it lands as a plot beat rather than a reversal the payoff engine can build pressure toward.`,
        suggestedFix: `In the two scenes following at least one dramatic turn, raise the tension — a ticking complication or a near-miss — so the pivot feeds the payoff engine's pressure rather than resolving into a learnable calm.`,
      });
    }
  }

  // PAYOFF_SEED_EMOTIONAL_AFTERMATH_VOID — Sequence/aftermath × seededClueIds trigger →
  // emotionalShift absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying seed scenes (pos<n-2), ≥2 emotionally-charged scenes anywhere, 2-scene lookahead.
  // Fires when every seed's two-scene aftermath is emotionally flat, while charged scenes occur
  // elsewhere. Distinct from SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (same trigger paired with
  // dialogueHighlights) — this pairs seededClueIds with emotionalShift for the first time in this
  // pass.
  {
    const r1000c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.seededClueIds ?? []).length > 0,
      isAftermath: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r1000c.fires) {
      issues.push({
        location: `${r1000c.triggerCount} seed aftermath(s) — no emotional shift within 2 scenes`,
        rule: 'PAYOFF_SEED_EMOTIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every clue-seeding scene (${r1000c.triggerCount} plants) is followed by two emotionally neutral scenes, even though ${r1000c.aftermathCount} emotionally-charged scenes exist elsewhere. Planting a clue usually carries some charge — unease, curiosity's cousin dread, quiet hope; when every seed's aftermath is affectively flat, the payoff engine's groundwork lands as pure information with no felt weight to collect on later.`,
        suggestedFix: `Let at least one seed carry feeling in its aftermath: in the scene or two after a clue is planted, show someone reacting to it — a beat of unease, a private hope, a flicker of dread.`,
      });
    }
  }

  // PAYOFF_STAKES_SUSPENSE_AFTERMATH_VOID — Sequence/aftermath × raise_stakes trigger →
  // suspenseDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying stakes-raise scenes (pos<n-2), ≥2 tension-raising scenes anywhere, 2-scene
  // lookahead. Fires when every stakes-raise's two-scene aftermath raises no tension, while
  // tension does rise elsewhere. Distinct from PAYOFF_STAKES_CURIOSITY_AFTERMATH_VOID (same
  // trigger paired with curiosityDelta) — this pairs raise_stakes with suspenseDelta for the first
  // time in this pass.
  {
    const r1014a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.purpose === 'raise_stakes',
      isAftermath: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r1014a.fires) {
      issues.push({
        location: `${r1014a.triggerCount} stakes-raise aftermath(s) — no suspense raised within 2 scenes`,
        rule: 'PAYOFF_STAKES_SUSPENSE_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every stakes-raising scene (${r1014a.triggerCount} escalations) is followed by two scenes with no rise in tension, even though ${r1014a.aftermathCount} such rises occur elsewhere. Escalating danger should usually tighten the felt sense of jeopardy in the beats right after it; when every stakes-raise's aftermath registers no suspense, the payoff engine has no compounding pressure to collect on later.`,
        suggestedFix: `In the two scenes following at least one stakes-raise, tighten the tension — a ticking complication or a near-miss — so escalating danger builds toward a payoff rather than sitting in a learnable void.`,
      });
    }
  }

  // PAYOFF_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID — Sequence/aftermath × heavy unresolved-clue-debt
  // trigger → emotionalShift absence. Built on checkAftermathVoid from the shared checks library.
  // n≥8, ≥2 qualifying heavy-debt scenes (unresolvedClues.length≥3, pos<n-2), ≥2 emotionally-
  // charged scenes anywhere, 2-scene lookahead. Fires when every heavy-debt scene's two-scene
  // aftermath is emotionally flat, while charged scenes occur elsewhere. Distinct from
  // PAYOFF_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID (Wave 986, same trigger paired with suspenseDelta)
  // — this pairs heavy clue-debt with emotionalShift for the first time in this pass.
  {
    const r1014b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.unresolvedClues ?? []).length >= 3,
      isAftermath: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r1014b.fires) {
      issues.push({
        location: `${r1014b.triggerCount} heavy clue-debt scene(s) — no emotional shift within 2 scenes of any`,
        rule: 'PAYOFF_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every scene carrying heavy unresolved clue-debt (${r1014b.triggerCount} instances) is followed by two emotionally neutral scenes, even though ${r1014b.aftermathCount} emotionally-charged scenes exist elsewhere. Accumulated mystery that never registers as felt weight in the scenes right after it leaves the payoff engine's backlog reading as inert bookkeeping rather than something anyone is anxious about.`,
        suggestedFix: `In the two scenes following at least one heavy clue-debt moment, show a character reacting emotionally to the accumulated unresolved material so the mystery presses on the story rather than sitting as inert backlog.`,
      });
    }
  }

  // PAYOFF_REVELATION_CURIOSITY_AFTERMATH_VOID — Sequence/aftermath × revelation trigger →
  // curiosityDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying revelation scenes (revelation != null, pos<n-2), ≥2 curiosity-raising scenes
  // anywhere, 2-scene lookahead. Fires when every revelation's two-scene aftermath opens no new
  // curiosity, while curiosity does occur elsewhere. Distinct from PAYOFF_REVELATION_RELATIONSHIP_
  // AFTERMATH_VOID (same trigger paired with relationshipShifts) — this pairs revelation with
  // curiosityDelta for the first time in this pass.
  {
    const r1014c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.revelation != null,
      isAftermath: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r1014c.fires) {
      issues.push({
        location: `${r1014c.triggerCount} revelation aftermath(s) — no curiosity raised within 2 scenes`,
        rule: 'PAYOFF_REVELATION_CURIOSITY_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every revelation in the story (${r1014c.triggerCount} disclosures) is followed by two scenes that raise no new curiosity, even though ${r1014c.aftermathCount} scenes elsewhere do open fresh questions. A disclosure that never opens a further question leaves the payoff engine with nothing new to seed and collect on.`,
        suggestedFix: `In the two scenes following at least one revelation, plant a new open question that the disclosure itself raises so the payoff engine keeps compounding rather than settling.`,
      });
    }
  }

  // PAYOFF_STAKES_EMOTIONAL_AFTERMATH_VOID — Sequence/aftermath × raise_stakes trigger →
  // emotionalShift absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying raise_stakes scenes (pos<n-2), ≥2 emotionally-charged scenes anywhere, 2-scene
  // lookahead. Fires when every stakes-raise's two-scene aftermath carries no emotional shift,
  // while such shifts occur elsewhere. Distinct from PAYOFF_STAKES_CURIOSITY_AFTERMATH_VOID and
  // PAYOFF_STAKES_SUSPENSE_AFTERMATH_VOID (same trigger paired with curiosityDelta and
  // suspenseDelta respectively) — this is the third consequence channel for this trigger.
  {
    const r1028a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.purpose === 'raise_stakes',
      isAftermath: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r1028a.fires) {
      issues.push({
        location: `${r1028a.triggerCount} raise-stakes aftermath(s) — no emotional shift within 2 scenes`,
        rule: 'PAYOFF_STAKES_EMOTIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every stakes-raising scene in the story (${r1028a.triggerCount} of them) is followed by two emotionally neutral scenes, even though ${r1028a.aftermathCount} emotionally-charged scenes exist elsewhere. A stakes-raise that isn't matched by any feeling in the scenes right after it leaves the escalation registering as a declared fact the payoff machinery tracks structurally rather than something anyone visibly feels.`,
        suggestedFix: `In the two scenes following at least one stakes-raise, let someone's feelings visibly register the new danger so escalating pressure carries emotional weight alongside its setup value.`,
      });
    }
  }

  // PAYOFF_CLOCK_RELATIONAL_AFTERMATH_VOID — Sequence/aftermath × clockRaised trigger →
  // relationshipShifts absence. Built on checkAftermathVoid from the shared checks library. n≥8,
  // ≥2 qualifying clock-raise scenes (pos<n-2), ≥2 relationship-shift scenes anywhere, 2-scene
  // lookahead. Fires when every clock-raise's two-scene aftermath carries no bond change, while
  // such changes occur elsewhere. Distinct from the original clockRaised → visualBeats rule and
  // PAYOFF_CLOCK_CURIOSITY_AFTERMATH_VOID (same trigger paired with visualBeats and curiosityDelta
  // respectively) — this is the third consequence channel for this trigger.
  {
    const r1028b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.clockRaised === true,
      isAftermath: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r1028b.fires) {
      issues.push({
        location: `${r1028b.triggerCount} clock-raise aftermath(s) — no relationship shift within 2 scenes`,
        rule: 'PAYOFF_CLOCK_RELATIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every clock-raise scene in the story (${r1028b.triggerCount} of them) is followed by two scenes with no shift in any relationship, even though ${r1028b.aftermathCount} such shifts occur elsewhere. A ticking deadline that never bears on how characters treat each other in the scenes right after it leaves the pressure purely external, disconnected from the bonds the eventual payoff will need to have moved.`,
        suggestedFix: `In the two scenes following at least one clock-raise, let the ticking deadline strain or shift a relationship so the pressure registers interpersonally, setting up richer payoff material later.`,
      });
    }
  }

  // PAYOFF_REVELATION_EMOTIONAL_AFTERMATH_VOID — Sequence/aftermath × revelation trigger →
  // emotionalShift absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying revelation scenes (pos<n-2), ≥2 emotionally-charged scenes anywhere, 2-scene
  // lookahead. Fires when every revelation's two-scene aftermath carries no emotional shift, while
  // such shifts occur elsewhere. Distinct from PAYOFF_REVELATION_RELATIONSHIP_AFTERMATH_VOID and
  // PAYOFF_REVELATION_CURIOSITY_AFTERMATH_VOID (same trigger paired with relationshipShifts and
  // curiosityDelta respectively) — this is the third consequence channel for this trigger.
  {
    const r1028c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.revelation != null,
      isAftermath: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r1028c.fires) {
      issues.push({
        location: `${r1028c.triggerCount} revelation aftermath(s) — no emotional shift within 2 scenes`,
        rule: 'PAYOFF_REVELATION_EMOTIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every revelation in the story (${r1028c.triggerCount} discoveries) is followed by two emotionally neutral scenes, even though ${r1028c.aftermathCount} emotionally-charged scenes exist elsewhere. A discovery that never registers as felt in the scenes right after it leaves the payoff informationally significant but emotionally inert — knowledge delivered without anyone visibly reckoning with it.`,
        suggestedFix: `In the two scenes following at least one revelation, let someone's feelings register the new knowledge so the payoff lands emotionally, not only informationally.`,
      });
    }
  }

  // PAYOFF_SEED_CURIOSITY_AFTERMATH_VOID — Sequence/aftermath × seededClueIds trigger →
  // curiosityDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying seed scenes (pos<n-2), ≥2 curiosity-rising scenes anywhere, 2-scene lookahead.
  // Fires when every seed's two-scene aftermath carries no curiosity rise, while such rises occur
  // elsewhere. Distinct from the original seededClueIds → dialogueHighlights rule and PAYOFF_SEED_
  // EMOTIONAL_AFTERMATH_VOID (same trigger paired with dialogueHighlights and emotionalShift
  // respectively) — this is the third consequence channel for this trigger.
  {
    const r1042a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.seededClueIds ?? []).length > 0,
      isAftermath: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r1042a.fires) {
      issues.push({
        location: `${r1042a.triggerCount} seed aftermath(s) — no curiosity rise within 2 scenes`,
        rule: 'PAYOFF_SEED_CURIOSITY_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every clue-seeding scene in the story (${r1042a.triggerCount} plants) is followed by two scenes with no rise in curiosity, even though ${r1042a.aftermathCount} such rises occur elsewhere. A planted clue that never sharpens into a fresh question right after it leaves the payoff machinery's groundwork buried rather than voiced as something the audience is now wondering about.`,
        suggestedFix: `In the two scenes following at least one clue-seeding moment, let curiosity visibly sharpen so the plant's groundwork registers as a live question, not just an inert deposit awaiting its eventual payoff.`,
      });
    }
  }

  // PAYOFF_TURN_CURIOSITY_AFTERMATH_VOID — Sequence/aftermath × dramaticTurn trigger →
  // curiosityDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying dramatic-turn scenes (pos<n-2), ≥2 curiosity-rising scenes anywhere, 2-scene
  // lookahead. Fires when every turn's two-scene aftermath carries no curiosity rise, while such
  // rises occur elsewhere. Distinct from the original dramaticTurn → dialogueHighlights rule and
  // PAYOFF_TURN_SUSPENSE_AFTERMATH_VOID (same trigger paired with dialogueHighlights and
  // suspenseDelta respectively) — this is the third consequence channel for this trigger.
  {
    const r1042b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
      isAftermath: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r1042b.fires) {
      issues.push({
        location: `${r1042b.triggerCount} dramatic-turn aftermath(s) — no curiosity rise within 2 scenes`,
        rule: 'PAYOFF_TURN_CURIOSITY_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every dramatic-turn scene in the story (${r1042b.triggerCount} pivots) is followed by two scenes with no rise in curiosity, even though ${r1042b.aftermathCount} such rises occur elsewhere. A pivot that never opens a fresh question right after it leaves the payoff machinery's turns registering as closed events rather than developments that generate the next thing to wonder about.`,
        suggestedFix: `In the two scenes following at least one dramatic turn, let a new question arise from the pivot so the payoff machinery's turns keep generating curiosity, not just resolving the immediate moment.`,
      });
    }
  }

  // PAYOFF_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID — Sequence/aftermath × heavy unresolvedClues debt
  // trigger → curiosityDelta absence. Built on checkAftermathVoid from the shared checks library.
  // n≥8, ≥2 qualifying heavy-debt scenes (pos<n-2, threshold ≥3), ≥2 curiosity-rising scenes
  // anywhere, 2-scene lookahead. Fires when every heavy-debt scene's two-scene aftermath carries
  // no curiosity rise, while such rises occur elsewhere. Distinct from PAYOFF_OPEN_THREAD_
  // SUSPENSE_AFTERMATH_VOID and PAYOFF_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID (same trigger paired
  // with suspenseDelta and emotionalShift respectively) — this is the third consequence channel
  // for this trigger.
  {
    const r1042c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.unresolvedClues ?? []).length >= 3,
      isAftermath: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r1042c.fires) {
      issues.push({
        location: `${r1042c.triggerCount} heavy clue-debt scene(s) — no curiosity rise within 2 scenes of any`,
        rule: 'PAYOFF_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every scene carrying heavy unresolved clue-debt (${r1042c.triggerCount} instances) is followed by two scenes with no rise in curiosity, even though ${r1042c.aftermathCount} such rises occur elsewhere. Accumulated mystery should usually compound into fresh questions rather than sit as inert backlog awaiting payoff; when every heavy-debt scene's aftermath opens nothing new, the payoff machinery's uncertainty stalls instead of deepening.`,
        suggestedFix: `In the two scenes following at least one heavy clue-debt moment, plant a new open question so accumulated mystery keeps compounding rather than sitting in a learnable lull before its eventual payoff.`,
      });
    }
  }

  // PAYOFF_SEED_SUSPENSE_AFTERMATH_VOID — Sequence/aftermath × seededClueIds trigger →
  // suspenseDelta absence. Built on checkAftermathVoid from the shared checks library. n>=8, >=2
  // qualifying seed scenes (pos<n-2), >=2 suspense-rising scenes anywhere, 2-scene lookahead.
  // Fires when every clue-seeding scene's two-scene aftermath carries no rise in suspense, while
  // such rises occur elsewhere. Distinct from PAYOFF_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID,
  // PAYOFF_SEED_EMOTIONAL_AFTERMATH_VOID, and PAYOFF_SEED_CURIOSITY_AFTERMATH_VOID (same trigger
  // paired with dialogueHighlights, emotionalShift, and curiosityDelta respectively) — this is the
  // fourth consequence channel for this trigger.
  {
    const r1056a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.seededClueIds ?? []).length > 0,
      isAftermath: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r1056a.fires) {
      issues.push({
        location: `${r1056a.triggerCount} clue-seeding scene(s) — no suspense rise within 2 scenes of any`,
        rule: 'PAYOFF_SEED_SUSPENSE_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every scene that seeds a clue (${r1056a.triggerCount} instances) is followed by two scenes with no rise in suspense, even though ${r1056a.aftermathCount} such rises occur elsewhere. A planted clue that never tightens suspense right after it lands registers as inert setup rather than a seed the payoff machinery is actively watching.`,
        suggestedFix: `In the two scenes following at least one clue-seeding moment, let suspense tighten so the seed feels like it's being watched, not just planted and forgotten.`,
      });
    }
  }

  // PAYOFF_CLOCK_EMOTIONAL_AFTERMATH_VOID — Sequence/aftermath × clockRaised trigger →
  // emotionalShift absence. Built on checkAftermathVoid from the shared checks library. n>=8,
  // >=2 qualifying clock-raising scenes (pos<n-2), >=2 emotionally-charged scenes anywhere,
  // 2-scene lookahead. Fires when every clock-raising scene's two-scene aftermath carries no
  // emotional shift, while such shifts occur elsewhere. Distinct from PAYOFF_CLOCK_STAGING_
  // AFTERMATH_VOID, PAYOFF_CLOCK_CURIOSITY_AFTERMATH_VOID, and PAYOFF_CLOCK_RELATIONAL_
  // AFTERMATH_VOID (same trigger paired with visualBeats, curiosityDelta, and relationshipShifts
  // respectively) — this is the fourth consequence channel for this trigger.
  {
    const r1056b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.clockRaised === true,
      isAftermath: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r1056b.fires) {
      issues.push({
        location: `${r1056b.triggerCount} clock-raising scene(s) — no emotional shift within 2 scenes of any`,
        rule: 'PAYOFF_CLOCK_EMOTIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every scene that raises a ticking clock (${r1056b.triggerCount} instances) is followed by two scenes registering no emotional shift, even though ${r1056b.aftermathCount} such shifts occur elsewhere. A deadline that never lands emotionally right after it's introduced reads as a mechanical constraint rather than something the payoff machinery's characters actually feel.`,
        suggestedFix: `In the two scenes following at least one clock-raising moment, register an emotional shift so the deadline feels felt, not just ticking in the background.`,
      });
    }
  }

  // PAYOFF_TURN_RELATIONAL_AFTERMATH_VOID — Sequence/aftermath × dramaticTurn trigger →
  // relationshipShifts absence. Built on checkAftermathVoid from the shared checks library. n>=8,
  // >=2 qualifying dramatic-turn scenes (pos<n-2), >=2 relationship-shifting scenes anywhere,
  // 2-scene lookahead. Fires when every turn's two-scene aftermath carries no relationship shift,
  // while such shifts occur elsewhere. Distinct from PAYOFF_TURN_HIGHLIGHT_AFTERMATH_VOID,
  // PAYOFF_TURN_SUSPENSE_AFTERMATH_VOID, and PAYOFF_TURN_CURIOSITY_AFTERMATH_VOID (same trigger
  // paired with dialogueHighlights, suspenseDelta, and curiosityDelta respectively) — this is the
  // fourth consequence channel for this trigger.
  {
    const r1056c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
      isAftermath: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r1056c.fires) {
      issues.push({
        location: `${r1056c.triggerCount} dramatic-turn aftermath(s) — no relationship shift within 2 scenes`,
        rule: 'PAYOFF_TURN_RELATIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every dramatic-turn scene in the story (${r1056c.triggerCount} pivots) is followed by two scenes with no shift in any relationship, even though ${r1056c.aftermathCount} such shifts occur elsewhere. A pivot that never moves how two characters stand with each other leaves the payoff machinery's turns registering as plot events isolated from the relational fabric they should be testing.`,
        suggestedFix: `In the two scenes following at least one dramatic turn, let a relationship shift so the pivot registers relationally, not just as an isolated plot event.`,
      });
    }
  }

  const { revised, usedLLM } = await rewritePass({ fountain, issues, passName: 'payoff', approvedSpans, storyContext: input.storyContext, priorPassResults: input.priorPassResults });
  const changed = revised !== fountain;

  return {
    pass: 'payoff',
    issues,
    revisedFountain: revised,
    changed,
    summary: issues.length === 0
      ? 'Payoff/continuity pass: all setups are resolved'
      : `Payoff/continuity pass: ${issues.length} issue(s) — ${usedLLM ? 'rewritten' : 'flagged (stub mode)'}`,
  };
}
