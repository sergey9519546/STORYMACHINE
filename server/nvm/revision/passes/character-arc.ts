// Wave 138 — Pass 6: Character Arc
// Checks arc completion: characters who start and end in the same emotional
// state, arcs without turning point, transformation without cause.
// Wave 138 additions: per-character relational arc tracking using relationship
// shift data — detects characters present throughout the story who have zero
// relational movement (CHARACTER_ARC_RELATIONAL_STASIS) and identifies when
// the protagonist has no relationship arc despite being present everywhere
// (CHARACTER_ARC_PROTAGONIST_PASSIVE).
// Wave 153 additions: arc monotone (emotional state never varies mid-story),
// late introduction (major character first appears past the midpoint), and
// emotional whiplash (rapid alternating emotional shifts without grounding).
// Wave 256 additions: relational dimension monotony (all shifts on one axis),
// Wave 270 additions: positive-only arc (no negative beats, no stakes),
// shift concentration (all relational movement in 3-scene burst),
// late relational void (no shifts in final quarter).
// emotional flatline (≥80% neutral scenes), negative-only arc (no positive beat).
// Wave 284 additions: emotional resolution absent (no positive shift in final quarter
// despite positive beats existing), revelation late cluster (>60% of revelations
// in final 25%), curiosity plateau (Act 2b avg curiosityDelta ≤ 0).
// Wave 298 additions: dramatic turn monotone (3+ turns all the same type), suspense/
// emotion decoupled (3+ high-suspense scenes all emotionally neutral), grief skipped
// (every negative shift is cancelled by a positive one in the very next scene).
// Wave 312 additions: first half emotionally flat (entire first half neutral while the
// second half carries emotion — late-starting arc), turn emotion absent (≥2 dramatic-turn
// scenes all emotionally neutral), curiosity/emotion decoupled (≥3 high-curiosity scenes
// all emotionally neutral — intrigue without investment).
// Wave 337 additions: suspense/curiosity decoupled (≥3 high-suspense scenes all curiosity-
// flat — tension without wonder), revelation emotion absent (≥2 revelation scenes all
// emotionally neutral — reveals that never move the protagonist), revelation curiosity
// decoupled (≥3 revelation scenes avg curiosityDelta ≤ 0 — answers that close no new doors).
// Wave 351 additions: second half emotionally flat (entire back half neutral while the front
// half carried emotion — arc runs out of fuel), emotional recovery absent (≥2 falls and joy
// exists but none after the first fall — relentless downslope), relational first-half flat
// (no bond shift in the front half while the back half moves bonds — late relational start).
// Wave 365 additions: peak suspense emotion absent (the single highest-suspense scene is
// emotionally neutral while the protagonist shows emotion elsewhere — the tension peak leaves
// them unmoved), peak curiosity emotion absent (the single highest-curiosity scene is neutral
// while emotion exists elsewhere — the intrigue peak doesn't move them), relational shift
// emotion flat (every relationship-shift scene is emotionally neutral — bonds move but the
// protagonist registers no feeling about any of them).
// Wave 379 additions: emotion concentration (all the protagonist's emotional beats burst in a
// span ≤20% of the story while the rest is flat — the emotion analogue of relational shift
// concentration), emotional front-loaded (>70% of emotional beats fall in the first half —
// feeling dwindles toward the climax instead of intensifying), negative emotion run (≥4
// consecutive negative-emotion scenes with no relief — an unbroken stretch of despair).
// Wave 393 additions: emotional back-loaded (>70% of emotional beats fall in the second half —
// an emotionally inert opening, the distribution mirror of front-loaded), positive emotion run
// (≥4 consecutive positive-emotion scenes with no setback — an unbroken upswing, the run mirror
// of negative emotion run), late low-point absent (≥2 negative beats, all in the first half —
// the protagonist's darkest moments are early and the back half has no nadir before the climax).
// Wave 407 additions: relational positive-only (≥3 relationship shifts, none negative — bonds
// only ever warm, the relational mirror of ARC_POSITIVE_ONLY), relational back-loaded (>70% of
// relationship shifts fall in the second half while the front half has at least one — a
// relationally inert opening, the relational mirror of ARC_EMOTIONAL_BACK_LOADED), relational
// recovery absent (≥2 negative shifts and a positive shift exists, but none after the first
// fracture — a broken bond never repairs, the relational mirror of ARC_EMOTIONAL_RECOVERY_ABSENT).
// Wave 421 additions: relational negative-only (≥3 shifts, zero positive — every bond only
// erodes; valence mode, relational mirror of ARC_RELATIONAL_POSITIVE_ONLY), peak relational
// emotion absent (the scene with the highest absolute shift magnitude is emotionally neutral while
// emotion exists elsewhere; single-peak isolation × relational × emotion), relational midpoint
// void (no shift in the 40%–60% pivot zone while shifts exist elsewhere; zone presence/absence ×
// relational × midpoint).
// Wave 435 additions: emotional overload (≥80% of scenes are non-neutral with both polarities
// present — perpetual emotion with no breathing room, emotion becomes wallpaper without
// contrast; underweight/bloat mode, the complement of ARC_EMOTIONAL_FLATLINE), clock emotion
// decoupled (≥3 clockRaised scenes are all emotionally neutral while non-clock scenes carry
// feeling — deadlines never produce emotional investment; co-occurrence/decoupling × clockRaised
// × emotionalShift, first clockRaised channel check in this pass), peak relational uncaused
// (the scene with the most relationship shifts by count has no emotional charge, revelation,
// clock, or turn in the two preceding scenes — the densest relational moment appears without
// narrative preparation; backward-cause × single-peak isolation × relational channel, distinct
// from ARC_PEAK_RELATIONAL_EMOTION_ABSENT which audits the peak scene's own emotional state).
// Wave 449 additions: relational drought run (≥5 consecutive scenes with no relationship shift
// despite ≥2 shift scenes existing — the protagonist's interpersonal world freezes in an
// extended run; run-based × relational × absence, the first run-based check on relational
// silence, distinct from all three zone-based relational void checks), turn emotional aftermath
// void (every dramatic turn is followed by 2 emotionally neutral scenes — the protagonist
// shows no felt reaction to any pivot; sequence/aftermath × turn × emotional aftermath, distinct
// from ARC_TURN_EMOTION_ABSENT which audits the turn scene itself and from DRAMATIC_TURN_
// AFTERMATH_VOID in causality.ts which checks all channels simultaneously), curiosity relational
// decoupled (≥3 curiosity-positive scenes all have no relationship shift while non-curiosity
// scenes do move bonds — wonder is never accompanied by relational consequence; co-occurrence ×
// curiosity × relational, the first check in this pass pairing the curiosity trigger with the
// relational output channel instead of the emotion channel).
// Wave 463 additions: suspense relational decoupled (≥3 suspense-positive scenes all have no
// relationship shift while non-suspense scenes do move bonds — danger never carries relational
// consequence; co-occurrence × suspense × relational, the suspense-channel parallel of ARC_
// CURIOSITY_RELATIONAL_DECOUPLED), relational front-loaded (>70% of shift scenes fall in the
// first half while the back half has at least one — bonds all move early then the climax goes
// relationally inert; distribution/timing × relational, the mirror of ARC_RELATIONAL_BACK_LOADED),
// revelation relational aftermath void (every revelation is followed by 2 scenes with no
// relationship shift — discoveries never reshape bonds in their wake; sequence/aftermath ×
// revelation × relational aftermath, distinct from ARC_REVELATION_EMOTION_ABSENT which audits the
// revelation scene's own emotion and from ARC_TURN_EMOTIONAL_AFTERMATH_VOID's turn→emotion axis).
// Wave 477 additions: positive relational aftermath void (every positive-emotion scene is followed
// by 2 scenes with no relationship shift — the protagonist's joys never move a bond in their wake;
// sequence/aftermath × positive-emotion × relational aftermath, the positive-emotion trigger
// complement of ARC_REVELATION_RELATIONAL_AFTERMATH_VOID's revelation trigger), turn zone cluster
// (>75% of dramatic-turn scenes fall in a single third of the script — pivots are ghettoized into
// one structural zone; distribution/timing × dramatic-turn channel, distinct from DRAMATIC_TURN_
// CLUSTER in causality.ts which checks micro-window concentration, and from ARC_EMOTIONAL_FRONT/
// BACK_LOADED which distribute emotion not turns), peak positive uncaused (the script's final
// positive-emotion scene — the most structurally climactic joy — has no revelation, no dramatic
// turn, no suspense rise in its 2 preceding scenes; backward-cause × single-peak × positive-
// emotion, the positive-emotion complement of ARC_PEAK_RELATIONAL_UNCAUSED).
// Wave 491 additions: clock peak emotion absent (single-peak isolation × clock-delta × emotion —
// n≥8, ≥2 emotional scenes, the scene with the highest clockDelta is emotionally neutral; the
// clock-delta cell in the single-peak family alongside ARC_PEAK_SUSPENSE_EMOTION_ABSENT and
// ARC_PEAK_CURIOSITY_EMOTION_ABSENT; distinct from ARC_CLOCK_EMOTION_DECOUPLED which fires on all
// clockRaised scenes being neutral vs this firing on the single peak-delta scene), payoff emotion
// decoupled (co-occurrence × payoff × emotion — n≥8, ≥3 payoff scenes, ≥2 emotional scenes, all
// payoff scenes neutral; thread resolutions never move the protagonist; the payoff-channel
// complement of ARC_CLOCK_EMOTION_DECOUPLED), payoff aftermath emotional void (sequence/aftermath
// × payoff → emotional aftermath — n≥8, ≥3 payoff scenes not at last position, every immediately
// following scene is neutral; distinct from ARC_PAYOFF_EMOTION_DECOUPLED which checks the payoff
// scene itself, and from ARC_TURN_EMOTIONAL_AFTERMATH_VOID which uses a dramatic-turn trigger).
// Wave 505 additions: seed emotional aftermath void (sequence/aftermath × seed → emotional
// aftermath — n≥8, ≥2 seed scenes not at last position, all followed by emotionally neutral
// scenes; foreshadowing never triggers felt consequence; distinct from all aftermath checks with
// revelation, turn, payoff, or positive triggers, and from all co-occurrence checks using the seed
// channel), clock curiosity aftermath void (average/aggregate × clockRaised → curiosity aftermath
// — n≥8, ≥2 clockRaised scenes not at last position, avg curiosityDelta of next scene ≤ 0;
// deadlines never open wondering in the protagonist; distinct from ARC_CLOCK_EMOTION_DECOUPLED
// and ARC_CLOCK_PEAK_EMOTION_ABSENT which check the clock scene itself, and from SEED_AFTERMATH_
// CURIOSITY_VOID in causality.ts which uses seed trigger not clock), payoff drought run (run-based
// × payoff absence — n≥10, ≥2 payoff scenes, longest consecutive run with no payoff ≥ 6; thread
// resolution goes dark for too long; distinct from ARC_RELATIONAL_DROUGHT_RUN which targets the
// relational channel, PAYOFF_BACK_LOADED in causality.ts which is a zone check, and all negative/
// positive emotion run checks which target the emotion channel).
// Wave 533 additions: curiosity peak relational void (single-peak isolation × curiosityDelta ×
// relationship — n≥8, ≥2 relationship-shift scenes, ≥2 curiosity scenes, the scene with the
// highest curiosityDelta has no relationship shift; the story's maximum wonder moment is
// interpersonally inert; first single-peak check on the curiosity channel in this pass, distinct
// from ARC_CLOCK_PEAK_EMOTION_ABSENT and ARC_PEAK_SUSPENSE_EMOTION_ABSENT which use different peak
// signals and aftermath channels), dramatic-turn emotional aftermath void (sequence/aftermath ×
// dramatic-turn → emotional aftermath — n≥8, ≥3 dramatic-turn scenes not at last position, none
// of the immediately following scenes carries a non-neutral emotional shift; pivots land without
// felt consequence; first aftermath check with dramatic-turn as trigger in this pass, distinct from
// ARC_DRAMATIC_TURN_AFTERMATH_VOID in causality.ts which checks causal logic and from ARC_SEED_
// EMOTIONAL_AFTERMATH_VOID which uses seed as trigger), curiosity back-loaded (distribution/timing
// × curiosityDelta × second half — n≥8, ≥4 curiosity scenes, >70% in second half while first half
// has ≥1; wonder ignites only late, never sustaining early investment; the back-half distribution
// complement of ARC_SUSPENSE_FRONT_LOADED, distinct from ARC_CURIOSITY_DROUGHT_RUN which is run-
// based and from CURIOSITY_FRONT_LOADED in causality.ts which is the opposite direction).
// Wave 547 additions: suspense opening zone absent (zone presence/absence × suspenseDelta ×
// opening third — n≥9, ≥3 suspense-positive scenes globally, none in opening structural third;
// protagonist enters the story without any felt tension; the suspense-channel sibling of ARC_
// CLOCK_OPENING_ZONE_ABSENT; distinct from ARC_SUSPENSE_FRONT_LOADED [>70% IN first half, fires
// when suspense IS there concentrated] and ARC_FIRST_HALF_EMOTIONALLY_FLAT [entire first half
// neutral, emotion not suspense]), negative relational aftermath void (sequence/aftermath ×
// negative emotion → relational aftermath — n≥8, ≥2 qualifying negative-emotion scenes
// [pos<n-2], ≥2 relShift scenes globally, no negative scene followed by a relShift in next 2
// scenes; protagonist's defeats never move bonds; distinct from ARC_POSITIVE_RELATIONAL_AFTERMATH_
// VOID [positive trigger] and ARC_REVELATION_RELATIONAL_AFTERMATH_VOID [revelation trigger]),
// payoff front-loaded (distribution/timing × payoff × first-half concentration — n≥8, ≥4 payoff
// scenes, >70% in first half while back half has ≥1; resolutions burst before pressure peaks;
// the front-half distribution complement of PAYOFF_BACK_LOADED in causality.ts; distinct from
// ARC_PAYOFF_DROUGHT_RUN [run-based] and ARC_RELATIONAL_FRONT_LOADED [different channel]).
// Wave 589 additions: dramatic-turn relational aftermath void (sequence/aftermath × dramatic-turn
// → relationship aftermath — n≥8, ≥2 qualifying dramatic-turn scenes [pos<n-1], ≥2 relational-
// shift scenes globally, no dramatic turn immediately followed by a relationship shift in the next
// scene; the dramatic-turn-trigger member of the relational-aftermath family alongside ARC_CLOCK_
// RELATIONAL_AFTERMATH_VOID [clock trigger], ARC_REVELATION_RELATIONAL_AFTERMATH_VOID [revelation
// trigger], ARC_POSITIVE/NEGATIVE_RELATIONAL_AFTERMATH_VOID [emotion triggers]; distinct from ARC_
// DRAMATIC_TURN_EMOTIONAL_AFTERMATH_VOID [emotion not relational]), payoff curiosity aftermath void
// (sequence/aftermath × payoff → curiosity aftermath — n≥8, ≥2 qualifying payoff scenes [pos<n-1],
// ≥2 curiosity-spike scenes globally, no payoff immediately followed by a curiosity spike; the payoff-
// trigger member of the curiosity-aftermath family alongside ARC_CLOCK_CURIOSITY_AFTERMATH_VOID [clock
// trigger] and ARC_SUSPENSE_CURIOSITY_AFTERMATH_VOID [suspense trigger]; distinct from ARC_PAYOFF_
// AFTERMATH_EMOTIONAL_VOID [emotion not curiosity]), emotional drought run (run-based × emotional-
// absence — n≥10, ≥4 emotional scenes [non-neutral emotionalShift], longest consecutive run of
// neutral-shift scenes ≥ 7; completes the drought-run family on the emotional channel alongside
// ARC_SUSPENSE/CURIOSITY/CLOCK/PAYOFF/RELATIONAL_DROUGHT_RUN; distinct from ARC_EMOTIONAL_FLATLINE
// [global rate ≥80% neutral — this is a local run-based check that fires even when global rate is
// below 80%]).
// Wave 575 additions: curiosity zone cluster (distribution/timing × curiosity × structural thirds
// — n≥9, ≥3 curiosity-positive scenes [curiosityDelta>0], >75% in one third; wonder spikes are
// ghettoized into one zone; finer-grained than binary half-partitions; the curiosity-channel
// sibling of ARC_RELATIONAL_ZONE_CLUSTER [Wave 561] and ARC_TURN_ZONE_CLUSTER [Wave 477];
// distinct from ARC_CURIOSITY_DROUGHT_RUN [run-based × absence] and ARC_CURIOSITY_PLATEAU
// [average-mode]), clock drought run (run-based × clockRaised × absence — n≥10, ≥3 clockRaised
// scenes, longest consecutive non-clock run ≥ 6; deadline engine goes silent for an extended
// stretch; completes the drought-run family on the clock channel alongside ARC_SUSPENSE_DROUGHT_
// RUN [Wave 561], ARC_CURIOSITY_DROUGHT_RUN [Wave 519], ARC_RELATIONAL_DROUGHT_RUN [Wave 449],
// ARC_PAYOFF_DROUGHT_RUN [Wave 505]; distinct from ARC_CLOCK_OPENING_ZONE_ABSENT [fixed zone]),
// suspense curiosity aftermath void (sequence/aftermath × suspenseDelta → curiosity aftermath —
// n≥8, ≥2 qualifying suspense-spike scenes [suspenseDelta>0, pos<n-1], ≥2 curiosity-positive
// scenes globally, none of the suspense spikes followed by curiosityDelta>0 in next 2 scenes;
// tension rises never spark wonder; the suspense-trigger member of the curiosity-aftermath family
// alongside ARC_CLOCK_CURIOSITY_AFTERMATH_VOID [Wave 505: clock trigger]; distinct from ARC_
// REVELATION_CURIOSITY_DECOUPLED [co-occurrence × same scene], ARC_CURIOSITY_DROUGHT_RUN
// [run-based × absence], ARC_SUSPENSE_EMOTION_DECOUPLED [same-scene × emotional channel]).
// Wave 561 additions: suspense drought run (run-based × suspenseDelta × absence — n≥10, ≥3
// suspense-positive scenes, longest consecutive run with suspenseDelta ≤ 0 ≥ 6; the tension engine
// stalls for an extended local stretch; completes the drought-run family on the suspense channel
// alongside ARC_CURIOSITY/RELATIONAL/PAYOFF_DROUGHT_RUN, distinct from ARC_SUSPENSE_FRONT_LOADED
// [global half-skew] and ARC_SUSPENSE_OPENING_ZONE_ABSENT [fixed opening zone]), relational zone
// cluster (distribution/timing × relationship × structural thirds — n≥9, ≥3 relShift scenes, >75%
// in a single third; bonds ghettoized into one zone; finer-grained than the binary ARC_RELATIONAL_
// FRONT/BACK_LOADED half-partitions and can fire on a middle-third cluster neither catches, distinct
// from ARC_SHIFT_CONCENTRATION's ≤3-scene micro-burst, the relational-channel sibling of ARC_TURN_
// ZONE_CLUSTER), clock relational aftermath void (sequence/aftermath × clock → relational aftermath
// — n≥8, ≥2 clockRaised scenes [pos<n-1], ≥2 relShift scenes globally, no clock scene followed by a
// relShift in next 2 scenes; deadlines never strain bonds; the clock-trigger member of the relational-
// aftermath family alongside ARC_NEGATIVE/POSITIVE/REVELATION_RELATIONAL_AFTERMATH_VOID, distinct from
// ARC_CLOCK_EMOTION_DECOUPLED [same-scene] and ARC_CLOCK_CURIOSITY_AFTERMATH_VOID [curiosity channel]).
// Wave 519 additions: curiosity drought run (run-based × curiosityDelta × absence — n≥10,
// ≥3 curiosity-positive scenes, longest run with curiosityDelta ≤ 0 ≥ 6; the wonder engine
// stalls for an extended stretch; first run-based check on the curiosity channel, distinct from
// ARC_RELATIONAL_DROUGHT_RUN and ARC_PAYOFF_DROUGHT_RUN which target different channels, and
// from all curiosity co-occurrence/zone/average-mode checks), suspense front-loaded (distribution/
// timing × suspenseDelta × first half — n≥8, ≥4 suspense scenes, >70% in first half while back
// half has ≥1; tension exhausted before climax; first distribution check on suspense channel,
// distinct from ARC_EMOTIONAL_FRONT_LOADED and ARC_RELATIONAL_FRONT_LOADED on different channels,
// and from ARC_PEAK_SUSPENSE_EMOTION_ABSENT which uses single-peak mode), clock opening zone
// absent (zone presence/absence × clockRaised × opening third — n≥9, ≥3 clockRaised scenes, none
// in opening structural third; deadline urgency absent from setup; first zone-based check on clock
// channel targeting opening third, distinct from ARC_CLOCK_EMOTION_DECOUPLED co-occurrence, ARC_
// CLOCK_PEAK_EMOTION_ABSENT single-peak, ARC_CLOCK_CURIOSITY_AFTERMATH_VOID aftermath, and all
// relational zone checks which target the relational channel).
// Wave 603 additions (built on the shared checks library, audit M2.2): RELATIONSHIP_SHIFT_
// DIALOGUE_HIGHLIGHT_DECOUPLED (co-occurrence/decoupling × relationshipShifts × dialogueHighlights
// — first use of dialogueHighlights anywhere in this 99-rule pass), VISUAL_STAGING_EMOTIONAL_
// FLATNESS_CLUSTER (distribution/timing × visualBeats+emotionalShift compound × structural thirds
// — first use of visualBeats anywhere in this pass), OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID
// (sequence/aftermath × heavy unresolvedClues debt → emotional beat absence — first use of
// unresolvedClues anywhere in this pass).
// Wave 617 additions (built on the shared checks library, audit M2.2): PAYOFF_VISUAL_BEAT_
// DECOUPLED (co-occurrence/decoupling × payoffSetupIds × visualBeats — first pairing of these two
// lightly-used fields in this 102-rule pass), ARC_CHARACTER_MOMENT_ZONE_IMBALANCE
// (underweight/bloat × purpose === 'character_moment' × four structural zones — first zone-based
// check on the purpose channel), ARC_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (sequence/aftermath ×
// seededClueIds trigger → dialogueHighlights absence — first pairing of these two fields).
// Wave 631 additions (built on the shared checks library, audit M2.2): ARC_DIALOGUE_HIGHLIGHT_
// STAGING_DECOUPLED (co-occurrence/decoupling × dialogueHighlights × visualBeats — first pairing
// of these two fields in this 105-rule pass), ARC_OPEN_THREAD_STAGING_AFTERMATH_VOID
// (sequence/aftermath × heavy unresolvedClues debt trigger → visualBeats absence — first pairing
// of these two fields), ARC_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE (underweight/bloat ×
// dialogueHighlights × four structural zones — Wave 617 applied this template to purpose only;
// dialogueHighlights itself has never been zone-audited here).
// Wave 645 additions (built on the shared checks library, audit M2.2): ARC_HIGHLIGHT_PEAK_
// UNCAUSED (single-peak isolation/backward-cause × dialogueHighlights magnitude — the scene with
// the single densest count of highlighted lines has no dramatic turn or revelation in itself or
// the two scenes before it; first checkPeakUncaused use in this 108-rule pass — every prior
// single-peak check here [suspense, curiosity, relational, clock, positive-emotion] measures a
// numeric delta or shift-density peak, never the dialogueHighlights channel), ARC_SEED_DROUGHT_
// RUN (run-based × seededClueIds absence — a 6+ consecutive-scene stretch with no clue seeded at
// all, while seeding occurs ≥3 times elsewhere; this pass already hand-rolls drought-run logic
// for suspenseDelta [Wave 561] and curiosityDelta [Wave 519], but never via the shared
// checkDroughtRun helper and never on the seededClueIds channel), ARC_OPEN_THREAD_CURIOSITY_
// DECOUPLED (co-occurrence/decoupling × unresolvedClues × curiosityDelta>0 — zero overlap between
// scenes carrying open clue-debt and scenes where curiosity is actively rising; unresolvedClues
// has only ever been paired with dialogueHighlights [Wave 603] and used as an aftermath-void
// trigger [Waves 603, 631] in this file, never cross-checked against the curiosity channel).
// Wave 659 additions (built on the shared checks library, audit M2.2): ARC_STAGING_PEAK_UNCAUSED
// (single-peak isolation/backward-cause × visualBeats magnitude — the scene with the densest
// physical staging has no dramatic turn or revelation in itself or the two scenes before it;
// visualBeats has only ever been zone-imbalanced [four-zone bloat/empty] here, never backward-
// cause peak-audited), ARC_OPEN_THREAD_DROUGHT_RUN (run-based × unresolvedClues absence — this
// pass already hand-rolls drought-run logic for relational/payoff/curiosity/suspense/clock/
// emotional channels and Wave 645 added seededClueIds via the shared helper; unresolvedClues
// itself has only been used in co-occurrence and aftermath-void contexts, never drought-audited),
// ARC_PAYOFF_ZONE_CLUSTER (distribution/timing × payoffSetupIds × structural thirds — this pass
// already applies the zone-cluster mode to dramaticTurn, relationshipShifts, and curiosityDelta;
// payoffSetupIds itself has never been cluster-audited here).
// Wave 673 additions (built on the shared checks library, audit M2.2): ARC_CLOCK_DELTA_PEAK_
// UNCAUSED (single-peak isolation/backward-cause × clockDelta magnitude — distinct from the
// existing ARC_CLOCK_PEAK_EMOTION_ABSENT, which checks whether the peak-clockDelta scene is
// itself emotionally neutral; this instead asks whether that scene is structurally caused by a
// dramatic turn or revelation), ARC_HIGHLIGHT_DROUGHT_RUN (run-based × dialogueHighlights absence
// — Wave 645 applied the peak-uncaused mode to dialogueHighlights; the drought-run mode has never
// been applied to this channel), ARC_SEED_ZONE_CLUSTER (distribution/timing × seededClueIds ×
// structural thirds — Wave 645 applied the drought-run mode to seededClueIds; the zone-cluster
// mode has never been applied to this channel despite it already anchoring two aftermath-void
// checks).
// Wave 687 additions (built on the shared checks library): ARC_PAYOFF_PEAK_UNCAUSED (single-peak
// isolation/backward-cause × payoffSetupIds magnitude — the scene with the most simultaneous
// thread resolutions has no dramatic turn or revelation in itself or the two scenes before it;
// payoffSetupIds has been zone-clustered [Wave 659] and drought-audited [hand-rolled Wave 505]
// but never backward-cause peak-audited), ARC_STAGING_DROUGHT_RUN (run-based × visualBeats
// absence — visualBeats has been zone-imbalanced [four-zone] and backward-cause peak-audited
// [Wave 659], but never drought-audited), ARC_HIGHLIGHT_ZONE_CLUSTER (distribution/timing ×
// dialogueHighlights × structural thirds — dialogueHighlights has been backward-cause
// peak-audited [Wave 645] and drought-audited [Wave 673], but never cluster-audited, completing
// the trio of shared-library modes on this channel).
// Wave 701 additions (built on the shared checks library): ARC_STAGING_ZONE_CLUSTER
// (distribution/timing × visualBeats × structural thirds — visualBeats has been backward-cause
// peak-audited [Wave 659], drought-audited [Wave 687], and four-zone imbalance-audited, but never
// cluster-audited on the thirds granularity, completing the trio of shared-library modes on this
// channel), ARC_CLOCK_DELTA_ZONE_CLUSTER (distribution/timing × clockDelta>0 × structural thirds —
// distinct from the existing hand-rolled ARC_CLOCK_DROUGHT_RUN [clockRaised boolean] and Wave
// 673's ARC_CLOCK_DELTA_PEAK_UNCAUSED [backward-cause peak]; the zone-cluster mode has never been
// applied to the raw clockDelta signal), ARC_SEED_PEAK_UNCAUSED (single-peak isolation/backward-
// cause × seededClueIds magnitude — seededClueIds has been drought-audited [Wave 645] and
// zone-clustered [Wave 673], but never backward-cause peak-audited, completing the trio of
// shared-library modes on this channel).
// Wave 715 additions (built on the shared checks library): ARC_RESOLUTION_DROUGHT_RUN (run-based
// × payoffSetupIds absence — Waves 659/687 applied the zone-cluster and backward-cause peak modes
// to payoffSetupIds; the drought-run mode has never been applied to it via the shared library,
// completing the trio; named distinctly from the existing hand-rolled ARC_PAYOFF_DROUGHT_RUN
// [Wave 505] to avoid a rule-name collision), ARC_CLOCK_DELTA_DROUGHT_RUN (run-based ×
// clockDelta>0 absence — Waves 673/701 applied the backward-cause peak and zone-cluster modes to
// clockDelta; the drought-run mode has never been applied to it, completing the trio; distinct
// from the existing hand-rolled ARC_CLOCK_DROUGHT_RUN [clockRaised boolean, Wave 575]),
// ARC_OPEN_THREAD_PEAK_UNCAUSED (single-peak isolation/backward-cause × unresolvedClues magnitude
// — unresolvedClues has only ever anchored a co-occurrence/decoupling check [Wave 645]; the
// backward-cause peak mode has never been applied to it).
// Wave 729 additions: ARC_OPEN_THREAD_ZONE_CLUSTER (distribution/timing × unresolvedClues ×
// structural thirds — Waves 659/715 applied the run-based drought and backward-cause peak modes
// to unresolvedClues; the zone-cluster mode has never been applied to it, completing the trio),
// ARC_CHARACTER_MOMENT_DROUGHT_RUN (run-based × purpose === 'character_moment' absence — Wave 617
// applied the four-zone-imbalance mode to this signal; the run-based drought mode has never been
// applied to it), ARC_CURIOSITY_PEAK_UNCAUSED (single-peak isolation/backward-cause ×
// curiosityDelta magnitude via the shared checks library — distinct from the existing hand-rolled
// peak-audits [ARC_PEAK_CURIOSITY_EMOTION_ABSENT, Wave 365; ARC_CURIOSITY_PEAK_RELATIONAL_VOID,
// Wave 533], both of which examine the peak scene's OWN state; this checks whether the peak scene
// or either of the two PRECEDING scenes contains a dramatic turn or revelation — a genuinely
// distinct backward-looking causal audit never applied to this channel).
// Wave 743 additions: ARC_CHARACTER_MOMENT_ZONE_CLUSTER (distribution/timing × purpose ===
// 'character_moment' × structural thirds — Wave 617 applied the four-zone-imbalance mode
// [bloat/empty across four zones] and Wave 729 applied the run-based drought mode to this signal;
// the thirds-ratio zone-cluster mode has never been applied to it — a distinct analytical shape
// from the four-zone imbalance check, since >75%-in-one-third can fire even when no zone is
// completely empty), ARC_TURN_DROUGHT_RUN (run-based × dramaticTurn !== 'nothing' absence — Wave
// 449 applied the zone-cluster mode to this channel [ARC_TURN_ZONE_CLUSTER]; the run-based
// drought mode has never been applied to it), ARC_CLOCK_ZONE_CLUSTER (distribution/timing ×
// clockRaised === true × structural thirds — the existing ARC_CLOCK_DROUGHT_RUN [Wave 575] audits
// run-length absence and ARC_CLOCK_OPENING_ZONE_ABSENT audits only the opening third specifically;
// the general thirds-ratio zone-cluster mode, which can fire on a middle- or closing-third
// concentration that the opening-only check cannot detect, has never been applied to it).
// Wave 757 additions: ARC_SUSPENSE_ZONE_CLUSTER (distribution/timing × suspenseDelta>0 presence ×
// structural thirds — the existing ARC_SUSPENSE_DROUGHT_RUN [Wave 561] audits run-length absence
// and ARC_SUSPENSE_OPENING_ZONE_ABSENT audits only the opening third specifically; the general
// thirds-ratio zone-cluster mode has never been applied to it), ARC_EMOTION_ZONE_CLUSTER
// (distribution/timing × emotionalShift !== 'neutral' presence × structural thirds — the existing
// ARC_EMOTIONAL_DROUGHT_RUN audits run-length absence, ARC_EMOTION_CONCENTRATION audits a
// contiguous span [≤20% of the story], and ARC_EMOTIONAL_FRONT_LOADED/BACK_LOADED audit a binary
// half-split; the general thirds-ratio zone-cluster mode — a disjoint-third majority test distinct
// from all three — has never been applied to it), ARC_STAKES_DROUGHT_RUN (run-based × purpose ===
// 'raise_stakes' absence — purpose has never anchored any of the three shared-library modes for
// this specific value; the run-based drought mode has never been applied to it).
// Wave 771 additions: ARC_SUSPENSE_PEAK_UNCAUSED (backward-cause × suspenseDelta-as-magnitude ×
// 2-scene lookback — ARC_SUSPENSE_DROUGHT_RUN and ARC_SUSPENSE_ZONE_CLUSTER completed the
// drought/cluster half of the trio; the existing ARC_PEAK_SUSPENSE_EMOTION_ABSENT audits the
// co-occurring emotion channel AT the peak scene, not a preparing cause in the scenes before it —
// the backward-cause peak mode has never been applied to suspenseDelta itself), ARC_STAKES_ZONE_
// CLUSTER (distribution/timing × purpose === 'raise_stakes' presence × structural thirds —
// ARC_STAKES_DROUGHT_RUN [Wave 757] applied the run-based drought mode to this value; the
// zone-cluster mode has never been applied to it), ARC_REVELATION_ZONE_CLUSTER (distribution/
// timing × revelation × structural thirds — the existing ARC_REVELATION_LATE_CLUSTER audits a
// fixed final-quarter window [>60% of revelations in the last 25%]; the general thirds-ratio
// zone-cluster mode — a disjoint-third majority test at a lower 75% threshold with no fixed
// zone — has never been applied to revelation).
// Wave 785 additions: ARC_REVELATION_DROUGHT_RUN (run-based × revelation absence — Wave 771
// applied the zone-cluster mode to revelation; the run-based drought mode has never been applied
// to it, completing 2 of 3 slots), ARC_REVELATION_PEAK_UNCAUSED (backward-cause ×
// revelation-as-magnitude × 2-scene lookback — completing the trio; hasCause references only
// dramaticTurn, never revelation, to avoid a circular/self-referential audit), ARC_NEGATIVE_
// EMOTION_ZONE_CLUSTER (distribution/timing × emotionalShift === 'negative' presence × structural
// thirds — the existing ARC_NEGATIVE_EMOTION_RUN audits consecutive-presence [run-based], a
// distinct claim from where negative beats concentrate structurally; the general thirds-ratio
// zone-cluster mode has never been applied to this specific valence).
// Wave 799 additions: ARC_NEGATIVE_EMOTION_DROUGHT_RUN (run-based × emotionalShift === 'negative'
// absence — completes the trio for this valence alongside the zone-cluster mode added in Wave
// 785; distinct from ARC_NEGATIVE_EMOTION_RUN, which audits consecutive PRESENCE of negative
// scenes — an absence run of 6+ scenes with no negative beat is the mirror-image claim, and a
// story satisfying one does not automatically satisfy the other). Reconnaissance for this wave
// also confirmed that ARC_SUSPENSE_DROUGHT_RUN (Wave 561, hand-rolled), ARC_CLOCK_DROUGHT_RUN
// (Wave 575, hand-rolled), ARC_CURIOSITY_DROUGHT_RUN (Wave 519, hand-rolled) and ARC_CURIOSITY_
// ZONE_CLUSTER (Wave 575, hand-rolled) and ARC_TURN_ZONE_CLUSTER (Wave 477, hand-rolled) and
// ARC_PEAK_RELATIONAL_UNCAUSED (Wave 435, hand-rolled) already complete their respective trios,
// so suspenseDelta, clockRaised, curiosityDelta, dramaticTurn, and relationshipShifts were
// correctly skipped as non-distinct candidates. ARC_TURNING_POINT_ZONE_CLUSTER
// (distribution/timing × purpose === 'turning_point' × structural thirds — this specific purpose
// value has only ever appeared inside a five-value composite set [line ~404]; it has never been
// audited as its own standalone signal by any of the three shared-library trio modes),
// ARC_TURNING_POINT_DROUGHT_RUN (run-based × purpose === 'turning_point' absence — completing 2
// of 3 slots for this purpose value alongside the zone-cluster mode added in this same wave; peak
// mode conventionally skipped for this categorical field).

import type { PassInput, PassResult, RevisionIssue } from './types.ts';
import { rewritePass } from '../rewrite.ts';
import { checkCoOccurrenceDecoupled, checkZoneCluster, checkAftermathVoid, checkZoneImbalance, checkPeakUncaused, checkDroughtRun, FOUR_ZONE_NAMES } from './lib/checks.ts';

export async function characterArcPass(input: PassInput): Promise<PassResult> {
  const { fountain, records, structure, annotations, approvedSpans } = input;
  const issues: RevisionIssue[] = [];

  if (records.length < 3) {
    return {
      pass: 'character-arc',
      issues: [],
      revisedFountain: fountain,
      changed: false,
      summary: 'Character-arc pass: too few scenes to evaluate',
    };
  }

  // ── Compute emotional journey per "character zone" ────────────────────────
  // We proxy character arcs through the records' emotionalShift field
  const firstThird = records.slice(0, Math.floor(records.length / 3));
  const lastThird = records.slice(Math.floor(records.length * 2 / 3));

  const firstShift = dominantShift(firstThird);
  const lastShift = dominantShift(lastThird);

  if (firstShift !== 'neutral' && lastShift !== 'neutral' && firstShift === lastShift) {
    issues.push({
      location: 'Overall character arc',
      rule: 'FLAT_CHARACTER_ARC',
      description: `Story opens and closes with the same dominant emotional tone (${firstShift}) — no character transformation is registered`,
      severity: 'major',
      suggestedFix: 'Add a turning-point scene in Act 2b where the protagonist\'s emotional orientation shifts',
    });
  }

  // ── Transformation without a causal scene ────────────────────────────────
  if (firstShift !== lastShift && firstShift !== 'neutral' && lastShift !== 'neutral') {
    // Good — there's a shift. Check it's not abrupt (no scene with revelation/turn in between).
    // NOTE: `dramaticTurn` is a freeform string that never equals 'none' — check `purpose` instead.
    const dramaticPurposes = new Set(['revelation', 'turning_point', 'climax', 'raise_stakes', 'complicate']);
    const middleRecords = records.slice(Math.floor(records.length / 3), Math.floor(records.length * 2 / 3));
    const hasTransformationCause = middleRecords.some(r => r.revelation !== null || dramaticPurposes.has(r.purpose));
    if (!hasTransformationCause && middleRecords.length >= 1) {
      issues.push({
        location: 'Mid-story character arc',
        rule: 'UNMOTIVATED_TRANSFORMATION',
        description: 'The character\'s emotional arc shifts from beginning to end but no mid-story scene clearly causes the change',
        severity: 'major',
        suggestedFix: 'Add a pivotal scene where the character confronts something that forces an internal shift',
      });
    }
  }

  // ── No revelation scenes in a complete story ──────────────────────────────
  if (structure.revelationCount === 0 && structure.completionPercent >= 70) {
    issues.push({
      location: 'Character arc — revelations',
      rule: 'NO_REVELATIONS',
      description: 'A near-complete story with no revelation scenes: character arcs cannot be witnessed, only told',
      severity: 'critical',
      suggestedFix: 'Add at least one scene where a character directly witnesses something that changes their worldview',
    });
  }

  // ── Approaching climax without emotional peak ─────────────────────────────
  if (structure.approachingClimax && records.length >= 4) {
    const lastFour = records.slice(-4);
    const hasEmotionalPeak = lastFour.some(r => r.emotionalShift !== 'neutral');
    if (!hasEmotionalPeak) {
      issues.push({
        location: 'Pre-climax character arc',
        rule: 'CLIMAX_EMOTIONALLY_FLAT',
        description: 'The climax approach is emotionally flat — the audience is not invested in the character\'s outcome',
        severity: 'major',
        suggestedFix: 'Add a moment of personal cost or sacrifice that makes the climax emotionally resonant',
      });
    }
  }

  // ── Per-character relational arc (Wave 138) ────────────────────────────────
  // Characters who appear prominently in the story but whose relationships never
  // shift have no arc — they are narrative furniture, not dramatic agents.
  // We count fountain character-cue appearances as a proxy for character prominence,
  // then check whether each character appears in any relationshipShifts pairKey.
  if (records.length >= 5) {
    // Build character appearance count from fountain (ALL-CAPS character cues)
    const fountainCueCounts = new Map<string, number>();
    for (const line of fountain.split('\n')) {
      const t = line.trim();
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}$/.test(t) &&
          !/^(INT\.|EXT\.|CUT TO|FADE|SMASH|THE END|ACT|MIDPOINT|SCENE)/i.test(t)) {
        const charName = t.replace(/\s*\(.*?\)\s*$/, '').toLowerCase().trim();
        if (charName !== 'narrator' && charName !== 'v.o.' && charName !== 'o.s.') {
          fountainCueCounts.set(charName, (fountainCueCounts.get(charName) ?? 0) + 1);
        }
      }
    }

    // Build set of characters who have at least one relationship shift in the records
    const charsWithRelArc = new Set<string>();
    for (const r of records) {
      for (const shift of r.relationshipShifts ?? []) {
        for (const charId of shift.pairKey.split('|')) {
          charsWithRelArc.add(charId.toLowerCase());
        }
      }
    }

    // Major characters: appear in ≥4 fountain cues (substantial scene presence)
    const majorFountainChars = [...fountainCueCounts.entries()]
      .filter(([, count]) => count >= 4)
      .sort((a, b) => b[1] - a[1]);

    if (majorFountainChars.length >= 2 && charsWithRelArc.size > 0) {
      // CHARACTER_ARC_PROTAGONIST_PASSIVE: the character with the most cues (protagonist
      // proxy) has no relationship arc at all — they drive scenes but nothing changes
      // between them and anyone else
      const [protagonistId, protagonistCues] = majorFountainChars[0];
      if (!charsWithRelArc.has(protagonistId) && protagonistCues >= 6) {
        const displayName = protagonistId.replace(/_/g, ' ').toUpperCase();
        issues.push({
          location: `Character: ${displayName}`,
          rule: 'CHARACTER_ARC_PROTAGONIST_PASSIVE',
          description:
            `${displayName} appears in ${protagonistCues} scenes (most of any character) ` +
            `but is never part of a relationship shift — the protagonist has no relational arc`,
          severity: 'major',
          suggestedFix:
            `The protagonist must have at least one relationship that fundamentally changes. ` +
            `Add a SHIFT_RELATIONSHIP op involving ${displayName} in a pivotal scene.`,
        });
      }

      // CHARACTER_ARC_RELATIONAL_STASIS: a secondary major character who appears
      // throughout but whose dynamic with everyone else never moves at all
      const inertChars = majorFountainChars.filter(
        ([id, count]) => count >= 4 && !charsWithRelArc.has(id),
      );
      if (inertChars.length > 0 && !issues.some(i => i.rule === 'CHARACTER_ARC_PROTAGONIST_PASSIVE')) {
        // Report only the most prominent inert character to avoid noise
        const [inertId, inertCues] = inertChars[0];
        const displayName = inertId.replace(/_/g, ' ').toUpperCase();
        issues.push({
          location: `Character: ${displayName}`,
          rule: 'CHARACTER_ARC_RELATIONAL_STASIS',
          description:
            `${displayName} appears in ${inertCues} scenes but their relationships never shift — ` +
            `they are a narrative fixture, not an agent in the story`,
          severity: 'minor',
          suggestedFix:
            `Give ${displayName} at least one relationship that moves: trust gained or lost, ` +
            `power reversed, alliance shifted. Static characters flatten the dramatic landscape.`,
        });
      }
    }
  }

  // ── Wave 153: Arc monotone, late introduction, emotional whiplash ───────────

  // ARC_EMOTIONAL_MONOTONE: Across the whole story, every scene carries the same
  // emotional shift (or all neutral). A character whose emotional register never
  // varies has no inner life — the arc is a flat line, not a journey.
  if (records.length >= 6) {
    const shiftCounts = new Map<string, number>();
    for (const r of records) {
      const s = r.emotionalShift ?? 'neutral';
      shiftCounts.set(s, (shiftCounts.get(s) ?? 0) + 1);
    }
    // Dominant shift covers ≥90% of scenes → monotone emotional landscape
    const dominantCount = Math.max(...shiftCounts.values());
    const dominantRatio = dominantCount / records.length;
    if (dominantRatio >= 0.9) {
      const dominant = [...shiftCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
      issues.push({
        location: 'Emotional landscape',
        rule: 'ARC_EMOTIONAL_MONOTONE',
        description: `${Math.round(dominantRatio * 100)}% of scenes carry the same emotional register (${dominant}) — the story has no emotional dynamics; every beat lands at the same pitch`,
        severity: 'major',
        suggestedFix: 'Vary the emotional register scene to scene: a moment of levity before tragedy, a flash of hope before despair. Contrast is what makes any single emotion land.',
      });
    }
  }

  // CHARACTER_LATE_INTRODUCTION: A major character (≥4 cues) whose first
  // appearance is past the story's midpoint. Introducing a significant player
  // late deprives the audience of the investment needed for them to matter.
  if (records.length >= 6) {
    // Track first scene index where each character cue appears
    const lines = fountain.split('\n');
    const lineToScene: number[] = [];
    let sceneIdx = -1;
    for (const line of lines) {
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(line.trim())) sceneIdx++;
      lineToScene.push(Math.max(0, sceneIdx));
    }

    const firstAppearance = new Map<string, number>();
    const cueCounts = new Map<string, number>();
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}$/.test(t) &&
          !/^(INT\.|EXT\.|CUT TO|FADE|SMASH|THE END|ACT|MIDPOINT|SCENE)/i.test(t)) {
        const charName = t.replace(/\s*\(.*?\)\s*$/, '').toLowerCase().trim();
        if (charName === 'narrator' || charName === 'v.o.' || charName === 'o.s.') continue;
        cueCounts.set(charName, (cueCounts.get(charName) ?? 0) + 1);
        if (!firstAppearance.has(charName)) {
          firstAppearance.set(charName, lineToScene[i]);
        }
      }
    }

    const midpoint = Math.floor(records.length / 2);
    for (const [charName, count] of cueCounts) {
      if (count >= 4) {
        const firstScene = firstAppearance.get(charName) ?? 0;
        if (firstScene > midpoint) {
          const displayName = charName.replace(/_/g, ' ').toUpperCase();
          issues.push({
            location: `Character: ${displayName}`,
            rule: 'CHARACTER_LATE_INTRODUCTION',
            description: `${displayName} is a major character (${count} scenes) but first appears at Scene ${firstScene}, past the midpoint (Scene ${midpoint}) — the audience has no time to invest in them before they matter`,
            severity: 'major',
            suggestedFix: `Introduce ${displayName} (or plant their existence) in the first half of the story so their later prominence feels earned, not arbitrary`,
          });
          break; // one flag per pass
        }
      }
    }
  }

  // EMOTIONAL_WHIPLASH: 4+ consecutive scenes that alternate emotional polarity
  // (positive→negative→positive→negative) with no neutral grounding between.
  // Rapid oscillation without settling feels manipulative rather than earned.
  if (records.length >= 4) {
    let alternations = 0;
    let whiplashStart = -1;
    for (let i = 1; i < records.length; i++) {
      const prev = records[i - 1].emotionalShift;
      const curr = records[i].emotionalShift;
      const isOpposite =
        (prev === 'positive' && curr === 'negative') ||
        (prev === 'negative' && curr === 'positive');
      if (isOpposite) {
        if (alternations === 0) whiplashStart = i - 1;
        alternations++;
        if (alternations === 3) {
          issues.push({
            location: `Scenes ${whiplashStart}–${i}`,
            rule: 'EMOTIONAL_WHIPLASH',
            description: `Scenes ${whiplashStart}–${i} alternate emotional polarity 3+ times with no neutral grounding (positive↔negative) — rapid oscillation feels manipulative rather than earned`,
            severity: 'minor',
            suggestedFix: 'Let one emotional state breathe across two scenes before flipping. Give the audience a moment to absorb a feeling before reversing it.',
          });
          alternations = 0; // reset to avoid duplicate flags
        }
      } else {
        alternations = 0;
      }
    }
  }

  // ── Wave 168: Relational symmetry, arc resolution, secondary character void ──

  // RELATIONAL_SYMMETRY_ABSENT: Every relationship shift in the story moves in the
  // same direction — all improving or all deteriorating. Real dramatic relationships
  // require both rise and fall to feel dynamic and three-dimensional.
  if (records.length >= 6) {
    const allAmounts: number[] = [];
    for (const r of records) {
      for (const shift of r.relationshipShifts ?? []) {
        allAmounts.push(shift.amount);
      }
    }
    if (allAmounts.length >= 4) {
      const allPositive = allAmounts.every(a => a > 0);
      const allNegative = allAmounts.every(a => a < 0);
      if (allPositive || allNegative) {
        const direction = allPositive ? 'positive (improving only)' : 'negative (deteriorating only)';
        issues.push({
          location: 'All relationship arcs',
          rule: 'RELATIONAL_SYMMETRY_ABSENT',
          description: `All ${allAmounts.length} relationship shifts in the story are ${direction} — no arc has both rise and fall. Unidirectional relationships are predictable rather than dramatic.`,
          severity: 'major',
          suggestedFix: 'Add at least one shift in the opposing direction: a trust built then broken, or a wound that slowly heals. Real relationships are tested by both growth and setback.',
        });
      }
    }
  }

  // ARC_RESOLUTION_ABSENT: Act 2 has 2+ negative emotional shifts (protagonist
  // struggles) but Act 3 (last 25%) has no positive shifts — the arc ends without
  // catharsis or transformation. The internal journey was never resolved.
  if (records.length >= 8) {
    const act2Start = Math.floor(records.length * 0.25);
    const act3Start = Math.floor(records.length * 0.75);
    const act2NegCount = records.slice(act2Start, act3Start)
      .filter(r => r.emotionalShift === 'negative').length;
    const act3PosCount = records.slice(act3Start)
      .filter(r => r.emotionalShift === 'positive').length;
    if (act2NegCount >= 2 && act3PosCount === 0) {
      issues.push({
        location: `Act 3 (Scenes ${act3Start}–${records.length - 1})`,
        rule: 'ARC_RESOLUTION_ABSENT',
        description: `Act 2 has ${act2NegCount} negative emotional shifts (struggle) but Act 3 has no positive shifts — the protagonist's internal arc ends without catharsis or transformation`,
        severity: 'major',
        suggestedFix: 'Add at least one positive emotional beat in Act 3: a reconciliation, a hard-won clarity, or a moment of grace. The struggle must earn some form of resolution.',
      });
    }
  }

  // SECONDARY_CHARACTER_VOID: 2+ secondary characters (3+ fountain cues, not the
  // protagonist) have zero relationship shifts across the story. The protagonist
  // moves through a socially static environment — no one around them grows or changes.
  if (records.length >= 6) {
    const cueCounts2 = new Map<string, number>();
    for (const line of fountain.split('\n')) {
      const t = line.trim();
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}$/.test(t) &&
          !/^(INT\.|EXT\.|CUT TO|FADE|SMASH|THE END|ACT|MIDPOINT|SCENE)/i.test(t)) {
        const charName = t.replace(/\s*\(.*?\)\s*$/, '').toLowerCase().trim();
        if (charName !== 'narrator' && charName !== 'v.o.' && charName !== 'o.s.') {
          cueCounts2.set(charName, (cueCounts2.get(charName) ?? 0) + 1);
        }
      }
    }
    const charsInArcs = new Set<string>();
    for (const r of records) {
      for (const shift of r.relationshipShifts ?? []) {
        for (const id of shift.pairKey.split('|')) charsInArcs.add(id.toLowerCase());
      }
    }
    const sortedChars = [...cueCounts2.entries()].sort((a, b) => b[1] - a[1]);
    const secondaries = sortedChars.slice(1).filter(([, c]) => c >= 3);
    const inertSecondaries = secondaries.filter(([id]) => !charsInArcs.has(id));
    if (inertSecondaries.length >= 2) {
      const names = inertSecondaries.slice(0, 3).map(([id]) => id.toUpperCase()).join(', ');
      issues.push({
        location: 'Secondary characters',
        rule: 'SECONDARY_CHARACTER_VOID',
        description: `${inertSecondaries.length} secondary characters (${names}) appear in 3+ scenes each but have no relationship shifts — the protagonist moves through a socially static landscape`,
        severity: 'minor',
        suggestedFix: 'Give at least one secondary character a relationship shift that intersects with the protagonist\'s journey. Even a single betrayal or alliance adds dramatic texture.',
      });
    }
  }

  // ── Wave 182: Arc stall in Act 2, secondary arc mirror, climax void ──────

  // ARC_STALL_IN_ACT2: The entire Act 2 conflict zone (25%–75%) has a neutral
  // emotional register — no growth, no suffering, no arc movement. The protagonist
  // neither wins nor loses ground across the story's central dramatic terrain.
  if (records.length >= 8) {
    const act2Start = Math.floor(records.length * 0.25);
    const act2End   = Math.floor(records.length * 0.75);
    const act2Records = records.slice(act2Start, act2End);
    if (act2Records.length >= 3 && act2Records.every(r => r.emotionalShift === 'neutral')) {
      issues.push({
        location: `Act 2 (Scenes ${act2Start}–${act2End - 1})`,
        rule: 'ARC_STALL_IN_ACT2',
        description: `All ${act2Records.length} Act 2 scenes are emotionally neutral — the conflict zone registers no emotional charge. The protagonist neither grows nor suffers across the story's entire middle.`,
        severity: 'major',
        suggestedFix: 'Introduce at least two emotionally charged scenes in Act 2: a positive beat (hope, connection, small victory) and a negative beat (loss, betrayal, cost). The arc needs both poles to feel earned.',
      });
    }
  }

  // SECONDARY_ARC_MIRROR: Two or more secondary characters share the same net
  // relationship arc direction (both improving or both deteriorating), making them
  // functionally interchangeable as dramatic agents. The story lacks contrasting
  // secondary arc perspectives — characters are echoes, not individuals.
  if (records.length >= 6) {
    const charNetArc = new Map<string, number>();
    for (const r of records) {
      for (const shift of r.relationshipShifts ?? []) {
        for (const charId of shift.pairKey.split('|')) {
          const id = charId.toLowerCase();
          charNetArc.set(id, (charNetArc.get(id) ?? 0) + shift.amount);
        }
      }
    }
    if (charNetArc.size >= 3) {
      const cueMap = new Map<string, number>();
      for (const line of fountain.split('\n')) {
        const t = line.trim();
        if (/^[A-Z][A-Z0-9\s\-'\.]{2,}$/.test(t) &&
            !/^(INT\.|EXT\.|CUT TO|FADE|SMASH|THE END|ACT|MIDPOINT|SCENE)/i.test(t)) {
          const charName = t.replace(/\s*\(.*?\)\s*$/, '').toLowerCase().trim();
          if (charName !== 'narrator' && charName !== 'v.o.' && charName !== 'o.s.') {
            cueMap.set(charName, (cueMap.get(charName) ?? 0) + 1);
          }
        }
      }
      const protagonistId = [...cueMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
      const significantSecondaries = [...charNetArc.entries()]
        .filter(([id, net]) => id !== protagonistId && Math.abs(net) >= 0.3);
      const positiveSecondaries = significantSecondaries.filter(([, net]) => net > 0);
      const negativeSecondaries = significantSecondaries.filter(([, net]) => net < 0);
      if (positiveSecondaries.length >= 2 || negativeSecondaries.length >= 2) {
        const mirrored = positiveSecondaries.length >= 2 ? positiveSecondaries : negativeSecondaries;
        const dir = positiveSecondaries.length >= 2 ? 'improving' : 'deteriorating';
        const names = mirrored.slice(0, 3).map(([id]) => id.toUpperCase()).join(', ');
        issues.push({
          location: 'Secondary character arcs',
          rule: 'SECONDARY_ARC_MIRROR',
          description: `Secondary characters ${names} all have ${dir} net relationship arcs — they duplicate each other's arc trajectory and are functionally interchangeable as dramatic agents.`,
          severity: 'minor',
          suggestedFix: 'Give at least one secondary character an arc in the opposing direction. Contrasting arcs (one ally rising while another falls) create dramatic irony and prevent the story from feeling like everyone is on the same emotional journey.',
        });
      }
    }
  }

  // ARC_CLIMAX_VOID: The scene explicitly marked as the climax is emotionally
  // neutral, has no relationship shifts, and contains no revelation — the story's
  // structural peak is dramatically hollow. The label exists without the substance.
  if (records.length >= 6) {
    const climaxRecord = records.find(r => r.purpose === 'climax');
    if (climaxRecord !== undefined) {
      const isHollow =
        climaxRecord.emotionalShift === 'neutral' &&
        (climaxRecord.relationshipShifts ?? []).length === 0 &&
        climaxRecord.revelation === null;
      if (isHollow) {
        issues.push({
          location: `Scene ${climaxRecord.sceneIdx} (climax)`,
          rule: 'ARC_CLIMAX_VOID',
          description: `The climax scene (Scene ${climaxRecord.sceneIdx}) is emotionally neutral, has no relationship shift, and contains no revelation — the story's designated peak moment carries no dramatic weight.`,
          severity: 'major',
          suggestedFix: 'The climax must carry the maximum emotional charge of the story: a revelation that recontextualizes everything, a relationship that breaks or transforms, or a moment of profound personal cost. The peak cannot be empty.',
        });
      }
    }
  }

  // ── Wave 196: Opening void, catharsis absent, bookend identical ───────────

  // ARC_OPENING_VOID: The opening two scenes are both emotionally neutral and
  // contain no revelations. Without an emotional baseline in the opening, the arc
  // has no departure point — the audience cannot track a journey that never establishes
  // where it starts.
  if (records.length >= 6) {
    const openA = records[0];
    const openB = records[1];
    if (openA.emotionalShift === 'neutral' && openB.emotionalShift === 'neutral' &&
        openA.revelation === null && openB.revelation === null) {
      issues.push({
        location: 'Scenes 0–1 (opening)',
        rule: 'ARC_OPENING_VOID',
        description: 'The opening two scenes are emotionally neutral with no revelation — the story begins without establishing the protagonist\'s emotional baseline. The arc has no departure point to measure transformation against.',
        severity: 'minor',
        suggestedFix: 'Give the protagonist a distinct emotional state in the opening scene — joy, fear, contentment, or dread — so the arc has a clearly felt starting point. The audience must know where the character is before they can feel where they end up.',
      });
    }
  }

  // ARC_CATHARSIS_ABSENT: The story contains 2+ negative emotional scenes
  // (struggle, loss) but no scene combines positive emotional shift with a
  // revelation — the arc accumulates suffering without a cathartic insight moment.
  // Transformation requires both the positive turn and the insight that causes it.
  if (records.length >= 8) {
    const negativeCount = records.filter(r => r.emotionalShift === 'negative').length;
    if (negativeCount >= 2) {
      const hasCatharticMoment = records.some(r =>
        r.emotionalShift === 'positive' && r.revelation !== null,
      );
      if (!hasCatharticMoment) {
        issues.push({
          location: 'Character arc — catharsis',
          rule: 'ARC_CATHARSIS_ABSENT',
          description: `The story has ${negativeCount} negative emotional scenes (struggle) but no scene delivers both a positive emotional shift AND a revelation — the arc accumulates cost without a cathartic insight that transforms it`,
          severity: 'major',
          suggestedFix: 'Add a scene where the protagonist achieves clarity at the moment of emotional uplift: a revelation that arrives during or just before a positive turn. Catharsis requires insight, not just resolution.',
        });
      }
    }
  }

  // ARC_BOOKEND_IDENTICAL: The first scene and the final scene share the same
  // non-neutral emotional shift. The story returns to its emotional starting point —
  // no net transformation is registered between the opening and the closing frame.
  if (records.length >= 6) {
    const firstShiftB = records[0].emotionalShift ?? 'neutral';
    const lastShiftB = records[records.length - 1].emotionalShift ?? 'neutral';
    if (firstShiftB !== 'neutral' && lastShiftB !== 'neutral' && firstShiftB === lastShiftB) {
      issues.push({
        location: `Scene 0 → Scene ${records.length - 1}`,
        rule: 'ARC_BOOKEND_IDENTICAL',
        description: `The story opens and closes with the same emotional register (${firstShiftB}) — the first and final scenes are emotionally identical. The character returns to where they started rather than arriving somewhere new.`,
        severity: 'minor',
        suggestedFix: 'The final scene should register a different emotional state from the opening — even if the protagonist returns to the same place physically, they must feel differently about it. The closing frame is the evidence of transformation.',
      });
    }
  }

  // ── Wave 213: Arc dynamics — multi-signal narrative physics ─────────────────────
  // Rather than counting the emotionalShift enum in isolation, these three checks
  // reason over a per-scene signal vector that fuses the emotional, relational, and
  // causal axes (see computeArcDynamics). A bare "sad" scene with no relational cost
  // and no rising threat no longer counts as genuine adversity; a relationship that
  // silently breaks DOES. This makes the checks resistant to token gaming and lets
  // them distinguish emotional conflict from relational conflict from causal motivation.
  const arcDyn213 = computeArcDynamics(records);

  // ARC_UNCONTESTED_ASCENT (minor, n≥8): the protagonist accumulates real positive
  // movement (emotional uplift and/or relational gain) while the cumulative adversity
  // index across BOTH the emotional and relational axes stays near zero. The journey
  // is an unbroken rise that is never meaningfully contested on any dramatic axis.
  if (records.length >= 8) {
    const totalTriumph213 = arcDyn213.reduce((acc, d) => acc + d.triumph, 0);
    const totalAdversity213 = arcDyn213.reduce((acc, d) => acc + d.adversity, 0);
    const triumphScenes213 = arcDyn213.filter(d => d.triumph > 0).length;
    if (triumphScenes213 >= 3 && totalTriumph213 >= 3 && totalAdversity213 < 0.5) {
      issues.push({
        location: 'Full story',
        rule: 'ARC_UNCONTESTED_ASCENT',
        severity: 'minor',
        description: `The protagonist's arc registers ${totalTriumph213.toFixed(1)} units of positive movement (across ${triumphScenes213} scenes) but only ${totalAdversity213.toFixed(1)} units of adversity across the emotional AND relational axes combined — no setback, no relational loss, no genuine cost. The journey is an unbroken ascent that is never dramatically contested.`,
        suggestedFix: 'Introduce real opposition along at least one axis: a scene of emotional defeat, OR a relationship that deteriorates (a negative SHIFT_RELATIONSHIP), OR a mounting clock that threatens the gains. Contrast is what gives the eventual triumph its weight — an uncontested rise reads as wish-fulfilment, not transformation.',
      });
    }
  }

  // ARC_LATE_TURN_UNSUPPORTED (major, n≥8): a final-act positive turn whose emotional
  // SWING (the climb from the local trough in the preceding window) is significant, yet
  // no proportionate CATALYST appears in the support window. A catalyst is any genuine
  // causal force — a revelation, a payoff firing, a major relationship shift (|amount|≥0.3),
  // or a suspense resolution (suspenseDelta<0). A big turn with a trivial cause is the defect,
  // not merely an absent revelation. Guard: prior adversity must exist so the turn is a real
  // reversal rather than the story's only emotional note.
  if (records.length >= 8) {
    const finalStart213 = Math.floor(records.length * 0.75);
    const hasPriorAdversity213 = arcDyn213.slice(0, finalStart213).some(d => d.adversity > 0);
    if (hasPriorAdversity213) {
      for (let i213 = finalStart213; i213 < records.length; i213++) {
        if (arcDyn213[i213].state <= 0) continue; // only positive emotional turns
        const troughStart213 = Math.max(0, i213 - 3);
        const priorTrough213 = Math.min(...arcDyn213.slice(troughStart213, i213).map(d => d.state));
        const swing213 = arcDyn213[i213].state - priorTrough213;
        const support213 = Math.max(...arcDyn213.slice(Math.max(0, i213 - 2), i213 + 1).map(d => d.catalyst));
        if (swing213 >= 1 && support213 === 0) {
          issues.push({
            location: `Scene ${i213}`,
            rule: 'ARC_LATE_TURN_UNSUPPORTED',
            severity: 'major',
            description: `Scene ${i213} delivers a positive emotional turn with a swing of ${swing213} (climbing from a trough of ${priorTrough213}), but the support window carries zero causal catalyst — no revelation, no payoff, no major relationship shift, and no suspense resolution motivates the change. The protagonist transforms without cause.`,
            suggestedFix: 'Motivate the turn with a real catalyst in the two scenes before it: a discovered truth (revelation), a planted setup paying off, a relationship decisively shifting (|amount| ≥ 0.3), or a clock/threat resolving. The magnitude of the emotional swing must be matched by the magnitude of its cause.',
          });
          break;
        }
      }
    }
  }

  // ARC_MIDPOINT_INERT (minor, n≥10): the structural midpoint (40%–60%) is classically
  // the point of maximum emotional VELOCITY — the great reversal or the great commitment.
  // This fires when emotional velocity (the absolute scene-to-scene change in emotional
  // state) flatlines through the midpoint while act 2 carries velocity on either side.
  // Unlike a naive "all neutral" check, a midpoint that holds a CONSTANT non-neutral tone
  // (e.g. uniformly positive — no turn) still reads as inert, and this catches it.
  if (records.length >= 10) {
    const midStart213 = Math.floor(records.length * 0.4);
    const midEnd213 = Math.floor(records.length * 0.6);
    const act2Start213 = Math.floor(records.length * 0.25);
    const act2End213 = Math.floor(records.length * 0.75);
    const velocity213 = arcDyn213.map((d, i) => i === 0 ? 0 : Math.abs(d.state - arcDyn213[i - 1].state));
    const midVelocity213 = velocity213.slice(midStart213, midEnd213).reduce((a, v) => a + v, 0);
    const act2OutsideVelocity213 =
      velocity213.slice(act2Start213, midStart213).reduce((a, v) => a + v, 0) +
      velocity213.slice(midEnd213, act2End213).reduce((a, v) => a + v, 0);
    const midZoneLen213 = midEnd213 - midStart213;
    if (midZoneLen213 >= 2 && act2OutsideVelocity213 > 0 && midVelocity213 === 0) {
      issues.push({
        location: `Scenes ${midStart213}–${midEnd213 - 1}`,
        rule: 'ARC_MIDPOINT_INERT',
        severity: 'minor',
        description: `The midpoint zone (scenes ${midStart213}–${midEnd213 - 1}) registers zero emotional velocity — the emotional state never turns — while act 2 on either side carries ${act2OutsideVelocity213} units of movement. The structural centre of the story, where the great reversal belongs, is dramatically static.`,
        suggestedFix: 'Engineer a true turn at the midpoint: drive the emotional state in one direction and then reverse it, or commit the protagonist irrevocably so the register flips. The midpoint must be the pivot of the arc, not a plateau — a held tone, even a positive one, is still a flat line through the story\'s spine.',
      });
    }
  }
  // ── End Wave 213 ──────────────────────────────────────────────────────────────

  // ── Wave 228: Protagonist social invulnerability, midpoint relational void, final-act stasis ──

  // ARC_PROTAGONIST_UNTESTED_SOCIALLY (minor, n≥8): The protagonist (highest
  // fountain cue count) participates in ≥2 relationship shifts but every single
  // one is positive — they gain socially without ever paying a relational cost.
  // No betrayal, no estrangement, no alliance lost across the whole story.
  if (records.length >= 8) {
    const cueCounts228 = new Map<string, number>();
    for (const line228 of fountain.split('\n')) {
      const t228 = line228.trim();
      if (/^[A-Z][A-Z0-9\s\-'\.]{2,}$/.test(t228) &&
          !/^(INT\.|EXT\.|CUT TO|FADE|SMASH|THE END|ACT|MIDPOINT|SCENE)/i.test(t228)) {
        const charName228 = t228.replace(/\s*\(.*?\)\s*$/, '').toLowerCase().trim();
        if (charName228 !== 'narrator' && charName228 !== 'v.o.' && charName228 !== 'o.s.') {
          cueCounts228.set(charName228, (cueCounts228.get(charName228) ?? 0) + 1);
        }
      }
    }
    const protagonist228 = [...cueCounts228.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (protagonist228 !== undefined) {
      const protRelShifts228 = records.flatMap(r =>
        (r.relationshipShifts ?? []).filter((s: any) =>
          s.pairKey.toLowerCase().split('|').includes(protagonist228),
        ),
      );
      if (protRelShifts228.length >= 2 && protRelShifts228.every((s: any) => s.amount > 0)) {
        issues.push({
          location: `Character: ${protagonist228.toUpperCase()}`,
          rule: 'ARC_PROTAGONIST_UNTESTED_SOCIALLY',
          severity: 'minor',
          description: `The protagonist (${protagonist228.toUpperCase()}) participates in ${protRelShifts228.length} relationship shifts but every one is positive — they gain socially without ever paying a relational cost. No betrayal, no estrangement, no alliance lost. The character's social arc is an unbroken rise.`,
          suggestedFix: 'Give the protagonist at least one negative relationship shift: a trusted ally who withdraws support, a bond that fractures under pressure, or a connection that costs them something real. Relational loss is what makes the eventual gains meaningful.',
        });
      }
    }
  }

  // ARC_MIDPOINT_RELATIONAL_VOID (major, n≥10): The structural midpoint zone
  // (40%–60%) contains no relationship shifts and no revelations. The fulcrum
  // where arcs must reverse is empty of character dynamics. Distinct from
  // ARC_MIDPOINT_INERT (which checks emotional velocity) — this fires when the
  // relational and revelation axes are both flat, so the midpoint has no
  // interpersonal event to pivot on.
  if (records.length >= 10) {
    const midStart228 = Math.floor(records.length * 0.4);
    const midEnd228 = Math.floor(records.length * 0.6);
    const midRecords228 = records.slice(midStart228, midEnd228);
    if (midRecords228.length >= 2) {
      const hasMidRelOrRev228 = midRecords228.some((r: any) =>
        (r.relationshipShifts ?? []).length > 0 || r.revelation !== null,
      );
      if (!hasMidRelOrRev228) {
        issues.push({
          location: `Midpoint zone (Scenes ${midStart228}–${midEnd228 - 1})`,
          rule: 'ARC_MIDPOINT_RELATIONAL_VOID',
          severity: 'major',
          description: `Scenes ${midStart228}–${midEnd228 - 1} (the structural midpoint, 40%–60%) contain no relationship shifts and no revelations. The story's fulcrum — where arcs must reverse — is empty of interpersonal events. Nothing changes between characters at the moment the story needs its central pivot.`,
          suggestedFix: 'Plant a relationship-altering event or revelation in the midpoint zone: a disclosure that shifts an alliance, a secret exposed, or a relationship that decisively changes direction. The midpoint must carry the weight of the story\'s central dramatic reversal.',
        });
      }
    }
  }

  // ARC_FINAL_ACT_CHARACTER_STATIC (major, n≥8): Act 3 (final 25%) has ≥3
  // scenes but contains zero relationship shifts. The resolution phase ends
  // without any relational conclusion — characters leave the story in the same
  // relational positions they entered Act 3. The arc does not close; it stops.
  if (records.length >= 8) {
    const act3Start228 = Math.floor(records.length * 0.75);
    const act3Records228 = records.slice(act3Start228);
    if (act3Records228.length >= 3) {
      const hasAct3RelShift228 = act3Records228.some((r: any) =>
        (r.relationshipShifts ?? []).length > 0,
      );
      if (!hasAct3RelShift228) {
        issues.push({
          location: `Act 3 (Scenes ${act3Start228}–${records.length - 1})`,
          rule: 'ARC_FINAL_ACT_CHARACTER_STATIC',
          severity: 'major',
          description: `Act 3 (scenes ${act3Start228}–${records.length - 1}, ${act3Records228.length} scenes) contains no relationship shifts — the resolution phase ends without any relational conclusion. Characters leave the story in the same relational positions they held at the start of Act 3.`,
          suggestedFix: 'The final act must contain at least one relationship shift that closes the story\'s central relational arc: a reconciliation, a final estrangement, an alliance confirmed or broken. A resolution without a relational event is hollow.',
        });
      }
    }
  }
  // ── Wave 242: Act 1 relational desert, midpoint positive absent, revelation unincorporated ──

  // ARC_ACT1_RELATIONAL_DESERT (major, n≥10, ≥2 pairs): No pair has any
  // relationship shift in Act 1 (first 25%) of the story. The setup act establishes
  // characters but not their relational world — the audience enters Act 2 with no
  // sense of who trusts, opposes, or relies on whom. The interpersonal landscape
  // is defined by what characters DO to each other; an Act 1 with no relational
  // events is a collection of individuals, not a cast.
  {
    const allPairs242 = new Set<string>();
    for (const r of records) for (const s of (r.relationshipShifts ?? [])) allPairs242.add((s as any).pairKey);
    if (records.length >= 10 && allPairs242.size >= 2) {
    const act1End242 = Math.floor(records.length * 0.25);
    const hasAct1Shift242 = records.slice(0, act1End242).some(r =>
      (r.relationshipShifts ?? []).length > 0,
    );
    if (!hasAct1Shift242) {
      issues.push({
        location: `Act 1 (Scenes 0–${act1End242 - 1}) — relational layer`,
        rule: 'ARC_ACT1_RELATIONAL_DESERT',
        severity: 'major',
        description: `Act 1 (the first ${act1End242} scenes) contains no relationship shifts — the setup establishes characters but leaves the relational world blank. The audience enters Act 2 with no established bonds, rivalries, or trust patterns to invest in.`,
        suggestedFix: 'Plant at least one relationship shift in Act 1: a gesture of trust, a moment of friction, or an alliance formed under pressure. The audience invests in relationships they have seen move; characters who meet without reacting to each other are strangers throughout.',
      });
    }
  }
  }

  // ARC_POSITIVE_MIDPOINT_ABSENT (minor, n≥10): The midpoint zone (40%–60%)
  // contains no positive relationship shift. All midpoint relational movement is
  // negative or absent — the structural pivot carries only downward pressure.
  // The midpoint is the story's fulcrum; a fulcrum with no positive energy means
  // no "false dawn" — no moment of hope before the Act 2b collapse. The tonal arc
  // becomes simply "bad, then worse, then resolution" with no emotional contrast
  // at the structural centre.
  if (records.length >= 10) {
    const midStart242 = Math.floor(records.length * 0.4);
    const midEnd242 = Math.floor(records.length * 0.6);
    const midRecords242 = records.slice(midStart242, midEnd242);
    if (midRecords242.length >= 2) {
      const hasMidPosShift242 = midRecords242.some(r =>
        (r.relationshipShifts ?? []).some((s: any) => s.amount > 0),
      );
      if (!hasMidPosShift242) {
        issues.push({
          location: `Midpoint zone (Scenes ${midStart242}–${midEnd242 - 1})`,
          rule: 'ARC_POSITIVE_MIDPOINT_ABSENT',
          severity: 'minor',
          description: `The midpoint zone (Scenes ${midStart242}–${midEnd242 - 1}) contains no positive relationship shift — the structural pivot carries only negative or absent relational movement. Without a "false dawn" at the midpoint, the story has no emotional contrast at its centre: just a continuous descent from Act 1 into Act 3.`,
          suggestedFix: "Add a positive relational beat at the midpoint: a trust restored, a new alliance forming, an unexpected warmth between adversaries. Even a small positive shift at the fulcrum creates the 'peak before the collapse' that gives Act 2b its emotional weight.",
        });
      }
    }
  }

  // ARC_REVELATION_UNINCORPORATED (minor, n≥8, ≥2 revelations): Two or more
  // witnessed revelations occur but none of them is followed by a relationship
  // shift in the same scene or within 2 scenes. Characters discover truths that
  // don't change their relationships — personal revelations leave no interpersonal
  // trace. Discovery without consequence is characterologically inert: if what the
  // protagonist learns doesn't affect who they trust or fear or love, why does it
  // matter to the story's relational arc?
  if (records.length >= 8) {
    const revRecs242 = records.filter(r => r.revelation !== null);
    if (revRecs242.length >= 2) {
      const allRevsUnincorporated242 = revRecs242.every(revR => {
        const revIdx242 = records.indexOf(revR);
        for (let k = revIdx242; k <= Math.min(revIdx242 + 2, records.length - 1); k++) {
          if ((records[k].relationshipShifts ?? []).length > 0) return false;
        }
        return true;
      });
      if (allRevsUnincorporated242) {
        issues.push({
          location: 'Revelation → relational consequence',
          rule: 'ARC_REVELATION_UNINCORPORATED',
          severity: 'minor',
          description: `${revRecs242.length} witnessed revelations occur but none is followed by a relationship shift within 2 scenes — personal discoveries leave no interpersonal trace. What characters learn doesn't change who they trust, fear, or love.`,
          suggestedFix: "After each revelation, show its relational consequence: the trust that breaks, the alliance that shifts, the estrangement that crystallises. A discovery that doesn't alter any relationship is characterologically inert — it's information the protagonist carries but never acts on.",
        });
      }
    }
  }
  // ── End Wave 242 ─────────────────────────────────────────────────────────────

  // ── End Wave 228 ─────────────────────────────────────────────────────────────

  // ── Wave 256: Relational dimension monotony, emotional flatline, negative-only arc ──

  // ARC_SINGLE_DIMENSION (minor, n≥6, ≥4 shifts): Every relationship shift across
  // the story moves on the same single dimension (e.g. only 'trust', never 'power'
  // or 'intimacy'). Relationships are multi-dimensional — people gain power as they
  // lose intimacy, earn trust while ceding control. A cast whose bonds only ever
  // move on one axis is relationally thin: the same note struck again and again
  // instead of a chord. Requires 4+ total shifts carrying a dimension field.
  if (records.length >= 6) {
    const dimensions256 = new Set<string>();
    let shiftCount256 = 0;
    for (const r of records) {
      for (const s of (r.relationshipShifts ?? []) as Array<{ dimension?: string }>) {
        shiftCount256++;
        if (s.dimension) dimensions256.add(s.dimension);
      }
    }
    if (shiftCount256 >= 4 && dimensions256.size === 1) {
      const [onlyDim256] = dimensions256;
      issues.push({
        location: 'Relational dimension coverage',
        rule: 'ARC_SINGLE_DIMENSION',
        severity: 'minor',
        description: `All ${shiftCount256} relationship shifts in the story move on a single dimension ("${onlyDim256}") — the relational world only ever changes along one axis. Relationships are multi-dimensional: trust, power, and intimacy move independently and often in opposition. A cast that only shifts on one note reads as relationally flat.`,
        suggestedFix: `Vary the relational dimensions: let one pair gain power while losing intimacy, another earn trust while ceding control. A relationship that moves on multiple axes at once — closer but more wary, allied but resentful — is what makes a cast feel three-dimensional.`,
      });
    }
  }

  // ARC_EMOTIONAL_FLATLINE (major, n≥8): 80% or more of all scenes carry a neutral
  // emotionalShift — the story has almost no emotional texture. Characters move
  // through events without registering feeling, so the audience has nothing to feel
  // alongside them. Distinct from FLAT_CHARACTER_ARC (same opening/closing tone) and
  // arc monotone (a non-neutral state that never varies); this catches the absence
  // of emotional signal altogether — a story told in affectless reportage.
  if (records.length >= 8) {
    const neutralCount256 = records.filter(r => r.emotionalShift === 'neutral').length;
    const neutralRatio256 = neutralCount256 / records.length;
    if (neutralRatio256 >= 0.8) {
      issues.push({
        location: 'Emotional texture',
        rule: 'ARC_EMOTIONAL_FLATLINE',
        severity: 'major',
        description: `${neutralCount256} of ${records.length} scenes (${Math.round(neutralRatio256 * 100)}%) carry a neutral emotional tone — the story has almost no emotional texture. Characters pass through events without registering feeling, so the audience is given nothing to feel with them. The narrative reads as affectless reportage rather than lived experience.`,
        suggestedFix: 'Inject emotional shifts across the arc: let scenes land as victories, losses, fears, or relief. Every significant beat should leave a character (and the audience) feeling something — a story with no emotional signal is a sequence of events, not a drama.',
      });
    }
  }

  // ARC_NEGATIVE_ONLY (minor, n≥8, ≥3 non-neutral scenes): Every non-neutral
  // emotional beat in the story is negative — there is not a single positive scene
  // anywhere. Unrelieved downward emotion gives the audience no contrast and nothing
  // to lose: despair only lands against the memory of hope. A story pitched entirely
  // in the minor key flattens into monotone bleakness. Distinct from ARC_POSITIVE_
  // MIDPOINT_ABSENT (relational, midpoint-only); this is the emotional arc end-to-end.
  if (records.length >= 8) {
    const nonNeutral256 = records.filter(r => r.emotionalShift !== 'neutral');
    if (nonNeutral256.length >= 3 && nonNeutral256.every(r => r.emotionalShift === 'negative')) {
      issues.push({
        location: 'Emotional arc polarity',
        rule: 'ARC_NEGATIVE_ONLY',
        severity: 'minor',
        description: `All ${nonNeutral256.length} emotionally charged scenes in the story are negative — there is not a single positive beat anywhere. Unrelieved downward emotion gives the audience no contrast: despair only registers against the memory of hope, and a story told entirely in the minor key flattens into monotone bleakness.`,
        suggestedFix: 'Plant at least one or two positive emotional beats — a small victory, a moment of connection, a flash of hope — even (especially) in a tragedy. The darkness deepens when it follows light; without contrast, relentless bleakness numbs rather than moves.',
      });
    }
  }

  // ── Wave 270: ARC_POSITIVE_ONLY ───────────────────────────────────────────
  // Every non-neutral emotional beat in the story is positive — there is not
  // a single negative scene anywhere. The mirror of ARC_NEGATIVE_ONLY: a story
  // told entirely in the major key has no stakes. When nothing goes wrong, the
  // audience has nothing to fear for; when every beat is a victory, there is no
  // cost to the protagonist and the final triumph carries no weight.
  // Requires 8+ records and 3+ non-neutral scenes.
  if (records.length >= 8) {
    const nonNeutral270 = records.filter(r => r.emotionalShift !== 'neutral');
    if (nonNeutral270.length >= 3 && nonNeutral270.every(r => r.emotionalShift === 'positive')) {
      issues.push({
        location: 'Emotional arc polarity',
        rule: 'ARC_POSITIVE_ONLY',
        severity: 'minor',
        description: `All ${nonNeutral270.length} emotionally charged scenes in the story are positive — there is not a single negative beat. A story told entirely in the major key has no stakes: without setbacks, the protagonist's successes are inevitable, and the final triumph carries no emotional weight because nothing was ever lost or risked.`,
        suggestedFix: 'Plant at least one or two negative emotional beats — a setback, a loss, a moment of genuine failure or despair — even in a comedy. Positive beats land harder when they follow darkness; unbroken positivity reads as conflict-free fantasy rather than earned resolution.',
      });
    }
  }

  // ── Wave 270: ARC_SHIFT_CONCENTRATION ─────────────────────────────────────
  // Three or more scenes with relationship shifts all cluster within a 3-scene
  // window (max scene index − min scene index ≤ 2). All relational movement
  // is packed into one concentrated burst rather than distributed across the
  // arc. Relationships develop gradually — trust erodes over time, power
  // accumulates scene by scene; cramming all relational change into a single
  // stretch compresses what should be a gradual arc into a sudden event.
  // Requires 8+ records and 3+ distinct scenes with shifts.
  if (records.length >= 8) {
    const shiftScenes270 = new Set<number>();
    for (const r of records) {
      if ((r.relationshipShifts as any[] ?? []).length > 0) shiftScenes270.add(r.sceneIdx as number);
    }
    if (shiftScenes270.size >= 3) {
      const shiftIdxList270 = [...shiftScenes270].sort((a, b) => a - b);
      const span270 = shiftIdxList270[shiftIdxList270.length - 1] - shiftIdxList270[0];
      if (span270 <= 2) {
        issues.push({
          location: `Scenes ${shiftIdxList270.join(', ')} — relational concentration`,
          rule: 'ARC_SHIFT_CONCENTRATION',
          severity: 'minor',
          description: `All ${shiftScenes270.size} scenes with relationship shifts are packed within a ${span270 + 1}-scene window (scenes ${shiftIdxList270.join(', ')}). Every relational change the story makes happens in a single concentrated burst — trust, power, and intimacy that should shift gradually across the arc are compressed into one stretch, reading as sudden event rather than organic development.`,
          suggestedFix: 'Distribute relationship shifts across the full arc. Let early scenes establish the baseline, mid-story scenes strain the relationship, and late scenes either repair or break it permanently. Relational change that accumulates over time reads as earned; concentrated change reads as contrived.',
        });
      }
    }
  }

  // ── Wave 270: ARC_LATE_RELATIONAL_VOID ────────────────────────────────────
  // The story has 3+ total relationship shifts but none occur in the final
  // quarter of the arc. The climax — where relational stakes should peak —
  // has no relational movement at all. Characters enter the final act with
  // fully settled relationships and the resolution has no relational cost.
  // Distinct from ARC_MIDPOINT_RELATIONAL_VOID (midpoint-specific); this
  // flags the final act specifically.
  // Requires 8+ records and 3+ total relationship shifts.
  if (records.length >= 8) {
    const totalShifts270 = (records as any[]).reduce((acc, r) => acc + ((r.relationshipShifts as any[] ?? []).length), 0);
    if (totalShifts270 >= 3) {
      const finalActStart270 = Math.floor(records.length * 0.75);
      const lateShiftScenes270 = (records as any[]).filter(r => r.sceneIdx >= finalActStart270 && (r.relationshipShifts as any[] ?? []).length > 0);
      if (lateShiftScenes270.length === 0) {
        issues.push({
          location: `Final quarter (scene ${finalActStart270}+) — relational void`,
          rule: 'ARC_LATE_RELATIONAL_VOID',
          severity: 'minor',
          description: `${totalShifts270} relationship shifts occur across the story but none appear in the final quarter (scene ${finalActStart270}+). The climax has no relational movement — characters enter the resolution with fully settled bonds and the outcome costs nothing relationally. The final act confirms rather than completes the character arc.`,
          suggestedFix: 'Add at least one relationship shift in the final act: a reconciliation, a definitive break, an unexpected alliance. The climax should change at least one relationship permanently — the audience needs to see the relational cost or reward of everything that came before it.',
        });
      }
    }
  }

  // ── Wave 284: ARC_EMOTIONAL_RESOLUTION_ABSENT ────────────────────────────
  // The story has positive emotional shift scenes but none appear in the
  // final quarter. The arc escalates through the story but never resolves
  // upward — the climax and resolution have no emotional lift. Even a
  // tragedy benefits from a moment of positive emotional shift at the
  // climax (recognition, acceptance, brief triumph) before the ending.
  // Requires 8+ records and 2+ positive-shift scenes anywhere in the story.
  if (records.length >= 8) {
    const posShiftScenes284 = (records as any[]).filter(r => r.emotionalShift === 'positive');
    if (posShiftScenes284.length >= 2) {
      const finalStart284 = Math.floor(records.length * 0.75);
      const finalPosScenes284 = posShiftScenes284.filter(r => r.sceneIdx >= finalStart284);
      if (finalPosScenes284.length === 0) {
        issues.push({
          location: `Final quarter (scene ${finalStart284}+) — no positive emotional shift`,
          rule: 'ARC_EMOTIONAL_RESOLUTION_ABSENT',
          severity: 'minor',
          description: `${posShiftScenes284.length} positive emotional shift scene(s) exist across the story but none occur in the final quarter (scene ${finalStart284}+). The arc never resolves upward — characters enter the climax with established positive capacity but the resolution denies any positive beat. Even in a tragedy, one moment of recognition, relief, or acceptance gives the ending its emotional weight.`,
          suggestedFix: 'Add at least one positive emotional shift in the final quarter — a brief triumph before the fall, a moment of clarity, a reconciliation, or a character accepting their fate with grace. Emotional resolution does not mean a happy ending; it means the arc completes rather than trailing off.',
        });
      }
    }
  }

  // ── Wave 284: ARC_REVELATION_LATE_CLUSTER ────────────────────────────────
  // More than 60% of all revelations occur in the final 25% of the story.
  // Information is withheld until the climax and then dumped in an
  // exposition avalanche. This is the opposite of seeding — rather than
  // planting clues and paying them off, the story hoards all revelations
  // for a single information flood at the end. Requires 8+ records and
  // 3+ total revelations.
  if (records.length >= 8) {
    const revScenes284 = (records as any[]).filter(r => r.revelation !== null);
    if (revScenes284.length >= 3) {
      const finalStart284b = Math.floor(records.length * 0.75);
      const lateRevScenes284 = revScenes284.filter(r => r.sceneIdx >= finalStart284b);
      if (lateRevScenes284.length / revScenes284.length > 0.60) {
        issues.push({
          location: `Final quarter (scene ${finalStart284b}+) — revelation cluster`,
          rule: 'ARC_REVELATION_LATE_CLUSTER',
          severity: 'minor',
          description: `${lateRevScenes284.length} of ${revScenes284.length} revelation(s) (${Math.round(lateRevScenes284.length / revScenes284.length * 100)}%) occur in the final quarter. Revelations should be seeded throughout the arc to build accumulating understanding; clustering them at the end creates an information avalanche and flattens the earlier acts' dramatic stakes.`,
          suggestedFix: 'Redistribute revelations across the story: plant the first revelation in Act 1 to hook the audience, escalate with a major revelation at the midpoint, and reserve only the final revelation for the climax. Each revelation should raise new questions, not just answer old ones.',
        });
      }
    }
  }

  // ── Wave 284: ARC_CURIOSITY_PLATEAU ──────────────────────────────────────
  // Average curiosityDelta in Act 2b (50–75%) is ≤ 0, meaning audience
  // curiosity stagnates or actively drops during the second half of Act 2.
  // Act 2b should be the arc's escalation engine — curiosity should peak
  // here as the protagonist approaches the climax. A plateau or descent
  // means the story loses dramatic momentum exactly when it needs to gain
  // it. Requires 10+ records and 3+ scenes in the Act 2b window.
  if (records.length >= 10) {
    const act2bStart284 = Math.floor(records.length * 0.50);
    const act2bEnd284 = Math.floor(records.length * 0.75);
    const act2bRecs284 = (records as any[]).slice(act2bStart284, act2bEnd284);
    if (act2bRecs284.length >= 3) {
      const avgCuriosity284 = act2bRecs284.reduce((acc: number, r: any) => acc + (r.curiosityDelta ?? 0), 0) / act2bRecs284.length;
      if (avgCuriosity284 <= 0) {
        issues.push({
          location: `Act 2b (scenes ${act2bStart284}–${act2bEnd284}) — curiosity plateau`,
          rule: 'ARC_CURIOSITY_PLATEAU',
          severity: 'minor',
          description: `Average curiosityDelta across Act 2b (scenes ${act2bStart284}–${act2bEnd284}) is ${avgCuriosity284.toFixed(2)} — audience curiosity stagnates or falls during the arc's escalation window. Act 2b should be the engine that drives the audience toward the climax; a plateau or descent here causes dramatic momentum to collapse before the finale.`,
          suggestedFix: 'Escalate mystery and stakes in Act 2b: introduce new complications, deepen unanswered questions, and raise the cost of failure. Each scene in this window should leave the audience more uncertain about the outcome than the scene before it.',
        });
      }
    }
  }

  // ── Wave 298: ARC_DRAMATIC_TURN_MONOTONE ─────────────────────────────────
  // The story contains 3+ dramatic turns and every one of them is the same
  // type (all reversals, all revelations, etc.). A character arc built from
  // a single kind of turn has one move it keeps repeating — the audience
  // learns the pattern and pre-empts every pivot. Requires 8+ records and
  // 3+ scenes with a dramatic turn.
  if (records.length >= 8) {
    const turnScenes298 = (records as any[]).filter(r => (r.dramaticTurn ?? 'nothing') !== 'nothing');
    if (turnScenes298.length >= 3) {
      const turnTypes298 = new Set(turnScenes298.map(r => r.dramaticTurn));
      if (turnTypes298.size === 1) {
        const [onlyTurn298] = turnTypes298;
        issues.push({
          location: 'Dramatic turns throughout',
          rule: 'ARC_DRAMATIC_TURN_MONOTONE',
          severity: 'minor',
          description: `All ${turnScenes298.length} dramatic turns in the story are the same type ("${onlyTurn298}"). An arc that pivots the same way every time has one move it keeps repeating — by the second occurrence the audience recognizes the pattern, and by the third they pre-empt it. Turn variety is what keeps an arc unpredictable.`,
          suggestedFix: `Vary the turn types: if every turn is a "${onlyTurn298}", convert at least one into a different kind of pivot — a revelation instead of a reversal, a choice instead of a discovery, an escalation instead of a collapse. Each type of turn exercises a different audience muscle; using only one exhausts it.`,
        });
      }
    }
  }

  // ── Wave 298: ARC_SUSPENSE_EMOTION_DECOUPLED ─────────────────────────────
  // Three or more high-suspense scenes (suspenseDelta > 1.5) all carry a
  // neutral emotional shift — tension peaks but the protagonist is never
  // emotionally touched by it. Suspense the character doesn't feel is
  // spectacle, not drama. Distinct from CLIMAX_EMOTIONALLY_FLAT (single
  // climax-scene audit): this checks the correlation across the whole story's
  // high-tension scenes. Requires 8+ records.
  if (records.length >= 8) {
    const highSusp298 = (records as any[]).filter(r => (r.suspenseDelta ?? 0) > 1.5);
    if (highSusp298.length >= 3 && highSusp298.every(r => r.emotionalShift === 'neutral')) {
      issues.push({
        location: 'High-suspense scenes',
        rule: 'ARC_SUSPENSE_EMOTION_DECOUPLED',
        severity: 'minor',
        description: `All ${highSusp298.length} high-suspense scenes (suspenseDelta > 1.5) carry a neutral emotional shift — tension spikes but never registers on the protagonist. Suspense the character does not feel is spectacle: the audience watches danger without watching anyone be changed by it. Tension becomes drama only when it costs or moves someone.`,
        suggestedFix: 'Let high-tension scenes mark the protagonist emotionally: fear that curdles into a negative shift, survival that releases into a positive one. At minimum, the most suspenseful scene in the story should also move the character — if the bomb under the table changes nothing about how anyone feels, it might as well not be there.',
      });
    }
  }

  // ── Wave 298: ARC_GRIEF_SKIPPED ──────────────────────────────────────────
  // Every negative emotional shift (3+ of them) is immediately followed by a
  // positive shift in the very next scene — losses never get a scene to land
  // before being cancelled. Distinct from EMOTIONAL_WHIPLASH (which requires
  // a contiguous run of alternations): this fires even when the instant
  // recoveries are scattered across the story with neutral scenes between
  // the pairs. Requires 8+ records.
  if (records.length >= 8) {
    const negIdxs298: number[] = [];
    for (let i298 = 0; i298 < records.length - 1; i298++) {
      if ((records as any[])[i298].emotionalShift === 'negative') negIdxs298.push(i298);
    }
    if (negIdxs298.length >= 3) {
      const allInstantlyRecovered298 = negIdxs298.every(
        i298 => (records as any[])[i298 + 1].emotionalShift === 'positive',
      );
      if (allInstantlyRecovered298) {
        issues.push({
          location: 'Negative emotional shifts throughout',
          rule: 'ARC_GRIEF_SKIPPED',
          severity: 'minor',
          description: `All ${negIdxs298.length} negative emotional shifts are cancelled by a positive shift in the very next scene — no loss is ever given a scene to land. When every wound heals immediately, the audience learns that setbacks are weightless: nothing bad will be allowed to matter for more than one scene. Grief skipped is stakes erased.`,
          suggestedFix: 'After at least one significant loss, hold the negative register for a scene or two before any recovery: show the character living inside the consequence — withdrawn, lashing out, going through the motions. The depth of a low is what gives the eventual rise its height; instant recovery flattens both.',
        });
      }
    }
  }

  // ── Wave 312: ARC_FIRST_HALF_EMOTIONALLY_FLAT ────────────────────────────
  // Every scene in the first half (0–50%) is emotionally neutral, while the
  // second half carries at least two non-neutral beats. The character's
  // emotional arc does not begin until the back half — the entire setup and
  // first complication zone play out at a single flat pitch. Distinct from
  // ARC_STALL_IN_ACT2 (the 25–75% band specifically), ARC_OPENING_VOID (first
  // two scenes), and ARC_EMOTIONAL_FLATLINE/MONOTONE (whole-story neutrality):
  // this targets a flat front half that an active back half then contradicts.
  // Requires 10+ records with a 5+ scene first half.
  if (records.length >= 10) {
    const halfIdx312 = Math.floor(records.length * 0.5);
    const firstHalf312 = (records as any[]).slice(0, halfIdx312);
    const secondHalf312 = (records as any[]).slice(halfIdx312);
    if (firstHalf312.length >= 5) {
      const firstHalfFlat312 = firstHalf312.every(r => r.emotionalShift === 'neutral');
      const secondHalfCharged312 = secondHalf312.filter(r => r.emotionalShift !== 'neutral').length;
      if (firstHalfFlat312 && secondHalfCharged312 >= 2) {
        issues.push({
          location: `First half (Scenes 0–${halfIdx312 - 1}) — emotionally flat`,
          rule: 'ARC_FIRST_HALF_EMOTIONALLY_FLAT',
          severity: 'minor',
          description: `Every scene in the first half (0–${halfIdx312 - 1}) is emotionally neutral, while the second half carries ${secondHalfCharged312} charged beats — the character's emotional arc does not begin until the back half. The entire setup and early complication zone play out at one flat pitch, so the audience spends half the story with no emotional read on the protagonist.`,
          suggestedFix: 'Seed emotional movement in the first half: a loss, a hope, a fear, a small win that establishes the protagonist\'s emotional baseline and starts the arc early. A character the audience cannot feel for in the first half is one they have no reason to follow into the second.',
        });
      }
    }
  }

  // ── Wave 312: ARC_TURN_EMOTION_ABSENT ────────────────────────────────────
  // Two or more dramatic-turn scenes occur and every one of them is emotionally
  // neutral — the protagonist pivots without feeling the pivot. A dramatic turn
  // is a hinge in the character's journey; if it registers no emotional shift,
  // the turn is plot machinery the character merely processes. Distinct from
  // ARC_SUSPENSE_EMOTION_DECOUPLED (high-suspense scenes), ARC_DRAMATIC_TURN_
  // MONOTONE (turn-type sameness), and causality's DRAMATIC_TURN_AFTERMATH_VOID
  // (downstream ripple): this audits the turn scenes themselves for charge.
  // Requires 8+ records.
  if (records.length >= 8) {
    const turnScenes312 = (records as any[]).filter(r => (r.dramaticTurn ?? 'nothing') !== 'nothing');
    if (turnScenes312.length >= 2 && turnScenes312.every(r => r.emotionalShift === 'neutral')) {
      issues.push({
        location: 'Dramatic-turn scenes',
        rule: 'ARC_TURN_EMOTION_ABSENT',
        severity: 'minor',
        description: `All ${turnScenes312.length} dramatic-turn scenes are emotionally neutral — the protagonist pivots without feeling the pivot. A dramatic turn is a hinge in the character's journey; when it registers no emotional shift, the turn reads as plot machinery the character processes rather than a moment that changes them.`,
        suggestedFix: 'Let each turn land emotionally on the protagonist: a reversal that wounds, a revelation that frightens or frees, a choice that costs. The size of a turn is measured by how much it moves the person at its center — a turn nobody feels is a turn that did not happen.',
      });
    }
  }

  // ── Wave 312: ARC_CURIOSITY_EMOTION_DECOUPLED ────────────────────────────
  // Three or more high-curiosity scenes (curiosityDelta > 1) are all emotionally
  // neutral — the story's most intriguing moments never move the protagonist.
  // Curiosity engages the audience's head; emotion engages their heart. When the
  // story's mysteries land only as puzzles and never as feelings, the audience
  // is interested but not invested. The curiosity analogue of ARC_SUSPENSE_
  // EMOTION_DECOUPLED (which crosses suspense with emotion). Requires 8+ records.
  if (records.length >= 8) {
    const highCuriosity312 = (records as any[]).filter(r => (r.curiosityDelta ?? 0) > 1);
    if (highCuriosity312.length >= 3 && highCuriosity312.every(r => r.emotionalShift === 'neutral')) {
      issues.push({
        location: 'High-curiosity scenes',
        rule: 'ARC_CURIOSITY_EMOTION_DECOUPLED',
        severity: 'minor',
        description: `All ${highCuriosity312.length} high-curiosity scenes (curiosityDelta > 1) are emotionally neutral — the story's most intriguing moments never move the protagonist. Curiosity engages the audience's head and emotion their heart; when the mysteries land only as puzzles and never as feelings, the audience stays interested but never becomes invested.`,
        suggestedFix: 'Fuse intrigue with feeling: the scene that raises the biggest question should also stir the protagonist — dread at what the answer might be, hope that it changes everything, grief at what it implies. A mystery the character cares about is one the audience cares about.',
      });
    }
  }

  // ── Wave 337: ARC_SUSPENSE_CURIOSITY_DECOUPLED, ARC_REVELATION_EMOTION_ABSENT, ARC_REVELATION_CURIOSITY_DECOUPLED ──

  // ARC_SUSPENSE_CURIOSITY_DECOUPLED (minor, n≥8, ≥3 high-suspense scenes):
  // Three or more scenes with suspenseDelta > 1 (genuine tension peaks) all have
  // curiosityDelta ≤ 0 — the story's most dangerous moments never raise a new
  // question in the audience's mind. Tension and wonder are twin engines of
  // engagement; when tension spikes consistently without igniting curiosity,
  // the story feels like a thriller without mystery — all danger, no intrigue,
  // no "but what does this mean?" hanging in the air after each spike.
  // Distinct from ARC_SUSPENSE_EMOTION_DECOUPLED (crosses suspense with emotion,
  // not curiosity) and ARC_CURIOSITY_EMOTION_DECOUPLED (crosses curiosity with
  // emotion, not suspense).
  if (records.length >= 8) {
    const highSuspense337 = (records as any[]).filter(r => (r.suspenseDelta ?? 0) > 1);
    if (highSuspense337.length >= 3 && highSuspense337.every(r => (r.curiosityDelta ?? 0) <= 0)) {
      issues.push({
        location: 'High-suspense scenes',
        rule: 'ARC_SUSPENSE_CURIOSITY_DECOUPLED',
        severity: 'minor',
        description: `All ${highSuspense337.length} high-suspense scenes (suspenseDelta > 1) carry a curiosityDelta of zero or less — the story's tension peaks never ignite audience wonder. Danger should raise questions: "Will they survive?", "Who is behind this?", "What will they do now?" When the most alarming moments consistently fail to spawn new questions, the story delivers adrenaline without intrigue — the audience is scared, but they are not curious.`,
        suggestedFix: 'Let danger generate questions: when the stakes spike, layer in a new unknown — an unexpected face, a missing piece, a revelation that recasts everything just as the threat lands. The best suspense scenes are those where the audience is simultaneously frightened and newly desperate to know something.',
      });
    }
  }

  // ARC_REVELATION_EMOTION_ABSENT (minor, n≥8, ≥2 revelation scenes): Two or more
  // scenes carry a genuine revelation (revelation field set) and every one of them
  // is emotionally neutral — the protagonist receives information without feeling
  // it. A revelation is a character event, not just a plot event; the moment a
  // character learns something that changes the shape of their world, they should
  // be visibly changed by it. If the story's "aha moments" are emotionally flat,
  // the revelations function as data transfers rather than turning points.
  // Distinct from ARC_REVELATION_LATE_CLUSTER (timing), ARC_TURN_EMOTION_ABSENT
  // (dramaticTurn field not revelation), and belief.ts's REVELATION_DRAMA_VACUUM
  // (which additionally requires low suspense — this fires on emotion alone).
  if (records.length >= 8) {
    const revScenes337 = (records as any[]).filter(r => r.revelation !== null && r.revelation !== undefined);
    if (revScenes337.length >= 2 && revScenes337.every(r => r.emotionalShift === 'neutral')) {
      issues.push({
        location: 'Revelation scenes',
        rule: 'ARC_REVELATION_EMOTION_ABSENT',
        severity: 'minor',
        description: `All ${revScenes337.length} revelation scenes are emotionally neutral — the protagonist receives information without being visibly changed by it. A revelation is a character event: the moment a character learns something that reshapes their world, their emotional response is the story's signal to the audience that this matters. When the story's aha moments are all flat, revelations function as data transfers rather than turning points.`,
        suggestedFix: "Give the protagonist a reaction that is felt, not just processed: the revelation might bring relief, dread, grief, rage, or a terrible clarity. The size of a reveal is measured by how much it moves the person who receives it — an aha moment nobody feels is a plot mechanic, not a story beat.",
      });
    }
  }

  // ARC_REVELATION_CURIOSITY_DECOUPLED (minor, n≥8, ≥3 revelation scenes): Three
  // or more revelation scenes have an average curiosityDelta of zero or less — the
  // story's answers close questions without opening new ones. Effective revelations
  // are generative: they resolve one layer of mystery while exposing a deeper one.
  // When revelations consistently fail to raise curiosity, the story's aha moments
  // feel like a ledger being cleared rather than a live system that keeps spinning.
  // Distinct from ARC_REVELATION_EMOTION_ABSENT (emotion on revelation scenes),
  // REVELATION_WITHOUT_CURIOSITY in causality.ts (revelation with no preceding
  // high-curiosity setup — checks setup order, not the revelation's own delta),
  // and ARC_REVELATION_LATE_CLUSTER (timing of revelations).
  if (records.length >= 8) {
    const revScenes337b = (records as any[]).filter(r => r.revelation !== null && r.revelation !== undefined);
    if (revScenes337b.length >= 3) {
      const avgCuriosity337r = revScenes337b.reduce((s: number, r: any) => s + (r.curiosityDelta ?? 0), 0) / revScenes337b.length;
      if (avgCuriosity337r <= 0) {
        issues.push({
          location: `${revScenes337b.length} revelation scene(s) — avg curiosityDelta ${avgCuriosity337r.toFixed(2)}`,
          rule: 'ARC_REVELATION_CURIOSITY_DECOUPLED',
          severity: 'minor',
          description: `${revScenes337b.length} revelation scenes have an average curiosityDelta of ${avgCuriosity337r.toFixed(2)} — the story's answers consistently close questions without opening new ones. A revelation should be generative: resolving one mystery while exposing a deeper layer, so the audience leans forward even as one thread closes. When revelations drain rather than feed curiosity, the story feels like a ledger being cleared — complete, perhaps, but not alive.`,
          suggestedFix: "Design revelations as doors, not walls: each answer should expose a new unknown, reframe what the audience thought they knew, or raise the stakes of a question still open. Let the curiosityDelta on revelation scenes reflect that the audience has been sent hunting, not satisfied.",
        });
      }
    }
  }

  // ── Wave 351: ARC_SECOND_HALF_EMOTIONALLY_FLAT, ARC_EMOTIONAL_RECOVERY_ABSENT, ARC_RELATIONAL_FIRST_HALF_FLAT ──

  // ARC_SECOND_HALF_EMOTIONALLY_FLAT (minor, n≥10, second half ≥5 scenes): Every scene
  // in the second half (50%–100%) is emotionally neutral, while the first half carried at
  // least two non-neutral beats. The protagonist's emotional arc runs out of fuel exactly
  // when the stakes should be peaking — the back half plays at a single flat pitch through
  // the complication, climax, and resolution. The mirror of ARC_FIRST_HALF_EMOTIONALLY_
  // FLAT (a flat front half); distinct from ARC_FINAL_ACT_CHARACTER_STATIC (the final 25%
  // only) — this flags the entire back half going emotionally silent.
  if (records.length >= 10) {
    const halfIdx351 = Math.floor(records.length * 0.5);
    const firstHalf351 = (records as any[]).slice(0, halfIdx351);
    const secondHalf351 = (records as any[]).slice(halfIdx351);
    if (secondHalf351.length >= 5) {
      const secondHalfFlat351 = secondHalf351.every(r => r.emotionalShift === 'neutral');
      const firstHalfCharged351 = firstHalf351.filter(r => r.emotionalShift !== 'neutral').length;
      if (secondHalfFlat351 && firstHalfCharged351 >= 2) {
        issues.push({
          location: `Second half (Scenes ${halfIdx351}–${records.length - 1}) — emotionally flat`,
          rule: 'ARC_SECOND_HALF_EMOTIONALLY_FLAT',
          severity: 'minor',
          description: `Every scene in the second half (${halfIdx351}–${records.length - 1}) is emotionally neutral, while the first half carried ${firstHalfCharged351} charged beats — the protagonist's emotional arc runs out of fuel exactly when the stakes should be peaking. The complication zone, climax, and resolution all play at one flat pitch, so the audience's emotional investment built in the first half is never paid off.`,
          suggestedFix: 'Carry emotion through the back half and intensify it toward the climax: the second half is where the costs come due, so the protagonist should feel them most sharply there. A character who stops reacting at the midpoint reads as a spectator to their own ending.',
        });
      }
    }
  }

  // ARC_EMOTIONAL_RECOVERY_ABSENT (minor, n≥8, ≥2 negative shifts, positives exist): The
  // protagonist suffers two or more negative emotional beats, the story shows positive
  // emotion somewhere — but no positive beat occurs at or after the first negative one.
  // All the protagonist's joy is front-loaded before the fall, and once the descent
  // begins they never rise again. A relentless downslope with no flicker of recovery
  // exhausts the audience and removes the contrast that makes a low point land. Distinct
  // from ARC_NEGATIVE_ONLY (no positives anywhere — here positives exist, only mis-timed),
  // ARC_CATHARSIS_ABSENT (no positive+revelation combination), ARC_EMOTIONAL_RESOLUTION_
  // ABSENT (final-quarter zone), and ARC_GRIEF_SKIPPED (negatives instantly cancelled).
  if (records.length >= 8) {
    const negPositions351 = (records as any[])
      .map((r, i) => ({ r, i }))
      .filter(x => x.r.emotionalShift === 'negative');
    const positiveExists351 = (records as any[]).some(r => r.emotionalShift === 'positive');
    if (negPositions351.length >= 2 && positiveExists351) {
      const firstNegIdx351 = negPositions351[0].i;
      const positiveAfterFall351 = (records as any[]).some((r, i) => i >= firstNegIdx351 && r.emotionalShift === 'positive');
      if (!positiveAfterFall351) {
        issues.push({
          location: `Emotional recovery (first fall at Scene ${(records as any[])[firstNegIdx351].sceneIdx})`,
          rule: 'ARC_EMOTIONAL_RECOVERY_ABSENT',
          severity: 'minor',
          description: `The protagonist suffers ${negPositions351.length} negative emotional beats and the story shows positive emotion elsewhere, but no positive beat lands at or after the first fall (Scene ${(records as any[])[firstNegIdx351].sceneIdx}) — all the joy is front-loaded, and once the descent begins the character never rises again. A relentless downslope with no flicker of recovery exhausts the audience and removes the contrast that makes the lowest point land.`,
          suggestedFix: 'Give the protagonist at least one moment of recovery after the descent begins — a small win, a kindness, a flash of hope — even if it is later snatched away. The rhythm of fall-and-partial-recovery is what keeps a downward arc dramatic rather than merely grim; an unbroken slide numbs.',
        });
      }
    }
  }

  // ARC_RELATIONAL_FIRST_HALF_FLAT (minor, n≥10, first half ≥5 scenes): No scene in the
  // first half (0%–50%) carries a relationship shift, while the second half carries two or
  // more. The protagonist's relational arc does not begin until the back half — the entire
  // setup and first complication zone establish the world without ever moving a bond, so
  // the audience reaches the midpoint with no felt relationships to invest in. The first-
  // half mirror of ARC_MIDPOINT_RELATIONAL_VOID (the 40%–60% zone) and ARC_LATE_RELATIONAL_
  // VOID (the final quarter); distinct from both by targeting the front half.
  if (records.length >= 10) {
    const halfIdx351b = Math.floor(records.length * 0.5);
    const firstHalf351b = (records as any[]).slice(0, halfIdx351b);
    const secondHalf351b = (records as any[]).slice(halfIdx351b);
    if (firstHalf351b.length >= 5) {
      const firstHalfHasShift351 = firstHalf351b.some(r => ((r.relationshipShifts ?? []) as any[]).length > 0);
      const secondHalfShiftScenes351 = secondHalf351b.filter(r => ((r.relationshipShifts ?? []) as any[]).length > 0).length;
      if (!firstHalfHasShift351 && secondHalfShiftScenes351 >= 2) {
        issues.push({
          location: `First half (Scenes 0–${halfIdx351b - 1}) — relationally flat`,
          rule: 'ARC_RELATIONAL_FIRST_HALF_FLAT',
          severity: 'minor',
          description: `No scene in the first half (0–${halfIdx351b - 1}) carries a relationship shift, while the second half carries ${secondHalfShiftScenes351} — the protagonist's relational arc does not begin until the back half. The setup and first complication zone establish the world without ever moving a bond, so the audience reaches the midpoint with no felt relationships to invest in before the story starts changing them.`,
          suggestedFix: 'Move a relationship early: let a bond warm, fray, or shift in the first half so the audience has a relational stake before the midpoint. The connections the back half puts under pressure land harder when the first half has already made the audience care about them.',
        });
      }
    }
  }

  // ── Wave 365: ARC_PEAK_SUSPENSE_EMOTION_ABSENT, ARC_PEAK_CURIOSITY_EMOTION_ABSENT, ARC_RELATIONAL_SHIFT_EMOTION_FLAT ──

  // ARC_PEAK_SUSPENSE_EMOTION_ABSENT (minor, n≥8, maxSuspense>1, emotion exists
  // elsewhere): The single scene with the highest suspenseDelta carries a neutral
  // emotional shift, even though the protagonist shows emotion in at least one other
  // scene. The story's most tense moment leaves the protagonist unmoved — at the
  // peak of danger, the character feels nothing. Distinct from ARC_SUSPENSE_EMOTION_
  // DECOUPLED (which requires ALL ≥3 high-suspense scenes to be neutral; this fires
  // on the single peak even when other high-suspense scenes carry emotion).
  if (records.length >= 8) {
    const maxSuspense365 = Math.max(...(records as any[]).map(r => r.suspenseDelta ?? 0));
    const emotionExists365 = (records as any[]).some(r => r.emotionalShift !== 'neutral');
    if (maxSuspense365 > 1 && emotionExists365) {
      const peakSusp365 = (records as any[]).find(r => (r.suspenseDelta ?? 0) === maxSuspense365);
      if (peakSusp365 && peakSusp365.emotionalShift === 'neutral') {
        issues.push({
          location: `Scene ${peakSusp365.sceneIdx} — peak suspense (${maxSuspense365.toFixed(2)})`,
          rule: 'ARC_PEAK_SUSPENSE_EMOTION_ABSENT',
          severity: 'minor',
          description: `The story's highest-suspense scene (Scene ${peakSusp365.sceneIdx}, suspenseDelta ${maxSuspense365.toFixed(2)}) carries a neutral emotional shift, even though the protagonist shows emotion in other scenes. At the single most tense moment of the story, the character feels nothing — the danger spikes but never touches them, so the audience experiences the peak as plot mechanics rather than as a crisis for someone they care about.`,
          suggestedFix: "Charge the peak-suspense scene emotionally: the moment of maximum danger should be the moment the protagonist feels the most — terror, desperate resolve, the cost of what's at risk. The story's tensest scene is the worst possible place for the character to be a neutral observer.",
        });
      }
    }
  }

  // ARC_PEAK_CURIOSITY_EMOTION_ABSENT (minor, n≥8, maxCuriosity>1, emotion exists
  // elsewhere): The single scene with the highest curiosityDelta carries a neutral
  // emotional shift, even though the protagonist shows emotion in at least one other
  // scene. The story's most intriguing moment — where the audience most wants to know
  // what happens — leaves the protagonist emotionally flat. Intrigue that doesn't move
  // the character reads as a puzzle rather than a stake. Distinct from ARC_CURIOSITY_
  // EMOTION_DECOUPLED (which requires ALL ≥3 high-curiosity scenes neutral; this fires
  // on the single peak) and ARC_PEAK_SUSPENSE_EMOTION_ABSENT (suspense channel).
  if (records.length >= 8) {
    const maxCuriosity365 = Math.max(...(records as any[]).map(r => r.curiosityDelta ?? 0));
    const emotionExists365b = (records as any[]).some(r => r.emotionalShift !== 'neutral');
    if (maxCuriosity365 > 1 && emotionExists365b) {
      const peakCur365 = (records as any[]).find(r => (r.curiosityDelta ?? 0) === maxCuriosity365);
      if (peakCur365 && peakCur365.emotionalShift === 'neutral') {
        issues.push({
          location: `Scene ${peakCur365.sceneIdx} — peak curiosity (${maxCuriosity365.toFixed(2)})`,
          rule: 'ARC_PEAK_CURIOSITY_EMOTION_ABSENT',
          severity: 'minor',
          description: `The story's highest-curiosity scene (Scene ${peakCur365.sceneIdx}, curiosityDelta ${maxCuriosity365.toFixed(2)}) carries a neutral emotional shift, even though the protagonist shows emotion elsewhere. At the moment the audience is most urgently wondering what happens next, the character feels nothing — the intrigue spikes but never lands as a personal stake, so the peak plays as a puzzle to solve rather than a crisis to dread or hope through.`,
          suggestedFix: "Tie the peak-curiosity moment to the protagonist's emotional life: the question the audience is most desperate to answer should also be the one the character most fears or most hopes for. Intrigue becomes drama when the unknown threatens or promises something the protagonist feels.",
        });
      }
    }
  }

  // ARC_RELATIONAL_SHIFT_EMOTION_FLAT (minor, n≥8, ≥3 relationship-shift scenes):
  // Every scene that carries a relationship shift is emotionally neutral — the
  // protagonist's bonds move (warm, cool, fracture, repair) but they register no
  // feeling about any of it. The relational arc proceeds as a ledger of status
  // changes rather than as lived experience. Distinct from relationship-arc.ts's
  // RELATIONSHIP_RUPTURE_EMOTION_FLAT (negative shifts only) and WARMTH_UNFELT
  // (strong positive shifts only): this audits the protagonist's emotional response
  // to ALL relationship movement regardless of direction, from the character-arc side.
  if (records.length >= 8) {
    const shiftScenes365 = (records as any[]).filter(r => ((r.relationshipShifts ?? []) as any[]).length > 0);
    if (shiftScenes365.length >= 3 && shiftScenes365.every(r => r.emotionalShift === 'neutral')) {
      issues.push({
        location: `${shiftScenes365.length} relationship-shift scene(s) — emotional register`,
        rule: 'ARC_RELATIONAL_SHIFT_EMOTION_FLAT',
        severity: 'minor',
        description: `All ${shiftScenes365.length} scenes where a relationship shifts are emotionally neutral — the protagonist's bonds warm, cool, or fracture, but they register no feeling about any of it. The relational arc proceeds as a ledger of status changes rather than as lived experience, so the audience tracks who-relates-to-whom without ever feeling the weight of those connections changing on the person at the center.`,
        suggestedFix: 'Let relationship changes move the protagonist emotionally: a warming bond should bring relief or hope, a cooling one unease or grief. When every relational shift lands in a neutral scene, the bonds read as plot bookkeeping; pair them with the protagonist\'s felt reaction so the relationships matter to the audience because they matter to the character.',
      });
    }
  }

  // ── Wave 379: ARC_EMOTION_CONCENTRATION, ARC_EMOTIONAL_FRONT_LOADED, ARC_NEGATIVE_EMOTION_RUN ──

  // ARC_EMOTION_CONCENTRATION (minor, n≥10, ≥3 charged scenes): All of the protagonist's
  // non-neutral emotional beats fall within a span of ≤20% of the story, while at least
  // half of all scenes are emotionally neutral. The character's emotional life bursts in one
  // chapter and goes flat everywhere else — feeling is a localized event rather than a
  // through-line. The emotional analogue of ARC_SHIFT_CONCENTRATION (which audits relational
  // movement bunched in one burst); distinct from ARC_EMOTIONAL_FLATLINE (≥80% neutral
  // overall, no span requirement) and ARC_EMOTIONAL_FRONT_LOADED (a first-half majority, not
  // a tight span anywhere).
  if (records.length >= 10) {
    const chargedIdxs379: number[] = [];
    for (let i379 = 0; i379 < records.length; i379++) {
      if ((records as any[])[i379].emotionalShift !== 'neutral') chargedIdxs379.push(i379);
    }
    const neutralCount379 = records.length - chargedIdxs379.length;
    if (chargedIdxs379.length >= 3) {
      const span379 = chargedIdxs379[chargedIdxs379.length - 1] - chargedIdxs379[0];
      if (span379 <= Math.floor(records.length * 0.2) && neutralCount379 / records.length >= 0.5) {
        issues.push({
          location: `Emotional beats clustered in Scenes ${(records as any[])[chargedIdxs379[0]].sceneIdx}–${(records as any[])[chargedIdxs379[chargedIdxs379.length - 1]].sceneIdx}`,
          rule: 'ARC_EMOTION_CONCENTRATION',
          severity: 'minor',
          description: `All ${chargedIdxs379.length} of the protagonist's emotional beats fall within a ${span379}-scene span (≤20% of the story), while ${neutralCount379} of ${records.length} scenes are emotionally neutral. The character's emotional life bursts in a single chapter and stays flat before and after it — feeling is a localized event rather than a through-line, so the audience's investment spikes once and then has nothing to ride.`,
          suggestedFix: 'Distribute the protagonist\'s emotional beats across the whole arc: thread reactions, hopes, and wounds through the setup, the middle, and the climax so feeling builds continuously. An arc whose emotion is concentrated in one stretch leaves the rest of the story affectively inert.',
        });
      }
    }
  }

  // ARC_EMOTIONAL_FRONT_LOADED (minor, n≥10, ≥4 charged scenes): More than 70% of the
  // protagonist's non-neutral emotional beats fall in the first half of the story. The
  // character's emotional intensity peaks early and dwindles toward the climax, so the back
  // half — where the stakes should be highest — coasts on the least feeling. Distinct from
  // ARC_SECOND_HALF_EMOTIONALLY_FLAT (the binary case: the entire back half is neutral — this
  // fires even when the back half carries some emotion, as long as it is a small minority) and
  // from ARC_EMOTION_CONCENTRATION (a tight span anywhere, not a first-half majority).
  if (records.length >= 10) {
    const chargedIdxs379b: number[] = [];
    for (let i379b = 0; i379b < records.length; i379b++) {
      if ((records as any[])[i379b].emotionalShift !== 'neutral') chargedIdxs379b.push(i379b);
    }
    if (chargedIdxs379b.length >= 4) {
      const mid379 = Math.floor(records.length * 0.5);
      const firstHalf379 = chargedIdxs379b.filter(i => i < mid379).length;
      if (firstHalf379 / chargedIdxs379b.length > 0.7) {
        issues.push({
          location: `Emotional distribution — ${firstHalf379}/${chargedIdxs379b.length} beats in the first half`,
          rule: 'ARC_EMOTIONAL_FRONT_LOADED',
          severity: 'minor',
          description: `${firstHalf379} of the protagonist's ${chargedIdxs379b.length} emotional beats (${Math.round(firstHalf379 / chargedIdxs379b.length * 100)}%) fall in the first half — emotional intensity peaks early and dwindles toward the climax. The back half, where the stakes should be highest and the cost of the conflict most acute, coasts on the least feeling, so the ending inherits an emotionally spent protagonist.`,
          suggestedFix: 'Reserve the protagonist\'s most charged emotional beats for the back half: the deepest loss, the hardest-won hope, the most acute fear should escalate toward the climax. Emotion, like tension, should build across the arc — not be spent in the opening movement.',
        });
      }
    }
  }

  // ARC_NEGATIVE_EMOTION_RUN (minor, n≥8, run≥4): Four or more consecutive scenes carry
  // emotionalShift='negative' with no positive or neutral beat to break the descent. An
  // unbroken stretch of despair exhausts the audience and erases the contrast that makes any
  // single low point land — relentless gloom reads as monotone, not tragedy. Distinct from
  // ARC_EMOTIONAL_RECOVERY_ABSENT (a whole-story check: no positive at or after the first
  // fall), conflict.ts NEGATIVE_SPIRAL_UNBROKEN (consecutive negative relationship SHIFTS,
  // not emotionalShift), and causality.ts EMOTIONAL_NEUTRAL_RUN (consecutive NEUTRAL scenes).
  if (records.length >= 8) {
    let negRun379 = 0;
    let maxNegRun379 = 0;
    let maxNegStart379 = 0;
    let curStart379 = 0;
    for (let i379n = 0; i379n < records.length; i379n++) {
      if ((records as any[])[i379n].emotionalShift === 'negative') {
        if (negRun379 === 0) curStart379 = i379n;
        negRun379++;
        if (negRun379 > maxNegRun379) { maxNegRun379 = negRun379; maxNegStart379 = curStart379; }
      } else {
        negRun379 = 0;
      }
    }
    if (maxNegRun379 >= 4) {
      const s379 = (records as any[])[maxNegStart379].sceneIdx;
      const e379 = (records as any[])[maxNegStart379 + maxNegRun379 - 1].sceneIdx;
      issues.push({
        location: `Scenes ${s379}–${e379} — unbroken negative run (${maxNegRun379} scenes)`,
        rule: 'ARC_NEGATIVE_EMOTION_RUN',
        severity: 'minor',
        description: `${maxNegRun379} consecutive scenes (${s379}–${e379}) carry a negative emotional shift with no positive or neutral beat to break the descent. An unbroken stretch of despair exhausts the audience and erases the contrast that makes any single low point land — relentless gloom reads as monotone rather than tragedy, and the audience numbs to suffering that never lets up.`,
        suggestedFix: 'Break the descent with at least one beat of relief, hope, or even grim humor inside the run — a small win later snatched away, a moment of connection before the next blow. The rhythm of fall-and-respite is what keeps a downward arc dramatic; an unbroken slide flattens into noise.',
      });
    }
  }

  // ── Wave 393: ARC_EMOTIONAL_BACK_LOADED, ARC_POSITIVE_EMOTION_RUN, ARC_LATE_LOW_POINT_ABSENT ──

  // ARC_EMOTIONAL_BACK_LOADED (minor, n≥10, ≥4 charged scenes): More than 70% of the
  // protagonist's non-neutral emotional beats fall in the second half. The opening is
  // emotionally inert and feeling concentrates only as the climax nears, so the audience
  // spends the first half with little reason to be invested before the back half suddenly
  // demands they care. The distribution mirror of ARC_EMOTIONAL_FRONT_LOADED; distinct from
  // ARC_FIRST_HALF_EMOTIONALLY_FLAT (the binary case — the entire first half is neutral — this
  // fires even when the first half carries some emotion, as long as it is a small minority).
  if (records.length >= 10) {
    const chargedIdxs393: number[] = [];
    for (let i393 = 0; i393 < records.length; i393++) {
      if ((records as any[])[i393].emotionalShift !== 'neutral') chargedIdxs393.push(i393);
    }
    if (chargedIdxs393.length >= 4) {
      const mid393 = Math.floor(records.length * 0.5);
      const secondHalf393 = chargedIdxs393.filter(i => i >= mid393).length;
      if (secondHalf393 / chargedIdxs393.length > 0.7) {
        issues.push({
          location: `Emotional distribution — ${secondHalf393}/${chargedIdxs393.length} beats in the second half`,
          rule: 'ARC_EMOTIONAL_BACK_LOADED',
          severity: 'minor',
          description: `${secondHalf393} of the protagonist's ${chargedIdxs393.length} emotional beats (${Math.round(secondHalf393 / chargedIdxs393.length * 100)}%) fall in the second half — the opening is emotionally inert and feeling concentrates only as the climax nears. The audience spends the first half with little reason to be invested, then the back half abruptly demands they care about a character whose inner life was withheld.`,
          suggestedFix: 'Seed emotional beats in the first half: an early hope, fear, or wound bonds the audience to the protagonist before the stakes peak. Emotion should build across the arc from the outset, not arrive all at once in the back half.',
        });
      }
    }
  }

  // ARC_POSITIVE_EMOTION_RUN (minor, n≥8, run≥4): Four or more consecutive scenes carry
  // emotionalShift='positive' with no negative or neutral beat to interrupt the upswing. An
  // unbroken run of good feeling drains tension — without a setback to threaten the gains, the
  // ascent reads as frictionless and the audience stops worrying. The run mirror of ARC_
  // NEGATIVE_EMOTION_RUN; distinct from ARC_UNCONTESTED_ASCENT (a cumulative triumph-vs-
  // adversity index across the whole story) and ARC_POSITIVE_ONLY (no negative beat anywhere).
  if (records.length >= 8) {
    let posRun393 = 0;
    let maxPosRun393 = 0;
    let maxPosStart393 = 0;
    let curStart393 = 0;
    for (let i393p = 0; i393p < records.length; i393p++) {
      if ((records as any[])[i393p].emotionalShift === 'positive') {
        if (posRun393 === 0) curStart393 = i393p;
        posRun393++;
        if (posRun393 > maxPosRun393) { maxPosRun393 = posRun393; maxPosStart393 = curStart393; }
      } else {
        posRun393 = 0;
      }
    }
    if (maxPosRun393 >= 4) {
      const s393 = (records as any[])[maxPosStart393].sceneIdx;
      const e393 = (records as any[])[maxPosStart393 + maxPosRun393 - 1].sceneIdx;
      issues.push({
        location: `Scenes ${s393}–${e393} — unbroken positive run (${maxPosRun393} scenes)`,
        rule: 'ARC_POSITIVE_EMOTION_RUN',
        severity: 'minor',
        description: `${maxPosRun393} consecutive scenes (${s393}–${e393}) carry a positive emotional shift with no negative or neutral beat to interrupt the upswing. An unbroken run of good feeling drains tension — without a setback to threaten the gains, the ascent reads as frictionless and the audience stops worrying, so the run plays as wish-fulfillment rather than earned progress.`,
        suggestedFix: 'Interrupt the upswing with a complication or cost: a win that creates a new problem, a gain shadowed by what it threatens. The rhythm of progress-and-setback is what keeps a rising arc dramatic; an unbroken climb of good feeling lulls the audience instead of gripping them.',
      });
    }
  }

  // ARC_LATE_LOW_POINT_ABSENT (minor, n≥10, ≥2 negative beats): The protagonist suffers two
  // or more negative emotional beats, but every one falls in the first half — the back half
  // contains no emotional nadir before the climax. The "all is lost" low point that should
  // precede the final push is missing from the place it belongs, so the protagonist coasts
  // into the climax without being broken down first. Distinct from ARC_EMOTIONAL_RECOVERY_
  // ABSENT (no positive after the first fall — about recovery), ARC_SECOND_HALF_EMOTIONALLY_
  // FLAT (the entire back half neutral — this allows positive beats late, only negatives are
  // absent), and structure's DARK_NIGHT_ABSENT (no deep low anywhere).
  if (records.length >= 10) {
    const negIdxs393: number[] = [];
    for (let i393n = 0; i393n < records.length; i393n++) {
      if ((records as any[])[i393n].emotionalShift === 'negative') negIdxs393.push(i393n);
    }
    const mid393b = Math.floor(records.length * 0.5);
    if (negIdxs393.length >= 2 && negIdxs393.every(i => i < mid393b)) {
      issues.push({
        location: `Negative beats all in the first half (latest at Scene ${(records as any[])[negIdxs393[negIdxs393.length - 1]].sceneIdx})`,
        rule: 'ARC_LATE_LOW_POINT_ABSENT',
        severity: 'minor',
        description: `The protagonist suffers ${negIdxs393.length} negative emotional beats, but every one falls in the first half — the back half contains no emotional nadir before the climax. The "all is lost" low point that should precede the final push is missing from where it belongs, so the protagonist coasts into the climax without being broken down first, and the victory loses the contrast that would make it land.`,
        suggestedFix: 'Place a genuine low point in the back half, just before the climax: the moment the protagonist loses what matters most, doubts everything, hits bottom. The deepest defeat should come late so the final rally has something to rise from — an arc whose lows are all early peaks too smoothly.',
      });
    }
  }

  // ── Wave 407: ARC_RELATIONAL_POSITIVE_ONLY, ARC_RELATIONAL_BACK_LOADED, ARC_RELATIONAL_RECOVERY_ABSENT ──

  // ARC_RELATIONAL_POSITIVE_ONLY (minor, n≥8, ≥3 positive shifts, 0 negative): The story makes
  // three or more relationship shifts and not one of them is negative — every bond only ever
  // warms. Trust builds, alliances form, intimacy deepens, but nothing ever erodes, betrays, or
  // fractures. A relational world that only improves has no relational stakes: there is no bond
  // the audience fears losing because no bond is ever threatened. This is the relational-channel
  // mirror of ARC_POSITIVE_ONLY (which audits the protagonist's EMOTIONAL valence); distinct
  // from RELATIONAL_SYMMETRY_ABSENT (one-sided reciprocity) and ARC_RELATIONAL_RECOVERY_ABSENT
  // (which requires negatives to exist) — this fires when negative relational movement is wholly
  // absent.
  if (records.length >= 8) {
    const allShifts407: any[] = (records as any[]).flatMap(r => (r.relationshipShifts as any[] ?? []));
    const posShifts407 = allShifts407.filter(s => (s.amount ?? 0) > 0);
    const negShifts407 = allShifts407.filter(s => (s.amount ?? 0) < 0);
    if (posShifts407.length >= 3 && negShifts407.length === 0) {
      issues.push({
        location: `${posShifts407.length} relationship shifts — all positive`,
        rule: 'ARC_RELATIONAL_POSITIVE_ONLY',
        severity: 'minor',
        description: `All ${posShifts407.length} of the story's relationship shifts are positive — every bond only ever warms, and not one erodes, betrays, or fractures. A relational world that only improves has no relational stakes: there is no bond the audience fears losing because no bond is ever threatened, so the warmth reads as frictionless rather than earned.`,
        suggestedFix: 'Introduce relational cost: a trust broken, an alliance that strains under pressure, an intimacy that curdles. Even a story about people growing closer needs a fracture to repair — the threat of loss is what gives a deepening bond its weight. Let at least one relationship move the wrong way before it is mended.',
      });
    }
  }

  // ARC_RELATIONAL_BACK_LOADED (minor, n≥10, ≥4 shift scenes, front half ≥1): More than 70% of
  // the scenes that move a relationship fall in the second half, while the front half has at
  // least one. The opening is relationally inert and bonding/breaking concentrates only as the
  // climax nears, so the audience spends the first half with little relational investment before
  // the back half abruptly demands they care who trusts whom. The relational mirror of ARC_
  // EMOTIONAL_BACK_LOADED; distinct from ARC_RELATIONAL_FIRST_HALF_FLAT (the binary case — zero
  // shifts in the front half — this fires even when the front half carries one or two, as long
  // as they are a small minority) and ARC_LATE_RELATIONAL_VOID (the opposite — none late).
  if (records.length >= 10) {
    const shiftSceneIdxs407: number[] = [];
    for (let i407 = 0; i407 < records.length; i407++) {
      if (((records as any[])[i407].relationshipShifts as any[] ?? []).length > 0) shiftSceneIdxs407.push(i407);
    }
    if (shiftSceneIdxs407.length >= 4) {
      const mid407 = Math.floor(records.length * 0.5);
      const frontHalf407 = shiftSceneIdxs407.filter(i => i < mid407).length;
      const backHalf407 = shiftSceneIdxs407.filter(i => i >= mid407).length;
      if (frontHalf407 >= 1 && backHalf407 / shiftSceneIdxs407.length > 0.7) {
        issues.push({
          location: `Relational distribution — ${backHalf407}/${shiftSceneIdxs407.length} shift scenes in the second half`,
          rule: 'ARC_RELATIONAL_BACK_LOADED',
          severity: 'minor',
          description: `${backHalf407} of the story's ${shiftSceneIdxs407.length} relationship-shift scenes (${Math.round(backHalf407 / shiftSceneIdxs407.length * 100)}%) fall in the second half — the opening is relationally inert and bonding or breaking concentrates only as the climax nears. The audience spends the first half with little relational investment, then the back half abruptly demands they care who trusts, betrays, or loves whom.`,
          suggestedFix: 'Seed relational movement in the first half: an early alliance, a small betrayal, a flicker of attraction or distrust establishes the bonds the back half will test. Relationships should accumulate stakes from the outset, not have all their movement crammed into the run-up to the climax.',
        });
      }
    }
  }

  // ARC_RELATIONAL_RECOVERY_ABSENT (minor, n≥8, ≥2 negative shifts, ≥1 positive somewhere): The
  // story makes two or more negative relationship shifts and contains at least one positive shift,
  // but no positive shift occurs after the first fracture — once a bond breaks, nothing relational
  // is ever mended again. The relational world enters a one-way decline: the warmth all lives
  // before the first betrayal, and the back half is unrelieved erosion. The relational mirror of
  // ARC_EMOTIONAL_RECOVERY_ABSENT (which tracks emotional valence); distinct from ARC_RELATIONAL_
  // POSITIVE_ONLY (which requires zero negatives) and ARC_NEGATIVE_ONLY (the emotion channel) —
  // this fires specifically on the absence of relational repair after the first fall.
  if (records.length >= 8) {
    const negSceneIdx407: number[] = [];
    const posSceneIdx407: number[] = [];
    for (let i407r = 0; i407r < records.length; i407r++) {
      const shifts = ((records as any[])[i407r].relationshipShifts as any[] ?? []);
      if (shifts.some(s => (s.amount ?? 0) < 0)) negSceneIdx407.push(i407r);
      if (shifts.some(s => (s.amount ?? 0) > 0)) posSceneIdx407.push(i407r);
    }
    if (negSceneIdx407.length >= 2 && posSceneIdx407.length >= 1) {
      const firstNeg407 = negSceneIdx407[0];
      const posAfterFirstNeg407 = posSceneIdx407.some(i => i > firstNeg407);
      if (!posAfterFirstNeg407) {
        issues.push({
          location: `No relational repair after the first fracture (Scene ${(records as any[])[firstNeg407].sceneIdx})`,
          rule: 'ARC_RELATIONAL_RECOVERY_ABSENT',
          severity: 'minor',
          description: `The story breaks a bond ${negSceneIdx407.length} times and has the capacity for relational warmth (a positive shift exists), but no relationship ever moves the right way after the first fracture at Scene ${(records as any[])[firstNeg407].sceneIdx}. Once the first bond breaks, the relational world enters a one-way decline — all the warmth lives before the first betrayal, and the back half is unrelieved erosion with no repair to hope for.`,
          suggestedFix: 'Place at least one relational repair after the first fracture: a reconciliation, a new trust formed in the wreckage of an old one, an unexpected ally. Even a tragic arc lands harder when a moment of repair gives the audience something to lose again — relentless relational decline numbs where alternating break-and-mend keeps the bonds alive.',
        });
      }
    }
  }

  // ── Wave 421: ARC_RELATIONAL_NEGATIVE_ONLY, ARC_PEAK_RELATIONAL_EMOTION_ABSENT, ARC_RELATIONAL_MIDPOINT_VOID ──

  // ARC_RELATIONAL_NEGATIVE_ONLY (minor, n≥8, ≥3 negative shifts, 0 positive): The story makes
  // three or more relationship shifts and not one of them is positive — every bond only ever
  // erodes, betrays, or fractures with nothing ever warming or deepening. A relational world that
  // only declines has no relational hope: the audience never has a bond that is improving to invest
  // in, so there is no relational joy the story can later put at risk. Decline without any repair
  // or warmth reads as nihilistic in tone, and the audience stops expecting the bonds to matter
  // because they only ever move one direction. Valence mode × relational channel. This is the
  // relational mirror of ARC_RELATIONAL_POSITIVE_ONLY (Wave 407: all shifts positive, zero negative).
  // Distinct from ARC_NEGATIVE_ONLY (the emotion channel — the protagonist never has an emotional
  // upswing — not the relational channel), and ARC_RELATIONAL_RECOVERY_ABSENT (which fires when
  // both polarities exist but no repair follows the first fracture — requires a positive shift to
  // exist somewhere).
  if (records.length >= 8) {
    const allShifts421: any[] = (records as any[]).flatMap(r => (r.relationshipShifts as any[] ?? []));
    const negShifts421 = allShifts421.filter(s => (s.amount ?? 0) < 0);
    const posShifts421 = allShifts421.filter(s => (s.amount ?? 0) > 0);
    if (negShifts421.length >= 3 && posShifts421.length === 0) {
      issues.push({
        location: `${negShifts421.length} relationship shifts — all negative`,
        rule: 'ARC_RELATIONAL_NEGATIVE_ONLY',
        severity: 'minor',
        description: `All ${negShifts421.length} of the story's relationship shifts are negative — every bond only ever erodes, betrays, or fractures, and nothing ever warms or deepens. A relational world that only declines has no relational hope: without a bond that is improving, the audience has nothing relational to lose. Unrelieved relational decline reads as nihilistic, and the audience stops expecting bonds to matter because they only ever move one direction.`,
        suggestedFix: 'Introduce at least one positive relational movement: a trust formed amid betrayal, a bond that deepens under pressure, an unexpected warmth. Even a tragedy needs a moment of genuine connection for its loss to register — decline is only painful against the backdrop of something worth preserving.',
      });
    }
  }

  // ARC_PEAK_RELATIONAL_EMOTION_ABSENT (minor, n≥8, ≥3 scenes with shifts, emotion exists
  // elsewhere): The scene carrying the highest absolute relationship-shift magnitude is
  // emotionally neutral — the story's biggest bond event (the sharpest deepening or worst
  // fracture) leaves the protagonist unregistered. When the most extreme relational moment
  // produces no emotion, the audience learns that the bonds don't really matter to anyone in
  // the story — the protagonist doesn't feel their most dramatic relational event, so why should
  // the audience? Single-peak isolation mode × relational × emotion. Distinct from ARC_PEAK_
  // SUSPENSE_EMOTION_ABSENT (suspense channel, Wave 365), ARC_PEAK_CURIOSITY_EMOTION_ABSENT
  // (curiosity channel, Wave 365), and ARC_RELATIONAL_SHIFT_EMOTION_FLAT (Wave 365: fires when
  // ALL relational scenes are neutral — this fires on only the peak scene being neutral while
  // others carry emotion, a more targeted isolation of the most critical beat).
  if (records.length >= 8) {
    const shiftScenes421b = (records as any[]).filter(r => ((r.relationshipShifts as any[] ?? [])).length > 0);
    if (shiftScenes421b.length >= 3) {
      const peakShiftScene421b = shiftScenes421b.reduce((best: any, r: any) => {
        const maxAbs = Math.max(...(r.relationshipShifts as any[]).map((s: any) => Math.abs(s.amount ?? 0)));
        const bestMaxAbs = Math.max(...(best.relationshipShifts as any[]).map((s: any) => Math.abs(s.amount ?? 0)));
        return maxAbs > bestMaxAbs ? r : best;
      });
      const hasEmotionElsewhere421b = (records as any[]).some(
        r => r.sceneIdx !== peakShiftScene421b.sceneIdx && r.emotionalShift !== 'neutral',
      );
      if (peakShiftScene421b.emotionalShift === 'neutral' && hasEmotionElsewhere421b) {
        issues.push({
          location: `Scene ${peakShiftScene421b.sceneIdx} (peak relationship shift — emotionally neutral)`,
          rule: 'ARC_PEAK_RELATIONAL_EMOTION_ABSENT',
          severity: 'minor',
          description: `The scene with the story's largest relationship shift (Scene ${peakShiftScene421b.sceneIdx}) is emotionally neutral — the protagonist's most dramatic bond event, the sharpest deepening or worst fracture, registers as no emotional state change. When the peak relational moment produces no emotion while other scenes carry feeling, the audience learns that the bonds don't actually matter to anyone in the story, so the biggest relational event fails to land.`,
          suggestedFix: `Give the peak relational scene an emotional charge: the scene where a bond moves most sharply should be the scene where the protagonist feels most intensely — joy, grief, betrayal, or relief. The audience mirrors the protagonist's emotional state; if the protagonist registers nothing at their most extreme relational moment, the audience registers nothing either.`,
        });
      }
    }
  }

  // ARC_RELATIONAL_MIDPOINT_VOID (minor, n≥10, ≥2 shift scenes, shifts outside midpoint):
  // No relationship shifts occurs in the 40%–60% zone (the story's structural pivot), while
  // shifts exist both outside this zone. The midpoint is the scene where the protagonist
  // typically crosses from reactivity to agency, and their relational world should be most
  // actively changing around that turn: alliances form or fracture, loyalties are tested, the
  // cost of the protagonist's goal becomes clear through its impact on the people around them.
  // A relational void at the midpoint means the story's relationships are static exactly when
  // they should be pivoting. Zone presence/absence × relational × midpoint. Distinct from
  // ARC_LATE_RELATIONAL_VOID (final quarter — a different zone), ARC_RELATIONAL_FIRST_HALF_FLAT
  // (the entire front half — binary, broader), and ARC_RELATIONAL_BACK_LOADED (distribution of
  // all shifts — proportion-based, not zone-based).
  if (records.length >= 10) {
    const midS421c = Math.floor(records.length * 0.40);
    const midE421c = Math.floor(records.length * 0.60);
    const shiftIdxs421c: number[] = [];
    for (let i421 = 0; i421 < records.length; i421++) {
      if (((records as any[])[i421].relationshipShifts as any[] ?? []).length > 0) shiftIdxs421c.push(i421);
    }
    if (shiftIdxs421c.length >= 2) {
      const hasMidShift421c = shiftIdxs421c.some(i => i >= midS421c && i < midE421c);
      const hasOutsideMid421c = shiftIdxs421c.some(i => !(i >= midS421c && i < midE421c));
      if (!hasMidShift421c && hasOutsideMid421c) {
        issues.push({
          location: `Midpoint zone (Scenes ${midS421c}–${midE421c - 1}) — no relationship shift`,
          rule: 'ARC_RELATIONAL_MIDPOINT_VOID',
          severity: 'minor',
          description: `No relationship shifts occurs in the story's midpoint zone (Scenes ${midS421c}–${midE421c - 1}) though shifts exist elsewhere. The midpoint is where the protagonist typically crosses from reactivity to agency, and it is the zone where their relational world should be most actively in motion — alliances forming or fracturing, loyalties tested, the cost of the protagonist's goal becoming visible through its impact on bonds. A relational void at the pivot means the story's structural fulcrum has no interpersonal weight.`,
          suggestedFix: `Place at least one relationship shift in the midpoint zone: a trust extended or broken at the halfway point grounds the structural pivot in the protagonist's relational world, making the story's turn feel personal rather than mechanical. The scene where everything changes for the protagonist should also change something between them and at least one other character.`,
        });
      }
    }
  }

  // ── Wave 435: ARC_EMOTIONAL_OVERLOAD, ARC_CLOCK_EMOTION_DECOUPLED, ARC_PEAK_RELATIONAL_UNCAUSED ──

  // ARC_EMOTIONAL_OVERLOAD (minor, n≥10, ≥8 non-neutral, ≥80% non-neutral, both polarities):
  // ≥80% of scenes carry a non-neutral emotional shift — the story has no emotional breathing
  // room. Every scene charges the protagonist, so the perpetual emotion becomes wallpaper:
  // there is no neutral contrast to make the charged scenes register with any specificity.
  // Without a flat scene to push off from, the audience loses the ability to gauge how much
  // any given beat costs; the baseline for "feeling something" is lost because nothing is ever
  // not felt. Underweight/bloat mode × emotional density. The complement of ARC_EMOTIONAL_
  // FLATLINE (which fires at ≥80% neutral; this fires at ≥80% non-neutral). Distinct from
  // ARC_POSITIVE_ONLY (all non-neutral scenes are positive — a directional filter regardless
  // of proportion) and ARC_NEGATIVE_ONLY (same, negative): by requiring BOTH polarities to
  // be present, this check is guaranteed not to overlap with either one-directional rule —
  // if both positive and negative exist at ≥80% combined, the story is emotionally dense,
  // not emotionally uniform. First underweight/bloat check in this pass targeting the
  // emotional-density dimension (too much emotion rather than too little).
  if (records.length >= 10) {
    const nonNeutral435a = (records as any[]).filter(r => r.emotionalShift !== 'neutral');
    const posCount435a = nonNeutral435a.filter(r => r.emotionalShift === 'positive').length;
    const negCount435a = nonNeutral435a.filter(r => r.emotionalShift === 'negative').length;
    const overloadRatio435a = nonNeutral435a.length / records.length;
    if (nonNeutral435a.length >= 8 && overloadRatio435a >= 0.80 && posCount435a >= 1 && negCount435a >= 1) {
      issues.push({
        location: `${nonNeutral435a.length} of ${records.length} scenes — non-neutral emotional shift`,
        rule: 'ARC_EMOTIONAL_OVERLOAD',
        severity: 'minor',
        description: `${nonNeutral435a.length} of ${records.length} scenes (${Math.round(overloadRatio435a * 100)}%) carry a non-neutral emotional shift (${posCount435a} positive, ${negCount435a} negative) — the story has no emotional breathing room. When nearly every scene charges the protagonist, the perpetual emotion becomes wallpaper: there is no flat baseline to push off from, and the audience loses the ability to measure how much any given beat actually costs. Contrast is what gives charged scenes their weight; a story that is always emotional is effectively never emotional.`,
        suggestedFix: 'Introduce neutral scenes as deliberate counterpoint: quiet moments of observation, logistics, or suspension between the emotionally active beats. A protagonist who is neutral — watchful, gathering, processing — makes the surrounding scenes of feeling register more sharply. Emotion needs contrast to have texture; perpetual intensity flattens everything to the same loudness.',
      });
    }
  }

  // ARC_CLOCK_EMOTION_DECOUPLED (minor, n≥8, ≥3 clock scenes, all neutral, emotion
  // elsewhere): Every scene with clockRaised=true is emotionally neutral for the
  // protagonist, even though non-clock scenes do carry feeling. Deadlines should be
  // among the most emotionally charged moments in a story: the ticking clock is meant
  // to concentrate feeling, force decision, and produce urgency the audience shares
  // with the protagonist. When clock scenes produce no emotional state change while other
  // scenes do, the deadline is a logistical event rather than an emotional one — an
  // abstract countdown that never registers as feeling. Co-occurrence/decoupling mode ×
  // clockRaised × emotionalShift. Distinct from ARC_SUSPENSE_EMOTION_DECOUPLED (high-
  // suspenseDelta scenes emotionally neutral — suspense channel, not deadline channel;
  // this is the first check in the pass to audit clockRaised specifically) and ARC_TURN_
  // EMOTION_ABSENT (dramaticTurn channel), ARC_REVELATION_EMOTION_ABSENT (revelation
  // channel): each of those three targets a different structural signal; this isolates
  // the urgency-feeling decoupling that makes countdowns feel mechanical rather than human.
  if (records.length >= 8) {
    const clockScenes435b = (records as any[]).filter(r => r.clockRaised === true);
    if (clockScenes435b.length >= 3 && clockScenes435b.every(r => r.emotionalShift === 'neutral')) {
      const hasEmotionOutsideClock435b = (records as any[]).some(
        r => !r.clockRaised && r.emotionalShift !== 'neutral',
      );
      if (hasEmotionOutsideClock435b) {
        issues.push({
          location: `${clockScenes435b.length} clock-raised scenes — all emotionally neutral`,
          rule: 'ARC_CLOCK_EMOTION_DECOUPLED',
          severity: 'minor',
          description: `${clockScenes435b.length} scenes with clockRaised=true are all emotionally neutral for the protagonist, even though non-clock scenes carry feeling. The story's deadlines produce no emotional state change: time pressure arrives and passes without the protagonist registering anything about it. A ticking clock that registers no emotion is a logistical event rather than a dramatic one — the countdown is abstract, and the urgency engine and the emotional engine run on completely separate tracks. The audience feels urgency only when the protagonist does.`,
          suggestedFix: 'Let at least one deadline scene also carry an emotional charge — fear, anger, relief, or grief shaped by time pressure. The emotion the protagonist feels because the clock is running is what transforms a countdown from a plot mechanism into a dramatic experience. Urgency without feeling is information; urgency with feeling is suspense.',
        });
      }
    }
  }

  // ARC_PEAK_RELATIONAL_UNCAUSED (backward-cause × single-peak isolation, n≥10,
  // peakShiftCount≥2, peakPos≥2): The scene with the highest COUNT of relationship
  // shifts — the densest relational moment in the story — has no causal driver
  // (emotional charge, revelation, clockRaised, or dramatic turn) in either of the
  // two preceding scenes. Looking backward from the relational peak, nothing in the
  // preceding narrative explains why so many bonds changed at once: the relational
  // climax appears without preparation, unmotivated by the scenes immediately before
  // it. Relationships change most dramatically when precipitated by something that
  // forces the shift — a revelation that reframes trust, a deadline that collapses
  // loyalty, a dramatic turn that reorganizes the protagonist's alliances. Without
  // that causal pressure in the run-up, the densest relational moment feels arbitrary
  // rather than inevitable. Backward-cause × single-peak isolation × relational
  // channel. Distinct from ARC_PEAK_RELATIONAL_EMOTION_ABSENT (Wave 421: uses maximum
  // absolute magnitude as the peak metric and audits the peak SCENE's own emotional
  // state; this uses maximum shift COUNT and audits the TWO PRECEDING SCENES for
  // causal drivers — the peak scene's own state is irrelevant, only its preparation
  // matters) and ARC_LATE_TURN_UNSUPPORTED (backward-cause for a late dramatic turn
  // — a different channel; this is for the relational peak) and ARC_UNMOTIVATED_
  // TRANSFORMATION (backward-cause for the whole-arc transformation event — broader,
  // not peak-specific): this is the first backward-cause check in the pass targeting
  // the relational channel as the isolating signal.
  if (records.length >= 10) {
    const shiftScenes435c = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as any[]).length > 0,
    );
    if (shiftScenes435c.length >= 2) {
      const peakRelRec435c = shiftScenes435c.reduce((best: any, r: any) =>
        ((r.relationshipShifts ?? []) as any[]).length >
        ((best.relationshipShifts ?? []) as any[]).length ? r : best,
      );
      const peakRelCount435c = ((peakRelRec435c.relationshipShifts ?? []) as any[]).length;
      if (peakRelCount435c >= 2) {
        const peakRelPos435c = (records as any[]).findIndex(
          r => r.sceneIdx === peakRelRec435c.sceneIdx,
        );
        if (peakRelPos435c >= 2) {
          const isDriver435c = (r: any) =>
            r.emotionalShift !== 'neutral' || r.revelation !== null ||
            r.clockRaised === true || ((r.dramaticTurn ?? 'nothing') !== 'nothing');
          const prior1_435c = (records as any[])[peakRelPos435c - 1];
          const prior2_435c = (records as any[])[peakRelPos435c - 2];
          if (!isDriver435c(prior1_435c) && !isDriver435c(prior2_435c)) {
            issues.push({
              location: `Scene ${peakRelRec435c.sceneIdx} — peak relational density (${peakRelCount435c} shifts), no causal setup`,
              rule: 'ARC_PEAK_RELATIONAL_UNCAUSED',
              severity: 'minor',
              description: `Scene ${peakRelRec435c.sceneIdx} contains ${peakRelCount435c} relationship shifts — the densest relational moment in the story — but neither of the two preceding scenes carries a causal driver (emotional charge, revelation, clock raised, or dramatic turn). Relationships change most sharply when precipitated by something that forces the shift: a revelation that reframes trust, a deadline that collapses loyalty, a dramatic turn that reorganizes alliances. Without that preparation, the relational peak appears arbitrary — bonds change densely because the story requires it, not because the narrative made it inevitable.`,
              suggestedFix: `Plant a causal driver in one or two scenes before the densest relational moment: a revelation that reframes how characters see each other, a dramatic turn that forces a loyalty choice, a clock that concentrates allegiance under pressure. The scene where the most bonds shift at once should feel like the scene everything was pointing toward — prepared by the preceding scenes, not dropped from the sky.`,
            });
          }
        }
      }
    }
  }

  // ── Wave 449: ARC_RELATIONAL_DROUGHT_RUN, ARC_TURN_EMOTIONAL_AFTERMATH_VOID, ARC_CURIOSITY_RELATIONAL_DECOUPLED ──

  // ARC_RELATIONAL_DROUGHT_RUN (run-based × relational × absence, n≥10, ≥2 shift scenes,
  // maxSilentRun≥5): Five or more consecutive scenes pass with no relationship shift, even
  // though the story contains at least 2 scenes where bonds move. Across the silent stretch,
  // the protagonist's interpersonal world is frozen: no bond deepens, fractures, or changes
  // in any direction. A sustained relational silence trains the audience that character
  // relationships are background scenery — the relational engine idles for too long.
  // Distinctness: ARC_LATE_RELATIONAL_VOID (Wave 270: final quarter — zone check),
  // ARC_RELATIONAL_FIRST_HALF_FLAT (Wave 351: first half — zone check), ARC_RELATIONAL_
  // MIDPOINT_VOID (Wave 421: 40%–60% zone — zone check). All three existing relational-absence
  // checks are tied to fixed structural zones. This is the first run-based check on relational
  // silence: it fires on the longest consecutive run of shift-free scenes regardless of zone,
  // capturing long embedded silences that zone-based checks miss entirely.
  if (records.length >= 10) {
    const shiftSet449a = new Set(
      (records as any[]).filter(r => ((r.relationshipShifts ?? []) as any[]).length > 0)
        .map(r => (r as any).sceneIdx),
    );
    if (shiftSet449a.size >= 2) {
      let maxSilent449a = 0;
      let curSilent449a = 0;
      for (const r of records) {
        if (shiftSet449a.has((r as any).sceneIdx)) {
          curSilent449a = 0;
        } else {
          if (++curSilent449a > maxSilent449a) maxSilent449a = curSilent449a;
        }
      }
      if (maxSilent449a >= 5) {
        issues.push({
          location: `Relational distribution — longest shift-free run: ${maxSilent449a} scenes`,
          rule: 'ARC_RELATIONAL_DROUGHT_RUN',
          severity: 'minor',
          description: `The story has ${shiftSet449a.size} scenes where bonds move but a consecutive stretch of ${maxSilent449a} scenes passes without any relationship shift. Across the silent run, the protagonist's interpersonal world is frozen — no bond deepens, fractures, or changes in any direction. A sustained relational silence trains the audience that character relationships are background rather than a living, changing part of the story: the relational engine idles instead of driving.`,
          suggestedFix: `Seed a small relational movement within the ${maxSilent449a}-scene silent stretch: a moment of dependence, tension, gratitude, or distance between two characters. It does not need to be a dramatic rupture — even a subtle shift in how characters speak to each other keeps the relational layer alive and makes the audience continue to track the bonds as meaningful stakes.`,
        });
      }
    }
  }

  // ARC_TURN_EMOTIONAL_AFTERMATH_VOID (sequence/aftermath × dramatic turn × emotional aftermath,
  // n≥8, ≥2 turns, each followed by ≥1 scene): Every dramatic turn in the script is followed
  // by two scenes in which the protagonist shows no emotional reaction — the immediate aftermath
  // of every pivot is emotionally flat. A dramatic turn reorganizes the protagonist's world, and
  // the emotional response in the scenes after is the dramatization of that reorganization:
  // the fear, relief, anger, or grief the pivot produces makes it feel real. When every pivot
  // lands without any felt aftermath, the story changes direction but the protagonist appears
  // unmoved — every turn is structural without being experiential.
  // Distinctness: ARC_TURN_EMOTION_ABSENT (Wave 312) fires when the TURN SCENE ITSELF is
  // emotionally neutral — it audits the turn scene's own register. This audits the 2 scenes
  // AFTER the turn for emotional response. DRAMATIC_TURN_AFTERMATH_VOID (causality.ts Wave
  // 296) checks 2 scenes after a turn for ANY fallout (emotion OR relationship OR revelation
  // OR suspense) — a co-occurrence check. This is specifically the emotional aftermath channel
  // in the character-arc framing, and the first aftermath check in this pass on the turn channel.
  if (records.length >= 8) {
    const turnScenes449b = (records as any[]).filter(r => (r.dramaticTurn ?? 'nothing') !== 'nothing');
    if (turnScenes449b.length >= 2) {
      const allTurnsNeutralAftermath449b = turnScenes449b.every(turn => {
        const turnIdx449b = (records as any[]).findIndex(r => (r as any).sceneIdx === (turn as any).sceneIdx);
        let checkedAny449b = false;
        for (let offset = 1; offset <= 2; offset++) {
          const nextIdx449b = turnIdx449b + offset;
          if (nextIdx449b >= records.length) continue;
          checkedAny449b = true;
          if (((records as any[])[nextIdx449b] as any).emotionalShift !== 'neutral') return false;
        }
        return checkedAny449b;
      });
      if (allTurnsNeutralAftermath449b) {
        issues.push({
          location: `${turnScenes449b.length} dramatic-turn aftermath(s) — no emotional response within 2 scenes`,
          rule: 'ARC_TURN_EMOTIONAL_AFTERMATH_VOID',
          severity: 'minor',
          description: `Every dramatic turn (${turnScenes449b.length} pivots) is followed by two scenes in which the protagonist shows no emotional reaction — every story pivot lands without felt aftermath. A turn reorganizes the protagonist's world, and the emotional response in the scenes immediately after is where that reorganization becomes real for the character: the fear that follows a reversal, the relief after a recognition, the grief when a hope is dashed. When every pivot's aftermath is emotionally flat, the story changes direction but the protagonist is unmoved — the turns feel structural rather than human.`,
          suggestedFix: `Give the protagonist an emotional reaction in the one or two scenes after at least one dramatic turn: the fear, anger, grief, or relief that the pivot produced. The aftermath is where the turn becomes real for the character — and therefore for the audience. A reversal without felt consequence is a plot event; a reversal followed by a moment of feeling is a turning point.`,
        });
      }
    }
  }

  // ARC_CURIOSITY_RELATIONAL_DECOUPLED (co-occurrence × curiosity × relational channel, n≥8,
  // ≥3 curiosity-positive scenes, all relational-silent, with shifts elsewhere): Every scene
  // in which curiosityDelta > 0 carries no relationship shift, even though non-curiosity scenes
  // do move bonds. The protagonist's wonder is never simultaneously accompanied by any movement
  // in their bonds — curiosity is purely intellectual, detached from the social fabric around
  // the protagonist. When wonder never carries relational consequence, the story's questions
  // lack the urgency that comes from knowing the answer would change something between two people.
  // Distinctness: ARC_CURIOSITY_EMOTION_DECOUPLED (Wave 312: curiosity × emotion). ARC_SUSPENSE_
  // EMOTION_DECOUPLED (Wave 298: suspense × emotion). ARC_REVELATION_EMOTION_ABSENT (Wave 337:
  // revelation × emotion). All existing co-occurrence checks in this pass pair a structural
  // trigger with EMOTION. This is the first check to pair the curiosity trigger with the
  // RELATIONSHIP output channel. REVELATION_RELATIONSHIP_VOID (causality.ts Wave 419) uses a
  // revelation trigger — different signal channel; this uses curiosity rises.
  if (records.length >= 8) {
    const curPositiveScenes449c = (records as any[]).filter(r => (r.curiosityDelta ?? 0) > 0);
    if (curPositiveScenes449c.length >= 3) {
      const allCuriosityRelSilent449c = curPositiveScenes449c.every(
        r => ((r.relationshipShifts ?? []) as any[]).length === 0,
      );
      const hasShiftOutsideCuriosity449c = (records as any[]).some(
        r => (r.curiosityDelta ?? 0) <= 0 && ((r.relationshipShifts ?? []) as any[]).length > 0,
      );
      if (allCuriosityRelSilent449c && hasShiftOutsideCuriosity449c) {
        issues.push({
          location: `${curPositiveScenes449c.length} curiosity-positive scenes — no relationship shift in any`,
          rule: 'ARC_CURIOSITY_RELATIONAL_DECOUPLED',
          severity: 'minor',
          description: `Every scene in which curiosity rises (${curPositiveScenes449c.length} scenes with curiosityDelta > 0) carries no relationship shift, even though non-curiosity scenes do move bonds. The protagonist's wonder is never simultaneously accompanied by relational consequence — curiosity is purely intellectual, entirely detached from the social fabric around them. When wonder never touches a bond, the story's questions lack the urgency that comes from knowing the answer would change something between two people: who trusts whom, who owes what, who stands where in relation to another.`,
          suggestedFix: `Let at least one moment of rising curiosity also move a relationship: a shared discovery that deepens or fractures a bond, a question that changes how two characters see each other, a mystery whose investigation forces a character to depend on or suspect someone else. When wonder has relational stakes — when finding out the truth would change the world between two people — curiosity becomes personal rather than intellectual, and the audience's investment in the answer deepens.`,
        });
      }
    }
  }

  // ── Wave 463: ARC_SUSPENSE_RELATIONAL_DECOUPLED, ARC_RELATIONAL_FRONT_LOADED, ARC_REVELATION_RELATIONAL_AFTERMATH_VOID ──

  // ARC_SUSPENSE_RELATIONAL_DECOUPLED (co-occurrence × suspense × relational channel, n≥8,
  // ≥3 suspense-positive scenes, all relational-silent, with shifts elsewhere): Every scene in
  // which suspenseDelta > 0 carries no relationship shift, even though non-suspense scenes do move
  // bonds. The protagonist's moments of rising danger never coincide with any movement in their
  // bonds — tension is purely situational, detached from the people the protagonist could lose,
  // betray, or be saved by. When suspense never carries relational stakes, the threat is to
  // circumstance rather than to relationship, and the audience fears for the plot rather than for
  // what the danger could do to a bond that matters.
  // Distinctness: ARC_SUSPENSE_EMOTION_DECOUPLED (Wave 298) pairs the suspense trigger with the
  // EMOTION channel; this pairs it with the RELATIONSHIP channel. ARC_CURIOSITY_RELATIONAL_
  // DECOUPLED (Wave 449) is the same relational-output check on the CURIOSITY trigger — this is
  // the suspense-trigger sibling, completing the danger-side of the relational-decoupling set.
  // Distinct from CHARACTER_ARC_RELATIONAL_STASIS (global absence of bonds) — this fires only when
  // bonds DO move, but never in the scenes where suspense rises.
  if (records.length >= 8) {
    const suspPositiveScenes463a = (records as any[]).filter(r => (r.suspenseDelta ?? 0) > 0);
    if (suspPositiveScenes463a.length >= 3) {
      const allSuspenseRelSilent463a = suspPositiveScenes463a.every(
        r => ((r.relationshipShifts ?? []) as any[]).length === 0,
      );
      const hasShiftOutsideSuspense463a = (records as any[]).some(
        r => (r.suspenseDelta ?? 0) <= 0 && ((r.relationshipShifts ?? []) as any[]).length > 0,
      );
      if (allSuspenseRelSilent463a && hasShiftOutsideSuspense463a) {
        issues.push({
          location: `${suspPositiveScenes463a.length} suspense-positive scenes — no relationship shift in any`,
          rule: 'ARC_SUSPENSE_RELATIONAL_DECOUPLED',
          severity: 'minor',
          description: `Every scene in which suspense rises (${suspPositiveScenes463a.length} scenes with suspenseDelta > 0) carries no relationship shift, even though non-suspense scenes do move bonds. The protagonist's moments of rising danger never coincide with any movement in their bonds — tension is purely situational, detached from the people they could lose, betray, or be rescued by. When suspense never touches a relationship, the threat is to circumstance rather than to a bond that matters, and the audience fears for the plot rather than for what the danger could do to the people inside it.`,
          suggestedFix: `Let at least one moment of rising suspense also move a relationship: a danger that forces two characters to depend on each other, a threat that exposes a betrayal, a crisis that tests whether a bond holds. When tension has relational stakes — when the cost of the danger is what it does to who-trusts-whom — suspense becomes personal, and the audience's fear attaches to people rather than to events.`,
        });
      }
    }
  }

  // ARC_RELATIONAL_FRONT_LOADED (distribution/timing × relational, n≥10, ≥4 shift scenes, back
  // half ≥1): More than 70% of the scenes that move a relationship fall in the FIRST half, while
  // the back half has at least one. Bonds form and break early, then the relational world goes
  // inert as the story approaches its climax — the audience builds relational investment in the
  // setup, then watches the back half resolve the plot with no further movement in who trusts,
  // loves, or betrays whom. A relationally static climax squanders the bonds the opening took care
  // to establish: the people stop changing toward each other exactly when the stakes peak.
  // Distinctness: ARC_RELATIONAL_BACK_LOADED (Wave 407) is the exact mirror (>70% in the SECOND
  // half) — this is the front-loaded pole, a genuinely empty cell. Distinct from ARC_LATE_
  // RELATIONAL_VOID (the binary case — zero shifts late; this fires even when the back half
  // carries one or two as long as they are a small minority) and from ARC_RELATIONAL_FIRST_HALF_
  // FLAT (the opposite — front half empty).
  if (records.length >= 10) {
    const shiftSceneIdxs463b: number[] = [];
    for (let i463b = 0; i463b < records.length; i463b++) {
      if (((records as any[])[i463b].relationshipShifts as any[] ?? []).length > 0) shiftSceneIdxs463b.push(i463b);
    }
    if (shiftSceneIdxs463b.length >= 4) {
      const mid463b = Math.floor(records.length * 0.5);
      const frontHalf463b = shiftSceneIdxs463b.filter(i => i < mid463b).length;
      const backHalf463b = shiftSceneIdxs463b.filter(i => i >= mid463b).length;
      if (backHalf463b >= 1 && frontHalf463b / shiftSceneIdxs463b.length > 0.7) {
        issues.push({
          location: `Relational distribution — ${frontHalf463b}/${shiftSceneIdxs463b.length} shift scenes in the first half`,
          rule: 'ARC_RELATIONAL_FRONT_LOADED',
          severity: 'minor',
          description: `${frontHalf463b} of the story's ${shiftSceneIdxs463b.length} relationship-shift scenes (${Math.round(frontHalf463b / shiftSceneIdxs463b.length * 100)}%) fall in the first half — bonds form and break early, then the relational world goes inert as the story nears its climax. The audience builds relational investment in the setup, then watches the back half resolve the plot with almost no further movement in who trusts, loves, or betrays whom. A relationally static climax squanders the bonds the opening established: the people stop changing toward each other exactly when the stakes peak.`,
          suggestedFix: `Carry relational movement into the back half: let the climax test or transform a bond rather than only resolving the plot. The relationships established early should pay off late — a trust that finally breaks under maximum pressure, an alliance forged in the crisis, a reconciliation that the ending earns. The peak of the story is where its bonds should move most, not least.`,
        });
      }
    }
  }

  // ARC_REVELATION_RELATIONAL_AFTERMATH_VOID (sequence/aftermath × revelation × relational
  // aftermath, n≥8, ≥2 revelations, each followed by ≥1 scene): Every revelation in the script is
  // followed by two scenes in which no relationship shifts — the immediate wake of every discovery
  // is relationally flat. A revelation typically reshapes bonds: learning the truth about who
  // someone is, or what they did, should change how the protagonist stands in relation to them in
  // the scenes that follow. When every discovery's aftermath leaves all bonds untouched, the
  // story's truths are informationally significant but relationally inert — the protagonist learns
  // things that never alter a single relationship.
  // Distinctness: ARC_REVELATION_EMOTION_ABSENT (Wave 337) audits the revelation SCENE ITSELF for
  // emotional charge; this audits the 2 scenes AFTER for relational response. ARC_TURN_EMOTIONAL_
  // AFTERMATH_VOID (Wave 449) is the same aftermath structure on the TURN trigger × EMOTION channel
  // — this is the REVELATION trigger × RELATIONAL channel, a distinct trigger/output pairing.
  // REVELATION_RELATIONSHIP_VOID (causality.ts Wave 419) checks the revelation scene's OWN
  // relationship co-occurrence; this checks the downstream aftermath.
  if (records.length >= 8) {
    const revScenes463c = (records as any[]).filter(r => r.revelation !== null && r.revelation !== undefined);
    if (revScenes463c.length >= 2) {
      const allRevsRelSilentAftermath463c = revScenes463c.every(rev => {
        const revIdx463c = (records as any[]).findIndex(r => (r as any).sceneIdx === (rev as any).sceneIdx);
        let checkedAny463c = false;
        for (let offset = 1; offset <= 2; offset++) {
          const nextIdx463c = revIdx463c + offset;
          if (nextIdx463c >= records.length) continue;
          checkedAny463c = true;
          if (((records as any[])[nextIdx463c].relationshipShifts ?? []).length > 0) return false;
        }
        return checkedAny463c;
      });
      if (allRevsRelSilentAftermath463c) {
        issues.push({
          location: `${revScenes463c.length} revelation aftermath(s) — no relationship shift within 2 scenes`,
          rule: 'ARC_REVELATION_RELATIONAL_AFTERMATH_VOID',
          severity: 'minor',
          description: `Every revelation (${revScenes463c.length} discoveries) is followed by two scenes in which no relationship shifts — the immediate wake of every truth is relationally flat. A revelation typically reshapes bonds: learning who someone really is, or what they did, should change how the protagonist stands toward them in the scenes that follow. When every discovery's aftermath leaves all bonds untouched, the story's truths are informationally significant but relationally inert — the protagonist learns things that never alter a single relationship.`,
          suggestedFix: `Let at least one revelation move a bond in its aftermath: in the scene or two after a discovery, have the truth redraw a relationship — trust withdrawn from someone exposed, an alliance forged with someone vindicated, distance opened or closed by what was learned. A revelation whose aftermath shifts a relationship has consequence beyond information; it changes the human world the protagonist moves through.`,
        });
      }
    }
  }

  // ── Wave 477: ARC_POSITIVE_RELATIONAL_AFTERMATH_VOID, ARC_TURN_ZONE_CLUSTER, ARC_PEAK_POSITIVE_UNCAUSED ──
  const n477 = records.length;

  // ARC_POSITIVE_RELATIONAL_AFTERMATH_VOID — Sequence/aftermath × positive-emotion × relational
  // aftermath (n≥8, ≥2 qualifying positive-emotion scenes not at last position). Every positive
  // emotional scene (emotionalShift === 'positive') is followed by 2 scenes in which no
  // relationship shifts. The protagonist's joys and triumphs never move a bond in their wake:
  // victories are felt emotionally but leave the relational world unchanged. The most affecting
  // dramatic moments are those where an emotional shift propagates into the interpersonal world —
  // a triumph that changes a relationship, a positive turn that rebuilds trust or opens a new
  // alliance — rather than remaining a private, relationally inert event.
  // Distinct from: ARC_REVELATION_RELATIONAL_AFTERMATH_VOID (Wave 463: revelation trigger →
  // relational aftermath; this is positive-emotion trigger → relational aftermath, a different
  // upstream event), ARC_TURN_EMOTIONAL_AFTERMATH_VOID (Wave 449: dramatic turn → emotional
  // aftermath; different trigger and different output channel), ARC_RELATIONAL_SHIFT_EMOTION_FLAT
  // (Wave 365: relationship-shift scenes are emotionally neutral; reverse direction — relationship
  // as trigger, emotion as output; here emotion is trigger and relationship is output).
  if (n477 >= 8) {
    const posScenes477a = (records as any[]).filter(r => r.emotionalShift === 'positive');
    const qualPos477a = posScenes477a.filter(r => {
      const idx477a = (records as any[]).findIndex(x => x.sceneIdx === r.sceneIdx);
      return idx477a >= 0 && idx477a < n477 - 1;
    });
    if (qualPos477a.length >= 2) {
      const allPosRelSilent477a = qualPos477a.every(r => {
        const idx477a = (records as any[]).findIndex(x => x.sceneIdx === r.sceneIdx);
        let checkedAny477a = false;
        for (let off = 1; off <= 2; off++) {
          const nextIdx477a = idx477a + off;
          if (nextIdx477a >= n477) continue;
          checkedAny477a = true;
          if (((records as any[])[nextIdx477a].relationshipShifts ?? []).length > 0) return false;
        }
        return checkedAny477a;
      });
      if (allPosRelSilent477a) {
        issues.push({
          location: `${qualPos477a.length} positive-emotion scene aftermath(s) — no relationship shift within 2 scenes`,
          rule: 'ARC_POSITIVE_RELATIONAL_AFTERMATH_VOID',
          severity: 'minor',
          description: `Every positive-emotion scene (${qualPos477a.length} qualifying) is followed by two scenes in which no relationship shifts — the protagonist's triumphs and joys never move a bond in their aftermath. A positive moment is most dramatically resonant when it propagates into the interpersonal world: a victory that rebuilds trust, a success that opens a new alliance, a relief that closes a rift. When every positive beat is relationally inert in its wake, the story treats joy as a private, internal event that carries no social or relational consequence — the protagonist feels positive, but nothing between the characters changes as a result.`,
          suggestedFix: `After at least one positive scene, let the emotional uplift move a relationship in the following scene or two: a character who was guarded opens up, a fractured bond starts to repair, or a new alliance forms from the shared positive experience. The aftermath of a positive beat is the natural moment for relational repair and deepening — staging it in relationally silent scenes wastes the emotional momentum just as it peaks.`,
        });
      }
    }
  }

  // ARC_TURN_ZONE_CLUSTER — Distribution/timing × dramatic-turn channel (n≥8, ≥4 turn scenes,
  // >75% in a single third). The story's pivots, reversals, and recognitions cluster in one
  // structural zone rather than distributing across the arc. When all the turns happen in one
  // third, the rest of the script passes without any directional change: the story coasts in two-
  // thirds of its arc without redirecting, accelerating, or reversing the protagonist's situation.
  // Dramatic turns work best when they punctuate the arc at all stages — an early turn sets new
  // direction, a mid-script turn escalates or reverses it, and a closing turn delivers the final
  // pivot that determines the resolution.
  // Distinct from: DRAMATIC_TURN_CLUSTER (causality.ts Wave 310: 3+ turns within a 3-scene micro-
  // window — within-window density concentration, not arc-level zone distribution), ARC_EMOTIONAL_
  // FRONT_LOADED / BACK_LOADED (distribution × emotional channel — a different signal), ARC_
  // RELATIONAL_FRONT_LOADED / BACK_LOADED (distribution × relational — different signal). First
  // distribution/timing check on the dramatic-turn channel in this pass.
  if (n477 >= 8) {
    const turnPositions477b = (records as any[])
      .map((r, pos) => ({ pos, hasTurn: (r.dramaticTurn ?? 'nothing') !== 'nothing' }))
      .filter(x => x.hasTurn)
      .map(x => x.pos);
    if (turnPositions477b.length >= 4) {
      const third477b = Math.floor(n477 / 3);
      const firstZ477b = turnPositions477b.filter(p => p < third477b).length;
      const midZ477b = turnPositions477b.filter(p => p >= third477b && p < 2 * third477b).length;
      const lastZ477b = turnPositions477b.filter(p => p >= 2 * third477b).length;
      const maxZ477b = Math.max(firstZ477b, midZ477b, lastZ477b);
      if (maxZ477b / turnPositions477b.length > 0.75) {
        const zone477b = firstZ477b === maxZ477b ? 'opening' : midZ477b === maxZ477b ? 'middle' : 'closing';
        issues.push({
          location: `${maxZ477b}/${turnPositions477b.length} dramatic-turn scene(s) in the ${zone477b} third`,
          rule: 'ARC_TURN_ZONE_CLUSTER',
          severity: 'minor',
          description: `${maxZ477b} of ${turnPositions477b.length} dramatic-turn scenes (${(maxZ477b / turnPositions477b.length * 100).toFixed(0)}%) fall within the ${zone477b} third — the story's pivots, reversals, and recognitions are architecturally ghettoized into one zone. The other two-thirds of the script pass without any directional change: the protagonist's situation goes unreverted, unescalated, and unrecognized for most of the arc. Dramatic turns work best when they punctuate the story at all stages: early turns set direction, mid-script turns complicate or reverse it, and late turns force the final reckoning. Clustering all turns in the ${zone477b} zone creates a reversal-dense zone surrounded by structurally static territory.`,
          suggestedFix: `Redistribute at least one or two dramatic turns into the zones currently without a pivot. The goal is not equal distribution but structural coverage: each act should contain at least one moment where the protagonist's situation meaningfully changes direction. Look for scenes in the currently turn-empty zones where the story could deliver a smaller recognition, escalation, or reversal that prepares the audience for the major turns.`,
        });
      }
    }
  }

  // ARC_PEAK_POSITIVE_UNCAUSED — Backward-cause × single-peak × positive-emotion (n≥8, ≥1
  // qualifying positive scene with position ≥ 2). The script's final positive-emotion scene —
  // the most structurally climactic moment of joy or triumph — has no revelation, no dramatic
  // turn, and no suspense rise (suspenseDelta > 0) in the 2 scenes immediately preceding it.
  // The protagonist's peak positive moment arrives without any narrative cause motivating it: no
  // discovery produced the victory, no reversal set it in motion, and no escalating pressure
  // preceded the relief. The most emotionally significant positive beat should be the hardest-
  // won: caused by a specific narrative event that the audience has watched unfold.
  // Distinct from: ARC_PEAK_RELATIONAL_UNCAUSED (Wave 435: backward-cause × densest-relational
  // peak — a different peak type and different channel), ARC_EMOTIONAL_RECOVERY_ABSENT (Wave 351:
  // whether a positive beat exists after falls — timing, not cause), ARC_GRIEF_SKIPPED (Wave 298:
  // a negative scene immediately followed by positive — a sequence pair, not backward-cause on the
  // positive scene itself). First backward-cause check targeting the positive-emotion channel peak.
  if (n477 >= 8) {
    const posPositions477c = (records as any[])
      .map((r, pos) => ({ pos, r }))
      .filter(x => x.r.emotionalShift === 'positive' && x.pos >= 2);
    if (posPositions477c.length >= 1) {
      // The "peak" is the last positive scene (most climactically positioned)
      const peakPos477c = posPositions477c[posPositions477c.length - 1].pos;
      let hasCause477c = false;
      for (let off = 1; off <= 2; off++) {
        const priorIdx477c = peakPos477c - off;
        if (priorIdx477c < 0) continue;
        const prior477c = (records as any[])[priorIdx477c];
        if (prior477c.revelation !== null && prior477c.revelation !== undefined) { hasCause477c = true; break; }
        if ((prior477c.dramaticTurn ?? 'nothing') !== 'nothing') { hasCause477c = true; break; }
        if ((prior477c.suspenseDelta ?? 0) > 0) { hasCause477c = true; break; }
      }
      if (!hasCause477c) {
        issues.push({
          location: `Scene ${(records as any[])[peakPos477c].sceneIdx} — script's final positive-emotion scene, no prior causal driver`,
          rule: 'ARC_PEAK_POSITIVE_UNCAUSED',
          severity: 'minor',
          description: `The script's final positive-emotion scene (Scene ${(records as any[])[peakPos477c].sceneIdx}) — the most structurally climactic moment of joy or triumph — has no revelation, no dramatic turn, and no suspense rise in the two preceding scenes. The protagonist's peak positive moment arrives without any narrative driver: no discovery produced the victory, no reversal set it in motion, and no escalating pressure preceded the relief. The most emotionally significant positive beat should be the hardest-won — caused by a specific story event that the audience has watched build. An uncaused climactic joy feels like a tonal gift rather than a dramatic resolution.`,
          suggestedFix: `Plant a causal driver in one or both of the two scenes before the climactic positive moment: a revelation whose truth paves the way for the victory, a dramatic turn that opens the door to the positive outcome, or an escalating suspense beat that the positive scene resolves. The goal is that the audience can trace a line from a specific narrative event to the emotional peak — so the joy feels earned by the story, not granted by the author.`,
        });
      }
    }
  }

  // ── Wave 491: ARC_CLOCK_PEAK_EMOTION_ABSENT, ARC_PAYOFF_EMOTION_DECOUPLED, ARC_PAYOFF_AFTERMATH_EMOTIONAL_VOID ──

  // ARC_CLOCK_PEAK_EMOTION_ABSENT — Single-peak isolation × clock-delta × emotion.
  // n≥8, ≥2 non-neutral emotional scenes. Find the scene with the highest clockDelta (> 0).
  // If that scene is emotionally neutral while ≥2 other scenes carry emotion → fire. The story's
  // maximum deadline escalation passes without the protagonist feeling anything — peak time
  // pressure is emotionally inert while the arc otherwise carries feeling.
  // Distinct from: ARC_CLOCK_EMOTION_DECOUPLED (Wave 435: co-occurrence × all clockRaised scenes
  // neutral; this is single-peak isolation × highest clockDelta — different analytical mode and a
  // different trigger signal), ARC_PEAK_SUSPENSE_EMOTION_ABSENT / ARC_PEAK_CURIOSITY_EMOTION_ABSENT
  // (same mode but suspense and curiosity channels respectively; this fills the clockDelta cell in
  // the single-peak × emotion family). First check in this pass targeting the clockDelta channel
  // with single-peak isolation mode.
  {
    const n491a = records.length;
    if (n491a >= 8) {
      const emotionalScenes491a = (records as any[]).filter(r => r.emotionalShift !== 'neutral');
      if (emotionalScenes491a.length >= 2) {
        const clockDeltas491a = (records as any[]).map(r => r.clockDelta ?? 0);
        const maxClockDelta491a = Math.max(...clockDeltas491a);
        if (maxClockDelta491a > 0) {
          const peakClockIdx491a = clockDeltas491a.indexOf(maxClockDelta491a);
          const peakIsNeutral491a = (records as any[])[peakClockIdx491a].emotionalShift === 'neutral';
          if (peakIsNeutral491a) {
            const peakRec491a = (records as any[])[peakClockIdx491a];
            issues.push({
              location: `Scene ${peakRec491a.sceneIdx} (${peakRec491a.slug}) — peak clockDelta (${maxClockDelta491a}) is emotionally neutral`,
              rule: 'ARC_CLOCK_PEAK_EMOTION_ABSENT',
              severity: 'minor',
              description: `The scene with the greatest time-pressure escalation (clockDelta ${maxClockDelta491a}) is emotionally neutral, while ${emotionalScenes491a.length} other scenes carry emotional charge. The story's maximum deadline moment — the single most urgent clock beat — passes without the protagonist registering any felt response. Clock pressure should generate experienced stakes: urgency that translates into the protagonist's emotional state, turning a logistical escalation into a felt crisis. When the clock peak is emotionally inert while the story otherwise carries feeling, the deadline system is decoupled from the character's inner life at precisely the moment of maximum urgency.`,
              suggestedFix: `Give scene ${peakRec491a.sceneIdx} an emotional shift — negative (the weight of the deadline landing as dread or despair) or positive (desperate hope or defiance against the clock). The protagonist's peak urgency moment should also be their most emotionally pressured moment: the clock and the feeling should compound rather than run on parallel tracks.`,
            });
          }
        }
      }
    }
  }

  // ARC_PAYOFF_EMOTION_DECOUPLED — Co-occurrence × payoff × emotion.
  // n≥8, ≥3 payoff scenes (payoffSetupIds.length > 0), ≥2 non-neutral emotional scenes.
  // All payoff scenes are emotionally neutral → fire. Thread resolutions never move the
  // protagonist — every promise kept is delivered without any felt charge.
  // Distinct from: ARC_CLOCK_EMOTION_DECOUPLED (Wave 435: clock-raise × emotion; this is the
  // payoff-channel parallel completing the event-type × emotion co-occurrence family), ARC_CURIOSITY_
  // RELATIONAL_DECOUPLED / ARC_SUSPENSE_RELATIONAL_DECOUPLED (co-occurrence × relational output
  // channel, not emotional output), PAYOFF_NO_EMOTION in causality.ts (same logical test from the
  // causality pass's perspective; this is the character-arc framing — asking whether the protagonist's
  // arc ever feels the promise being kept, not just whether the story is causally inert at payoffs).
  {
    const payoffScenes491b = (records as any[]).filter(r => (r.payoffSetupIds ?? []).length > 0);
    const emotionalScenes491b = (records as any[]).filter(r => r.emotionalShift !== 'neutral');
    if (records.length >= 8 && payoffScenes491b.length >= 3 && emotionalScenes491b.length >= 2) {
      const allPayoffNeutral491b = payoffScenes491b.every(r => r.emotionalShift === 'neutral');
      if (allPayoffNeutral491b) {
        issues.push({
          location: `${payoffScenes491b.length} payoff scene(s) — all emotionally neutral`,
          rule: 'ARC_PAYOFF_EMOTION_DECOUPLED',
          severity: 'minor',
          description: `Every one of the ${payoffScenes491b.length} thread-resolution scenes is emotionally neutral, while ${emotionalScenes491b.length} other scenes carry emotional charge. The protagonist never feels the satisfaction, relief, grief, or triumph of a resolved thread — payoffs deliver their dramatic resolution without any accompanying emotional stake. A payoff is among the most charged moments of a story: it answers a question the audience has been carrying, confirms or destroys what they hoped for, and completes an arc. When the protagonist registers no feeling at payoff moments, the story's structural satisfactions are delivered without emotional weight.`,
          suggestedFix: `Give at least one payoff scene a non-neutral emotional shift — positive (relief, satisfaction, triumph when a hope is answered) or negative (grief, loss, bitter irony when the resolution costs more than expected). The protagonist's emotional state during a payoff signals to the audience what the resolution means: it teaches them how to feel about the story keeping its promises.`,
        });
      }
    }
  }

  // ARC_PAYOFF_AFTERMATH_EMOTIONAL_VOID — Sequence/aftermath × payoff → emotional aftermath.
  // n≥8, ≥3 payoff scenes (payoffSetupIds.length > 0) not at last position. The scene immediately
  // following each payoff is emotionally neutral → fire. Thread resolutions don't produce any
  // felt reaction in the next beat — each resolved promise is followed by an inert scene.
  // Distinct from: ARC_PAYOFF_EMOTION_DECOUPLED (co-occurrence checking the payoff scene ITSELF;
  // this checks the NEXT scene — aftermath direction, different temporal slot), ARC_TURN_EMOTIONAL_
  // AFTERMATH_VOID (Wave 449: same analytical mode but dramatic-turn trigger → emotion output; this
  // is payoff trigger → emotion output), ARC_REVELATION_RELATIONAL_AFTERMATH_VOID (Wave 463: same
  // mode but revelation trigger and relational output channel — both trigger and channel differ).
  {
    const qualPayoffs491c = (records as any[])
      .map((r, pos) => ({ r, pos }))
      .filter(({ r, pos }) => (r.payoffSetupIds ?? []).length > 0 && pos < records.length - 1);
    if (records.length >= 8 && qualPayoffs491c.length >= 3) {
      const allPayoffAftermathNeutral491c = qualPayoffs491c.every(({ pos }) => {
        const next = (records as any[])[pos + 1];
        return next.emotionalShift === 'neutral';
      });
      if (allPayoffAftermathNeutral491c) {
        issues.push({
          location: `${qualPayoffs491c.length} payoff scene(s) — each followed immediately by an emotionally neutral scene`,
          rule: 'ARC_PAYOFF_AFTERMATH_EMOTIONAL_VOID',
          severity: 'minor',
          description: `Every qualifying payoff scene (${qualPayoffs491c.length} total) is immediately followed by an emotionally neutral scene — thread resolutions never produce any felt reaction in the protagonist or the story world in the next beat. The scene after a payoff is when the resolution lands most concretely: what did the protagonist gain or lose? How does fulfilling this promise change their state? When the payoff aftermath is always neutral, resolutions are delivered and then absorbed without register — the audience gets no signal about how to feel about the story having kept its promises.`,
          suggestedFix: `After at least one payoff scene, give the immediately following scene a non-neutral emotional shift: positive emotion (relief or triumph when the resolution is hoped-for) or negative (grief or bitterness when it comes at a cost or fails an expectation). The beat after a resolved thread is the most natural place for emotional landing.`,
        });
      }
    }
  }

  // ── Wave 505 checks ──────────────────────────────────────────────────────────

  // ARC_SEED_EMOTIONAL_AFTERMATH_VOID — Sequence/aftermath × seed → emotional aftermath.
  // n≥8, ≥2 seed scenes (seededClueIds.length > 0) not at last position. All seed scenes are
  // immediately followed by an emotionally neutral scene → fire. When the protagonist plants
  // foreshadowing (a clue, a mysterious object, a portent), the next scene should register
  // emotional consequence — a felt unease, a quickened anticipation, or a reaction that shows
  // the planted material has registered in the protagonist's inner life. When seeds consistently
  // precede neutral scenes, the foreshadowing is mechanically present but emotionally inert —
  // the character is planting clues without the narrative registering that planting as meaningful.
  // Distinct from: ARC_REVELATION_RELATIONAL_AFTERMATH_VOID (Wave 463: revelation trigger ×
  // relational channel — different trigger and different channel), ARC_TURN_EMOTIONAL_AFTERMATH_VOID
  // (Wave 449: turn trigger), ARC_PAYOFF_AFTERMATH_EMOTIONAL_VOID (Wave 491: payoff trigger),
  // ARC_POSITIVE_RELATIONAL_AFTERMATH_VOID (Wave 477: positive-emotion trigger, relational channel),
  // SEED_AFTERMATH_CURIOSITY_VOID in causality.ts (sequence/aftermath × seed → curiosity in the
  // structural channel — different pass and different aftermath channel: curiosity, not emotion).
  {
    const n505a = records.length;
    if (n505a >= 8) {
      const seedAndNext505a = (records as any[])
        .map((r, pos) => ({ pos, hasSeed: ((r.seededClueIds ?? []) as any[]).length > 0 }))
        .filter(x => x.hasSeed && x.pos < n505a - 1);
      if (seedAndNext505a.length >= 2) {
        const allSeedAfterNeutral505a = seedAndNext505a.every(
          x => (records as any[])[x.pos + 1].emotionalShift === 'neutral',
        );
        if (allSeedAfterNeutral505a) {
          issues.push({
            location: `${seedAndNext505a.length} seed scene(s) — all followed by emotionally neutral scenes`,
            rule: 'ARC_SEED_EMOTIONAL_AFTERMATH_VOID',
            severity: 'minor',
            description: `Every one of the ${seedAndNext505a.length} clue-planting scene(s) is immediately followed by a scene with a neutral emotional register. When the protagonist plants foreshadowing, the next scene should carry emotional consequence — unease, anticipation, or a reaction that confirms the planted material has registered in their inner life. When seeds consistently precede emotional vacuums, the foreshadowing is mechanically woven but affectively inert: the character plants clues without any felt sense that the planting matters.`,
            suggestedFix: `After at least one seed scene, give the immediately following scene a non-neutral emotional register — the protagonist who planted the clue should feel something in the next beat: unease about what they've set in motion, anticipation about whether it will pay off, or discomfort at the implications of what they've foreshadowed. Foreshadowing lands hardest when its aftermath carries emotional weight.`,
          });
        }
      }
    }
  }

  // ARC_CLOCK_CURIOSITY_AFTERMATH_VOID — Average/aggregate × clockRaised → curiosity aftermath.
  // n≥8, ≥2 clockRaised scenes not at last position. Average curiosityDelta of the scene
  // immediately following each clock-raised scene ≤ 0 → fire. When a deadline is established,
  // the next scene should ignite wondering in the protagonist: what are the options? how much
  // time remains? what must be sacrificed? A clock that never generates curiosity in its aftermath
  // functions as a mechanical constraint rather than a narrative opening — it closes possibilities
  // without prompting the audience (through the protagonist's wondering) to explore them.
  // Distinct from: ARC_CLOCK_EMOTION_DECOUPLED (Wave 435: co-occurrence × clockRaised × emotion —
  // checks the clock scene's OWN emotion, not the NEXT scene's curiosity), ARC_CLOCK_PEAK_EMOTION_
  // ABSENT (Wave 491: single-peak × clockDelta × the peak scene's own emotion), CLOCK_RAISE_
  // CURIOSITY_VOID in causality.ts (average/aggregate × clockRaised × the clock scene's OWN
  // curiosityDelta — different pass and different time slot: own scene not next scene), SEED_
  // AFTERMATH_CURIOSITY_VOID in causality.ts (different trigger: seed, not clock). First check
  // in this pass pairing a clock trigger with a curiosity aftermath reading.
  {
    const n505b = records.length;
    if (n505b >= 8) {
      const clockAndNext505b = (records as any[])
        .map((r, pos) => ({ pos, raised: !!(r.clockRaised) }))
        .filter(x => x.raised && x.pos < n505b - 1);
      if (clockAndNext505b.length >= 2) {
        const totalCurAfter505b = clockAndNext505b.reduce(
          (sum, x) => sum + (((records as any[])[x.pos + 1] as any).curiosityDelta ?? 0),
          0,
        );
        const avgCurAfter505b = totalCurAfter505b / clockAndNext505b.length;
        if (avgCurAfter505b <= 0) {
          issues.push({
            location: `${clockAndNext505b.length} clock scene(s) — avg post-clock curiosityDelta ${avgCurAfter505b.toFixed(2)}`,
            rule: 'ARC_CLOCK_CURIOSITY_AFTERMATH_VOID',
            severity: 'minor',
            description: `Across ${clockAndNext505b.length} scenes in which a clock or deadline is raised, the scene immediately following each averages a curiosityDelta of ${avgCurAfter505b.toFixed(2)} (≤ 0). When a deadline is established, the next beat should ignite wondering — what are the protagonist's options? how much time remains? what must be sacrificed? A clock that consistently generates zero or negative curiosity in its aftermath functions as a mechanical constraint rather than a dramatic opening: it imposes urgency without the wondering that gives urgency its meaning.`,
            suggestedFix: `After at least one clock-raised scene, ensure the next scene carries positive curiosity — a character actively thinking through their options, a discovery that raises a new question about how the deadline can be met, or a complication that makes the constraint feel genuinely open-ended rather than predetermined. Clocks are most powerful when they generate wondering, not just pressure.`,
          });
        }
      }
    }
  }

  // ARC_PAYOFF_DROUGHT_RUN — Run-based × payoff absence × consecutive run.
  // n≥10, ≥2 payoff scenes (payoffSetupIds.length > 0). Longest consecutive run of scenes with
  // no payoff event ≥ 6 → fire. A payoff drought of six or more scenes means the story goes
  // through a significant stretch without resolving any planted promise — the foreshadowing
  // engine runs but the delivery engine is idle for too long. Audiences track setup-payoff
  // contracts; when payoffs are absent for an extended run, the sense that the story is building
  // toward something degrades, because no promise is ever being cashed.
  // Distinct from: ARC_RELATIONAL_DROUGHT_RUN (Wave 449: run-based × relational channel — different
  // channel), ARC_NEGATIVE_EMOTION_RUN / ARC_POSITIVE_EMOTION_RUN (Wave 379/393: run-based on
  // emotion channel), PAYOFF_BACK_LOADED in causality.ts (Zone presence/absence — first half vs.
  // second half binary split; this measures consecutive run length regardless of which structural
  // half), PAYOFF_ZONE_CLUSTER in causality.ts (distribution/timing × thirds — a different mode).
  {
    const n505c = records.length;
    if (n505c >= 10) {
      const payoffSceneSet505c = new Set(
        (records as any[])
          .filter(r => ((r.payoffSetupIds ?? []) as any[]).length > 0)
          .map(r => r.sceneIdx),
      );
      if (payoffSceneSet505c.size >= 2) {
        let maxPayoffDrought505c = 0;
        let curDrought505c = 0;
        for (const r of records as any[]) {
          if (payoffSceneSet505c.has(r.sceneIdx)) {
            curDrought505c = 0;
          } else {
            if (++curDrought505c > maxPayoffDrought505c) maxPayoffDrought505c = curDrought505c;
          }
        }
        if (maxPayoffDrought505c >= 6) {
          issues.push({
            location: `longest payoff-free run: ${maxPayoffDrought505c} scenes`,
            rule: 'ARC_PAYOFF_DROUGHT_RUN',
            severity: 'minor',
            description: `The script contains a run of ${maxPayoffDrought505c} consecutive scenes in which no planted narrative promise is resolved. A payoff drought of ${maxPayoffDrought505c} scenes means the story goes through a significant stretch with the foreshadowing engine running but the delivery engine idle. Audiences track setup-payoff contracts; when no promise is cashed for an extended run, the sense that the story is building toward something degrades — the planted threads feel increasingly like dead weight rather than live lines of expectation.`,
            suggestedFix: `Introduce a payoff scene within the ${maxPayoffDrought505c}-scene drought window to confirm that at least one planted promise is still alive and being honored. Not every payoff needs to be a climactic reveal — a smaller thread resolving, a detail from an earlier scene returning with new significance, or a partial disclosure can serve as a payoff beat that keeps the audience's sense of forward motion intact.`,
          });
        }
      }
    }
  }

  // ── Wave 519 checks ──────────────────────────────────────────────────────
  {
    // ARC_CURIOSITY_DROUGHT_RUN — run-based × curiosityDelta × absence
    // Checks whether curiosity-positive scenes exist but the script contains an extended
    // consecutive run where curiosity never rises. Wonder that appears then vanishes for
    // ≥6 scenes in a row signals a curiosity engine that keeps stalling, leaving the
    // audience unhooked between peaks.
    // Distinctness: first run-based check on the curiosity channel. ARC_RELATIONAL_DROUGHT_RUN
    // and ARC_PAYOFF_DROUGHT_RUN use the same mode on relational/payoff channels. All other
    // curiosity checks (ARC_CURIOSITY_PLATEAU, ARC_PEAK_CURIOSITY_EMOTION_ABSENT, ARC_CURIOSITY_
    // RELATIONAL_DECOUPLED, ARC_REVELATION_CURIOSITY_DECOUPLED, ARC_CLOCK_CURIOSITY_AFTERMATH_VOID)
    // use zone, single-peak, co-occurrence, or average modes.
    const n519a = records.length;
    const curiosPos519 = (records as any[]).filter(r => (r.curiosityDelta ?? 0) > 0);
    if (n519a >= 10 && curiosPos519.length >= 3) {
      let maxCuriousDrought519 = 0;
      let curRun519 = 0;
      for (const r of (records as any[])) {
        if ((r.curiosityDelta ?? 0) <= 0) {
          curRun519++;
          if (curRun519 > maxCuriousDrought519) maxCuriousDrought519 = curRun519;
        } else {
          curRun519 = 0;
        }
      }
      if (maxCuriousDrought519 >= 6) {
        issues.push({
          location: `longest curiosity-flat run: ${maxCuriousDrought519} scenes`,
          rule: 'ARC_CURIOSITY_DROUGHT_RUN',
          severity: 'minor',
          description: `The script's curiosity engine fires in ${curiosPos519.length} scenes but then stalls for a run of ${maxCuriousDrought519} consecutive scenes where curiosityDelta never rises above zero. A drought of ${maxCuriousDrought519} scenes means the audience's open questions go unrefreshed for a substantial stretch. Unlike a deliberate pause, a curiosity drought of this length risks the audience abandoning or prematurely resolving the story's open threads, draining forward momentum.`,
          suggestedFix: `Introduce at least one curiosity-raising moment within the ${maxCuriousDrought519}-scene drought — a partial disclosure, a new question surfaced, or a detail that reframes what the audience thought they understood. This restarts the wondering engine and maintains the sense that the story is still concealing things worth discovering.`,
        });
      }
    }
  }

  {
    // ARC_SUSPENSE_FRONT_LOADED — distribution/timing × suspenseDelta × first half
    // Fires when >70% of suspense-raising scenes are concentrated in the first half while
    // the back half carries only a fraction. Suspense that peaks early and dwindles as the
    // story approaches its climax inverts the expected dramatic curve.
    // Distinctness: first distribution/timing check on the suspense channel. ARC_EMOTIONAL_
    // FRONT_LOADED and ARC_RELATIONAL_FRONT_LOADED use the same mode on other channels.
    // ARC_PEAK_SUSPENSE_EMOTION_ABSENT uses single-peak not distribution. ARC_SUSPENSE_EMOTION_
    // DECOUPLED uses co-occurrence. No prior check measures suspense concentration across
    // the temporal axis in distribution terms.
    const n519b = records.length;
    const half519b = Math.floor(n519b / 2);
    const suspenseScenes519b = (records as any[]).filter(r => (r.suspenseDelta ?? 0) > 0);
    if (n519b >= 8 && suspenseScenes519b.length >= 4) {
      const frontCount519b = (records as any[]).slice(0, half519b).filter(r => (r.suspenseDelta ?? 0) > 0).length;
      const backCount519b = suspenseScenes519b.length - frontCount519b;
      const ratio519b = frontCount519b / suspenseScenes519b.length;
      if (ratio519b > 0.70 && backCount519b >= 1) {
        issues.push({
          location: `suspense distribution: ${frontCount519b} front / ${backCount519b} back`,
          rule: 'ARC_SUSPENSE_FRONT_LOADED',
          severity: 'minor',
          description: `${Math.round(ratio519b * 100)}% of the script's suspense-raising moments (${frontCount519b} of ${suspenseScenes519b.length}) fall in the first half, leaving the back half with only ${backCount519b}. A story where tension accumulates early then dissipates toward the climax inverts the expected dramatic curve — the audience is most on edge at the start and progressively calmer as events approach resolution. Suspense should intensify into the climax, not exhaust itself before it.`,
          suggestedFix: `Redistribute suspense by adding or relocating tension-raising scenes into the second half, especially the final third. A new obstacle, a narrowing escape window, or a secret threatening to surface can re-establish the rising tension that should accelerate as the story approaches its climax.`,
        });
      }
    }
  }

  {
    // ARC_CLOCK_OPENING_ZONE_ABSENT — zone presence/absence × clockRaised × opening third
    // Detects scripts where deadline pressure exists but never appears in the opening structural
    // third. A clock that doesn't tick until Act 2 means the audience spends the setup without
    // urgency — they don't know time is running out, so the protagonist's choices carry no
    // cost-of-delay.
    // Distinctness: first zone check on the clockRaised channel targeting the opening third.
    // ARC_LATE_RELATIONAL_VOID, ARC_RELATIONAL_MIDPOINT_VOID, and ARC_RELATIONAL_FIRST_HALF_FLAT
    // all use zone mode on the relational channel. ARC_CLOCK_EMOTION_DECOUPLED uses co-occurrence,
    // ARC_CLOCK_PEAK_EMOTION_ABSENT uses single-peak, ARC_CLOCK_CURIOSITY_AFTERMATH_VOID uses
    // average/aftermath — none target an opening-zone absence on the clock channel.
    const n519c = records.length;
    const openingThird519c = Math.floor(n519c / 3);
    const clockScenes519c = (records as any[]).filter(r => r.clockRaised === true);
    if (n519c >= 9 && clockScenes519c.length >= 3) {
      const clockInOpening519c = (records as any[]).slice(0, openingThird519c).some(r => r.clockRaised === true);
      if (!clockInOpening519c) {
        issues.push({
          location: `opening third (scenes 1–${openingThird519c}): no clock raised`,
          rule: 'ARC_CLOCK_OPENING_ZONE_ABSENT',
          severity: 'minor',
          description: `The script raises ${clockScenes519c.length} deadline beats but none appear in the opening structural third (scenes 1–${openingThird519c}). Introducing a clock is how a story tells the audience that choices cost time — without it, the protagonist's actions in the setup carry no urgency. When the deadline only surfaces in Act 2 or later, the audience must retroactively apply time pressure to scenes they experienced as open-ended, weakening the structural logic of the story's first movement.`,
          suggestedFix: `Introduce at least one clockRaised beat in the opening structural third — a looming deadline established early, a window closing, or a timer started. This does not require the full stakes to be visible; even a hint that time is limited changes how the audience weighs every subsequent scene in the setup.`,
        });
      }
    }
  }

  // ── Wave 533: ARC_CURIOSITY_PEAK_RELATIONAL_VOID, ARC_DRAMATIC_TURN_EMOTIONAL_AFTERMATH_VOID,
  //              ARC_CURIOSITY_BACK_LOADED ─────────────────────────────────────────────────────────

  // ARC_CURIOSITY_PEAK_RELATIONAL_VOID — Single-peak isolation × curiosityDelta × relationship.
  // n≥8, ≥2 scenes with non-empty relationshipShifts, ≥2 scenes with curiosityDelta > 0. The scene
  // with the highest curiosityDelta has no relationship shift. The story's single most intriguing
  // moment — the peak of audience wonder — arrives without any bond dimension: no relationship is
  // tested, altered, or deepened at the apex of the story's mystery engine. The most powerful wonder
  // moments tend to be socially inhabited: what we want to know about the plot is often entangled
  // with what we want to know about the people and their relationships. When the peak of curiosity
  // is relationally inert, the story's maximum intrigue is a purely intellectual event.
  // Distinct from: ARC_CLOCK_PEAK_EMOTION_ABSENT (single-peak × clockDelta × emotion — different
  // peak signal and different correlated channel), ARC_PEAK_SUSPENSE_EMOTION_ABSENT (single-peak ×
  // suspenseDelta × emotion — different peak signal), ARC_SUSPENSE_RELATIONAL_DECOUPLED (co-
  // occurrence × suspense × relationship — different mode: aggregate, not single-peak). First
  // single-peak isolation check on the curiosity channel in this pass.
  {
    const n533a = records.length;
    if (n533a >= 8) {
      const relScenes533a = (records as any[]).filter(r => ((r.relationshipShifts ?? []) as any[]).length > 0);
      const curScenes533a = (records as any[]).filter(r => (r.curiosityDelta ?? 0) > 0);
      if (relScenes533a.length >= 2 && curScenes533a.length >= 2) {
        const maxCur533a = Math.max(...(records as any[]).map(r => r.curiosityDelta ?? 0));
        const peakCurIdx533a = (records as any[]).findIndex(r => (r.curiosityDelta ?? 0) === maxCur533a);
        if (peakCurIdx533a >= 0) {
          const peakRec533a = (records as any[])[peakCurIdx533a];
          const peakHasRel533a = ((peakRec533a.relationshipShifts ?? []) as any[]).length > 0;
          if (!peakHasRel533a) {
            issues.push({
              location: `Scene ${peakRec533a.sceneIdx} (${peakRec533a.slug}) — peak curiosityDelta (${maxCur533a}) with no relationship shift`,
              rule: 'ARC_CURIOSITY_PEAK_RELATIONAL_VOID',
              severity: 'minor',
              description: `The scene with the story's highest curiosityDelta (${maxCur533a} at scene ${peakRec533a.sceneIdx}) carries no relationship shift, despite the story having ${relScenes533a.length} scene(s) where bonds do move. The story's maximum moment of audience wonder — the apex of the mystery engine — is interpersonally inert: no bond is tested, deepened, or altered at the peak of intrigue. The most powerful wonder moments tend to be socially inhabited, because what we want to know about the plot is often entangled with what we want to know about the people. When the peak of curiosity is relationally void, the story's maximum intrigue is a purely intellectual event — audiences are gripped by the question but not by who will be affected by its answer.`,
              suggestedFix: `Give the scene with the highest curiosityDelta a relationship dimension: a bond tested by the mystery, a character whose relationship to another shifts as the intrigue peaks, or a disclosure that simultaneously raises a question and moves a human connection. The peak of audience wondering is the moment the story can most powerfully root the mystery in the people the audience cares about — the wonder becomes both intellectual and emotional.`,
            });
          }
        }
      }
    }
  }

  // ARC_DRAMATIC_TURN_EMOTIONAL_AFTERMATH_VOID — Sequence/aftermath × dramatic-turn → emotional
  // aftermath. n≥8, ≥3 qualifying dramatic-turn scenes (dramaticTurn not 'nothing'/empty, not at
  // last position). None of the immediately following scenes carries a non-neutral emotional shift.
  // A dramatic turn — a reversal, pivot, or structural gear-shift — is among the most emotionally
  // charged events in a story. The scene that immediately follows a turn is when the audience (and
  // the protagonist) absorb what just happened: the new reality should produce a felt emotional
  // response. When every dramatic-turn aftermath is emotionally neutral, the story's pivots are
  // structurally present but affectively inert — gear-shifts that move the plot without moving anyone.
  // Distinct from: ARC_POSITIVE_RELATIONAL_AFTERMATH_VOID (Wave 477: aftermath × positive emotion →
  // relationship; different trigger and channel), ARC_SEED_EMOTIONAL_AFTERMATH_VOID (Wave 505: seed
  // trigger — this is dramatic-turn trigger), ARC_DRAMATIC_TURN_AFTERMATH_VOID in causality.ts
  // (causality pass: checks causal channels — suspense, emotion, relationship simultaneously in the
  // 2 following scenes; this checks ONLY emotional shift in the IMMEDIATELY following scene and uses
  // a lower threshold of ≥3 turns). First aftermath check using dramatic-turn as trigger in this pass.
  {
    const n533b = records.length;
    if (n533b >= 8) {
      const turnAndNext533b = (records as any[])
        .map((r, pos) => ({ r, pos }))
        .filter(({ r, pos }) =>
          r.dramaticTurn !== undefined && r.dramaticTurn !== null &&
          r.dramaticTurn !== 'nothing' && r.dramaticTurn !== '' &&
          pos < n533b - 1,
        );
      if (turnAndNext533b.length >= 3) {
        const anyTurnAftermathEmotional533b = turnAndNext533b.some(({ pos }) => {
          const nextRec = (records as any[])[pos + 1];
          return nextRec.emotionalShift !== 'neutral' && nextRec.emotionalShift !== undefined;
        });
        if (!anyTurnAftermathEmotional533b) {
          issues.push({
            location: `${turnAndNext533b.length} dramatic-turn scene(s) — none followed by an emotional (non-neutral) scene`,
            rule: 'ARC_DRAMATIC_TURN_EMOTIONAL_AFTERMATH_VOID',
            severity: 'minor',
            description: `The script has ${turnAndNext533b.length} qualifying dramatic-turn scenes, but not one is followed by a scene carrying a non-neutral emotional shift. A dramatic turn — a reversal, pivot, or structural gear-shift — is among the most emotionally charged events in a story. The scene immediately following a turn is where the audience and the protagonist absorb what just happened: the new reality should produce a felt emotional response, whether that is the relief of an obstacle removed, the dread of a new threat, or the grief of a loss. When every dramatic-turn aftermath is emotionally neutral, the story's pivots are structurally present but affectively inert — gear-shifts that move the plot without moving anyone.`,
            suggestedFix: `Ensure at least one dramatic-turn scene is immediately followed by a scene with a non-neutral emotional shift — positive or negative. The emotional aftermath of a pivot does not need to be prolonged: even a single scene in which the protagonist (or another character) feels the weight of what has just changed gives the turn its human dimension. Structural pivots are most powerful when the audience not only understands the new situation but feels it.`,
          });
        }
      }
    }
  }

  // ARC_CURIOSITY_BACK_LOADED — Distribution/timing × curiosityDelta × second half.
  // n≥8, ≥4 scenes with curiosityDelta > 0 (wonder-generating scenes). >70% of those scenes fall
  // in the second half while the first half has ≥1. The story's wonder engine starts cold: the
  // audience spends the first half without significant intrigue, then receives a burst of questioning
  // energy only in the back half. Curiosity needs to be established early to sustain investment —
  // when wonder only arrives late, the audience has spent the first half without the questions that
  // make the second half's answers satisfying.
  // Distinct from: ARC_CURIOSITY_DROUGHT_RUN (Wave 519: run-based × consecutive absence — measures
  // sustained multi-scene stretches of zero curiosity, not arc-wide back-concentration), ARC_SUSPENSE_
  // FRONT_LOADED (Wave 519: distribution/timing × suspense × first half — different channel and
  // different polarity of concentration), CURIOSITY_FRONT_LOADED in causality.ts (Wave 268: checks
  // all curiosity spikes in first half — the opposite concentration pattern; this checks back-
  // concentration, completing the front-vs-back curiosity distribution pair across the two passes).
  {
    const n533c = records.length;
    const half533c = Math.floor(n533c / 2);
    const curScenes533c = (records as any[]).filter(r => (r.curiosityDelta ?? 0) > 0);
    if (n533c >= 8 && curScenes533c.length >= 4) {
      const backCount533c = (records as any[]).slice(half533c).filter(r => (r.curiosityDelta ?? 0) > 0).length;
      const frontCount533c = curScenes533c.length - backCount533c;
      const backRatio533c = backCount533c / curScenes533c.length;
      if (backRatio533c > 0.70 && frontCount533c >= 1) {
        issues.push({
          location: `curiosity distribution: ${frontCount533c} front-half / ${backCount533c} back-half`,
          rule: 'ARC_CURIOSITY_BACK_LOADED',
          severity: 'minor',
          description: `${Math.round(backRatio533c * 100)}% of the script's curiosity-generating moments (${backCount533c} of ${curScenes533c.length}) fall in the second half, leaving the first half with only ${frontCount533c}. The wonder engine starts cold: the audience spends the setup with minimal intrigue and only receives the questions that make a story compelling in the back half. Curiosity needs to be seeded early — the questions that the first half poses are what make the second half's answers feel earned and satisfying. When wondering only arrives late, the audience has no established stakes of "what happens next" to carry them through the opening act.`,
          suggestedFix: `Redistribute curiosity-generating moments into the first half of the story: plant a mystery, introduce a character whose motives are unclear, or open a question whose stakes become clear only later. The first half should establish questions that the second half answers — curiosity concentrated entirely in the back half means the story has made its audience wait for the experience that justifies their investment.`,
        });
      }
    }
  }

  // ── Wave 547: ARC_SUSPENSE_OPENING_ZONE_ABSENT, ARC_NEGATIVE_RELATIONAL_AFTERMATH_VOID,
  //              ARC_PAYOFF_FRONT_LOADED ──────────────────────────────────────────────────────────

  // ARC_SUSPENSE_OPENING_ZONE_ABSENT (zone presence/absence × suspenseDelta × opening third,
  // n≥9, ≥3 suspense-positive scenes globally, none in the opening structural third [pos < n/3]):
  // The protagonist enters the story without any felt tension in the setup zone — the first
  // structural third is entirely suspense-free while the rest of the story escalates. The
  // opening third's job is to anchor the audience to the stakes that the protagonist faces:
  // a setup that carries no raised tension tells the audience that what they are watching is
  // consequence-free during the period when their first impressions of the dramatic world are
  // forming. When suspense is entirely absent from the opening zone, the setup registers as
  // inert observation before tension eventually kicks in elsewhere. Zone presence/absence mode
  // × suspenseDelta × opening zone. Distinct from ARC_CLOCK_OPENING_ZONE_ABSENT (Wave 519:
  // clock-channel sibling — clockRaised in opening third; this audits suspenseDelta instead),
  // ARC_SUSPENSE_FRONT_LOADED (Wave 519: distribution/timing — >70% of suspense in first half;
  // fires when suspense IS concentrated there, the opposite structural problem), ARC_FIRST_HALF_
  // EMOTIONALLY_FLAT (Wave 312: entire first half emotionally neutral — emotion not suspense).
  {
    const n547a = records.length;
    if (n547a >= 9) {
      const third547a = Math.floor(n547a / 3);
      const suspScenes547a = (records as any[]).filter(r => (r.suspenseDelta ?? 0) > 0);
      if (suspScenes547a.length >= 3) {
        const openingSuspCount547a = (records as any[]).filter(
          (r, i) => i < third547a && (r.suspenseDelta ?? 0) > 0,
        ).length;
        if (openingSuspCount547a === 0) {
          issues.push({
            location: `Opening third (scenes 0–${third547a - 1}) — no suspense-positive scene`,
            rule: 'ARC_SUSPENSE_OPENING_ZONE_ABSENT',
            severity: 'minor',
            description: `The opening structural third of the story (scenes 0–${third547a - 1}) contains no scene with a positive suspenseDelta — the setup zone is entirely tension-free — while ${suspScenes547a.length} suspense-positive scenes exist in the remaining two-thirds. The opening third is when the audience forms their first understanding of the stakes: what the protagonist has to lose, what danger the world contains, what makes the situation feel pressing. When the setup zone carries no raised tension, the audience enters the story without the felt pressure that would give the protagonist's choices dramatic weight. Tension that only begins after the opening third asks the audience to invest in events before they have been given any reason to care what happens.`,
            suggestedFix: `Place at least one suspense-positive scene in the opening third (scenes 0–${third547a - 1}): a moment where the stakes are made tangible through rising tension — a threat introduced, a deadline implied, a danger made real. The opening zone doesn't need the story's maximum tension, but it needs enough to tell the audience that what they are watching has consequences: that the protagonist's world is one where things can go wrong, and are beginning to.`,
          });
        }
      }
    }
  }

  // ARC_NEGATIVE_RELATIONAL_AFTERMATH_VOID (sequence/aftermath × negative emotion → relational
  // aftermath, n≥8, ≥2 qualifying negative-emotion scenes [pos < n-2], ≥2 relationship-shift
  // scenes globally, none of the qualifying negative scenes is followed by a relationship shift
  // within 2 scenes): The protagonist's defeats never move bonds — every moment of negative
  // emotional charge passes without any relational consequence in the immediate aftermath. When
  // a character suffers, the people around them should respond: a relationship fractures, a bond
  // is tested, an alliance shifts, or an attachment deepens. When the protagonist's negative
  // experiences never trigger relational movement in the following scenes, loss and failure operate
  // as purely individual experiences disconnected from the interpersonal world. Sequence/aftermath
  // mode × negative-emotion trigger × relational aftermath. Distinct from ARC_POSITIVE_RELATIONAL_
  // AFTERMATH_VOID (Wave 477: positive trigger — the protagonist's joys never move bonds; this
  // audits the negative trigger, the opposite emotional polarity), ARC_REVELATION_RELATIONAL_
  // AFTERMATH_VOID (Wave 463: revelation trigger — different trigger, not emotional charge),
  // ARC_TURN_EMOTIONAL_AFTERMATH_VOID (Wave 449: dramatic-turn trigger → emotional aftermath —
  // different trigger and aftermath channel), ARC_RELATIONAL_SHIFT_EMOTION_FLAT (Wave 365:
  // co-occurrence × relational scene's own emotion — different mode and direction).
  {
    const n547b = records.length;
    if (n547b >= 8) {
      const relShiftScenes547b = (records as any[]).filter(
        r => ((r.relationshipShifts ?? []) as any[]).length > 0,
      );
      const qualNegScenes547b = (records as any[])
        .map((r, pos) => ({ r, pos }))
        .filter(({ r, pos }) => r.emotionalShift === 'negative' && pos < n547b - 2);
      if (relShiftScenes547b.length >= 2 && qualNegScenes547b.length >= 2) {
        const anyNegFollowedByRel547b = qualNegScenes547b.some(({ pos }) => {
          const next1 = (records as any[])[pos + 1];
          const next2 = (records as any[])[pos + 2];
          return (
            (next1 && ((next1.relationshipShifts ?? []) as any[]).length > 0) ||
            (next2 && ((next2.relationshipShifts ?? []) as any[]).length > 0)
          );
        });
        if (!anyNegFollowedByRel547b) {
          issues.push({
            location: `${qualNegScenes547b.length} negative-emotion scene(s) — none followed by a relationship shift within 2 scenes`,
            rule: 'ARC_NEGATIVE_RELATIONAL_AFTERMATH_VOID',
            severity: 'minor',
            description: `None of the story's ${qualNegScenes547b.length} negative-emotion scenes is followed by a relationship shift within the next two scenes, even though ${relShiftScenes547b.length} bond movements exist elsewhere. When the protagonist suffers — when something goes wrong, a failure lands, or a loss hits — the people around them should respond: a bond fractures under the pressure, an ally moves closer in support, an antagonist seizes the advantage. When the protagonist's defeats never trigger relational movement in the following beats, emotional losses operate as purely individual experiences disconnected from the interpersonal world. The story's adversity and its relational arc run as separate systems: the protagonist fails alone, and their bonds move independently, in scenes unconnected to the moments of defeat.`,
            suggestedFix: `After at least one negative-emotion scene, let the next one or two scenes carry a relationship shift — a bond that responds to the protagonist's setback. The relational consequence need not be dramatic: an ally who pulls back, a rival who presses forward, or a relationship whose dynamic shifts because of what just happened all connect the emotional world of defeat to the interpersonal world of consequences. The most resonant arcs show defeat not as a solitary experience but as something that reverberates through the protagonist's relationships.`,
          });
        }
      }
    }
  }

  // ARC_PAYOFF_FRONT_LOADED (distribution/timing × payoff × first-half concentration, n≥8,
  // ≥4 payoff scenes, >70% in the first half while the back half has ≥1): More than 70% of
  // the story's thread resolutions occur in the first half — narrative promises are fulfilled
  // before the pressure of the second half has peaked, leaving the climax and resolution with
  // diminished payoff architecture. Payoffs are structurally most powerful when they coincide
  // with or follow the story's maximum pressure: a narrative promise kept at a moment of high
  // stakes carries both the satisfaction of completion and the urgency of the dramatic context.
  // When payoffs front-load, the first half delivers most of the thread resolutions while the
  // escalation, climax, and resolution proceed without the structural satisfaction of kept
  // promises. Distribution/timing mode × payoff channel × first-half concentration. Distinct
  // from PAYOFF_BACK_LOADED in causality.ts (Wave 268: fires when all callbacks are in the
  // second half — the opposite concentration; this fires when the first half dominates),
  // ARC_PAYOFF_DROUGHT_RUN (Wave 505: run-based — longest consecutive non-payoff stretch ≥6;
  // different mode), ARC_PAYOFF_AFTERMATH_EMOTIONAL_VOID (Wave 491: aftermath mode, not timing),
  // ARC_EMOTIONAL_FRONT_LOADED and ARC_RELATIONAL_FRONT_LOADED (same temporal pattern on
  // different channels).
  {
    const n547c = records.length;
    if (n547c >= 8) {
      const half547c = Math.floor(n547c / 2);
      const payoffScenes547c = (records as any[]).filter(
        r => ((r.payoffSetupIds ?? []) as any[]).length > 0,
      );
      if (payoffScenes547c.length >= 4) {
        const frontCount547c = (records as any[]).slice(0, half547c).filter(
          r => ((r.payoffSetupIds ?? []) as any[]).length > 0,
        ).length;
        const backCount547c = payoffScenes547c.length - frontCount547c;
        const frontRatio547c = frontCount547c / payoffScenes547c.length;
        if (frontRatio547c > 0.70 && backCount547c >= 1) {
          issues.push({
            location: `payoff distribution: ${frontCount547c} front-half / ${backCount547c} back-half`,
            rule: 'ARC_PAYOFF_FRONT_LOADED',
            severity: 'minor',
            description: `${Math.round(frontRatio547c * 100)}% of the story's thread resolutions (${frontCount547c} of ${payoffScenes547c.length} payoff scenes) occur in the first half, with only ${backCount547c} in the second half. Most narrative promises are fulfilled before the story reaches its maximum pressure — payoffs arrive during the setup and initial complication rather than at the moments of escalation, climax, and resolution where their completion would carry the most weight. A payoff kept under high stakes is structurally more satisfying than the same payoff kept before the story has built the pressure that makes the kept promise feel urgent. When payoffs front-load, the back half must sustain the audience without the structural satisfaction of completed promises, and the climax resolves without the accumulated payoff architecture that would give it maximum weight.`,
            suggestedFix: `Redistribute at least ${Math.ceil(frontCount547c * 0.3)} of the first-half payoffs into the second half — hold some narrative promises longer and complete them as the story escalates toward its climax. The most structurally powerful payoff arrives at or near the climax: the promise kept under maximum pressure, the narrative setup that pays off when the protagonist most needs it or when its completion changes what the audience understands about the resolution. Hold back some payoffs and let the back half carry more of the thread completions.`,
          });
        }
      }
    }
  }

  // ── Wave 561: ARC_SUSPENSE_DROUGHT_RUN, ARC_RELATIONAL_ZONE_CLUSTER,
  //              ARC_CLOCK_RELATIONAL_AFTERMATH_VOID ──────────────────────────────────────────────

  // ARC_SUSPENSE_DROUGHT_RUN (run-based × suspenseDelta × absence, n≥10, ≥3 suspense-positive
  // scenes globally, longest consecutive run of scenes with suspenseDelta ≤ 0 is ≥ 6): The
  // story's tension engine stalls for an extended consecutive stretch — six or more scenes pass
  // in a row with no raised suspense, even though suspense rises elsewhere. A run-based drought is
  // distinct from a distribution skew: the suspense may be perfectly balanced front-to-back across
  // the script and still contain a dead zone in the middle where the audience's felt pressure
  // flatlines for a sixth of the runtime or more. An extended tension drought lets the dramatic
  // grip go slack: the audience, having been shown that this is a story where tension can rise,
  // spends a long uninterrupted stretch with no pressure on the protagonist, and the momentum the
  // earlier suspense built dissipates before the next rise can recover it. Run-based mode ×
  // suspenseDelta × absence. Distinct from ARC_SUSPENSE_FRONT_LOADED (Wave 519: distribution/timing
  // — >70% of suspense in first half; a global skew, not a local consecutive run), ARC_SUSPENSE_
  // OPENING_ZONE_ABSENT (Wave 547: zone presence/absence — opening third has none; a fixed-zone
  // check, not a sliding run anywhere in the script), ARC_CURIOSITY_DROUGHT_RUN / ARC_RELATIONAL_
  // DROUGHT_RUN / ARC_PAYOFF_DROUGHT_RUN (Waves 519/449/505: run-based siblings on the curiosity,
  // relational, and payoff channels — this completes the drought-run family on the suspense channel).
  {
    const n561a = records.length;
    if (n561a >= 10) {
      const suspScenes561a = (records as any[]).filter(r => (r.suspenseDelta ?? 0) > 0);
      if (suspScenes561a.length >= 3) {
        let longestRun561a = 0;
        let currentRun561a = 0;
        for (const r of records as any[]) {
          if ((r.suspenseDelta ?? 0) <= 0) {
            currentRun561a++;
            if (currentRun561a > longestRun561a) longestRun561a = currentRun561a;
          } else {
            currentRun561a = 0;
          }
        }
        if (longestRun561a >= 6) {
          issues.push({
            location: `longest suspense drought: ${longestRun561a} consecutive scenes with no raised tension`,
            rule: 'ARC_SUSPENSE_DROUGHT_RUN',
            severity: 'minor',
            description: `The story contains a run of ${longestRun561a} consecutive scenes with no positive suspenseDelta — an extended tension drought — even though ${suspScenes561a.length} suspense-positive scenes exist across the script. Unlike a front-to-back distribution skew, this is a local dead zone: a sixth of the runtime or more passes in an unbroken stretch where the audience's felt pressure flatlines. Having been shown that this is a story where tension can rise, the audience spends a long uninterrupted span with no pressure on the protagonist, and the dramatic momentum the surrounding suspense built dissipates before the next rise can recover it. Tension that is technically present in the script but absent for a long consecutive run leaves the middle of the experience slack.`,
            suggestedFix: `Break up the ${longestRun561a}-scene drought by seeding at least one suspense-positive beat into the middle of the run: a complication that raises the stakes, a threat that surfaces, a deadline that tightens, or a danger that becomes tangible. The drought doesn't need the story's maximum tension — it needs enough raised pressure to keep the audience's grip from going slack across an extended stretch. A story sustains its hold by never letting the felt tension flatline for too long, even between its larger peaks.`,
          });
        }
      }
    }
  }

  // ARC_RELATIONAL_ZONE_CLUSTER (distribution/timing × relationship × structural thirds, n≥9,
  // ≥3 relationship-shift scenes, >75% of them fall in a single structural third): The story's
  // relational movement is ghettoized into one structural third — the opening, middle, or closing
  // zone carries the overwhelming majority of all bond shifts while the other two-thirds are
  // relationally inert. A thirds-based cluster is a finer-grained distribution check than the
  // binary half-partition checks: a script can split its relational shifts evenly across the two
  // halves and still concentrate three-quarters of them into, say, the middle third, leaving both
  // the opening and the climax relationally flat. When bonds only ever move in one zone, the
  // protagonist's interpersonal arc reads as an isolated episode rather than a continuous thread:
  // the relationships either change all at once and then freeze, or stay static until a single
  // burst, rather than evolving across the full sweep of the story. Distribution/timing mode ×
  // relational channel × structural thirds. Distinct from ARC_RELATIONAL_FRONT_LOADED (Wave 463)
  // and ARC_RELATIONAL_BACK_LOADED (Wave 407: binary half-partitions — front vs. back; this uses
  // three zones and can fire on a middle-third cluster that neither half-check would catch), ARC_
  // SHIFT_CONCENTRATION (Wave 270: a ≤3-scene micro-burst regardless of zone — a tighter window
  // than a structural third), ARC_TURN_ZONE_CLUSTER (Wave 477: same thirds mode on the dramatic-
  // turn channel — this is the relational-channel sibling).
  {
    const n561b = records.length;
    if (n561b >= 9) {
      const relShiftPositions561b = (records as any[])
        .map((r, pos) => ({ r, pos }))
        .filter(({ r }) => ((r.relationshipShifts ?? []) as any[]).length > 0)
        .map(({ pos }) => pos);
      if (relShiftPositions561b.length >= 3) {
        const third561b = Math.floor(n561b / 3);
        const firstZone561b = relShiftPositions561b.filter(p => p < third561b).length;
        const lastZone561b = relShiftPositions561b.filter(p => p >= 2 * third561b).length;
        const midZone561b = relShiftPositions561b.length - firstZone561b - lastZone561b;
        const maxZone561b = Math.max(firstZone561b, midZone561b, lastZone561b);
        if (maxZone561b / relShiftPositions561b.length > 0.75) {
          const zoneName561b =
            maxZone561b === firstZone561b ? 'opening' : maxZone561b === lastZone561b ? 'closing' : 'middle';
          issues.push({
            location: `relationship shifts: ${firstZone561b} opening / ${midZone561b} middle / ${lastZone561b} closing third — ${Math.round((maxZone561b / relShiftPositions561b.length) * 100)}% in the ${zoneName561b} third`,
            rule: 'ARC_RELATIONAL_ZONE_CLUSTER',
            severity: 'minor',
            description: `${Math.round((maxZone561b / relShiftPositions561b.length) * 100)}% of the story's ${relShiftPositions561b.length} relationship-shift scenes are concentrated in the ${zoneName561b} structural third, leaving the other two-thirds relationally inert. Unlike a front-vs-back skew, this is a single-zone cluster: the bonds move almost entirely within one third of the runtime and stay frozen across the rest. When relational movement is ghettoized into one zone, the protagonist's interpersonal arc reads as an isolated episode rather than a continuous thread — relationships either change all at once and then freeze, or stay static until a single concentrated burst, rather than evolving across the full sweep of the story. The most resonant interpersonal arcs let bonds shift, recover, and shift again across all three structural zones, so the relational world feels alive throughout.`,
            suggestedFix: `Redistribute some of the ${zoneName561b} third's relationship shifts into the other two zones so that bonds move across the full arc rather than clustering in one stretch. Each structural third can carry its own relational beat: an early shift that establishes the dynamics, a middle shift that tests them under pressure, and a late shift that resolves or transforms them. Spreading bond movement across the thirds turns an isolated relational episode into a continuous interpersonal thread the audience can follow from setup to climax.`,
          });
        }
      }
    }
  }

  // ARC_CLOCK_RELATIONAL_AFTERMATH_VOID (sequence/aftermath × clock trigger → relational aftermath,
  // n≥8, ≥2 qualifying clockRaised scenes [pos < n-1], ≥2 relationship-shift scenes globally, none
  // of the qualifying clock scenes is followed by a relationship shift within 2 scenes): The
  // protagonist's deadlines never move bonds — every moment a clock is raised passes without any
  // relational consequence in the immediate aftermath. When time pressure tightens, the people
  // around the protagonist should feel it too: an alliance strains under the deadline, a bond is
  // tested by the urgency, someone is forced to choose sides as the clock runs down. When raised
  // clocks never trigger relational movement in the following scenes, the story's urgency operates
  // as a purely plot-mechanical device disconnected from the interpersonal world — the deadline
  // drives events but never the relationships those events should strain. Sequence/aftermath mode ×
  // clock trigger × relational aftermath. Distinct from ARC_CLOCK_EMOTION_DECOUPLED (Wave 435:
  // co-occurrence × the clock scene's own emotional state — same-scene, not aftermath), ARC_CLOCK_
  // CURIOSITY_AFTERMATH_VOID (Wave 505: clock → curiosity aftermath — different aftermath channel),
  // ARC_NEGATIVE_RELATIONAL_AFTERMATH_VOID / ARC_POSITIVE_RELATIONAL_AFTERMATH_VOID / ARC_
  // REVELATION_RELATIONAL_AFTERMATH_VOID (Waves 547/477/463: same relational-aftermath output but
  // triggered by emotion or revelation — this is the clock-trigger member of that family).
  {
    const n561c = records.length;
    if (n561c >= 8) {
      const relShiftScenes561c = (records as any[]).filter(
        r => ((r.relationshipShifts ?? []) as any[]).length > 0,
      );
      const qualClockScenes561c = (records as any[])
        .map((r, pos) => ({ r, pos }))
        .filter(({ r, pos }) => r.clockRaised === true && pos < n561c - 1);
      if (relShiftScenes561c.length >= 2 && qualClockScenes561c.length >= 2) {
        const anyClockFollowedByRel561c = qualClockScenes561c.some(({ pos }) => {
          const next1 = (records as any[])[pos + 1];
          const next2 = (records as any[])[pos + 2];
          return (
            (next1 && ((next1.relationshipShifts ?? []) as any[]).length > 0) ||
            (next2 && ((next2.relationshipShifts ?? []) as any[]).length > 0)
          );
        });
        if (!anyClockFollowedByRel561c) {
          issues.push({
            location: `${qualClockScenes561c.length} clock-raised scene(s) — none followed by a relationship shift within 2 scenes`,
            rule: 'ARC_CLOCK_RELATIONAL_AFTERMATH_VOID',
            severity: 'minor',
            description: `None of the story's ${qualClockScenes561c.length} clock-raised scenes is followed by a relationship shift within the next two scenes, even though ${relShiftScenes561c.length} bond movements exist elsewhere. When time pressure tightens — a deadline is set, a countdown begins, the window to act narrows — the people around the protagonist should feel the strain: an alliance buckles under the urgency, a bond is tested by the pressure, someone is forced to choose sides as the clock runs down. When raised clocks never trigger relational movement in the following beats, the story's urgency operates as a purely plot-mechanical device disconnected from the interpersonal world: the deadline drives the events but never the relationships those events should strain. The clock and the relational arc run as separate systems, and the time pressure carries no human cost.`,
            suggestedFix: `After at least one clock-raised scene, let the next one or two scenes carry a relationship shift that the deadline provokes — an ally who pulls back as the stakes climb, a bond that fractures under the time pressure, or an attachment that deepens when the countdown forces the characters together. Time pressure is most powerful when it strains relationships, not just the plot: the deadline that tests a bond carries a human cost the audience feels, where the deadline that only drives events remains a mechanical device.`,
          });
        }
      }
    }
  }

  // ── Wave 575: ARC_CURIOSITY_ZONE_CLUSTER, ARC_CLOCK_DROUGHT_RUN,
  //              ARC_SUSPENSE_CURIOSITY_AFTERMATH_VOID ───────────────────────────────────────────
  {
    // ARC_CURIOSITY_ZONE_CLUSTER (distribution/timing × curiosity × structural thirds, n≥9, ≥3
    // curiosity-positive scenes [curiosityDelta > 0], >75% of them fall in a single structural
    // third): The story's wonder-and-mystery spikes are ghettoized into one structural third —
    // the protagonist's intrigue and question-opening beats cluster almost entirely in one zone
    // while the other two-thirds are curiosity-flat. Like the relational and turn analogues, a
    // thirds-based curiosity cluster is a finer-grained distribution check than the binary half-
    // partitions: a script can split its curiosity beats evenly across the two halves and still
    // concentrate three-quarters in, say, the opening third, leaving the middle and climax with
    // no new questions opening for the protagonist. When wonder is ghettoized, the protagonist's
    // investigative engagement reads as an early-story burst (or late-story avalanche) rather
    // than a continuous thread of building mystery. Distribution/timing mode × curiosity channel
    // × structural thirds. Distinct from ARC_CURIOSITY_DROUGHT_RUN (Wave 519: run-based × absence
    // — fires on a consecutive local run, not a global zone concentration), ARC_CURIOSITY_PLATEAU
    // (Wave 284: average/aggregate × Act-2b window — different mode and window), ARC_RELATIONAL_
    // ZONE_CLUSTER (Wave 561: same thirds mode on the relational channel), ARC_TURN_ZONE_CLUSTER
    // (Wave 477: same mode on the dramatic-turn channel).
    const n575a = records.length;
    if (n575a >= 9) {
      const curiPositions575a = (records as any[])
        .map((r, pos) => ({ r, pos }))
        .filter(({ r }) => (r.curiosityDelta ?? 0) > 0)
        .map(({ pos }) => pos);
      if (curiPositions575a.length >= 3) {
        const third575a = Math.floor(n575a / 3);
        const zone1Curi575a = curiPositions575a.filter(p => p < third575a).length;
        const zone2Curi575a = curiPositions575a.filter(p => p >= third575a && p < 2 * third575a).length;
        const zone3Curi575a = curiPositions575a.length - zone1Curi575a - zone2Curi575a;
        const maxZoneCuri575a = Math.max(zone1Curi575a, zone2Curi575a, zone3Curi575a);
        if (maxZoneCuri575a / curiPositions575a.length > 0.75) {
          const zoneName575a = zone1Curi575a === maxZoneCuri575a
            ? 'opening' : zone3Curi575a === maxZoneCuri575a ? 'closing' : 'middle';
          issues.push({
            location: `curiosity spikes: ${zone1Curi575a} opening / ${zone2Curi575a} middle / ${zone3Curi575a} closing third — ${Math.round((maxZoneCuri575a / curiPositions575a.length) * 100)}% in the ${zoneName575a} third`,
            rule: 'ARC_CURIOSITY_ZONE_CLUSTER',
            severity: 'minor',
            description: `${Math.round((maxZoneCuri575a / curiPositions575a.length) * 100)}% of the story's ${curiPositions575a.length} curiosity-spike scenes are concentrated in the ${zoneName575a} structural third, leaving the other two-thirds curiosity-flat. Unlike a front-vs-back distribution skew, this is a single-zone cluster: the protagonist's wonder-and-mystery beats operate almost entirely within one stretch of the runtime and stay question-quiet across the rest. When intrigue is ghettoized into one zone, the protagonist's investigative engagement reads as an episode rather than a continuous thread — the questions open all at once and then go silent, rather than deepening across the full sweep of the story. The most engaging curiosity arcs keep new questions opening across all three structural zones: early questions hook the audience, middle questions deepen the mystery, and late questions hold the tension through the climax.`,
            suggestedFix: `Redistribute some of the ${zoneName575a} third's curiosity spikes into the other two zones so that new questions open across the full arc. Each structural third can carry its own intrigue beat: an early question that establishes what the protagonist doesn't know, a middle question that complicates their understanding, and a late question that holds the tension through the resolution. Spreading wonder across the thirds turns an episodic burst of mystery into a continuous thread of deepening intrigue.`,
          });
        }
      }
    }

    // ARC_CLOCK_DROUGHT_RUN (run-based × clockRaised × absence, n≥10, ≥3 clockRaised scenes
    // globally, longest consecutive run of scenes with clockRaised = false ≥ 6): The story's
    // deadline engine goes silent for an extended consecutive stretch — six or more scenes pass
    // in a row with no clock raised, even though urgency mechanisms fire elsewhere. Like the
    // suspense and curiosity drought analogues, this is a local dead zone rather than a global
    // distribution skew: the story may balance its clocks perfectly front-to-back and still have
    // an extended stretch in which no new urgency is established or reinforced, letting the felt
    // pressure from earlier deadlines dissipate without any new constraint anchoring the
    // protagonist's situation. A long clock drought means the story coasts on accumulated urgency
    // for an extended stretch rather than refreshing it. Run-based mode × clockRaised × absence.
    // Distinct from ARC_CLOCK_OPENING_ZONE_ABSENT (Wave 519: fixed opening-third zone — a zone-
    // based check on a fixed window, not a sliding run anywhere in the script), ARC_CLOCK_
    // EMOTION_DECOUPLED (co-occurrence × clock × emotion — different mode), ARC_CLOCK_CURIOSITY_
    // AFTERMATH_VOID (aftermath × clock trigger — different mode), ARC_SUSPENSE_DROUGHT_RUN
    // (Wave 561: run-based × suspenseDelta — different signal channel; this targets clockRaised).
    const n575b = records.length;
    if (n575b >= 10) {
      const clockScenes575b = (records as any[]).filter(r => r.clockRaised === true);
      if (clockScenes575b.length >= 3) {
        let longestDrought575b = 0;
        let currentDrought575b = 0;
        for (const r of records as any[]) {
          if (r.clockRaised !== true) {
            currentDrought575b++;
            if (currentDrought575b > longestDrought575b) longestDrought575b = currentDrought575b;
          } else {
            currentDrought575b = 0;
          }
        }
        if (longestDrought575b >= 6) {
          issues.push({
            location: `longest clock drought: ${longestDrought575b} consecutive scenes with no raised deadline`,
            rule: 'ARC_CLOCK_DROUGHT_RUN',
            severity: 'minor',
            description: `The story contains a run of ${longestDrought575b} consecutive scenes with no raised clock — an extended deadline drought — even though ${clockScenes575b.length} clock scenes exist across the script. This is a local dead zone, not a global distribution skew: the urgency mechanisms fire elsewhere in the story, but a stretch of ${longestDrought575b} scenes passes in an unbroken run where no new deadline is established and no urgency is refreshed. The felt pressure from earlier clocks dissipates across this stretch rather than being sustained by a new constraint anchoring the protagonist's situation. The story coasts on accumulated urgency for an extended stretch rather than reinforcing it — the protagonist moves through ${longestDrought575b} scenes without any new time constraint tightening.`,
            suggestedFix: `Break up the ${longestDrought575b}-scene clock drought by raising or reinforcing at least one deadline within the run — not necessarily a new clock, but an existing one that tightens, updates, or resurfaces (a reminder of the deadline, a new development that changes its stakes). The story's felt urgency is strongest when deadlines are periodically refreshed rather than established once and left to fade. Even a single scene that reminds the protagonist — and the audience — of the time constraint prevents the run from coasting on pressure that has long since dissipated.`,
          });
        }
      }
    }

    // ARC_SUSPENSE_CURIOSITY_AFTERMATH_VOID (sequence/aftermath × suspenseDelta → curiosity
    // aftermath, n≥8, ≥2 qualifying suspense-spike scenes [suspenseDelta > 0, pos < n-1], ≥2
    // curiosity-positive scenes globally, none of the qualifying suspense-spike scenes is
    // followed by a curiosityDelta > 0 scene within the next 2 scenes): The protagonist's tension
    // rises never spark new wonder — every moment where stakes increase is followed by 2 scenes
    // with no raised curiosity. When danger or pressure escalates, the natural corollary is a
    // deepening of what the protagonist doesn't know: who's responsible, what comes next, whether
    // escape is possible. Suspense without curiosity aftermath is pressure without mystery: the
    // protagonist feels the stakes rise but generates no new questions from the heightened situation.
    // When every suspense spike passes without a curiosity rise in its immediate wake, tension and
    // wonder operate as completely parallel systems — the story escalates danger and opens mystery
    // through entirely separate mechanisms that never cross. Sequence/aftermath mode × suspenseDelta
    // trigger × curiosity aftermath. Distinct from ARC_CLOCK_CURIOSITY_AFTERMATH_VOID (Wave 505:
    // clock trigger → curiosity aftermath — this uses suspense as the trigger), ARC_REVELATION_
    // CURIOSITY_DECOUPLED (Wave 337: co-occurrence × same scene × revelation trigger — curiosity
    // within the revelation scene, not aftermath following a suspense spike), ARC_CURIOSITY_DROUGHT_
    // RUN (Wave 519: run-based × curiosity absence — sustained absence regardless of trigger),
    // ARC_SUSPENSE_EMOTION_DECOUPLED (Wave 298: co-occurrence × emotional state × same scene — not
    // aftermath, not curiosity channel).
    const n575c = records.length;
    if (n575c >= 8) {
      const curiPosScenes575c = (records as any[]).filter(r => (r.curiosityDelta ?? 0) > 0);
      const qualSuspScenes575c = (records as any[])
        .map((r, pos) => ({ r, pos }))
        .filter(({ r, pos }) => (r.suspenseDelta ?? 0) > 0 && pos < n575c - 1);
      if (curiPosScenes575c.length >= 2 && qualSuspScenes575c.length >= 2) {
        const anySuspFollowedByCuri575c = qualSuspScenes575c.some(({ pos }) => {
          const next1 = (records as any[])[pos + 1];
          const next2 = pos + 2 < n575c ? (records as any[])[pos + 2] : null;
          return (
            (next1 && (next1.curiosityDelta ?? 0) > 0) ||
            (next2 && (next2.curiosityDelta ?? 0) > 0)
          );
        });
        if (!anySuspFollowedByCuri575c) {
          issues.push({
            location: `${qualSuspScenes575c.length} suspense-spike scene(s) — none followed by a curiosity rise within 2 scenes`,
            rule: 'ARC_SUSPENSE_CURIOSITY_AFTERMATH_VOID',
            severity: 'minor',
            description: `None of the story's ${qualSuspScenes575c.length} suspense-spike scenes is followed by a scene with raised curiosity within the next two scenes, even though ${curiPosScenes575c.length} curiosity-positive scenes exist elsewhere. When stakes increase, the natural corollary is deeper mystery: who's responsible for the threat, what comes next, whether survival is possible in this new configuration. Suspense without curiosity aftermath is pressure without wonder — the protagonist feels the stakes rise but generates no new questions from the heightened situation. When every tension spike passes into a two-scene curiosity void, danger and mystery operate as completely parallel systems that never cross: the story escalates stakes through one channel and deepens questions through another, but the two never speak to each other in the immediate aftermath of the story's most charged moments.`,
            suggestedFix: `After at least one suspense-spike scene, let the next one or two scenes carry a raised curiosityDelta — a new question that the escalated danger generates. The curiosity doesn't need to be explicit exposition: a revelation that the threat has a hidden dimension, a development that makes the protagonist wonder about an element they thought they understood, or an encounter that raises a new question under pressure all qualify. Tension that generates wonder makes the stakes feel more complex and the protagonist's situation more unknowable — and an unknowable situation is harder to look away from.`,
          });
        }
      }
    }
  }

  // ── Wave 589: ARC_DRAMATIC_TURN_RELATIONAL_AFTERMATH_VOID, ARC_PAYOFF_CURIOSITY_AFTERMATH_VOID,
  //              ARC_EMOTIONAL_DROUGHT_RUN ─────────────────────────────────────────────────────────
  {
    // ARC_DRAMATIC_TURN_RELATIONAL_AFTERMATH_VOID (sequence/aftermath × dramatic-turn →
    // relationship aftermath, n≥8, ≥2 qualifying dramatic-turn scenes [pos<n-1], ≥2 relational-
    // shift scenes globally, no dramatic turn immediately followed by a relationship shift): Every
    // narrative pivot passes without any relationship shifting in the immediately following scene.
    // A dramatic turn is the story's gear-shift — a reversal, recognition, or twist that reorients
    // the protagonist's situation — and the scene immediately after is where those around them
    // should respond: a bond adjusting to the new reality, an alliance tested by the change, a
    // connection strained or deepened by the turn. When no pivot is ever followed by a relationship
    // shift, turns are relationally inert: the story's gear-shifts change the plot but never the
    // interpersonal world. Sequence/aftermath mode × dramatic-turn trigger × relationship channel.
    // Distinct from ARC_DRAMATIC_TURN_EMOTIONAL_AFTERMATH_VOID (Wave 547: emotion not relational
    // — different aftermath channel), ARC_CLOCK_RELATIONAL_AFTERMATH_VOID (Wave 561: clock trigger
    // — different trigger; also uses 2-scene window), ARC_REVELATION_RELATIONAL_AFTERMATH_VOID
    // (Wave 463: revelation trigger), ARC_POSITIVE/NEGATIVE_RELATIONAL_AFTERMATH_VOID (emotion
    // trigger), and ARC_TURN_RELATIONAL_DECOUPLED (co-occurrence × same scene — checks if the
    // turn scene ITSELF carries a shift, not the following scene).
    const n589a = records.length;
    if (n589a >= 8) {
      const relScenes589a = (records as any[]).filter(
        r => ((r.relationshipShifts ?? []) as any[]).length > 0,
      );
      const qualTurnScenes589a = (records as any[])
        .map((r, pos) => ({ r, pos }))
        .filter(({ r, pos }) =>
          (r.dramaticTurn ?? 'nothing') !== 'nothing' && r.dramaticTurn !== '' && pos < n589a - 1
        );
      if (relScenes589a.length >= 2 && qualTurnScenes589a.length >= 2) {
        const anyTurnFollowedByRel589a = qualTurnScenes589a.some(({ pos }) =>
          (((records as any[])[pos + 1].relationshipShifts ?? []) as any[]).length > 0
        );
        if (!anyTurnFollowedByRel589a) {
          issues.push({
            location: `${qualTurnScenes589a.length} dramatic-turn scene(s) — none immediately followed by a relationship shift`,
            rule: 'ARC_DRAMATIC_TURN_RELATIONAL_AFTERMATH_VOID',
            severity: 'minor',
            description: `None of the story's ${qualTurnScenes589a.length} dramatic-turn scenes is immediately followed by a scene with a relationship shift, even though ${relScenes589a.length} bond movements exist elsewhere. A dramatic turn — reversal, recognition, or twist — is the story's gear-shift, and the scene immediately after is the natural moment for those around the protagonist to respond: a bond adjusting to the new reality, an alliance tested by the change, a connection strained or deepened by the pivot. When no turn is ever followed by a relationship shift, the story's pivots are relationally inert: the plot changes direction, but the interpersonal world never registers the change. Turns and bonds run as separate systems, and the story's most consequential direction-changes never alter who trusts, depends on, or stands against whom.`,
            suggestedFix: `After at least one dramatic turn, let the immediately following scene carry a relationship shift — a bond that responds to the pivot. The shift need not be caused by the turn; proximity is enough to let the reversal feel consequential in the relational world: a trust strained because everything changed, an alliance formed in the new reality the turn created, or a connection that breaks when the reversal exposes what someone actually wants.`,
          });
        }
      }
    }

    // ARC_PAYOFF_CURIOSITY_AFTERMATH_VOID (sequence/aftermath × payoff → curiosity aftermath,
    // n≥8, ≥2 qualifying payoff scenes [pos<n-1], ≥2 curiosity-spike scenes globally, no payoff
    // immediately followed by a curiosity spike): Every resolved planted promise passes without a
    // new question opening in the immediately following scene. A payoff closes a thread — and the
    // scene immediately after is the natural place for the protagonist to wonder what comes next:
    // the resolution of one promise should open the horizon of the next. When no payoff is ever
    // followed by a curiosity spike, resolutions are terminal — each one closes a thread and leaves
    // the scene that follows in a question-free zone, so the payoff layers of the story deliver
    // satisfactions that generate no new forward momentum. Sequence/aftermath mode × payoff trigger
    // × curiosity channel. Distinct from ARC_PAYOFF_AFTERMATH_EMOTIONAL_VOID (Wave 505: emotion not
    // curiosity — different aftermath channel), ARC_CLOCK_CURIOSITY_AFTERMATH_VOID (Wave 505: clock
    // trigger — different trigger), ARC_SUSPENSE_CURIOSITY_AFTERMATH_VOID (Wave 575: suspense
    // trigger — different trigger), and ARC_PAYOFF_EMOTION_DECOUPLED (Wave 491: co-occurrence in
    // the payoff scene itself — different mode).
    const n589b = records.length;
    if (n589b >= 8) {
      const curiSpikeScenes589b = (records as any[]).filter(r => (r.curiosityDelta ?? 0) > 0);
      const qualPayoffScenes589b = (records as any[])
        .map((r, pos) => ({ r, pos }))
        .filter(({ r, pos }) => ((r.payoffSetupIds ?? []) as string[]).length > 0 && pos < n589b - 1);
      if (curiSpikeScenes589b.length >= 2 && qualPayoffScenes589b.length >= 2) {
        const anyPayoffFollowedByCuri589b = qualPayoffScenes589b.some(({ pos }) =>
          ((records as any[])[pos + 1].curiosityDelta ?? 0) > 0
        );
        if (!anyPayoffFollowedByCuri589b) {
          issues.push({
            location: `${qualPayoffScenes589b.length} payoff scene(s) — none immediately followed by a curiosity spike`,
            rule: 'ARC_PAYOFF_CURIOSITY_AFTERMATH_VOID',
            severity: 'minor',
            description: `None of the story's ${qualPayoffScenes589b.length} payoff scenes is immediately followed by a scene with raised curiosity, even though ${curiSpikeScenes589b.length} curiosity-spike scenes exist elsewhere. A payoff closes a planted thread — and the scene immediately after is the natural place for the protagonist to wonder what comes next: one promise resolving should open the horizon of what remains unknown. When no payoff is ever followed by a curiosity spike, resolutions are terminal — each one closes a thread and leaves the following scene in a question-free zone. The story delivers satisfactions that generate no new forward pull: the audience watches each planted promise resolve without feeling the momentum of a new question forming in its wake.`,
            suggestedFix: `After at least one payoff scene, let the immediately following scene carry a raised curiosityDelta — a new question opened by the resolution. The curiosity might arise from what the payoff revealed (a resolved thread exposing a new unknown), from what it changed (the protagonist in a new situation that generates fresh wondering), or from what it left unfinished. When a resolution generates wonder rather than only closure, the payoff layer drives the story forward rather than merely completing it.`,
          });
        }
      }
    }

    // ARC_EMOTIONAL_DROUGHT_RUN (run-based × emotional-absence, n≥10, ≥4 emotional scenes
    // [non-neutral emotionalShift], longest consecutive run of neutral-shift scenes ≥ 7): The
    // story contains an extended stretch of emotionally flat scenes — 7 or more consecutive scenes
    // where the protagonist registers no emotional shift — even though emotional engagement exists
    // elsewhere in the arc. Unlike ARC_EMOTIONAL_FLATLINE (which fires on global rate ≥80%
    // neutral), this is a local run-based check: the story can have healthy overall emotional
    // texture and still contain a mid-arc flatline where the protagonist drifts through an
    // extended neutral stretch without a single moment of felt experience. A 7-scene emotional
    // drought is an extended zone of affective disengagement: the audience watches events without
    // watching the protagonist feel them, and the arc's emotional thread goes dark for long
    // enough that the stakes stop feeling inhabited. Run-based mode × emotional-absence. Distinct
    // from ARC_EMOTIONAL_FLATLINE (Wave 152: global rate ≥80% neutral — this fires even when
    // global rate is well below 80%, targeting local runs), ARC_SUSPENSE_DROUGHT_RUN (suspense
    // not emotion), ARC_CURIOSITY_DROUGHT_RUN (curiosity not emotion), ARC_CLOCK_DROUGHT_RUN
    // (clock not emotion), ARC_PAYOFF_DROUGHT_RUN (payoff not emotion), ARC_RELATIONAL_DROUGHT_RUN
    // (relational not emotion).
    const n589c = records.length;
    if (n589c >= 10) {
      const emotionalScenes589c = (records as any[]).filter(
        r => r.emotionalShift !== 'neutral' && r.emotionalShift !== null && r.emotionalShift !== undefined
      );
      if (emotionalScenes589c.length >= 4) {
        let maxDrought589c = 0;
        let curDrought589c = 0;
        for (const r of (records as any[])) {
          const isNeutral = r.emotionalShift === 'neutral' || r.emotionalShift === null || r.emotionalShift === undefined;
          if (isNeutral) {
            curDrought589c++;
            if (curDrought589c > maxDrought589c) maxDrought589c = curDrought589c;
          } else {
            curDrought589c = 0;
          }
        }
        if (maxDrought589c >= 7) {
          issues.push({
            location: `longest emotional drought: ${maxDrought589c} consecutive scenes with neutral emotional shift`,
            rule: 'ARC_EMOTIONAL_DROUGHT_RUN',
            severity: 'minor',
            description: `The story contains a run of ${maxDrought589c} consecutive scenes in which the protagonist registers no emotional shift — an extended flatline of felt experience — even though ${emotionalScenes589c.length} emotional moments exist elsewhere in the arc. A ${maxDrought589c}-scene emotional drought is an extended zone of affective disengagement: the audience watches events without watching the protagonist feel them, and the arc's emotional thread goes dark for long enough that the stakes stop feeling inhabited. Unlike a global flatness check, this is a local failure: the protagonist's emotional life is active in other sections of the story, which makes the extended neutral run more conspicuous — the audience knows feeling is possible here, and its absence registers as a void rather than a stylistic choice.`,
            suggestedFix: `Break up the ${maxDrought589c}-scene neutral run by introducing at least one emotional shift within the stretch — a moment where the protagonist feels something, even briefly: a fear, a flash of relief, a pang of doubt, a surge of hope. The emotional beat does not need to be dramatic; a mild shift registered in a single scene is enough to signal that the protagonist is still inhabiting the story rather than passing through it. Sustained neutral stretches of this length suggest a segment where the protagonist has been written as observer rather than experiencer.`,
          });
        }
      }
    }
  }

  // ── Wave 603: RELATIONSHIP_SHIFT_DIALOGUE_HIGHLIGHT_DECOUPLED, VISUAL_STAGING_EMOTIONAL_
  //              FLATNESS_CLUSTER, OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID ──────────────────────

  // RELATIONSHIP_SHIFT_DIALOGUE_HIGHLIGHT_DECOUPLED — Co-occurrence/decoupling ×
  // relationshipShifts × dialogueHighlights. Built on checkCoOccurrenceDecoupled from the shared
  // checks library. n≥8, ≥2 scenes carrying a relationship shift, ≥2 scenes carrying a curated
  // dialogue highlight. Zero overlap → fire. A bond changing between characters and a line the
  // story itself judged worth highlighting never happen in the same scene — the moments this
  // pass's central signal (relational movement) occurs are never also the moments flagged as
  // verbally memorable. First use of the dialogueHighlights field anywhere in this 99-rule pass —
  // every prior relational check in this file cross-references clock/curiosity/suspense/dramatic-
  // turn/emotional channels, never the story's own record of which dialogue stood out. Distinct
  // from ARC_SUSPENSE_RELATIONAL_DECOUPLED (Wave 463: suspense channel, not dialogueHighlights)
  // and every other decoupling check in this pass, none of which pair relationshipShifts with a
  // dialogue-side signal.
  {
    const r603a = checkCoOccurrenceDecoupled({
      records, minRecords: 8, minACount: 2, minBCount: 2,
      isA: r => (r.relationshipShifts ?? []).length > 0,
      isB: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r603a.fires) {
      issues.push({
        location: `${r603a.aCount} relationship-shift scene(s), ${r603a.bCount} dialogue-highlight scene(s) — zero overlap`,
        rule: 'RELATIONSHIP_SHIFT_DIALOGUE_HIGHLIGHT_DECOUPLED',
        severity: 'minor',
        description: `The ${r603a.aCount} scenes where a relationship shifts never coincide with the ${r603a.bCount} scenes flagged as containing a standout line of dialogue — every bond change in the story passes without a memorable verbal moment attached to it, and every memorable line lands while every relationship is holding steady. The arc's most relationally charged beats and its most verbally charged beats run on entirely separate tracks.`,
        suggestedFix: `Let at least one relationship shift land in a scene that also carries a line worth remembering — a character naming what just changed between them, or a piece of dialogue whose weight comes precisely from the bond having moved. Tying the story's most memorable lines to its relational turns gives the shift a voice instead of leaving it to structural bookkeeping alone.`,
      });
    }
  }

  // VISUAL_STAGING_EMOTIONAL_FLATNESS_CLUSTER — Distribution/timing × a compound visualBeats+
  // emotionalShift signal × structural thirds. Built on checkZoneCluster from the shared checks
  // library. n≥9, ≥3 scenes that are BOTH physically staged (visualBeats non-empty) AND
  // emotionally neutral, more than 75% of which fall in a single structural third → fire. First
  // use of the visualBeats field anywhere in this pass. Purely physical, emotionally inert scenes
  // are ordinary in isolation, but when they cluster overwhelmingly in one third of the story, that
  // third becomes a stretch where the arc pauses: the protagonist is staged and moved through space
  // without the felt experience this pass exists to track. Distinct from ARC_EMOTIONAL_DROUGHT_RUN
  // (Wave 589: run-based × pure emotional-neutrality — no visualBeats condition, and consecutive-
  // run rather than zone-proportion) and ARC_CURIOSITY_ZONE_CLUSTER (Wave 575: curiosityDelta
  // channel, not the visualBeats+emotionalShift compound).
  {
    const r603b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.visualBeats ?? []).length > 0 && r.emotionalShift === 'neutral',
    });
    if (r603b.fires) {
      const zoneName603b = r603b.zoneNames[r603b.maxZoneIdx];
      issues.push({
        location: `${zoneName603b} third — ${r603b.maxZoneCount}/${r603b.count} visually-staged, emotionally flat scenes`,
        rule: 'VISUAL_STAGING_EMOTIONAL_FLATNESS_CLUSTER',
        severity: 'minor',
        description: `${r603b.maxZoneCount} of the story's ${r603b.count} scenes that are both physically staged and emotionally neutral (${Math.round((r603b.maxZoneCount / r603b.count) * 100)}%) cluster in the ${zoneName603b} third. That stretch of the story leans on physical staging while the protagonist's felt experience goes quiet — the arc pauses precisely where the scenes are busiest with visual description, rather than the physical and emotional registers being interwoven throughout.`,
        suggestedFix: `Break up the concentration by giving at least one visually-staged scene in the ${zoneName603b} third an emotional shift — let the protagonist feel something while the physical action or staging is happening, rather than treating physical description and emotional experience as scenes that never overlap.`,
      });
    }
  }

  // OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID — Sequence/aftermath × heavy unresolved-clue-debt
  // trigger → emotional-shift absence. Built on checkAftermathVoid from the shared checks
  // library. n≥8, ≥2 qualifying trigger scenes (unresolvedClues.length≥3 — heavy carried debt),
  // ≥3 scenes anywhere with a non-neutral emotionalShift, a 2-scene lookahead window. Fires when
  // every heavy-debt scene's two-scene aftermath contains no emotional beat, while emotional beats
  // do occur elsewhere in the story. First use of the unresolvedClues field anywhere in this pass —
  // this is the arc-relevant question the mystery-tracking passes don't ask: does the protagonist's
  // felt experience ever register the weight of everything still unresolved? Distinct from
  // ARC_SEED_EMOTIONAL_AFTERMATH_VOID (Wave 505: seededClueIds — a single planting event this
  // scene — not unresolvedClues, the accumulated, carried-forward debt of clues not yet paid off)
  // and ARC_EMOTIONAL_DROUGHT_RUN (Wave 589: unconditioned run-based absence, no debt trigger).
  {
    const r603c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 3, window: 2,
      isTrigger: r => (r.unresolvedClues ?? []).length >= 3,
      isAftermath: r => r.emotionalShift !== 'neutral' && r.emotionalShift != null,
    });
    if (r603c.fires) {
      issues.push({
        location: `${r603c.triggerCount} heavy clue-debt scene(s) — no emotional shift within 2 scenes after any of them`,
        rule: 'OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every scene carrying heavy unresolved clue-debt (${r603c.triggerCount} instances, each with 3 or more open threads at once) is followed by two full scenes with no emotional shift, even though ${r603c.aftermathCount} emotional beats occur elsewhere in the story. The heaviest concentrations of open mystery never register on the protagonist's felt experience in their immediate aftermath — the weight of everything left unanswered passes without being felt.`,
        suggestedFix: `In the two scenes following at least one heavy clue-debt moment, give the protagonist an emotional beat shaped by the unresolved pressure — anxiety at not knowing, a flash of hope that an answer is close, or frustration at how much is still open. Let the accumulated mystery register as something felt, not only something tracked.`,
      });
    }
  }

  // ── Wave 617: PAYOFF_VISUAL_BEAT_DECOUPLED, ARC_CHARACTER_MOMENT_ZONE_IMBALANCE,
  //              ARC_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID ─────────────────────────────────

  // PAYOFF_VISUAL_BEAT_DECOUPLED — Co-occurrence/decoupling × payoffSetupIds × visualBeats. Built
  // on checkCoOccurrenceDecoupled from the shared checks library. n≥6, ≥2 payoff scenes, ≥2
  // visually-staged scenes (visualBeats.length≥2). Zero overlap → fire. A thread resolving and a
  // scene rich in physical staging never happen together — every payoff lands in a scene that
  // leans on dialogue or interiority, and every heavily staged scene resolves nothing. First
  // pairing of these two fields in this 102-rule pass — payoffSetupIds (Wave 505/533 aftermath
  // triggers) and visualBeats (Wave 603, distribution mode only) have each been used but never
  // together.
  {
    const r617a = checkCoOccurrenceDecoupled({
      records, minRecords: 6, minACount: 2, minBCount: 2,
      isA: r => (r.payoffSetupIds ?? []).length > 0,
      isB: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r617a.fires) {
      issues.push({
        location: `${r617a.aCount} payoff scene(s), ${r617a.bCount} visually-staged scene(s) — zero overlap`,
        rule: 'PAYOFF_VISUAL_BEAT_DECOUPLED',
        severity: 'minor',
        description: `The ${r617a.aCount} scenes where a planted thread resolves never coincide with the ${r617a.bCount} scenes leaning heavily on physical staging — thread resolution and physical presence run on separate tracks. A payoff often lands with more weight when a character's physical action embodies what the resolution means, rather than the moment being carried entirely by dialogue or interior reflection.`,
        suggestedFix: `Let at least one payoff scene also lean on physical staging — an action or object a character handles that embodies what just resolved, giving the payoff a physical anchor alongside whatever is said.`,
      });
    }
  }

  // ARC_CHARACTER_MOMENT_ZONE_IMBALANCE — Underweight/bloat × purpose === 'character_moment' ×
  // four structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4
  // character-moment scenes total, divided across four equal structural zones. Fires only when
  // one zone has zero such scenes while another holds ≥50% of the total. First zone-based check
  // on the purpose channel in this pass — purpose has only ever been read for a fixed 'climax'
  // lookup (line ~638) and a dramaticPurposes set-membership check, never audited for structural
  // distribution. Dedicated character-development beats clustering into one quarter while another
  // has none means the arc's opportunities for reflection are themselves unevenly rationed.
  {
    const r617b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'character_moment',
    });
    if (r617b.fires) {
      const emptyNames617b = r617b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName617b = FOUR_ZONE_NAMES[r617b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames617b} empty; ${bloatName617b} has ${r617b.counts[r617b.bloatZoneIdx]}/${r617b.totalCount} character-moment scenes`,
        rule: 'ARC_CHARACTER_MOMENT_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r617b.totalCount} character-moment scenes are unevenly distributed across its four structural zones: ${bloatName617b} contains ${r617b.counts[r617b.bloatZoneIdx]} of them (${Math.round((r617b.counts[r617b.bloatZoneIdx] / r617b.totalCount) * 100)}%) while ${emptyNames617b} contains none. Dedicated character-development beats bloat in one structural quarter and vanish from another, giving the arc's opportunities for reflection an uneven structural rhythm.`,
        suggestedFix: `Redistribute character-development beats: move at least one character-moment scene into the empty zone(s) — ${emptyNames617b} — so every structural quarter carries some space for the protagonist to reflect, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // ARC_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID — Sequence/aftermath × seededClueIds trigger →
  // dialogueHighlights absence. Built on checkAftermathVoid from the shared checks library. n≥8,
  // ≥2 qualifying seed scenes (pos<n-2), ≥3 scenes anywhere with a dialogue highlight, a 2-scene
  // lookahead window. Fires when every seed's two-scene aftermath contains no highlighted
  // dialogue, while highlighted dialogue does occur elsewhere in the story. First pairing of
  // seededClueIds with dialogueHighlights in this pass — every planted clue passes into an
  // aftermath with no memorable verbal moment giving the planted material texture. Distinct from
  // ARC_SEED_EMOTIONAL_AFTERMATH_VOID (Wave 505: same seed trigger, but the aftermath channel
  // there is emotionalShift, not dialogueHighlights).
  {
    const r617c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 3, window: 2,
      isTrigger: r => (r.seededClueIds ?? []).length > 0,
      isAftermath: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r617c.fires) {
      issues.push({
        location: `${r617c.triggerCount} seed scene(s) — no highlighted dialogue within 2 scenes of any`,
        rule: 'ARC_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r617c.triggerCount} clue-planting scenes is followed by two scenes with no highlighted dialogue, even though ${r617c.aftermathCount} such scenes exist elsewhere in the script. Seeds are the arc's long-horizon deposits; when their immediate aftermath never carries a memorable line, the planted material gets no verbal texture nearby, living purely as structural bookkeeping until its eventual payoff.`,
        suggestedFix: `After at least one seed, let one of the following two scenes carry a line worth remembering — a character circling the planted material, or a reaction that gives it emotional presence before the payoff arrives.`,
      });
    }
  }

  // ── Wave 631: ARC_DIALOGUE_HIGHLIGHT_STAGING_DECOUPLED, ARC_OPEN_THREAD_STAGING_AFTERMATH_
  //              VOID, ARC_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE ─────────────────────────────────

  // ARC_DIALOGUE_HIGHLIGHT_STAGING_DECOUPLED — Co-occurrence/decoupling × dialogueHighlights ×
  // visualBeats. Built on checkCoOccurrenceDecoupled from the shared checks library. n≥6, ≥2
  // scenes carrying a dialogue highlight, ≥2 visually-staged scenes (visualBeats.length≥2). Zero
  // overlap → fire. First pairing of these two fields in this 105-rule pass. The arc's most
  // memorable dialogue and its most physically staged moments never share a scene — a character's
  // standout line and their most visible physical action develop on entirely separate beats.
  {
    const r631a = checkCoOccurrenceDecoupled({
      records, minRecords: 6, minACount: 2, minBCount: 2,
      isA: r => (r.dialogueHighlights ?? []).length > 0,
      isB: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r631a.fires) {
      issues.push({
        location: `${r631a.aCount} dialogue-highlight scene(s), ${r631a.bCount} visually-staged scene(s) — zero overlap`,
        rule: 'ARC_DIALOGUE_HIGHLIGHT_STAGING_DECOUPLED',
        severity: 'minor',
        description: `The ${r631a.aCount} scenes flagged as containing a standout line of dialogue never coincide with the ${r631a.bCount} scenes leaning heavily on physical staging — the arc's most memorable words and its most visible physical action run on separate tracks. A line worth remembering often lands hardest when paired with a physical beat that embodies it.`,
        suggestedFix: `Let at least one heavily staged scene also carry a line worth remembering — a character's standout dialogue landing during, not instead of, a moment of visible physical action.`,
      });
    }
  }

  // ARC_OPEN_THREAD_STAGING_AFTERMATH_VOID — Sequence/aftermath × heavy unresolved-clue-debt
  // trigger → visualBeats absence. Built on checkAftermathVoid from the shared checks library.
  // n≥8, ≥2 qualifying heavy-debt scenes (unresolvedClues.length≥3, pos<n-2), ≥3 scenes anywhere
  // with substantial physical staging, a 2-scene lookahead window. Fires when every heavy-debt
  // scene's two-scene aftermath contains no visually dense scene, while such scenes do occur
  // elsewhere. First pairing of unresolvedClues with visualBeats in this pass — distinct from
  // OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID (Wave 603: same trigger, emotionalShift channel instead).
  {
    const r631b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 3, window: 2,
      isTrigger: r => (r.unresolvedClues ?? []).length >= 3,
      isAftermath: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r631b.fires) {
      issues.push({
        location: `${r631b.triggerCount} heavy clue-debt scene(s) — no visually dense scene within 2 scenes of any`,
        rule: 'ARC_OPEN_THREAD_STAGING_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every scene carrying heavy unresolved clue-debt (${r631b.triggerCount} instances) is followed by two full scenes with no substantial physical staging, even though ${r631b.aftermathCount} such scenes occur elsewhere in the story. The heaviest concentrations of open mystery never register in the protagonist's physical world nearby — no lingering glance, no restless action reflecting the unresolved pressure.`,
        suggestedFix: `In the two scenes following at least one heavy clue-debt moment, let the protagonist's physical behavior register the pressure — a restless action, a lingering look at something tied to the mystery, staged rather than only stated.`,
      });
    }
  }

  // ARC_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE — Underweight/bloat × dialogueHighlights × four
  // structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 scenes
  // carrying a dialogue highlight, divided across four equal structural zones. Fires only when one
  // zone has zero such scenes while another holds ≥50% of the total. Wave 617 applied this
  // template to the purpose channel only; dialogueHighlights itself has never been zone-audited
  // in this file despite already being used in a co-occurrence and an aftermath check.
  {
    const r631c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r631c.fires) {
      const emptyNames631c = r631c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName631c = FOUR_ZONE_NAMES[r631c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames631c} empty; ${bloatName631c} has ${r631c.counts[r631c.bloatZoneIdx]}/${r631c.totalCount} dialogue-highlight scenes`,
        rule: 'ARC_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r631c.totalCount} dialogue-highlight scenes are unevenly distributed across its four structural zones: ${bloatName631c} contains ${r631c.counts[r631c.bloatZoneIdx]} of them (${Math.round((r631c.counts[r631c.bloatZoneIdx] / r631c.totalCount) * 100)}%) while ${emptyNames631c} contains none. Memorable dialogue bloats in one structural quarter and vanishes from another, giving the arc's verbal high points an uneven structural rhythm.`,
        suggestedFix: `Redistribute standout dialogue: bring at least one memorable line into ${emptyNames631c}, so every structural quarter carries some verbal high point for the arc, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // ── Wave 645: ARC_HIGHLIGHT_PEAK_UNCAUSED, ARC_SEED_DROUGHT_RUN, ARC_OPEN_THREAD_CURIOSITY_
  //              DECOUPLED ───────────────────────────────────────────────────────────────────

  // ARC_HIGHLIGHT_PEAK_UNCAUSED — Single-peak isolation/backward-cause × dialogueHighlights
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 scenes carrying
  // a dialogue highlight, a 2-scene lookback. Finds the single scene with the most highlighted
  // lines; fires when neither that scene nor either of the two before it contains a dramatic turn
  // or revelation. First checkPeakUncaused use in this pass — every prior single-peak check here
  // (ARC_PEAK_SUSPENSE_EMOTION_ABSENT, ARC_PEAK_CURIOSITY_EMOTION_ABSENT, ARC_PEAK_RELATIONAL_
  // UNCAUSED, ARC_PEAK_POSITIVE_UNCAUSED, ARC_CLOCK_PEAK_EMOTION_ABSENT) measures a numeric delta
  // or shift-density peak, never the dialogueHighlights channel.
  {
    const r645a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.dialogueHighlights ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r645a.fires) {
      issues.push({
        location: `scene ${r645a.peakIdx + 1} — peak highlighted-dialogue density (${r645a.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'ARC_HIGHLIGHT_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The arc's single densest scene for highlighted dialogue (scene ${r645a.peakIdx + 1}, with ${r645a.peakMagnitude} standout lines) has no dramatic turn or revelation in itself or the two scenes before it. The moment where the character's most memorable dialogue concentrates arrives without any structural pivot or disclosure driving it — the peak of verbal craft and the peak of narrative causality never coincide.`,
        suggestedFix: `Give scene ${r645a.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the arc's most quotable moment is earned by a shift in the character's situation rather than arriving in a causal vacuum.`,
      });
    }
  }

  // ARC_SEED_DROUGHT_RUN — Run-based × seededClueIds absence. Built on checkDroughtRun from the
  // shared checks library. n≥10, ≥3 seed scenes overall, fires when the longest consecutive run
  // of scenes with no clue seeded reaches 6. This pass already hand-rolls drought-run logic for
  // suspenseDelta (Wave 561) and curiosityDelta (Wave 519), but never via the shared
  // checkDroughtRun helper and never on the seededClueIds channel — a long unbroken stretch where
  // the arc plants nothing new leaves its forward momentum running on prior material alone.
  {
    const r645b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.seededClueIds ?? []).length > 0,
    });
    if (r645b.fires) {
      issues.push({
        location: `longest stretch with no clue seeded: ${r645b.longestRun} consecutive scenes`,
        rule: 'ARC_SEED_DROUGHT_RUN',
        severity: 'minor',
        description: `The arc contains a run of ${r645b.longestRun} consecutive scenes with no clue seeded at all, even though ${r645b.presentCount} scenes elsewhere do plant new material. A long unbroken stretch where nothing new is planted leaves the character's arc coasting on prior setups with nothing fresh to draw on.`,
        suggestedFix: `Seed a new clue or thread somewhere within the ${r645b.longestRun}-scene stretch so the arc keeps planting forward momentum throughout, not only in isolated bursts.`,
      });
    }
  }

  // ARC_OPEN_THREAD_CURIOSITY_DECOUPLED — Co-occurrence/decoupling × unresolvedClues ×
  // curiosityDelta>0. Built on checkCoOccurrenceDecoupled from the shared checks library. n≥6,
  // ≥2 scenes carrying outstanding clue-debt, ≥2 scenes where curiosity is actively rising, zero
  // overlap → fire. unresolvedClues has only ever been paired with dialogueHighlights (Wave 603)
  // and used as an aftermath-void trigger (Waves 603, 631) in this file — never cross-checked
  // against the curiosity channel. A scene where a mystery sits open is a natural place for
  // wonder to spike further, but that pairing never occurs here.
  {
    const r645c = checkCoOccurrenceDecoupled({
      records, minRecords: 6, minACount: 2, minBCount: 2,
      isA: r => (r.unresolvedClues ?? []).length > 0,
      isB: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r645c.fires) {
      issues.push({
        location: `${r645c.aCount} open-thread scene(s), ${r645c.bCount} rising-curiosity scene(s) — zero overlap`,
        rule: 'ARC_OPEN_THREAD_CURIOSITY_DECOUPLED',
        severity: 'minor',
        description: `The ${r645c.aCount} scenes carrying outstanding clue-debt never coincide with the ${r645c.bCount} scenes where curiosity is actively rising — the arc's open mysteries and its moments of climbing intrigue run on separate tracks. A scene that already holds an unresolved question is a natural place for wonder to spike further, but that pairing never occurs here.`,
        suggestedFix: `Let at least one scene carrying outstanding clue-debt also raise curiosity — a new question surfacing while an old one is still open, giving the arc's open threads a causal tie to its rising intrigue.`,
      });
    }
  }

  // ── Wave 659: ARC_STAGING_PEAK_UNCAUSED, ARC_OPEN_THREAD_DROUGHT_RUN, ARC_PAYOFF_ZONE_CLUSTER ──

  // ARC_STAGING_PEAK_UNCAUSED — Single-peak isolation/backward-cause × visualBeats magnitude.
  // Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 visually-staged scenes, a
  // 2-scene lookback. Finds the single scene with the densest physical staging; fires when
  // neither that scene nor either of the two before it contains a dramatic turn or revelation.
  // visualBeats has only ever been zone-imbalanced (four-zone bloat/empty) in this file, never
  // backward-cause peak-audited.
  {
    const r659a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.visualBeats ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r659a.fires) {
      issues.push({
        location: `scene ${r659a.peakIdx + 1} — peak physical-staging density (${r659a.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'ARC_STAGING_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The arc's single densest scene for physical staging (scene ${r659a.peakIdx + 1}, with ${r659a.peakMagnitude} staged beats) has no dramatic turn or revelation in itself or the two scenes before it. The moment where physical action concentrates most heavily arrives without any structural pivot or disclosure driving it — the peak of staged action carries no causal weight behind it.`,
        suggestedFix: `Give scene ${r659a.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the arc's most physically active moment is earned by a shift in the character's situation rather than arriving in a causal vacuum.`,
      });
    }
  }

  // ARC_OPEN_THREAD_DROUGHT_RUN — Run-based × unresolvedClues absence. Built on checkDroughtRun
  // from the shared checks library. n≥10, ≥3 open-thread scenes overall, fires when the longest
  // consecutive run of scenes with zero outstanding clue-debt reaches 6. This pass already
  // hand-rolls drought-run logic for relational/payoff/curiosity/suspense/clock/emotional channels
  // and Wave 645 added seededClueIds via the shared helper; unresolvedClues itself has only been
  // used in co-occurrence and aftermath-void contexts, never drought-audited.
  {
    const r659b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r659b.fires) {
      issues.push({
        location: `longest stretch with no outstanding clue-debt: ${r659b.longestRun} consecutive scenes`,
        rule: 'ARC_OPEN_THREAD_DROUGHT_RUN',
        severity: 'minor',
        description: `The arc contains a run of ${r659b.longestRun} consecutive scenes with no outstanding clue-debt at all, even though ${r659b.presentCount} scenes elsewhere do carry open mysteries. A long stretch where nothing is left unresolved means the character's arc has no unanswered question to press against for an extended run.`,
        suggestedFix: `Seed a new thread somewhere within the ${r659b.longestRun}-scene stretch so the arc maintains some outstanding mystery throughout, keeping the character's arc of open questions alive.`,
      });
    }
  }

  // ARC_PAYOFF_ZONE_CLUSTER — Distribution/timing × payoffSetupIds × structural thirds. Built on
  // checkZoneCluster from the shared checks library. n≥9, ≥3 payoff scenes, fires when >75% of
  // them fall in a single structural third. This pass already applies the zone-cluster mode to
  // dramaticTurn, relationshipShifts, and curiosityDelta; payoffSetupIds itself has never been
  // cluster-audited here.
  {
    const r659c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.payoffSetupIds ?? []).length > 0,
    });
    if (r659c.fires) {
      const zoneName659c = r659c.zoneNames[r659c.maxZoneIdx];
      issues.push({
        location: `${zoneName659c} third — ${r659c.maxZoneCount}/${r659c.count} payoff scenes`,
        rule: 'ARC_PAYOFF_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r659c.maxZoneCount} of the arc's ${r659c.count} thread-resolution scenes (${Math.round((r659c.maxZoneCount / r659c.count) * 100)}%) cluster in the ${zoneName659c} third. Resolution concentrates almost exclusively in that stretch of the story rather than landing throughout, leaving other structural thirds with no sense of the character's arc paying off.`,
        suggestedFix: `Let at least one thread resolve outside the ${zoneName659c} third — spreading resolutions across the story lets the character's arc pay off gradually instead of arriving all at once.`,
      });
    }
  }

  // ── Wave 673: ARC_CLOCK_DELTA_PEAK_UNCAUSED, ARC_HIGHLIGHT_DROUGHT_RUN, ARC_SEED_ZONE_CLUSTER ──

  // ARC_CLOCK_DELTA_PEAK_UNCAUSED — Single-peak isolation/backward-cause × clockDelta magnitude.
  // Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 scenes with clockDelta>0,
  // a 2-scene lookback. Finds the single scene with the highest clockDelta; fires when neither
  // that scene nor either of the two before it contains a dramatic turn or revelation. Distinct
  // from the existing ARC_CLOCK_PEAK_EMOTION_ABSENT, which checks whether the peak-clockDelta
  // scene is itself emotionally neutral; this instead asks whether that scene is structurally
  // caused by a dramatic turn or revelation.
  {
    const r673a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => r.clockDelta ?? 0,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r673a.fires) {
      issues.push({
        location: `scene ${r673a.peakIdx + 1} — peak clockDelta (${r673a.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'ARC_CLOCK_DELTA_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The scene with the arc's single highest clockDelta (scene ${r673a.peakIdx + 1}, at ${r673a.peakMagnitude}) has no dramatic turn or revelation in itself or the two scenes before it. The moment time pressure compresses most sharply arrives without any structural pivot or disclosure driving it — the peak of urgency carries no causal weight behind it.`,
        suggestedFix: `Give scene ${r673a.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the arc's sharpest deadline compression is earned by a shift in the character's situation rather than arriving in a causal vacuum.`,
      });
    }
  }

  // ARC_HIGHLIGHT_DROUGHT_RUN — Run-based × dialogueHighlights absence. Built on checkDroughtRun
  // from the shared checks library. n≥10, ≥3 highlighted-dialogue scenes overall, fires when the
  // longest consecutive run of scenes with no highlighted dialogue reaches 6. Wave 645 applied
  // the peak-uncaused mode to dialogueHighlights; the drought-run mode has never been applied to
  // this channel.
  {
    const r673b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r673b.fires) {
      issues.push({
        location: `longest stretch with no highlighted dialogue: ${r673b.longestRun} consecutive scenes`,
        rule: 'ARC_HIGHLIGHT_DROUGHT_RUN',
        severity: 'minor',
        description: `The arc contains a run of ${r673b.longestRun} consecutive scenes with no highlighted dialogue at all, even though ${r673b.presentCount} scenes elsewhere carry a standout line. A long unbroken stretch with nothing verbally memorable leaves the character's arc running on unremarkable dialogue for an extended stretch.`,
        suggestedFix: `Give at least one scene within the ${r673b.longestRun}-scene stretch a standout line of dialogue — a character voicing something close to their arc memorably, keeping the verbal register alive throughout.`,
      });
    }
  }

  // ARC_SEED_ZONE_CLUSTER — Distribution/timing × seededClueIds × structural thirds. Built on
  // checkZoneCluster from the shared checks library. n≥9, ≥3 seed scenes, fires when >75% of them
  // fall in a single structural third. Wave 645 applied the drought-run mode to seededClueIds;
  // the zone-cluster mode has never been applied to this channel despite it already anchoring two
  // aftermath-void checks.
  {
    const r673c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.seededClueIds ?? []).length > 0,
    });
    if (r673c.fires) {
      const zoneName673c = r673c.zoneNames[r673c.maxZoneIdx];
      issues.push({
        location: `${zoneName673c} third — ${r673c.maxZoneCount}/${r673c.count} seed scenes`,
        rule: 'ARC_SEED_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r673c.maxZoneCount} of the arc's ${r673c.count} clue-planting scenes (${Math.round((r673c.maxZoneCount / r673c.count) * 100)}%) cluster in the ${zoneName673c} third. Foreshadowing concentrates almost exclusively in that stretch of the story rather than surfacing throughout, leaving other structural thirds with no new material feeding the character's arc.`,
        suggestedFix: `Plant at least one clue outside the ${zoneName673c} third — spreading foreshadowing across the story lets every structural third carry some fresh material for the character's arc to draw on.`,
      });
    }
  }

  // ── Wave 687: ARC_PAYOFF_PEAK_UNCAUSED, ARC_STAGING_DROUGHT_RUN, ARC_HIGHLIGHT_ZONE_CLUSTER ──

  // ARC_PAYOFF_PEAK_UNCAUSED — Single-peak isolation/backward-cause × payoffSetupIds magnitude.
  // Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 payoff scenes, a 2-scene
  // lookback. Finds the single scene with the most simultaneous thread resolutions; fires when
  // neither that scene nor either of the two before it contains a dramatic turn or revelation.
  // payoffSetupIds has been zone-clustered (Wave 659) and drought-audited (hand-rolled, Wave 505)
  // but never backward-cause peak-audited.
  {
    const r687a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.payoffSetupIds ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r687a.fires) {
      issues.push({
        location: `scene ${r687a.peakIdx + 1} — peak payoff density (${r687a.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'ARC_PAYOFF_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The arc's single densest scene for thread resolution (scene ${r687a.peakIdx + 1}, with ${r687a.peakMagnitude} payoffs resolving at once) has no dramatic turn or revelation in itself or the two scenes before it. The moment where the most convergent resolution lands arrives without any structural pivot or disclosure driving it — the peak of narrative payoff carries no causal weight behind it.`,
        suggestedFix: `Give scene ${r687a.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the arc's most convergent resolution is earned by a shift in the character's situation rather than arriving in a causal vacuum.`,
      });
    }
  }

  // ARC_STAGING_DROUGHT_RUN — Run-based × visualBeats absence. Built on checkDroughtRun from the
  // shared checks library. n≥10, ≥3 physically-staged scenes overall, fires when the longest
  // consecutive run of scenes with zero visual beats reaches 6. visualBeats has been zone-
  // imbalanced (four-zone) and backward-cause peak-audited (Wave 659), but never drought-audited.
  {
    const r687b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.visualBeats ?? []).length > 0,
    });
    if (r687b.fires) {
      issues.push({
        location: `longest stretch with no visual staging: ${r687b.longestRun} consecutive scenes`,
        rule: 'ARC_STAGING_DROUGHT_RUN',
        severity: 'minor',
        description: `The arc contains a run of ${r687b.longestRun} consecutive scenes with no visual staging beats at all, even though ${r687b.presentCount} scenes elsewhere do carry physical staging. A long unbroken stretch of pure dialogue or exposition with nothing physically shown leaves the character's arc without any staged action to anchor it.`,
        suggestedFix: `Add a physical staging beat somewhere within the ${r687b.longestRun}-scene stretch — a gesture, an object, a piece of blocking — so the arc stays visually grounded throughout.`,
      });
    }
  }

  // ARC_HIGHLIGHT_ZONE_CLUSTER — Distribution/timing × dialogueHighlights × structural thirds.
  // Built on checkZoneCluster from the shared checks library. n≥9, ≥3 highlighted-dialogue scenes,
  // fires when >75% of them fall in a single structural third. dialogueHighlights has been
  // backward-cause peak-audited (Wave 645) and drought-audited (Wave 673), but never cluster-
  // audited, completing the trio of shared-library modes on this channel.
  {
    const r687c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r687c.fires) {
      const zoneName687c = r687c.zoneNames[r687c.maxZoneIdx];
      issues.push({
        location: `${zoneName687c} third — ${r687c.maxZoneCount}/${r687c.count} highlighted-dialogue scenes`,
        rule: 'ARC_HIGHLIGHT_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r687c.maxZoneCount} of the arc's ${r687c.count} scenes carrying a standout line of dialogue (${Math.round((r687c.maxZoneCount / r687c.count) * 100)}%) cluster in the ${zoneName687c} third. Memorable dialogue concentrates almost exclusively in that stretch rather than landing throughout, leaving other structural thirds with nothing verbally memorable to carry the character's arc.`,
        suggestedFix: `Give at least one scene outside the ${zoneName687c} third a standout line of dialogue — spreading memorable dialogue across the story lets the character's arc carry its own verbal high point in every structural third, not just one.`,
      });
    }
  }

  // ── Wave 701: ARC_STAGING_ZONE_CLUSTER, ARC_CLOCK_DELTA_ZONE_CLUSTER, ARC_SEED_PEAK_UNCAUSED ──

  // ARC_STAGING_ZONE_CLUSTER — Distribution/timing × visualBeats × structural thirds. Built on
  // checkZoneCluster from the shared checks library. n≥9, ≥3 visually-staged scenes, fires when
  // >75% of them fall in a single structural third. visualBeats has been backward-cause
  // peak-audited (Wave 659), drought-audited (Wave 687), and four-zone imbalance-audited, but
  // never cluster-audited on the thirds granularity.
  {
    const r701a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r701a.fires) {
      const zoneName701a = r701a.zoneNames[r701a.maxZoneIdx];
      issues.push({
        location: `${zoneName701a} third — ${r701a.maxZoneCount}/${r701a.count} visually dense scenes`,
        rule: 'ARC_STAGING_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r701a.maxZoneCount} of the arc's ${r701a.count} visually dense scenes (${Math.round((r701a.maxZoneCount / r701a.count) * 100)}%) cluster in the ${zoneName701a} third. Physical staging concentrates almost exclusively in that stretch of the story rather than surfacing throughout, leaving other structural thirds with no physically embodied moment for the character's arc.`,
        suggestedFix: `Give at least one scene outside the ${zoneName701a} third substantial physical staging — spreading embodied presence across the story lets each structural third carry some physical sense of the character's arc.`,
      });
    }
  }

  // ARC_CLOCK_DELTA_ZONE_CLUSTER — Distribution/timing × clockDelta>0 × structural thirds. Built
  // on checkZoneCluster from the shared checks library. n≥9, ≥3 scenes with a positive clock
  // delta, fires when >75% of them fall in a single structural third. Distinct from the existing
  // hand-rolled ARC_CLOCK_DROUGHT_RUN (clockRaised boolean) and Wave 673's ARC_CLOCK_DELTA_PEAK_
  // UNCAUSED (backward-cause peak); the zone-cluster mode has never been applied to the raw
  // clockDelta signal.
  {
    const r701b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.clockDelta ?? 0) > 0,
    });
    if (r701b.fires) {
      const zoneName701b = r701b.zoneNames[r701b.maxZoneIdx];
      issues.push({
        location: `${zoneName701b} third — ${r701b.maxZoneCount}/${r701b.count} clock-advancing scenes`,
        rule: 'ARC_CLOCK_DELTA_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r701b.maxZoneCount} of the arc's ${r701b.count} scenes where the clock advances (${Math.round((r701b.maxZoneCount / r701b.count) * 100)}%) cluster in the ${zoneName701b} third. Time pressure concentrates almost exclusively in that stretch of the story rather than surfacing throughout, leaving other structural thirds with no urgency bearing on the character's arc.`,
        suggestedFix: `Advance the clock in at least one scene outside the ${zoneName701b} third — spreading time pressure across the story lets every structural third carry some urgency on the character's arc.`,
      });
    }
  }

  // ARC_SEED_PEAK_UNCAUSED — Single-peak isolation/backward-cause × seededClueIds magnitude. Built
  // on checkPeakUncaused from the shared checks library. n≥8, ≥2 seed scenes, a 2-scene lookback.
  // Finds the single scene with the most simultaneous clues planted; fires when neither that scene
  // nor either of the two before it contains a dramatic turn or revelation. seededClueIds has been
  // drought-audited (Wave 645) and zone-clustered (Wave 673), but never backward-cause peak-
  // audited.
  {
    const r701c = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.seededClueIds ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r701c.fires) {
      issues.push({
        location: `scene ${r701c.peakIdx + 1} — peak seed density (${r701c.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'ARC_SEED_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The arc's single densest scene for planting new clues (scene ${r701c.peakIdx + 1}, with ${r701c.peakMagnitude} clues seeded at once) has no dramatic turn or revelation in itself or the two scenes before it. The moment where foreshadowing concentrates most heavily arrives without any structural pivot or disclosure driving it — an uncaused spike that undercuts the sense that the character's arc drives what gets planted.`,
        suggestedFix: `Give scene ${r701c.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the arc's most seed-dense moment is earned by a shift in the character's situation rather than arriving in a causal vacuum.`,
      });
    }
  }

  // ── Wave 715: ARC_RESOLUTION_DROUGHT_RUN, ARC_CLOCK_DELTA_DROUGHT_RUN,
  //              ARC_OPEN_THREAD_PEAK_UNCAUSED ─────────────────────────────────────────────────

  // ARC_RESOLUTION_DROUGHT_RUN — Run-based × payoffSetupIds absence. Built on checkDroughtRun from
  // the shared checks library. n≥10, ≥3 payoff scenes overall, fires when the longest consecutive
  // run of scenes with zero thread resolution reaches 6. Waves 659/687 applied the zone-cluster
  // and backward-cause peak modes to payoffSetupIds; the drought-run mode has never been applied
  // to it via the shared library, completing the trio. Named distinctly from the existing
  // hand-rolled ARC_PAYOFF_DROUGHT_RUN (Wave 505) to avoid a rule-name collision.
  {
    const r715a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.payoffSetupIds ?? []).length > 0,
    });
    if (r715a.fires) {
      issues.push({
        location: `longest stretch with no payoff: ${r715a.longestRun} consecutive scenes`,
        rule: 'ARC_RESOLUTION_DROUGHT_RUN',
        severity: 'minor',
        description: `The arc contains a run of ${r715a.longestRun} consecutive scenes with no thread resolving at all, even though ${r715a.presentCount} scenes elsewhere do pay off a setup. A long stretch where nothing resolves leaves the character's arc without a sense of accumulating clarity for an extended run.`,
        suggestedFix: `Resolve at least one thread somewhere within the ${r715a.longestRun}-scene stretch so the character's arc keeps building toward resolution throughout that stretch.`,
      });
    }
  }

  // ARC_CLOCK_DELTA_DROUGHT_RUN — Run-based × clockDelta>0 absence. Built on checkDroughtRun from
  // the shared checks library. n≥10, ≥3 scenes with a positive clock delta, fires when the longest
  // consecutive run of scenes with no clock advance reaches 6. Waves 673/701 applied the
  // backward-cause peak and zone-cluster modes to clockDelta; the drought-run mode has never been
  // applied to it, completing the trio. Distinct from the existing hand-rolled ARC_CLOCK_
  // DROUGHT_RUN (clockRaised boolean, Wave 575).
  {
    const r715b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.clockDelta ?? 0) > 0,
    });
    if (r715b.fires) {
      issues.push({
        location: `longest stretch with no clock advance: ${r715b.longestRun} consecutive scenes`,
        rule: 'ARC_CLOCK_DELTA_DROUGHT_RUN',
        severity: 'minor',
        description: `The arc contains a run of ${r715b.longestRun} consecutive scenes with no clock advance at all, even though ${r715b.presentCount} scenes elsewhere do compress time pressure. A long unbroken stretch with no deadline tightening leaves the character's arc without any urgency for an extended run.`,
        suggestedFix: `Advance the clock somewhere within the ${r715b.longestRun}-scene stretch — even a small compression keeps the character's arc under some time pressure throughout that stretch.`,
      });
    }
  }

  // ARC_OPEN_THREAD_PEAK_UNCAUSED — Single-peak isolation/backward-cause × unresolvedClues
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 scenes carrying
  // outstanding clue-debt, a 2-scene lookback. Finds the single scene with the most simultaneous
  // open threads; fires when neither that scene nor either of the two before it contains a
  // dramatic turn or revelation. unresolvedClues has only ever anchored a co-occurrence/decoupling
  // check (Wave 645); the backward-cause peak mode has never been applied to it.
  {
    const r715c = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.unresolvedClues ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r715c.fires) {
      issues.push({
        location: `scene ${r715c.peakIdx + 1} — peak open-thread density (${r715c.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'ARC_OPEN_THREAD_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The arc's single densest scene for outstanding clue-debt (scene ${r715c.peakIdx + 1}, with ${r715c.peakMagnitude} open threads) has no dramatic turn or revelation in itself or the two scenes before it. The moment where unresolved mystery concentrates most heavily arrives without any structural pivot or disclosure driving it — the peak of accumulated question carries no causal weight behind it.`,
        suggestedFix: `Give scene ${r715c.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the arc's most mystery-dense moment is earned by a shift in the character's situation rather than arriving in a causal vacuum.`,
      });
    }
  }

  // ── Wave 729: ARC_OPEN_THREAD_ZONE_CLUSTER, ARC_CHARACTER_MOMENT_DROUGHT_RUN,
  //              ARC_CURIOSITY_PEAK_UNCAUSED ───────────────────────────────────────────

  // ARC_OPEN_THREAD_ZONE_CLUSTER — Distribution/timing × unresolvedClues × structural thirds.
  // Built on checkZoneCluster from the shared checks library. n≥9, ≥3 open-thread scenes, fires
  // when more than 75% of those scenes cluster in a single third. Waves 659/715 applied the
  // run-based drought and backward-cause peak modes to unresolvedClues; the zone-cluster mode has
  // never been applied to it, completing the trio.
  {
    const r729a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r729a.fires) {
      issues.push({
        location: `${r729a.zoneNames[r729a.maxZoneIdx]} third — ${r729a.maxZoneCount} of ${r729a.count} open-thread scenes`,
        rule: 'ARC_OPEN_THREAD_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r729a.maxZoneCount / r729a.count) * 100)}% of the scenes carrying outstanding clue-debt cluster in the arc's ${r729a.zoneNames[r729a.maxZoneIdx]} third. When every open question is left dangling in the same structural window, the character's arc has no unresolved mystery pressing on them anywhere else in the story.`,
        suggestedFix: `Seed or carry forward at least one open thread outside the ${r729a.zoneNames[r729a.maxZoneIdx]} third so unresolved mystery keeps pressing on the character throughout the arc.`,
      });
    }
  }

  // ARC_CHARACTER_MOMENT_DROUGHT_RUN — Run-based × purpose === 'character_moment' absence. Built
  // on checkDroughtRun from the shared checks library. n≥10, ≥3 character-moment scenes overall,
  // fires when the longest consecutive run of scenes purposed otherwise reaches 6. Wave 617
  // applied the four-zone-imbalance mode to this signal; the run-based drought mode has never been
  // applied to it.
  {
    const r729b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'character_moment',
    });
    if (r729b.fires) {
      issues.push({
        location: `longest stretch with no character-moment scene: ${r729b.longestRun} consecutive scenes`,
        rule: 'ARC_CHARACTER_MOMENT_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r729b.longestRun} consecutive scenes purposed otherwise than a character moment, even though ${r729b.presentCount} scenes elsewhere are dedicated to the protagonist's inner life. A long unbroken stretch with nothing but plot-forward scenes leaves the character's arc without a beat to breathe and reveal who they are for an extended run.`,
        suggestedFix: `Purpose at least one scene within the ${r729b.longestRun}-scene stretch as a character moment — even a brief beat of reflection keeps the arc's interior thread alive throughout that stretch.`,
      });
    }
  }

  // ARC_CURIOSITY_PEAK_UNCAUSED — Single-peak isolation/backward-cause × curiosityDelta magnitude,
  // via the shared checks library. n≥8, ≥2 scenes with a positive curiosity spike, a 2-scene
  // lookback. Finds the single scene with the sharpest curiosity rise; fires when neither that
  // scene nor either of the two before it contains a dramatic turn or revelation. Distinct from
  // the existing hand-rolled peak-audits (ARC_PEAK_CURIOSITY_EMOTION_ABSENT, Wave 365;
  // ARC_CURIOSITY_PEAK_RELATIONAL_VOID, Wave 533), both of which examine the peak scene's OWN
  // state (its emotion, its relationship shifts); this instead audits whether the peak scene or
  // either of the two PRECEDING scenes contains a causal driver — a backward-looking check never
  // applied to this channel.
  {
    const r729c = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => Math.max(0, r.curiosityDelta ?? 0),
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r729c.fires) {
      issues.push({
        location: `scene ${r729c.peakIdx + 1} — peak curiosity spike (${r729c.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'ARC_CURIOSITY_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The arc's single sharpest curiosity spike (scene ${r729c.peakIdx + 1}, a rise of ${r729c.peakMagnitude}) has no dramatic turn or revelation in itself or the two scenes before it. The moment where the audience's hunger to know more peaks hardest arrives without any structural pivot or disclosure driving it — an uncaused spike that gives the character's arc nothing to hook the wondering to.`,
        suggestedFix: `Give scene ${r729c.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the arc's sharpest curiosity spike is earned by a shift in the character's circumstance rather than arriving in a causal vacuum.`,
      });
    }
  }

  // ── Wave 743: ARC_CHARACTER_MOMENT_ZONE_CLUSTER, ARC_TURN_DROUGHT_RUN,
  //              ARC_CLOCK_ZONE_CLUSTER ───────────────────────────────────────────────────

  // ARC_CHARACTER_MOMENT_ZONE_CLUSTER — Distribution/timing × purpose === 'character_moment' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // character-moment scenes, fires when more than 75% of those scenes cluster in a single third.
  // Wave 617 applied the four-zone-imbalance mode and Wave 729 applied the run-based drought mode
  // to this signal; the thirds-ratio zone-cluster mode has never been applied to it — a distinct
  // analytical shape, since a >75%-in-one-third concentration can fire even when no zone is
  // completely empty.
  {
    const r743a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'character_moment',
    });
    if (r743a.fires) {
      issues.push({
        location: `${r743a.zoneNames[r743a.maxZoneIdx]} third — ${r743a.maxZoneCount} of ${r743a.count} character-moment scenes`,
        rule: 'ARC_CHARACTER_MOMENT_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r743a.maxZoneCount / r743a.count) * 100)}% of the story's dedicated character-moment scenes cluster in the ${r743a.zoneNames[r743a.maxZoneIdx]} third. When every beat purposed to reveal the protagonist's inner life lands in the same structural window, the arc has no interior breath anywhere else in the story.`,
        suggestedFix: `Purpose at least one scene outside the ${r743a.zoneNames[r743a.maxZoneIdx]} third as a character moment so the arc's interior thread keeps breathing more evenly across the story.`,
      });
    }
  }

  // ARC_TURN_DROUGHT_RUN — Run-based × dramaticTurn !== 'nothing' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 scenes carrying a dramatic turn,
  // fires when the longest consecutive run of scenes with no turn reaches 6. Wave 449 applied the
  // zone-cluster mode to this channel (ARC_TURN_ZONE_CLUSTER); the run-based drought mode has
  // never been applied to it.
  {
    const r743b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
    });
    if (r743b.fires) {
      issues.push({
        location: `longest stretch with no dramatic turn: ${r743b.longestRun} consecutive scenes`,
        rule: 'ARC_TURN_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r743b.longestRun} consecutive scenes with no dramatic turn at all, even though ${r743b.presentCount} scenes elsewhere do pivot. A long unbroken stretch with nothing reversing or complicating the situation leaves the character's arc coasting without a structural pivot to react to for an extended run.`,
        suggestedFix: `Introduce a dramatic turn somewhere within the ${r743b.longestRun}-scene stretch so the arc keeps something to react to and grow from throughout that stretch.`,
      });
    }
  }

  // ARC_CLOCK_ZONE_CLUSTER — Distribution/timing × clockRaised === true × structural thirds.
  // Built on checkZoneCluster from the shared checks library. n≥9, ≥3 clockRaised scenes, fires
  // when more than 75% of those scenes cluster in a single third. The existing
  // ARC_CLOCK_DROUGHT_RUN (Wave 575) audits run-length absence and ARC_CLOCK_OPENING_ZONE_ABSENT
  // audits only the opening third specifically; the general thirds-ratio zone-cluster mode, which
  // can fire on a middle- or closing-third concentration that the opening-only check cannot
  // detect, has never been applied to it.
  {
    const r743c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.clockRaised === true,
    });
    if (r743c.fires) {
      issues.push({
        location: `${r743c.zoneNames[r743c.maxZoneIdx]} third — ${r743c.maxZoneCount} of ${r743c.count} clockRaised scenes`,
        rule: 'ARC_CLOCK_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r743c.maxZoneCount / r743c.count) * 100)}% of the story's clockRaised scenes cluster in the ${r743c.zoneNames[r743c.maxZoneIdx]} third. When every ticking-clock beat lands in the same structural window, the character's arc loses any sense of mounting time pressure recurring across the whole story.`,
        suggestedFix: `Raise the clock in at least one scene outside the ${r743c.zoneNames[r743c.maxZoneIdx]} third so time pressure keeps testing the character more evenly across the story.`,
      });
    }
  }

  // ── Wave 757: ARC_SUSPENSE_ZONE_CLUSTER, ARC_EMOTION_ZONE_CLUSTER, ARC_STAKES_DROUGHT_RUN ──

  // ARC_SUSPENSE_ZONE_CLUSTER — Distribution/timing × suspenseDelta>0 presence × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 suspense-positive
  // scenes, fires when more than 75% of those scenes cluster in a single third. The existing
  // ARC_SUSPENSE_DROUGHT_RUN audits run-length absence and ARC_SUSPENSE_OPENING_ZONE_ABSENT
  // audits only the opening third specifically; the general thirds-ratio zone-cluster mode has
  // never been applied to it.
  {
    const r757a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r757a.fires) {
      issues.push({
        location: `${r757a.zoneNames[r757a.maxZoneIdx]} third — ${r757a.maxZoneCount} of ${r757a.count} suspense-positive scenes`,
        rule: 'ARC_SUSPENSE_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r757a.maxZoneCount / r757a.count) * 100)}% of the scenes where tension rises cluster in the ${r757a.zoneNames[r757a.maxZoneIdx]} third. When every suspense spike lands in the same structural window, the character's arc has no rising danger testing them anywhere else in the story.`,
        suggestedFix: `Raise suspense in at least one scene outside the ${r757a.zoneNames[r757a.maxZoneIdx]} third so tension keeps testing the character more evenly across the arc.`,
      });
    }
  }

  // ARC_EMOTION_ZONE_CLUSTER — Distribution/timing × emotionalShift !== 'neutral' presence ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // emotionally-charged scenes, fires when more than 75% of those scenes cluster in a single
  // third. The existing ARC_EMOTIONAL_DROUGHT_RUN audits run-length absence,
  // ARC_EMOTION_CONCENTRATION audits a contiguous span (≤20% of the story), and
  // ARC_EMOTIONAL_FRONT_LOADED/BACK_LOADED audit a binary half-split; the general thirds-ratio
  // zone-cluster mode — a disjoint-third majority test distinct from all three — has never been
  // applied to it.
  {
    const r757b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.emotionalShift !== 'neutral',
    });
    if (r757b.fires) {
      issues.push({
        location: `${r757b.zoneNames[r757b.maxZoneIdx]} third — ${r757b.maxZoneCount} of ${r757b.count} emotionally-charged scenes`,
        rule: 'ARC_EMOTION_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r757b.maxZoneCount / r757b.count) * 100)}% of the protagonist's emotionally-charged scenes cluster in the ${r757b.zoneNames[r757b.maxZoneIdx]} third. When every emotional beat lands in the same structural window, the character's arc goes affectively quiet everywhere else in the story.`,
        suggestedFix: `Give the protagonist an emotional beat in at least one scene outside the ${r757b.zoneNames[r757b.maxZoneIdx]} third so feeling keeps threading through the arc more evenly.`,
      });
    }
  }

  // ARC_STAKES_DROUGHT_RUN — Run-based × purpose === 'raise_stakes' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 stakes-raising scenes overall, fires
  // when the longest consecutive run of scenes purposed otherwise reaches 6. purpose has never
  // anchored any of the three shared-library modes for this specific value; the run-based drought
  // mode has never been applied to it.
  {
    const r757c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'raise_stakes',
    });
    if (r757c.fires) {
      issues.push({
        location: `longest stretch with no scene raising stakes: ${r757c.longestRun} consecutive scenes`,
        rule: 'ARC_STAKES_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r757c.longestRun} consecutive scenes with no scene purposed to raise stakes, even though ${r757c.presentCount} scenes elsewhere do escalate. A long unbroken stretch with nothing pushing the stakes higher leaves the character's arc coasting without mounting pressure for an extended run.`,
        suggestedFix: `Purpose at least one scene within the ${r757c.longestRun}-scene stretch to raise stakes — even a small escalation keeps the character's arc under mounting pressure throughout that stretch.`,
      });
    }
  }

  // ── Wave 771: ARC_SUSPENSE_PEAK_UNCAUSED, ARC_STAKES_ZONE_CLUSTER,
  //              ARC_REVELATION_ZONE_CLUSTER ──────────────────────────────────────

  // ARC_SUSPENSE_PEAK_UNCAUSED — Backward-cause × suspenseDelta-as-magnitude × 2-scene lookback.
  // Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 suspense-positive scenes,
  // fires when the peak suspense scene has no dramatic turn or revelation in the 2 scenes
  // preceding it. ARC_SUSPENSE_DROUGHT_RUN and ARC_SUSPENSE_ZONE_CLUSTER completed the
  // drought/cluster half of the trio; the existing ARC_PEAK_SUSPENSE_EMOTION_ABSENT audits the
  // co-occurring emotion channel AT the peak scene, not a preparing cause in the scenes before
  // it — the backward-cause peak mode has never been applied to suspenseDelta itself.
  {
    const r771a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => Math.max(0, r.suspenseDelta ?? 0),
      hasCause: r => (r.dramaticTurn ?? 'nothing') !== 'nothing' || r.revelation != null,
    });
    if (r771a.fires) {
      issues.push({
        location: `scene ${r771a.peakIdx} (peak suspenseDelta ${r771a.peakMagnitude}) — no preparing cause nearby`,
        rule: 'ARC_SUSPENSE_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single highest-suspense scene (Scene ${r771a.peakIdx}, suspenseDelta ${r771a.peakMagnitude}) arrives with no dramatic turn or revelation in the 2 scenes leading into it, even though ${r771a.qualifyingCount} scenes elsewhere carry tension. The moment the character is most gripped lands out of nowhere — the arc hasn't built toward the pressure it's about to test them with.`,
        suggestedFix: `Add a dramatic turn or revelation in one of the 2 scenes before scene ${r771a.peakIdx} so the character's arc builds toward the peak instead of springing it without preparation.`,
      });
    }
  }

  // ARC_STAKES_ZONE_CLUSTER — Distribution/timing × purpose === 'raise_stakes' presence ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // stakes-raising scenes, fires when more than 75% of those scenes cluster in a single third.
  // ARC_STAKES_DROUGHT_RUN applied the run-based drought mode to this value; the zone-cluster
  // mode has never been applied to it.
  {
    const r771b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'raise_stakes',
    });
    if (r771b.fires) {
      issues.push({
        location: `${r771b.zoneNames[r771b.maxZoneIdx]} third — ${r771b.maxZoneCount} of ${r771b.count} stakes-raising scenes`,
        rule: 'ARC_STAKES_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r771b.maxZoneCount / r771b.count) * 100)}% of the scenes purposed to raise stakes cluster in the ${r771b.zoneNames[r771b.maxZoneIdx]} third. When every escalation lands in the same structural window, the character's arc has no mounting pressure testing them anywhere else in the story.`,
        suggestedFix: `Purpose at least one scene outside the ${r771b.zoneNames[r771b.maxZoneIdx]} third to raise stakes so the character's arc keeps mounting pressure testing them more evenly across the story.`,
      });
    }
  }

  // ARC_REVELATION_ZONE_CLUSTER — Distribution/timing × revelation × structural thirds. Built on
  // checkZoneCluster from the shared checks library. n≥9, ≥3 revelation scenes, fires when more
  // than 75% of those scenes cluster in a single third. The existing ARC_REVELATION_LATE_CLUSTER
  // audits a fixed final-quarter window (>60% of revelations in the last 25%); the general
  // thirds-ratio zone-cluster mode — a disjoint-third majority test at a lower 75% threshold with
  // no fixed zone — has never been applied to revelation.
  {
    const r771c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.revelation != null,
    });
    if (r771c.fires) {
      issues.push({
        location: `${r771c.zoneNames[r771c.maxZoneIdx]} third — ${r771c.maxZoneCount} of ${r771c.count} revelation scenes`,
        rule: 'ARC_REVELATION_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r771c.maxZoneCount / r771c.count) * 100)}% of the story's revelation scenes cluster in the ${r771c.zoneNames[r771c.maxZoneIdx]} third. When every disclosure lands in the same structural window, the character's arc has no fresh truth reshaping them anywhere else in the story.`,
        suggestedFix: `Let a revelation land in at least one scene outside the ${r771c.zoneNames[r771c.maxZoneIdx]} third so the character's arc keeps being reshaped by new disclosures more evenly across the story.`,
      });
    }
  }

  // ── Wave 785: ARC_REVELATION_DROUGHT_RUN, ARC_REVELATION_PEAK_UNCAUSED,
  //              ARC_NEGATIVE_EMOTION_ZONE_CLUSTER ──────────────────────────────────────

  // ARC_REVELATION_DROUGHT_RUN — Run-based × revelation absence. Built on checkDroughtRun from
  // the shared checks library. n≥10, ≥3 revelation scenes overall, fires when the longest
  // consecutive run of scenes with no revelation reaches 6. Wave 771 applied the zone-cluster
  // mode to revelation; the run-based drought mode has never been applied to it.
  {
    const r785a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.revelation != null,
    });
    if (r785a.fires) {
      issues.push({
        location: `longest stretch with no revelation: ${r785a.longestRun} consecutive scenes`,
        rule: 'ARC_REVELATION_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r785a.longestRun} consecutive scenes with no revelation at all, even though ${r785a.presentCount} scenes elsewhere disclose a truth. A long unbroken stretch with nothing new coming to light leaves the character's arc with no fresh disclosure reshaping it for an extended run.`,
        suggestedFix: `Let a truth surface somewhere within the ${r785a.longestRun}-scene stretch so the character's arc keeps being reshaped by new disclosures throughout that stretch.`,
      });
    }
  }

  // ARC_REVELATION_PEAK_UNCAUSED — Backward-cause × revelation-as-magnitude × 2-scene lookback.
  // Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 revelation scenes, fires
  // when the peak (earliest, on magnitude ties) revelation scene has no dramatic turn in the 2
  // scenes preceding it. Completing the trio; hasCause references only dramaticTurn, never
  // revelation, to avoid a circular/self-referential audit.
  {
    const r785b = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.revelation != null ? 1 : 0),
      hasCause: r => r.dramaticTurn !== 'nothing',
    });
    if (r785b.fires) {
      issues.push({
        location: `scene ${r785b.peakIdx + 1} — the story's peak revelation scene`,
        rule: 'ARC_REVELATION_PEAK_UNCAUSED',
        severity: 'minor',
        description: `Scene ${r785b.peakIdx + 1} is the earliest of ${r785b.qualifyingCount} revelation scenes, yet none of the 2 scenes leading into it carry a dramatic turn. A disclosure this significant lands without any structural pivot building toward it, leaving the character's arc slack right before the reveal.`,
        suggestedFix: `Add a dramatic turn in one of the 2 scenes before scene ${r785b.peakIdx + 1} so the character's arc builds pressure into the revelation instead of arriving flat.`,
      });
    }
  }

  // ARC_NEGATIVE_EMOTION_ZONE_CLUSTER — Distribution/timing × emotionalShift === 'negative'
  // presence × structural thirds. Built on checkZoneCluster from the shared checks library. n≥9,
  // ≥3 negative-shift scenes, fires when more than 75% of those scenes cluster in a single third.
  // The existing ARC_NEGATIVE_EMOTION_RUN audits consecutive-presence (run-based), a distinct
  // claim from where negative beats concentrate structurally; the general thirds-ratio
  // zone-cluster mode has never been applied to this specific valence.
  {
    const r785c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.emotionalShift === 'negative',
    });
    if (r785c.fires) {
      issues.push({
        location: `${r785c.zoneNames[r785c.maxZoneIdx]} third — ${r785c.maxZoneCount} of ${r785c.count} negative-shift scenes`,
        rule: 'ARC_NEGATIVE_EMOTION_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r785c.maxZoneCount / r785c.count) * 100)}% of the story's negative emotional shifts cluster in the ${r785c.zoneNames[r785c.maxZoneIdx]} third. When every setback lands in the same structural window, the character's arc has no low point testing them anywhere else in the story.`,
        suggestedFix: `Give the character a setback in at least one scene outside the ${r785c.zoneNames[r785c.maxZoneIdx]} third so the arc keeps testing them with adversity more evenly across the story.`,
      });
    }
  }

  // ── Wave 799: ARC_NEGATIVE_EMOTION_DROUGHT_RUN, ARC_TURNING_POINT_ZONE_CLUSTER,
  //              ARC_TURNING_POINT_DROUGHT_RUN ──────────────────────────────────────

  // ARC_NEGATIVE_EMOTION_DROUGHT_RUN — Run-based × emotionalShift === 'negative' absence. Built
  // on checkDroughtRun from the shared checks library. n≥10, ≥3 negative-shift scenes overall,
  // fires when the longest consecutive run of scenes with no negative charge reaches 6. Completes
  // the trio for this valence alongside the zone-cluster mode added in Wave 785. Distinct from
  // ARC_NEGATIVE_EMOTION_RUN, which audits consecutive PRESENCE of negative scenes — an absence
  // run of 6+ scenes with no negative beat is the mirror-image claim, and a story satisfying one
  // does not automatically satisfy the other.
  {
    const r799a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.emotionalShift === 'negative',
    });
    if (r799a.fires) {
      issues.push({
        location: `longest stretch with no negative-emotion charge: ${r799a.longestRun} consecutive scenes`,
        rule: 'ARC_NEGATIVE_EMOTION_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r799a.longestRun} consecutive scenes with no negative-emotion charge at all, even though ${r799a.presentCount} scenes elsewhere carry one. A long unbroken stretch with no setback leaves the character's arc without any adversity testing them for an extended run.`,
        suggestedFix: `Give the character a setback within the ${r799a.longestRun}-scene stretch so the arc keeps testing them with adversity throughout that stretch.`,
      });
    }
  }

  // ARC_TURNING_POINT_ZONE_CLUSTER — Distribution/timing × purpose === 'turning_point' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // turning-point scenes, fires when more than 75% of them fall in a single structural third.
  // This specific purpose value has only ever appeared inside a five-value composite set (used
  // elsewhere in this pass); it has never been audited as its own standalone signal by any of the
  // three shared-library trio modes.
  {
    const r799b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'turning_point',
    });
    if (r799b.fires) {
      issues.push({
        location: `${r799b.zoneNames[r799b.maxZoneIdx]} third — ${r799b.maxZoneCount} of ${r799b.count} turning-point scenes`,
        rule: 'ARC_TURNING_POINT_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r799b.maxZoneCount / r799b.count) * 100)}% of the story's turning-point scenes cluster in the ${r799b.zoneNames[r799b.maxZoneIdx]} third. When every scene purposed as a turning point lands in the same structural window, the character's arc has no redirection anywhere else in the story.`,
        suggestedFix: `Purpose at least one scene outside the ${r799b.zoneNames[r799b.maxZoneIdx]} third as a turning point so the arc keeps redirecting the character more evenly across the story.`,
      });
    }
  }

  // ARC_TURNING_POINT_DROUGHT_RUN — Run-based × purpose === 'turning_point' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 turning-point scenes overall, fires
  // when the longest consecutive run of scenes with no turning-point purpose reaches 6. Completes
  // 2 of 3 slots for this purpose value alongside the zone-cluster mode added in this same wave
  // (peak mode conventionally skipped for this categorical field).
  {
    const r799c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'turning_point',
    });
    if (r799c.fires) {
      issues.push({
        location: `longest stretch with no turning point: ${r799c.longestRun} consecutive scenes`,
        rule: 'ARC_TURNING_POINT_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r799c.longestRun} consecutive scenes with no turning-point purpose at all, even though ${r799c.presentCount} scenes elsewhere redirect the character. A long unbroken stretch with no redirection leaves the character's arc coasting without a pivot for an extended run.`,
        suggestedFix: `Purpose at least one scene within the ${r799c.longestRun}-scene stretch as a turning point so the arc keeps redirecting the character throughout that stretch.`,
      });
    }
  }

  const { revised, usedLLM } = await rewritePass({ fountain, issues, passName: 'character-arc', approvedSpans, storyContext: input.storyContext, priorPassResults: input.priorPassResults });
  const changed = revised !== fountain;

  return {
    pass: 'character-arc',
    issues,
    revisedFountain: revised,
    changed,
    summary: issues.length === 0
      ? 'Character-arc pass: arcs are complete'
      : `Character-arc pass: ${issues.length} issue(s) — ${usedLLM ? 'rewritten' : 'flagged (stub mode)'}`,
  };
}

/** Per-scene narrative signal vector used by the Wave 213 arc-dynamics checks.
 *  Each scene is decomposed onto orthogonal dramatic axes so the checks can reason
 *  about emotional movement, relational movement, and causal motivation independently
 *  rather than collapsing everything onto a single emotionalShift enum. */
interface SceneArcSignal {
  /** Emotional state of the scene: +1 positive, 0 neutral, -1 negative */
  state: number;
  /** Positive movement: emotional uplift + cumulative positive relationship gain */
  triumph: number;
  /** Adversity: emotional defeat + cumulative relational loss (absolute magnitude) */
  adversity: number;
  /** Causal force capable of motivating an emotional turn: revelation, payoff firing,
   *  a major relationship shift (|amount| ≥ 0.3), or a suspense resolution. */
  catalyst: number;
}

function computeArcDynamics(records: PassInput['records']): SceneArcSignal[] {
  return records.map((r: any) => {
    const rel = (r.relationshipShifts ?? []) as Array<{ amount: number }>;
    const relGain = rel.filter(s => s.amount > 0).reduce((a, s) => a + s.amount, 0);
    const relLoss = rel.filter(s => s.amount < 0).reduce((a, s) => a + Math.abs(s.amount), 0);
    const state = r.emotionalShift === 'positive' ? 1 : r.emotionalShift === 'negative' ? -1 : 0;

    const triumph = (state > 0 ? 1 : 0) + relGain;
    const adversity = (state < 0 ? 1 : 0) + relLoss;

    const bigRelShift = rel.some(s => Math.abs(s.amount) >= 0.3);
    const suspenseResolved = (r.suspenseDelta ?? 0) < 0;
    const catalyst =
      (r.revelation !== null && r.revelation !== undefined ? 1 : 0) +
      ((r.payoffSetupIds?.length ?? 0) > 0 ? 1 : 0) +
      (bigRelShift ? 1 : 0) +
      (suspenseResolved ? 1 : 0);

    return { state, triumph, adversity, catalyst };
  });
}

function dominantShift(records: PassInput['records']): string {
  if (records.length === 0) return 'neutral';
  const counts: Record<string, number> = {};
  for (const r of records) {
    const shift = r.emotionalShift ?? 'neutral';
    counts[shift] = (counts[shift] ?? 0) + 1;
  }
  const entries = Object.entries(counts);
  if (entries.length === 0) return 'neutral';
  return entries.sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'neutral';
}
