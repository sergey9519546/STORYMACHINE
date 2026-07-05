// Wave 139 — Pass 1: Structure
// Checks act balance: act1 too long, act2 too short, missing midpoint pressure,
// climax approach in wrong position, epilogue missing.
// Wave 139 additions: missing inciting incident (Act 1 without major shift),
// weak act boundaries (Act 1 end and Act 2 end lack turning-point suspense deltas),
// and protagonist passivity at climax (climax scene lacks decisive character action).
// Wave 152 additions: revelation drought (long sequences without any revelation
// or clue), false climax (peak suspense scene not near climax position), and
// act symmetry imbalance (Act 1 and Act 3 wildly mismatched in scene count).
// Wave 264 additions: revelation clustered (≥3 revelations in ≤4-scene window),
// Act 1 curiosity absent (no curiosity spike in Act 1 when story has 2+ elsewhere),
// Act 1 purpose single (all Act 1 scenes share one purpose).
// Wave 278 additions: Act 2a suspense void (Act 2a has no scene with suspenseDelta>1),
// climax purpose absent (no scene carries purpose='climax'), and emotional arc
// uniform (>70% of scenes share the same emotionalShift register).
// Wave 292 additions: Act 3 curiosity spike absent (final quarter never spikes
// curiosity), clock pressure finale absent (no clockRaised in final quarter despite
// earlier clock activity), opening suspense flatline (first 3 scenes all suspenseDelta ≤ 0).
// Wave 306 additions: midpoint emotional flatline (the central scene is emotionally
// neutral with no suspense), final image weak (last scene has no emotional/suspense/
// relational charge), act balance extreme (one act holds >55% of all scenes).
// Wave 320 additions: climax revelation absent (no revelation in Act 3 while 2+
// exist earlier), Act 2 curiosity valley (Act 2 avg curiosity below both bookend
// acts), emotional opening neutral (first 3 scenes all emotionally neutral).
// Wave 331 additions: Act 3 emotional flatline (all finale scenes emotionally
// neutral), Act 1 warmth absent (no positive scene in opening act),
// dramatic turn opening absent (no dramatic turn in first 30% of scenes).
// Wave 345 additions: Act 2b suspense void (no suspense spike in the 50%–75% run-up to
// the climax), Act 2a emotional flatline (the 25%–50% conflict zone is all neutral),
// midpoint curiosity void (the 40%–60% pivot averages curiosityDelta ≤ 0 while the
// story is otherwise curious).
// Wave 359 additions: opening curiosity flatline (Act 1 averages curiosityDelta ≤ 0
// while the story is otherwise curious — the hook fails to generate questions), Act 3
// dramatic turn absent (no dramatic turn in the final 25% despite turns earlier — the
// finale unfolds without reversals), Act 1 relationship void (no relationship shift in
// Act 1 while ≥3 shifts exist overall — the opening establishes no relational dynamic).
// Wave 373 additions: midpoint suspense void (the 40%–60% pivot has no suspense spike
// while the story spikes elsewhere — completes the midpoint channel set with curiosity and
// emotion), Act 2 purpose single (all Act 2 scenes share one purpose — the gap between
// Act 1 and Act 3 purpose checks), Act 2b emotional flatline (the 50%–75% run-up to the
// climax is all neutral — the emotional mirror of Act 2a emotional flatline).
// Wave 387 additions: Act 1 emotional flatline (the whole first 25% is neutral while emotion
// exists elsewhere — completes the emotional-flatline zone set with Act 2a/2b/3 and midpoint),
// Act 2a curiosity void (the 25%–50% zone averages curiosityDelta ≤ 0 while the story is
// otherwise curious — completes the curiosity-zone set), Act 2 dramatic turn absent (the long
// middle act 25%–75% carries no pivot while ≥2 turns land outside it — the sagging middle).
// Wave 401 additions: Act 2b curiosity void (the 50%–75% run-up to the climax generates no
// curiosity while the story is otherwise curious — completes the per-half curiosity zone set),
// midpoint dramatic turn void (the 40%–60% pivot carries no reversal while ≥2 turns land
// elsewhere — the pivot is structurally inert; completes the midpoint channel set), Act 3
// suspense void (the final 25% generates no suspense spike while the story spikes elsewhere —
// the climax act builds no tension).
// Wave 415 additions: Act 1 suspense void (the 0%–25% setup generates no suspense spike while
// the story spikes elsewhere — completes the suspense zone set with Act 2a/2b/3 and midpoint),
// Act 2a dramatic turn void (the 25%–50% approach zone carries no reversal while ≥2 turns land
// elsewhere), Act 2b dramatic turn void (the 50%–75% escalation zone carries no reversal while
// ≥2 turns land elsewhere) — the last two complete the per-half dramatic-turn zone set alongside
// the opening/Act 2/Act 3/midpoint turn checks.
// Wave 429 additions: inciting aftermath stall (sequence/aftermath — the first early catalyst in
// the opening 40% is followed by two scenes that neither raise suspense nor curiosity; the story
// sparks its engine then stalls, squandering the inciting incident's momentum), climax unprepared
// (backward-cause — the peak-suspense scene in the final 30% and its two preceding scenes carry
// no revelation or dramatic turn though the story uses these devices elsewhere; the climax erupts
// without structural run-up), purpose monotone run (run-based — five or more consecutive scenes
// share one purpose; a local structural plateau distinct from the global PURPOSE_MONOCULTURE and
// the zone-complete ACT1/ACT2/ACT3_PURPOSE_SINGLE checks).
// Wave 443 additions: revelation-curiosity decoupled (co-occurrence/decoupling — every revelation
// scene has curiosityDelta ≤ 0; revelations never co-occur with a curiosity spike, so disclosures
// close questions rather than opening new ones; the first co-occurrence check in this pass, distinct
// from all zone-based and channel-isolation checks), peak suspense emotional vacuum (single-peak
// isolation × valence — the single highest-suspense scene in the story has emotionalShift = neutral
// while emotion is active elsewhere; the tensest moment is emotionally blank, isolating the peak
// from the story's affective register), positive scene drought (valence × underweight — fewer than
// 15% of scenes carry positive emotionalShift while ≥3 carry negative; the positive register is
// chronically underrepresented, distinct from EMOTIONAL_ARC_UNIFORM which audits dominance of any
// one register above 70% and from ACT_1_WARMTH_ABSENT which is zone-scoped).
// Wave 457 additions: revelation suspense decoupled (co-occurrence/decoupling × suspense channel —
// every revelation scene has suspenseDelta ≤ 0; disclosures never land under tension, the suspense-
// channel sibling of REVELATION_CURIOSITY_DECOUPLED), negative scene drought (valence × underweight
// — fewer than 15% of scenes carry negative emotionalShift while ≥3 carry positive; the story is
// relentlessly upbeat with almost no darkness for contrast, the mirror of POSITIVE_SCENE_DROUGHT),
// dramatic turn causeless (backward-cause × dramatic turn — every scene whose dramaticTurn ≠ 'nothing'
// is preceded in the prior 3 scenes by no revelation, high suspense, or clock raise; pivots erupt
// without structural build-up, the turn-signal sibling of CLIMAX_UNPREPARED).
// Wave 471 additions: curiosity peak emotional void (single-peak isolation × curiosity channel ×
// valence — the scene with the highest curiosityDelta is emotionally neutral while ≥2 scenes carry
// emotional charge elsewhere; fills the curiosity-channel cell in the peak-isolation × valence matrix
// alongside PEAK_SUSPENSE_EMOTIONAL_VACUUM which uses the suspense channel), positive scene run
// (run-based × positive emotional valence — 5+ consecutive scenes all emotionalShift='positive';
// the first run-based check on emotional valence, distinct from EMOTIONAL_ARC_UNIFORM which audits
// global proportion and NEGATIVE_SCENE_DROUGHT which audits a global ratio), revelation turn
// decoupled (co-occurrence/decoupling × revelation × dramaticTurn — the story has ≥2 revelations
// and ≥2 turns but no scene carries both; the truth-surfacing and direction-changing machinery
// always operate in separate beats; completes the revelation co-occurrence family with curiosity
// and suspense channels now joined by the dramatic-turn channel).
// Wave 485 additions: negative scene run (run-based × negative emotional valence — 5+ consecutive
// scenes all emotionalShift='negative'; the run mirror of POSITIVE_SCENE_RUN on the negative side,
// a sustained descent without contrast or relief), revelation clock decoupled (co-occurrence/
// decoupling × revelation × clock — ≥2 revelation scenes and ≥2 clock scenes but no scene carries
// both; disclosures never land under deadline pressure, completing the revelation co-occurrence
// family alongside curiosity/suspense/turn channels), climax aftermath flat (sequence/aftermath ×
// climax trigger — the peak-suspense scene in the final 30% is followed by 2 scenes with no
// emotional shift and no relationship shift; the climax produces no human ripple; first aftermath
// check triggered by the story's climax position).
// Wave 513 additions: clock turn decoupled (co-occurrence/decoupling × clock × dramatic-turn —
// ≥2 clock scenes and ≥2 turn scenes but no scene carries both; urgency and direction-change
// never coincide, completing the clock co-occurrence family alongside clock × curiosity [Wave 499]
// and clock × revelation [Wave 485]), curiosity run (run-based × curiosity channel — 5+ consecutive
// curiosity-positive scenes while ≥4 curiosity scenes exist; first run check on the curiosity
// channel, completing the channel-run family alongside SUSPENSE_RUN, POSITIVE_SCENE_RUN, NEGATIVE_
// SCENE_RUN), turn aftermath suspense void (sequence/aftermath × suspense × dramatic-turn trigger —
// ≥2 qualifying turn scenes none followed by a suspense spike in next 2 scenes while ≥3 suspense
// scenes exist; first aftermath check using the dramatic-turn trigger, distinct from REVELATION_
// AFTERMATH_CLOCK_VOID [revelation trigger] and INCITING_AFTERMATH_STALL [inciting incident trigger]).
// Wave 583 additions: turn suspense decoupled (co-occurrence/decoupling × dramatic turn ×
// suspense — n≥8, ≥2 turn scenes and ≥2 suspense-positive scenes but zero overlap; pivots
// are emotionally cool at the moment they happen; suspense-channel sibling of TURN_CURIOSITY_
// DECOUPLED and TURN_EMOTION_DECOUPLED, completing the dramatic-turn co-occurrence family;
// distinct from TURN_AFTERMATH_SUSPENSE_VOID [aftermath mode] and DRAMATIC_TURN_CAUSELESS
// [backward-cause]), clock aftermath emotion void (sequence/aftermath × clock trigger ×
// emotion — n≥8, ≥3 qualifying clock-raise scenes, ≥2 emotional scenes, every clock aftermath
// window is emotionally neutral; urgency operates in affective isolation; first aftermath check
// using the clock-raise trigger, distinct from TURN_AFTERMATH_EMOTION_VOID [turn trigger] and
// REVELATION_AFTERMATH_EMOTION_VOID [revelation trigger]), peak suspense curiosity void (single-
// peak isolation × suspense peak × curiosity — n≥8, ≥2 curiosity scenes, peak suspenseDelta
// scene has curiosityDelta≤0; the tensest moment raises no question; curiosity-channel sibling
// of PEAK_SUSPENSE_EMOTIONAL_VACUUM; distinct from CURIOSITY_PEAK_EMOTIONAL_VOID [curiosity is
// the peak] and CLOCK_CURIOSITY_DECOUPLED [co-occurrence mode across all scenes]).
// Wave 569 additions: turn aftermath clock void (sequence/aftermath × clock × dramatic-turn trigger
// — ≥3 qualifying turn scenes none followed by a clock raise in next 2 scenes while ≥2 clock scenes
// exist; pivots never tighten a deadline in their wake; the clock-channel sibling of TURN_AFTERMATH_
// SUSPENSE/CURIOSITY/EMOTION_VOID, completing the turn-trigger aftermath family; distinct from
// REVELATION_AFTERMATH_CLOCK_VOID [revelation trigger] and CLOCK_TURN_DECOUPLED [same-scene]), turn
// curiosity decoupled (co-occurrence/decoupling × curiosity × dramatic-turn trigger — ≥2 turn scenes
// and ≥2 curiosity scenes but zero overlap; pivots never open a question in the scene they turn; the
// turn-trigger entry in the curiosity co-occurrence family alongside CLOCK_CURIOSITY_DECOUPLED and
// REVELATION_CURIOSITY_DECOUPLED, distinct from TURN_AFTERMATH_CURIOSITY_VOID [aftermath, next 2
// scenes] and TURN_EMOTION_DECOUPLED [emotion channel]), midpoint clock void (zone presence/absence ×
// clock × midpoint 40%–60% — n≥10, ≥2 clock scenes globally, none in the center window; the structural
// pivot carries no time pressure; the clock-channel sibling of MIDPOINT_SUSPENSE/CURIOSITY/DRAMATIC_
// TURN_VOID, distinct from CLOCK_RAISED_LATE [first-occurrence] and CLOCK_PRESSURE_FINALE_ABSENT [finale]).
// Wave 555 additions: clock suspense decoupled (co-occurrence/decoupling × clock × suspense
// — ≥2 clock scenes and ≥2 suspense-positive scenes but zero overlap; urgency and tension
// never coincide in the same scene; distinct from CLOCK_CURIOSITY_DECOUPLED which audits the
// curiosity channel and CLOCK_TURN_DECOUPLED which audits the dramatic-turn channel; completes
// the clock co-occurrence family with the suspense channel), revelation causeless (backward-cause
// × revelation signal — ≥3 revelation scenes at positions ≥3, every one preceded in the prior 3
// scenes by no suspense spike, no clock raise, and no dramatic turn; disclosures erupt without
// structural build-up; distinct from DRAMATIC_TURN_CAUSELESS which uses the turn trigger and
// CLIMAX_UNPREPARED which uses the climax-position trigger), turn aftermath emotion void (sequence/
// aftermath × emotion × dramatic-turn trigger — ≥3 qualifying turn scenes none followed by an
// emotional shift in next 2 scenes while ≥2 emotional scenes exist; pivots never move the
// emotional register in their aftermath; the emotion-channel sibling of TURN_AFTERMATH_SUSPENSE_VOID
// and TURN_AFTERMATH_CURIOSITY_VOID, completing the turn-trigger aftermath channel family with the
// emotional register).
// Wave 541 additions: revelation aftermath suspense void (sequence/aftermath × suspense ×
// revelation trigger — ≥3 qualifying revelations none followed by a suspense spike in next
// 2 scenes while ≥2 suspense-spike scenes exist; disclosures never activate tension in their
// aftermath; suspense-channel sibling of REVELATION_AFTERMATH_CLOCK_VOID and REVELATION_
// AFTERMATH_EMOTION_VOID), turn aftermath curiosity void (sequence/aftermath × curiosity ×
// dramatic-turn trigger — ≥3 qualifying turns none followed by curiosityDelta>0 in next 2
// scenes while ≥2 curiosity scenes exist; pivots never generate new questions; curiosity-
// channel sibling of TURN_AFTERMATH_SUSPENSE_VOID), emotional neutral run (run-based × neutral
// emotional valence — 6+ consecutive emotionally neutral scenes while ≥4 emotionally charged
// scenes exist; the story goes affectively flat for a sustained stretch; neutral-counterpart of
// POSITIVE_SCENE_RUN and NEGATIVE_SCENE_RUN, completing the three-valence run family).
// Wave 527 additions: clock run (run-based × clock channel — 5+ consecutive clockRaised scenes;
// the first run check on the clock channel, completing the channel-run family alongside SUSPENSE_RUN,
// CURIOSITY_RUN, POSITIVE_SCENE_RUN, NEGATIVE_SCENE_RUN), turn emotion decoupled (co-occurrence/
// decoupling × dramatic turn × emotional shift — ≥2 turns and ≥2 emotional scenes but zero overlap;
// the emotional-shift co-occurrence sibling of REVELATION_TURN_DECOUPLED and CLOCK_TURN_DECOUPLED),
// revelation aftermath emotion void (sequence/aftermath × emotional shift × revelation trigger —
// ≥3 qualifying revelations none followed by emotion in next 2 scenes; the emotional-channel sibling
// of REVELATION_AFTERMATH_CLOCK_VOID, completing the revelation-trigger aftermath family).
// Wave 499 additions: clock curiosity decoupled (co-occurrence/decoupling × clock × curiosity —
// ≥2 clock scenes and ≥2 curiosity-spike scenes but no scene carries both; urgency and wonder
// never coincide, extending the co-occurrence family beyond the revelation-centric checks by
// placing the clock channel as the trigger rather than revelation), revelation aftermath clock void
// (sequence/aftermath × revelation trigger × clock aftermath — ≥3 qualifying revelation scenes
// [pos < n-2], ≥2 clock scenes globally, none followed by a clock raise in the next 2 scenes;
// disclosures never trigger urgency, the first aftermath check on the clock channel with a
// revelation trigger, distinct from REVELATION_CLOCK_DECOUPLED which checks simultaneous
// co-occurrence), suspense run (run-based × suspense channel — longest consecutive run of scenes
// with suspenseDelta > 0 ≥ 5; the tension dial stuck at high across an unbroken sequence, the
// first run-based check on the suspense channel, distinct from the emotional-valence run checks).
// Wave 597 additions: unresolved clue debt escalation absent (distribution/timing × unresolvedClues
// trend — first half's average unresolved-clue count is not exceeded by the second half's average;
// narrative debt never pays down as the story approaches resolution; first check in this pass to
// use the unresolvedClues signal at all — the file's macro-structure lens has never before audited
// clue-debt trajectory, only revelation/clock/suspense/curiosity trends), dialogue highlight drought
// run (run-based × dialogueHighlights absence, built on checkDroughtRun from the shared checks
// library — audit M2.2, the library's first use of this specific template this session — ≥6
// consecutive scenes with no dialogueHighlights while ≥3 highlight-bearing scenes exist elsewhere;
// an extended stretch where no character states a belief worth tracking), dialogue highlight zone
// imbalance (underweight/bloat × dialogueHighlights × four structural zones, built on
// checkZoneImbalance — one zone silent while another holds ≥50% of all highlights; the zone-based
// sibling of the drought-run check above, both first uses of dialogueHighlights in this file).
// Wave 611 additions (built on the shared checks library, audit M2.2): VISUAL_BEAT_STRUCTURAL_
// IMBALANCE (underweight/bloat × visualBeats × four structural zones — first use of visualBeats
// anywhere in this 110-rule pass, its last completely untouched record field), PAYOFF_SCENE_TURN_
// DECOUPLED (co-occurrence/decoupling × payoffSetupIds × dramaticTurn — payoffSetupIds had exactly
// one prior incidental OR-condition use in this file, never as its own standalone signal),
// PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (sequence/aftermath × payoff trigger → dialogueHighlights
// absence — first aftermath-mode check on the dialogueHighlights channel in this file, which had
// only drought-run and zone-imbalance coverage from Wave 597).
// Wave 625 additions (built on the shared checks library, audit M2.2): STRUCTURAL_STAGING_OPEN_
// THREAD_DECOUPLED (co-occurrence/decoupling × visualBeats × unresolvedClues — first pairing of
// these two fields in this 113-rule pass), DRAMATIC_TURN_STAGING_AFTERMATH_VOID
// (sequence/aftermath × dramaticTurn trigger → visualBeats absence — first pairing of these two
// fields, despite dramaticTurn already being paired with clockDelta/clockRaised/emotionalShift/
// payoffSetupIds), STRUCTURAL_STAGING_PEAK_UNCAUSED (backward-cause × visualBeats-density peak ×
// revelation/dramaticTurn cause — first backward-cause check in this file).
// Wave 639 additions (built on the shared checks library, audit M2.2): STRUCTURE_DIALOGUE_
// HIGHLIGHT_ZONE_CLUSTER (distribution/timing × dialogueHighlights × structural thirds — first
// zone-cluster mode applied to records in this 116-rule pass), STRUCTURE_HIGHLIGHT_OPEN_THREAD_
// DECOUPLED (co-occurrence/decoupling × dialogueHighlights × unresolvedClues — first pairing of
// these two fields), STRUCTURE_OPEN_THREAD_HIGHLIGHT_AFTERMATH_VOID (sequence/aftermath × heavy
// unresolvedClues debt trigger → dialogueHighlights absence — first pairing of these two fields).
// Wave 653 additions (built on the shared checks library, audit M2.2): this 119-rule pass already
// imports all six shared-checks-library templates, so distinctness comes from applying each to a
// channel it has never touched. STRUCTURE_HIGHLIGHT_PEAK_UNCAUSED (single-peak isolation/
// backward-cause × dialogueHighlights magnitude — Wave 625's STRUCTURAL_STAGING_PEAK_UNCAUSED
// applied the peak-uncaused mode to visualBeats; this is the first application to the highlighted-
// dialogue channel), STRUCTURE_OPEN_THREAD_DROUGHT_RUN (run-based × unresolvedClues absence —
// Wave 597's DIALOGUE_HIGHLIGHT_DROUGHT_RUN applied the drought-run mode to dialogueHighlights;
// unresolvedClues itself has never been drought-audited here despite being used in co-occurrence
// and aftermath contexts), STRUCTURE_SEED_ZONE_CLUSTER (distribution/timing
// × seededClueIds × structural thirds — Wave 639's STRUCTURE_DIALOGUE_HIGHLIGHT_ZONE_CLUSTER
// applied the zone-cluster mode to dialogueHighlights; seededClueIds itself has never been
// cluster-audited here).
// Wave 667 additions (built on the shared checks library, audit M2.2): STRUCTURE_PAYOFF_PEAK_
// UNCAUSED (single-peak isolation/backward-cause × payoffSetupIds magnitude — the scene with the
// most simultaneous thread resolutions has no dramatic turn or revelation in itself or the two
// scenes before it; Wave 625/653 applied the peak-uncaused mode to visualBeats and
// dialogueHighlights; payoffSetupIds itself has never been backward-cause peak-audited),
// STRUCTURE_RELATIONSHIP_DROUGHT_RUN (run-based × relationshipShifts absence — the drought-run
// mode has covered emotion/suspense/curiosity/clock/purpose channels via hand-rolled logic and
// unresolvedClues via the shared helper [Wave 653]; relationshipShifts itself has never been
// drought-audited despite being used extensively elsewhere), STRUCTURE_CLOCK_ZONE_CLUSTER
// (distribution/timing × clockRaised × structural thirds — Wave 639 applied the zone-cluster mode
// to dialogueHighlights; clockRaised itself has never been cluster-audited despite anchoring an
// entire hand-rolled run-based check family).
// Wave 681 additions (built on the shared checks library, audit M2.2): STRUCTURE_CLOCK_DELTA_
// PEAK_UNCAUSED (single-peak isolation/backward-cause × clockDelta magnitude — clockDelta has
// only ever appeared as an OR-condition alongside clockRaised inside decoupled/aftermath
// triggers; the backward-cause peak mode applied to it standalone for the first time),
// STRUCTURE_STAGING_DROUGHT_RUN (run-based × visualBeats absence — Waves 625/667 applied the
// peak-uncaused and zone-imbalance modes to visualBeats; the drought-run mode has never been
// applied to this channel), STRUCTURE_STAKES_ZONE_CLUSTER (distribution/timing × purpose ===
// 'raise_stakes' × structural thirds — `purpose` has only ever appeared inside incidental
// filter/set-collection contexts here, never as the standalone subject of its own check).
// Wave 695 additions (built on the shared checks library): STRUCTURE_OPEN_THREAD_PEAK_UNCAUSED
// (single-peak isolation/backward-cause × unresolvedClues magnitude — unresolvedClues anchors a
// drought-run check [Wave 653] plus decoupling/aftermath checks [Wave 639]; the backward-cause
// peak mode has never been applied to it), STRUCTURE_SEED_DROUGHT_RUN (run-based × seededClueIds
// absence — Wave 653 applied the zone-cluster mode to seededClueIds; the drought-run mode has
// never been applied to this channel), STRUCTURE_STAGING_ZONE_CLUSTER (distribution/timing ×
// visualBeats × structural thirds — visualBeats anchors a four-zone imbalance check [Wave 611], a
// backward-cause peak check [Wave 625], and a drought-run check [Wave 681]; the thirds-based
// zone-cluster mode has never been applied to it).
// Wave 709 additions (built on the shared checks library): STRUCTURE_HIGHLIGHT_DROUGHT_RUN
// (run-based × dialogueHighlights absence — Waves 639/653 applied the zone-cluster and
// backward-cause peak modes to dialogueHighlights; the drought-run mode has never been applied to
// it, completing the trio), STRUCTURE_OPEN_THREAD_ZONE_CLUSTER (distribution/timing ×
// unresolvedClues × structural thirds — Waves 653/695 applied the drought-run and backward-cause
// peak modes to unresolvedClues; the zone-cluster mode has never been applied to it, completing
// the trio), STRUCTURE_SEED_PEAK_UNCAUSED (single-peak isolation/backward-cause × seededClueIds
// magnitude — Waves 653/695 applied the zone-cluster and drought-run modes to seededClueIds; the
// backward-cause peak mode has never been applied to it, completing the trio).
// Wave 723 additions (built on the shared checks library): STRUCTURE_PAYOFF_ZONE_CLUSTER
// (distribution/timing × payoffSetupIds × structural thirds — Wave 667 applied the backward-
// cause peak mode to payoffSetupIds; the zone-cluster mode has never been applied to it),
// STRUCTURE_RELATIONSHIP_ZONE_CLUSTER (distribution/timing × relationshipShifts × structural
// thirds — Wave 667 applied the drought-run mode to relationshipShifts; the zone-cluster mode
// has never been applied to it), STRUCTURE_CLOCK_DROUGHT_RUN (run-based × clockRaised absence —
// Wave 667 applied the zone-cluster mode to clockRaised; the drought-run mode has never been
// applied to it).
// Wave 737 additions: STRUCTURE_PAYOFF_DROUGHT_RUN (run-based × payoffSetupIds absence — Waves
// 667/723 applied the backward-cause peak and zone-cluster modes to payoffSetupIds; the
// drought-run mode has never been applied to it, completing the trio),
// STRUCTURE_RELATIONSHIP_PEAK_UNCAUSED (single-peak isolation/backward-cause × relationshipShifts
// magnitude — Waves 667/723 applied the run-based drought and zone-cluster modes to
// relationshipShifts; the backward-cause peak mode has never been applied to it, completing the
// trio), STRUCTURE_CLOCK_DELTA_DROUGHT_RUN (run-based × clockDelta≠0 absence — Wave 681 applied
// the backward-cause peak mode to clockDelta; the drought-run mode has never been applied to it).
// Wave 751 additions: STRUCTURE_CLOCK_DELTA_ZONE_CLUSTER (distribution/timing × clockDelta≠0
// presence × structural thirds — Waves 681/737 applied the backward-cause peak and run-based
// drought modes to clockDelta; the zone-cluster mode has never been applied to it, completing the
// trio), STRUCTURE_TURN_DROUGHT_RUN (run-based × dramaticTurn !== 'nothing' absence — dramaticTurn
// is this pass's second most heavily used field [59 accesses] and has never anchored any of the
// three shared-library modes as a primary signal; the run-based drought mode has never been
// applied to it), STRUCTURE_STAKES_DROUGHT_RUN (run-based × purpose === 'raise_stakes' absence —
// Wave 681 applied the zone-cluster mode to this signal; the drought-run mode has never been
// applied to it).
// Wave 765 additions: STRUCTURE_SUSPENSE_ZONE_CLUSTER (distribution/timing × suspenseDelta>0
// presence × structural thirds — existing suspense checks in this pass are average/aggregate
// [OPENING_SUSPENSE_FLATLINE], zone-imbalance [ACT2A/ACT2B_SUSPENSE_VOID], presence-run
// [SUSPENSE_RUN], co-occurrence-at-the-peak [PEAK_SUSPENSE_EMOTIONAL_VACUUM,
// PEAK_SUSPENSE_CURIOSITY_VOID], and a hand-rolled backward-cause check restricted to the climax
// zone [CLIMAX_UNPREPARED]; the shared-library thirds-based >75%-cluster mode has never been
// applied to suspenseDelta across the whole story), STRUCTURE_CURIOSITY_ZONE_CLUSTER
// (distribution/timing × curiosityDelta>0 presence × structural thirds — existing curiosity
// checks are average/aggregate, zone-scoped absence [ACT1/ACT2A/ACT2B_CURIOSITY_*], and
// presence-run [CURIOSITY_RUN]; the shared-library zone-cluster mode has never been applied to
// it), STRUCTURE_CURIOSITY_PEAK_UNCAUSED (backward-cause × curiosityDelta-as-magnitude × 2-scene
// lookback — the existing curiosity-peak checks [CURIOSITY_PEAK_EMOTIONAL_VOID,
// PEAK_SUSPENSE_CURIOSITY_VOID] audit the co-occurring channel AT the peak scene itself; none
// looks backward from the peak for a preparing cause, so the shared-library backward-cause mode
// has never been applied to curiosityDelta).
// Wave 779 additions: STRUCTURE_TURN_ZONE_CLUSTER (distribution/timing × dramaticTurn !== 'nothing'
// presence × structural thirds — dramaticTurn is this pass's second most heavily used field and
// has only ever had the run-based drought mode applied to it as a primary signal; the zone-
// cluster mode has never been applied to it, completing the trio), STRUCTURE_SUSPENSE_DROUGHT_RUN
// (run-based × suspenseDelta>0 absence — Wave 765 applied the zone-cluster mode and the
// hand-rolled CLIMAX_UNPREPARED already covers the backward-cause peak mode restricted to the
// climax zone; the general run-based drought mode has never been applied to it, completing the
// trio), STRUCTURE_CURIOSITY_DROUGHT_RUN (run-based × curiosityDelta>0 absence — Wave 765 applied
// the zone-cluster and backward-cause peak modes to curiosityDelta; the run-based drought mode has
// never been applied to it, completing the trio).
// Wave 793 additions: STRUCTURE_NEGATIVE_EMOTION_ZONE_CLUSTER (distribution/timing ×
// emotionalShift='negative' × structural thirds — existing negative-emotion checks are
// valence-ratio [NEGATIVE_SCENE_DROUGHT], presence-run [NEGATIVE_SCENE_RUN], and fixed-zone
// [ACT2A/ACT2B/ACT3_EMOTIONAL_FLATLINE, which test 'neutral' not 'negative']; the general
// thirds-based >75%-cluster mode has never been applied to emotionalShift as a categorical
// signal), STRUCTURE_REVELATION_ZONE_CLUSTER (distribution/timing × revelation × structural
// thirds — the existing REVELATION_CLUSTERED fires on a fixed 4-scene span anywhere in the
// story, not a >75% concentration within one of the three structural thirds; the shared-library
// thirds-based cluster mode has never been applied to revelation), STRUCTURE_REVELATION_
// DROUGHT_RUN (run-based × revelation absence — the existing REVELATION_DROUGHT fires on a
// composite absence of revelation OR seededClueIds OR relationshipShifts together at a 4-scene
// threshold; a pure single-field run-based absence check on revelation alone, at the
// shared-library's 6-scene threshold, has never been applied).
// Wave 807 additions: STRUCTURE_NEGATIVE_EMOTION_DROUGHT_RUN (run-based × emotionalShift ===
// 'negative' absence — Wave 793 applied the zone-cluster mode to this valence; the drought-run
// mode has never been applied to it, completing 2 of 3 slots for this categorical field, peak
// conventionally skipped), STRUCTURE_REVELATION_PEAK_UNCAUSED (backward-cause ×
// revelation-as-magnitude [0/1] × 2-scene lookback, anchored on the FIRST revelation scene —
// completes the trio for revelation; distinct from the existing REVELATION_CAUSELESS, which
// requires ALL revelations in the story to be causeless with a broader 3-signal/3-scene lookback,
// not a single-peak backward-cause test with a 2-scene lookback), STRUCTURE_CHARACTER_
// MOMENT_ZONE_CLUSTER (distribution/timing × purpose === 'character_moment' × structural thirds
// — this purpose value has only ever appeared inside the SETUP_RESOLUTION_IMBALANCE composite set
// [union with 'establish_world']; it has never been audited as its own standalone signal by any
// of the three shared-library trio modes).
// Wave 821 additions: STRUCTURE_CHARACTER_MOMENT_DROUGHT_RUN (run-based × purpose ===
// 'character_moment' absence — completing 2 of 3 slots for this purpose value alongside the
// zone-cluster mode added in Wave 807; peak mode conventionally skipped for this categorical
// field), STRUCTURE_TURNING_POINT_ZONE_CLUSTER (distribution/timing × purpose ===
// 'turning_point' × structural thirds — this purpose value has only ever appeared inside the
// payoffPurposes composite set [union with 'climax', 'resolution']; it has never been audited
// as its own standalone signal by any of the three shared-library trio modes),
// STRUCTURE_TURNING_POINT_DROUGHT_RUN (run-based × purpose === 'turning_point' absence —
// completing 2 of 3 slots for this purpose value alongside the zone-cluster mode added in this
// same wave; peak mode conventionally skipped for this categorical field).
//
// Wave 835 additions: STRUCTURE_INTRODUCE_CONFLICT_ZONE_CLUSTER (distribution/timing × purpose
// === 'introduce_conflict' × structural thirds — this purpose value has never been referenced
// anywhere in this pass, not even inside the setupPurposes/payoffPurposes composite sets; a
// virgin field), STRUCTURE_INTRODUCE_CONFLICT_DROUGHT_RUN (run-based × purpose ===
// 'introduce_conflict' absence — completing 2 of 3 slots for this purpose value alongside the
// zone-cluster mode added in this same wave; peak mode conventionally skipped for this
// categorical field), STRUCTURE_POSITIVE_EMOTION_ZONE_CLUSTER (distribution/timing ×
// emotionalShift === 'positive' × structural thirds — mirrors the completed negative-valence
// trio; the positive valence has never been isolated by any of the three shared-library trio
// modes in this pass).
//
// Wave 849 additions: STRUCTURE_POSITIVE_EMOTION_DROUGHT_RUN (run-based × emotionalShift ===
// 'positive' absence — completes 2 of 3 slots for this valence alongside the zone-cluster mode
// added in Wave 835; peak mode conventionally skipped for this categorical field),
// STRUCTURE_ESTABLISH_WORLD_ZONE_CLUSTER (distribution/timing × purpose === 'establish_world' ×
// structural thirds — this purpose value has only ever appeared inside the setupPurposes
// composite set [union with 'character_moment']; it has never been audited as its own standalone
// signal by any of the three shared-library trio modes), STRUCTURE_CLIMAX_ZONE_CLUSTER
// (distribution/timing × purpose === 'climax' × structural thirds — this purpose value has only
// ever appeared inside the payoffPurposes composite set [union with 'resolution',
// 'turning_point'] or the presence-only PURPOSE_CLIMAX_ABSENT check; a virgin standalone signal).
//
// Wave 863 additions: STRUCTURE_CLIMAX_DROUGHT_RUN (run-based x purpose === 'climax' absence --
// completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave
// 849; peak mode conventionally skipped for this categorical field),
// STRUCTURE_ESTABLISH_WORLD_DROUGHT_RUN (run-based x purpose === 'establish_world' absence --
// completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave
// 849; peak mode conventionally skipped for this categorical field),
// STRUCTURE_RESOLUTION_ZONE_CLUSTER (distribution/timing x purpose === 'resolution' x
// structural thirds -- this purpose value has only ever appeared inside the payoffPurposes
// composite set [union with 'climax', 'turning_point'] and two incidental last-record
// disjunctions (`purpose !== 'resolution'`); it has never been audited as its own standalone
// signal by any of the three shared-library trio modes).
//
// Wave 877 additions: STRUCTURE_RESOLUTION_DROUGHT_RUN (run-based x purpose === 'resolution'
// absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode
// added in Wave 863; peak mode conventionally skipped for this categorical field),
// STRUCTURE_COMPLICATE_ZONE_CLUSTER (distribution/timing x purpose === 'complicate' x
// structural thirds -- this purpose value has never been referenced anywhere in this pass; a
// virgin field), STRUCTURE_COMPLICATE_DROUGHT_RUN (run-based x purpose === 'complicate'
// absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode
// added in this same wave; peak mode conventionally skipped for this categorical field).
//
// Wave 891 additions: no purpose value had ever been audited by the distinct 4-zone
// checkZoneImbalance mode in this pass (only dialogueHighlights and visualBeats had). This wave
// applies it to three purpose values with complete 3-zone/run-based trios: STRUCTURE_CLIMAX_
// ZONE_IMBALANCE (purpose === 'climax'), STRUCTURE_ESTABLISH_WORLD_ZONE_IMBALANCE (purpose ===
// 'establish_world'), and STRUCTURE_RESOLUTION_ZONE_IMBALANCE (purpose === 'resolution').
//
// Wave 905 additions: continuing the checkZoneImbalance rollout begun in Wave 891, this wave
// applies the 4-zone bloat+empty-zone mode to three more purpose values that each already have a
// complete 3-zone/run-based trio (checkZoneCluster + checkDroughtRun) but have never been audited
// by it: STRUCTURE_TURNING_POINT_ZONE_IMBALANCE (purpose === 'turning_point'),
// STRUCTURE_COMPLICATE_ZONE_IMBALANCE (purpose === 'complicate'), and
// STRUCTURE_INTRODUCE_CONFLICT_ZONE_IMBALANCE (purpose === 'introduce_conflict').
//
// Wave 919 additions: purpose === 'revelation' has never been referenced anywhere in this pass
// (the pre-existing STRUCTURE_REVELATION_ZONE_CLUSTER/DROUGHT_RUN audit the separate revelation
// string|null field, not this purpose enum value) -- a genuinely virgin field. This wave adds
// STRUCTURE_REVELATION_PURPOSE_ZONE_CLUSTER and STRUCTURE_REVELATION_PURPOSE_DROUGHT_RUN (peak
// mode conventionally skipped for this categorical field), plus STRUCTURE_CHARACTER_MOMENT_ZONE_
// IMBALANCE, continuing the checkZoneImbalance rollout: purpose === 'character_moment' already has
// a complete 3-zone/run-based trio but has never been audited by the 4-zone bloat+empty-zone mode.
//
// Wave 933 additions: continuing the checkZoneImbalance rollout, this wave applies the 4-zone
// bloat+empty-zone mode to three more signals that each already have a complete 3-zone/run-based
// trio but had never been audited by it: STRUCTURE_STAKES_ZONE_IMBALANCE (purpose ===
// 'raise_stakes'), STRUCTURE_REVELATION_PURPOSE_ZONE_IMBALANCE (purpose === 'revelation', whose
// trio was completed in Wave 919), and STRUCTURE_NEGATIVE_EMOTION_ZONE_IMBALANCE (emotionalShift
// === 'negative', a valence signal with a complete 3-zone/run trio).
// Wave 947 additions: extending the checkZoneImbalance rollout to three more trio-complete signals
// spanning three distinct signal classes: STRUCTURE_POSITIVE_EMOTION_ZONE_IMBALANCE (emotionalShift
// === 'positive', the positive-valence mirror of Wave 933's negative one), STRUCTURE_SUSPENSE_ZONE_
// IMBALANCE (suspenseDelta > 0 — tension-delta magnitude), and STRUCTURE_OPEN_THREAD_ZONE_IMBALANCE
// (unresolvedClues.length > 0 — open-thread array field).
// Wave 961 additions: continuing the non-purpose 4-zone rollout with three more trio-complete signals
// spanning three distinct classes: STRUCTURE_CURIOSITY_ZONE_IMBALANCE (curiosityDelta > 0 — the
// question-raising delta beside Wave 947's suspense one), STRUCTURE_PAYOFF_ZONE_IMBALANCE
// (payoffSetupIds.length > 0 — the payoff array beside 947's open-thread one), and STRUCTURE_
// REVELATION_ZONE_IMBALANCE (revelation != null — the revelation string field, a new class).
// Wave 975 additions: auditing three more trio-complete signals in this pass, spanning three distinct
// classes: STRUCTURE_CLOCK_ZONE_IMBALANCE (clockRaised boolean — whether a ticking clock is
// introduced), STRUCTURE_CLOCK_DELTA_ZONE_IMBALANCE (clockDelta !== 0 — the numeric delta, distinct
// from the boolean field above), and STRUCTURE_RELATIONSHIP_ZONE_IMBALANCE (relationshipShifts
// array, distinct from all previously audited arrays in this pass).
// Wave 989 additions: STRUCTURE_SEED_ZONE_IMBALANCE (seededClueIds array) and STRUCTURE_TURN_ZONE_
// IMBALANCE (dramaticTurn !== 'nothing') — the last two clean trio-complete zone-imbalance
// candidates in this pass (STRUCTURE_STAGING was skipped: its cluster/drought predicates disagree,
// >=2 vs >0 visualBeats). With zone-imbalance now down to just these two, this wave completes the
// trio with one aftermath-void pairing: STRUCTURE_STAKES_CURIOSITY_AFTERMATH_VOID (raise_stakes →
// curiosityDelta), the first use of raise_stakes as an aftermath-void trigger in this pass.
// Wave 1003 additions: STRUCTURE_STAGING re-checked and re-excluded (same predicate mismatch). With
// zone-imbalance still exhausted, this wave gives three existing aftermath-void triggers a fresh
// consequence channel: STRUCTURE_STAKES_SUSPENSE_AFTERMATH_VOID (raise_stakes, previously only
// paired with curiosityDelta, now paired with suspenseDelta), STRUCTURE_PAYOFF_RELATIONAL_
// AFTERMATH_VOID (payoffSetupIds, previously only paired with dialogueHighlights, now paired with
// relationshipShifts), and STRUCTURE_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID (heavy unresolvedClues
// debt, previously only paired with dialogueHighlights, now paired with emotionalShift).
// Wave 1017 additions: this wave gives three more triggers a fresh consequence channel:
// STRUCTURE_TURN_CURIOSITY_AFTERMATH_VOID (dramaticTurn, previously only paired with visualBeats,
// now paired with curiosityDelta), STRUCTURE_PAYOFF_EMOTIONAL_AFTERMATH_VOID (payoffSetupIds,
// previously paired with dialogueHighlights and relationshipShifts, now paired with
// emotionalShift for a third channel), and STRUCTURE_STAKES_RELATIONAL_AFTERMATH_VOID
// (raise_stakes, previously paired with curiosityDelta and suspenseDelta, now paired with
// relationshipShifts for a third channel).
// Wave 1031 additions: three more fresh channels for existing triggers: STRUCTURE_STAKES_
// EMOTIONAL_AFTERMATH_VOID (raise_stakes, previously paired with curiosityDelta/suspenseDelta/
// relationshipShifts, now a fourth channel with emotionalShift), STRUCTURE_TURN_RELATIONAL_
// AFTERMATH_VOID (dramaticTurn, previously paired with visualBeats/curiosityDelta, now a third
// channel with relationshipShifts), and STRUCTURE_PAYOFF_CURIOSITY_AFTERMATH_VOID (payoffSetupIds,
// previously paired with dialogueHighlights/relationshipShifts/emotionalShift, now a fourth
// channel with curiosityDelta).
// Wave 1045 additions: with raise_stakes and payoffSetupIds now at four channels each, this wave
// targets dramaticTurn and unresolvedClues instead: STRUCTURE_TURN_EMOTIONAL_AFTERMATH_VOID
// (dramaticTurn, previously paired with visualBeats/curiosityDelta/relationshipShifts, now a
// fourth channel with emotionalShift), STRUCTURE_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID (heavy
// unresolvedClues debt, previously paired with dialogueHighlights/emotionalShift, now a third
// channel with curiosityDelta), and STRUCTURE_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID (heavy
// unresolvedClues debt, now a fourth channel with relationshipShifts).
// Wave 1059 additions: with all four main triggers now at four channels each, this wave gives
// three of them a fifth: STRUCTURE_PAYOFF_SUSPENSE_AFTERMATH_VOID (payoffSetupIds, previously
// paired with dialogueHighlights/relationshipShifts/emotionalShift/curiosityDelta, now also
// paired with suspenseDelta), STRUCTURE_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (dramaticTurn,
// previously paired with visualBeats/curiosityDelta/relationshipShifts/emotionalShift, now also
// paired with dialogueHighlights), and STRUCTURE_OPEN_THREAD_STAGING_AFTERMATH_VOID (heavy
// unresolvedClues debt, previously paired with dialogueHighlights/emotionalShift/curiosityDelta/
// relationshipShifts, now also paired with visualBeats).
// Wave 1073 additions: payoffSetupIds, dramaticTurn, and heavy unresolvedClues debt each reach
// full six-channel saturation: STRUCTURE_PAYOFF_STAGING_AFTERMATH_VOID (payoffSetupIds,
// previously paired with dialogueHighlights/relationshipShifts/emotionalShift/curiosityDelta/
// suspenseDelta, now also paired with visualBeats — its only remaining standard channel),
// STRUCTURE_TURN_SUSPENSE_AFTERMATH_VOID (dramaticTurn, previously paired with visualBeats/
// curiosityDelta/relationshipShifts/emotionalShift/dialogueHighlights, now also paired with
// suspenseDelta — its only remaining standard channel), and STRUCTURE_OPEN_THREAD_SUSPENSE_
// AFTERMATH_VOID (heavy unresolvedClues debt, previously paired with dialogueHighlights/
// emotionalShift/curiosityDelta/relationshipShifts/visualBeats, now also paired with
// suspenseDelta — its only remaining standard channel).
// Wave 1087 additions: raise_stakes reaches full six-channel saturation — STRUCTURE_STAKES_
// DIALOGUE_HIGHLIGHT_AFTERMATH_VOID and STRUCTURE_STAKES_STAGING_AFTERMATH_VOID (previously
// paired with curiosityDelta/suspenseDelta/relationshipShifts/emotionalShift, now also paired
// with dialogueHighlights and visualBeats respectively — its last two remaining standard
// channels). With all four boolean triggers now fully saturated, the third check introduces
// revelation as a genuinely fresh sequence/aftermath trigger — STRUCTURE_REVELATION_CURIOSITY_
// AFTERMATH_VOID — distinct from this pass's existing revelation-curiosity co-occurrence/
// decoupling check (Wave 443), which audits same-scene co-occurrence rather than a windowed
// aftermath.
// Wave 1101 additions: with all four main boolean triggers already fully saturated, this wave
// continues building out revelation's checkAftermathVoid channel set (currently just
// curiosityDelta, established Wave 1087) — STRUCTURE_REVELATION_EMOTIONAL_AFTERMATH_VOID
// (emotionalShift), STRUCTURE_REVELATION_SUSPENSE_AFTERMATH_VOID (suspenseDelta), and
// STRUCTURE_REVELATION_RELATIONAL_AFTERMATH_VOID (relationshipShifts) give this trigger three
// fresh channels.
// Wave 1115 additions: STRUCTURE_REVELATION_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID and STRUCTURE_
// REVELATION_STAGING_AFTERMATH_VOID give revelation its fifth and sixth channels (previously
// paired with curiosityDelta/emotionalShift/suspenseDelta/relationshipShifts, now also paired
// with dialogueHighlights and visualBeats respectively), completing full six-channel saturation
// for all five of this pass's tracked triggers. With those exhausted, this wave introduces
// clockRaised as a genuinely fresh checkAftermathVoid trigger — it has only ever anchored
// distribution/timing (zone-imbalance/zone-cluster) checks here, never sequence/aftermath:
// STRUCTURE_CLOCK_CURIOSITY_AFTERMATH_VOID pairs it with curiosityDelta.
// Wave 1129 additions: clockRaised also carries a pre-existing hand-rolled sequence/aftermath
// channel — CLOCK_AFTERMATH_EMOTION_VOID (Wave 583, emotionalShift) — putting it at two
// channels rather than one as of Wave 1115. STRUCTURE_CLOCK_SUSPENSE_AFTERMATH_VOID,
// STRUCTURE_CLOCK_RELATIONAL_AFTERMATH_VOID, and STRUCTURE_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_
// VOID give it its third, fourth, and fifth channels (suspenseDelta, relationshipShifts,
// dialogueHighlights).
// Wave 1143 additions: clockRaised and dramaticTurn were each at five of six channels
// (dramaticTurn's five spanning both legacy TURN_AFTERMATH_*_VOID and modern STRUCTURE_TURN_*
// rule names for the same suspenseDelta/curiosityDelta/emotionalShift channels, plus
// relationshipShifts and dialogueHighlights). STRUCTURE_CLOCK_STAGING_AFTERMATH_VOID and
// STRUCTURE_TURN_STAGING_AFTERMATH_VOID give each its sixth and final channel (visualBeats),
// completing full saturation for both triggers. With every tracked trigger in this pass now
// exhausted, STRUCTURE_SUSPENSE_CURIOSITY_AFTERMATH_VOID introduces suspenseDelta as a
// genuinely fresh checkAftermathVoid trigger — it has only ever appeared as an aftermath
// channel or isPresent condition in this file, never as the isTrigger side of a check.
// Wave 1157 additions: suspenseDelta had only its one Wave-1143 channel. STRUCTURE_SUSPENSE_
// EMOTIONAL_AFTERMATH_VOID and STRUCTURE_SUSPENSE_RELATIONAL_AFTERMATH_VOID give it its second
// and third channels (emotionalShift, relationshipShifts). This wave also introduces
// seededClueIds as a genuinely fresh checkAftermathVoid trigger — it has never anchored the
// isTrigger side of any check in this file: STRUCTURE_SEED_CURIOSITY_AFTERMATH_VOID pairs it
// with curiosityDelta.
// Wave 1171 additions: after Wave 1157, suspenseDelta stood at three of six channels
// (curiosityDelta, emotionalShift, relationshipShifts) and seededClueIds at one (curiosityDelta).
// STRUCTURE_SUSPENSE_STAGING_AFTERMATH_VOID and STRUCTURE_SUSPENSE_DIALOGUE_HIGHLIGHT_AFTERMATH_
// VOID give suspenseDelta its fourth and fifth channels (visualBeats, dialogueHighlights);
// STRUCTURE_SEED_EMOTIONAL_AFTERMATH_VOID gives seededClueIds its second channel (emotionalShift).
// Wave 1184 additions (Program v2, Type 3 — genre-conditioned): DARK_NIGHT_ABSENT is one of
// the highest-firing generic rules in the calibration corpus (20/20 samples — see the wave's
// measurement pass). Its suspenseDelta floor for what counts as the "all is lost" beat now
// consults GENRE_RULE_MODIFIERS (server/lib/genre-router.ts), generic value as the default:
// comedy's low point is measured in dignity/embarrassment rather than survival dread, so a
// milder dip still legitimately counts (floor loosens); horror's low point must carry genuine
// dread, so a passing dip should not count (floor tightens). storyContext absent, genre
// absent, or genre unset in the table -> identical constant and identical issue text to
// pre-Wave-1184 behavior.

import type { PassInput, PassResult, RevisionIssue } from './types.ts';
import { rewritePass } from '../rewrite.ts';
import { checkDroughtRun, checkZoneImbalance, checkCoOccurrenceDecoupled, checkAftermathVoid, checkPeakUncaused, checkZoneCluster, FOUR_ZONE_NAMES } from './lib/checks.ts';
import { GENRE_RULE_MODIFIERS } from '../../../lib/genre-router.ts';
import type { StoryGenre } from '../../../engine/types.ts';

export async function structurePass(input: PassInput): Promise<PassResult> {
  const { fountain, structure, records, annotations, approvedSpans } = input;
  const issues: RevisionIssue[] = [];
  const n = records.length;

  // Wave 1184: resolved once per pass, consumed by DARK_NIGHT_ABSENT below.
  // Wave 1188: also consumed by WEAK_MIDPOINT and ACT3_SCENE_EXCESS below. Undefined
  // when storyContext/genre is absent or the genre has no live rule modifier — every
  // consumer falls through to its own generic constant in that case.
  const genre1184 = input.storyContext?.genre as StoryGenre | undefined;
  const genreMod1184 = genre1184 ? GENRE_RULE_MODIFIERS[genre1184] : undefined;

  // ── Act balance checks ────────────────────────────────────────────────────
  if (structure.completionPercent < 80 && structure.actPosition === 'act3') {
    issues.push({
      location: 'Overall structure',
      rule: 'ACT3_TOO_EARLY',
      description: `Act 3 reached at only ${structure.completionPercent}% completion — the climax arrives too early`,
      severity: 'major',
      suggestedFix: 'Expand Act 2b with additional complications or reversals',
    });
  }

  if (structure.actPosition === 'act1' || structure.actPosition === 'act2a') {
    if (structure.completionPercent > 60) {
      issues.push({
        location: 'Overall structure',
        rule: 'ACT2_TOO_SHORT',
        description: `Story is ${structure.completionPercent}% complete but still in ${structure.actPosition} — Act 2 is truncated`,
        severity: 'critical',
        suggestedFix: 'Add more conflict escalation scenes before the climax',
      });
    }
  }

  // ── Midpoint pressure ─────────────────────────────────────────────────────
  // Wave 1188: generic floor 1, genre-shifted per GENRE_RULE_MODIFIERS (see the
  // file-header comment and genre-router.ts for the craft argument). Absent/unknown
  // genre falls through to the pre-wave 1 constant.
  const weakMidpointFloor1188 = genreMod1184?.weakMidpointPressureFloor ?? 1;
  if (n >= 6 && structure.midpointPressure < weakMidpointFloor1188) {
    const genreNote1188 = genreMod1184?.weakMidpointPressureFloor !== undefined ? ` (threshold adjusted for ${genre1184})` : '';
    issues.push({
      location: `Scene ${Math.floor(n / 2)} (midpoint)`,
      rule: 'WEAK_MIDPOINT',
      description: `Midpoint suspense pressure is flat — the story lacks a dramatic pivot${genreNote1188}`,
      severity: 'major',
      suggestedFix: 'Insert a surprise revelation or reversal at the midpoint scene',
    });
  }

  // ── Tightest scene should be in second half ───────────────────────────────
  if (structure.tightestScene !== null && n > 6 && structure.tightestScene < Math.floor(n * 0.4)) {
    issues.push({
      location: `Scene ${structure.tightestScene}`,
      rule: 'CLIMAX_TOO_EARLY',
      description: 'The most intense scene is in the first 40% of the story — the structure peaks too soon',
      severity: 'major',
      suggestedFix: 'Move the peak intensity scene closer to the third act',
    });
  }

  // ── Missing reversal means flat structure ─────────────────────────────────
  if (structure.reversalCount === 0 && n >= 5) {
    issues.push({
      location: 'Overall structure',
      rule: 'NO_REVERSALS',
      description: 'No dramatic reversals detected — the story progresses in a single direction without opposition',
      severity: 'major',
      suggestedFix: 'Add a scene where a character\'s plan backfires or a situation inverts',
    });
  }

  // ── Missing inciting incident (Act 1 without major shift) ──────────────────
  // Wave 139: Act 1 should force the protagonist into the central conflict via
  // a major belief update, relationship shift, or clock raise. If none occur,
  // the story hasn't begun; it's just setup without incitement.
  if (n >= 3) {
    const act1End = Math.floor(n * 0.25);
    const act1Records = records.slice(0, Math.max(1, act1End));
    const hasIncitingEvent = act1Records.some(r =>
      (r.seededClueIds.length > 0 && r.payoffSetupIds.length === 0) || // clue planted
      (r.relationshipShifts && r.relationshipShifts.length > 0) || // relationship shift
      r.clockRaised, // clock pressure applied
    );
    if (!hasIncitingEvent && act1Records.length > 0) {
      issues.push({
        location: `Act 1 (Scenes 0–${Math.max(0, act1End - 1)})`,
        rule: 'MISSING_INCITING_INCIDENT',
        description: `Act 1 lacks a major inciting event — no clues planted, relationship shifts, or clock pressure. The protagonist isn't forced into the central conflict.`,
        severity: 'critical',
        suggestedFix: 'Add a scene in Act 1 where something happens that throws the protagonist into action: a revelation, a betrayal, or an external deadline.',
      });
    }
  }

  // ── Act boundary turning points ────────────────────────────────────────────
  // Wave 139: Act boundaries (25% and 75% of story) should have suspense peaks
  // that mark transitions. If the suspense delta at these boundaries is flat,
  // the acts don't feel like they have shaped, purposeful endings.
  if (n >= 6) {
    const act1End = Math.floor(n * 0.25);
    const act2End = Math.floor(n * 0.75);

    const act1EndRecord = records[Math.min(act1End, n - 1)];
    const act2EndRecord = records[Math.min(act2End, n - 1)];

    if (act1EndRecord && act1EndRecord.suspenseDelta < 1) {
      issues.push({
        location: `End of Act 1 (Scene ~${act1End})`,
        rule: 'ACT1_BOUNDARY_WEAK',
        description: `Scene ${Math.min(act1End, n - 1)} (Act 1 ending) has low suspense delta (${act1EndRecord.suspenseDelta.toFixed(1)}) — Act 1 should end with a turning point that forces entry into Act 2`,
        severity: 'major',
        suggestedFix: 'Ensure the final Act 1 scene is a clear inciting incident or reversal that propels the protagonist into the main conflict',
      });
    }

    if (act2EndRecord && act2EndRecord.suspenseDelta < 1.5) {
      issues.push({
        location: `End of Act 2 (Scene ~${act2End})`,
        rule: 'ACT2_BOUNDARY_WEAK',
        description: `Scene ${Math.min(act2End, n - 1)} (Act 2 ending) has low suspense delta (${act2EndRecord.suspenseDelta.toFixed(1)}) — Act 2 should end with a climactic turn that forces entry into Act 3`,
        severity: 'major',
        suggestedFix: 'The final Act 2 scene should be the highest-stakes moment before the climax: a major reversal, false climax, or all-is-lost moment',
      });
    }
  }

  // ── Wave 152: Revelation drought, false climax, act symmetry ─────────────────

  // REVELATION_DROUGHT: A stretch of 4+ consecutive scenes with no revelation,
  // planted clue, or relationship shift. The story goes quiet — no narrative
  // information is being delivered to the audience during this stretch.
  if (n >= 8) {
    let droughtLen = 0;
    let droughtStart = -1;
    for (let i = 0; i < n; i++) {
      const r = records[i];
      const hasNarrativeInfo = r.revelation !== null ||
        (r.seededClueIds?.length ?? 0) > 0 ||
        (r.relationshipShifts?.length ?? 0) > 0;

      if (!hasNarrativeInfo) {
        if (droughtLen === 0) droughtStart = i;
        droughtLen++;
      } else {
        droughtLen = 0;
      }

      if (droughtLen === 4) {
        issues.push({
          location: `Scenes ${droughtStart}–${i}`,
          rule: 'REVELATION_DROUGHT',
          description: `Scenes ${droughtStart}–${i}: 4 consecutive scenes with no revelation, planted clue, or relationship shift — the narrative goes dark; nothing is being learned or changed`,
          severity: 'major',
          suggestedFix: 'At least one of these scenes must deliver narrative payload: a clue, a revelation, or a shift in a key relationship. The audience should never go 4 scenes without learning something new.',
        });
        droughtLen = 0; // reset to avoid duplicate flags
      }
    }
  }

  // FALSE_CLIMAX: The highest-suspense scene occurs far from the story's
  // expected climax zone (last 30%). When peak intensity lands in the middle
  // the audience goes through the real climax feeling emotionally spent.
  if (n >= 8) {
    let peakScene = -1;
    let peakSuspense = -Infinity;
    for (let i = 0; i < n; i++) {
      if (records[i].suspenseDelta > peakSuspense) {
        peakSuspense = records[i].suspenseDelta;
        peakScene = i;
      }
    }
    const climaxZoneStart = Math.floor(n * 0.7);
    // False climax: peak is not near the end AND peak suspense is meaningful (>2)
    if (peakScene >= 0 && peakScene < climaxZoneStart && peakSuspense > 2) {
      issues.push({
        location: `Scene ${peakScene} (peak intensity)`,
        rule: 'FALSE_CLIMAX',
        description: `Peak suspense (${peakSuspense.toFixed(1)}) occurs at Scene ${peakScene} — ${Math.round(peakScene / n * 100)}% through the story — but the climax zone starts at Scene ${climaxZoneStart}. The story peaked too early; the real climax will feel anticlimactic.`,
        severity: 'major',
        suggestedFix: 'Either move high-intensity scenes into the final third, or build new complications in Act 2b that exceed the mid-story peak',
      });
    }
  }

  // SETUP_RESOLUTION_IMBALANCE: Setup scenes (establish_world, character_moment)
  // outnumber payoff scenes (climax, resolution, turning_point) by 4:1 or more.
  // This indicates a screenplay that front-loads context but rushes or collapses
  // the emotional payoff the setup promised.
  if (n >= 6) {
    const setupPurposes = new Set(['establish_world', 'character_moment']);
    const payoffPurposes = new Set(['climax', 'resolution', 'turning_point']);
    const setupCount = records.filter(r => setupPurposes.has(r.purpose)).length;
    const payoffCount = records.filter(r => payoffPurposes.has(r.purpose)).length;

    if (payoffCount > 0 && setupCount / payoffCount >= 4) {
      issues.push({
        location: `Setup vs resolution`,
        rule: 'SETUP_RESOLUTION_IMBALANCE',
        description: `${setupCount} setup/character scenes but only ${payoffCount} payoff scenes (${(setupCount / payoffCount).toFixed(1)}:1 ratio) — the screenplay front-loads context but rushes its emotional resolution`,
        severity: 'minor',
        suggestedFix: 'Either cut setup scenes that don\'t directly raise the stakes, or expand the climax and resolution to honor the promise of the setup with adequate space',
      });
    }
  }

  // ── Wave 165: Protagonist passivity at climax, dark night absent, Act 2 dead zone ──

  // PROTAGONIST_PASSIVITY_CLIMAX: The peak-suspense scene in the climax zone (last 30%)
  // shows no protagonist engagement — neutral emotion, no clock pressure, no discovery.
  // The protagonist is watching rather than choosing at the story's peak moment.
  if (n >= 8) {
    const climaxZoneStart = Math.floor(n * 0.7);
    let peakScene = -1;
    let peakSuspense = -Infinity;
    for (let i = climaxZoneStart; i < n; i++) {
      if (records[i].suspenseDelta > peakSuspense) {
        peakSuspense = records[i].suspenseDelta;
        peakScene = i;
      }
    }
    if (peakScene >= 0 && peakSuspense > 1.5) {
      const rec = records[peakScene];
      const isPassive =
        rec.emotionalShift === 'neutral' &&
        !rec.clockRaised &&
        (rec.seededClueIds?.length ?? 0) === 0;
      if (isPassive) {
        issues.push({
          location: `Scene ${peakScene} (climax peak)`,
          rule: 'PROTAGONIST_PASSIVITY_CLIMAX',
          description: `Peak-intensity climax scene (suspense ${peakSuspense.toFixed(1)}) shows no protagonist engagement — neutral emotion, no clock pressure, no discovery. The protagonist is absent from their own story's highest moment.`,
          severity: 'critical',
          suggestedFix: 'Give the protagonist a decisive choice or irreversible action at the story\'s peak: a sacrifice, a confrontation, or a revelation they must act on immediately',
        });
      }
    }
  }

  // DARK_NIGHT_ABSENT: In the 65%-85% zone, no scene has a negative emotional shift
  // combined with meaningful suspense. The "all is lost" / "dark night of the soul"
  // beat is missing — the protagonist never hits bottom before the climax, so the
  // final push feels unearned.
  if (n >= 8) {
    const darkNightStart = Math.floor(n * 0.65);
    const darkNightEnd = Math.floor(n * 0.85);
    const darkZone = records.slice(darkNightStart, darkNightEnd);
    if (darkZone.length >= 2) {
      // Wave 1184: generic floor 1, genre-shifted per GENRE_RULE_MODIFIERS (see the
      // file-header comment). Absent/unknown genre falls through to the pre-wave
      // constant of 1.
      const darkNightSuspenseFloor1184 = genreMod1184?.darkNightSuspenseFloor ?? 1;
      const hasDarkNight = darkZone.some(r =>
        r.emotionalShift === 'negative' && r.suspenseDelta > darkNightSuspenseFloor1184,
      );
      if (!hasDarkNight) {
        const genreNote1184 = genreMod1184?.darkNightSuspenseFloor !== undefined ? ` (threshold adjusted for ${genre1184})` : '';
        issues.push({
          location: `Scenes ${darkNightStart}–${darkNightEnd} (pre-climax zone)`,
          rule: 'DARK_NIGHT_ABSENT',
          description: `No scene in the pre-climax zone (${Math.round(darkNightStart / n * 100)}%–${Math.round(darkNightEnd / n * 100)}%) carries a negative emotional shift with meaningful suspense — the protagonist never hits their lowest point before the final push${genreNote1184}`,
          severity: 'major',
          suggestedFix: 'Insert an "all is lost" beat in this zone: a failure, a betrayal, or a moment where all hope seems gone. The climax lands harder after the protagonist has been broken.',
        });
      }
    }
  }

  // ACT2_DEAD_ZONE: The middle portion of Act 2 (40%-60% of scenes) has an average
  // suspense delta lower than both the flanking Act 2 sections (25%-40% and 60%-75%).
  // The classic mid-Act-2 sag — energy dips before the second-half escalation.
  if (n >= 10) {
    const act2Start = Math.floor(n * 0.25);
    const midStart = Math.floor(n * 0.4);
    const midEnd = Math.floor(n * 0.6);
    const act2End = Math.floor(n * 0.75);
    const earlyAct2 = records.slice(act2Start, midStart);
    const midAct2 = records.slice(midStart, midEnd);
    const lateAct2 = records.slice(midEnd, act2End);
    if (earlyAct2.length >= 1 && midAct2.length >= 2 && lateAct2.length >= 1) {
      const avg = (arr: typeof records) => arr.reduce((s, r) => s + r.suspenseDelta, 0) / arr.length;
      const earlyAvg = avg(earlyAct2);
      const midAvg = avg(midAct2);
      const lateAvg = avg(lateAct2);
      if (midAvg < earlyAvg * 0.7 && midAvg < lateAvg * 0.7) {
        issues.push({
          location: `Scenes ${midStart}–${midEnd} (mid-Act 2)`,
          rule: 'ACT2_DEAD_ZONE',
          description: `Mid-Act-2 suspense avg (${midAvg.toFixed(1)}) is less than 70% of both early-Act-2 (${earlyAvg.toFixed(1)}) and late-Act-2 (${lateAvg.toFixed(1)}) — the classic mid-story energy sag. The story loses momentum before the second-half escalation.`,
          severity: 'major',
          suggestedFix: 'Inject a complication, reversal, or discovery into the dead zone: a new obstacle, a false ally, or a ticking-clock development that prevents the story from settling.',
        });
      }
    }
  }

  // ── Wave 179: Escalation reversed, climax plateau, unresolved ending ─────────

  // ESCALATION_REVERSED: The story de-escalates overall — the final third's
  // average suspense is well below the first third's. The narrative loses energy
  // as it goes rather than building. Distinct from FALSE_CLIMAX (a single early
  // peak): this is a whole-arc downward trend. Requires real opening energy
  // (first-third average ≥ 1.5) so a flat story doesn't trip it.
  if (n >= 6) {
    const third = Math.floor(n / 3);
    const firstThird = records.slice(0, third);
    const lastThird = records.slice(n - third);
    const avg = (arr: typeof records) => arr.reduce((s, r) => s + r.suspenseDelta, 0) / arr.length;
    const firstAvg = avg(firstThird);
    const lastAvg = avg(lastThird);
    if (firstAvg >= 1.5 && lastAvg < firstAvg * 0.7) {
      issues.push({
        location: 'Overall escalation',
        rule: 'ESCALATION_REVERSED',
        description: `Suspense de-escalates across the story: the opening third averages ${firstAvg.toFixed(1)} but the final third drops to ${lastAvg.toFixed(1)} — the narrative loses energy as it goes instead of building toward the climax.`,
        severity: 'major',
        suggestedFix: 'Invert the energy curve. Either pull the high-intensity opening material back into the body of the story, or escalate the final third so the stakes are highest at the end, not the beginning.',
      });
    }
  }

  // CLIMAX_PLATEAU: There is no single distinct peak — the highest suspense value
  // is shared across a large fraction of scenes, so the climax never stands out
  // from the surrounding intensity. Distinct from FALSE_CLIMAX (peak located too
  // early); here the problem is the peak isn't a peak at all. Requires a
  // meaningful max (>1.5) repeated across 40%+ of scenes.
  if (n >= 8) {
    let maxSuspense = -Infinity;
    for (const r of records) if (r.suspenseDelta > maxSuspense) maxSuspense = r.suspenseDelta;
    const atMax = records.filter(r => r.suspenseDelta === maxSuspense).length;
    const plateauThreshold = Math.max(3, Math.ceil(n * 0.4));
    if (maxSuspense > 1.5 && atMax >= plateauThreshold) {
      issues.push({
        location: 'Suspense profile',
        rule: 'CLIMAX_PLATEAU',
        description: `${atMax} of ${n} scenes share the story's peak suspense (${maxSuspense.toFixed(1)}) — there is no single distinct climax, just a plateau of equal-intensity scenes. The audience can't feel the high point because everything is the high point.`,
        severity: 'major',
        suggestedFix: 'Carve out one undisputed peak. Dial back the intensity of the surrounding scenes so the climax stands alone as the most intense moment — a plateau has no summit.',
      });
    }
  }

  // UNRESOLVED_ENDING: The final scene is still escalating (high suspense) and
  // isn't a resolution beat — the story stops mid-climb with no denouement. The
  // audience is dropped before the release the rising action promised.
  if (n >= 6) {
    const last = records[n - 1];
    if (last && last.suspenseDelta > 2 && last.purpose !== 'resolution') {
      issues.push({
        location: `Scene ${n - 1} (final scene)`,
        rule: 'UNRESOLVED_ENDING',
        description: `The final scene still carries high suspense (${last.suspenseDelta.toFixed(1)}) and isn't a resolution beat (purpose: "${last.purpose}") — the story stops mid-climb with no denouement, dropping the audience before the release the rising action promised.`,
        severity: 'major',
        suggestedFix: 'Add a resolution beat after the climax: a scene that lets the suspense discharge and shows the new equilibrium. Even an ambiguous ending needs a moment that registers the climax has happened.',
      });
    }
  }

  // ── Wave 186: Act 2 inversion, midpoint reversal absent, inciting incident late ──

  // SECOND_ACT_INVERSION: Act 2b (50%–75%) averages significantly lower suspense
  // than Act 2a (25%–50%). The middle of the story should build continuously;
  // when the second half of Act 2 drops, the narrative inverts exactly where it
  // should escalate toward the climax. Distinct from ESCALATION_REVERSED (whole arc)
  // and ACT2_DEAD_ZONE (global mid-zone flatness).
  if (n >= 8) {
    const act2aStart = Math.floor(n * 0.25);
    const act2bStart = Math.floor(n * 0.5);
    const act2bEnd   = Math.floor(n * 0.75);
    const act2aRecs  = records.slice(act2aStart, act2bStart);
    const act2bRecs  = records.slice(act2bStart, act2bEnd);
    if (act2aRecs.length >= 2 && act2bRecs.length >= 2) {
      const avgAct2a = act2aRecs.reduce((s, r) => s + r.suspenseDelta, 0) / act2aRecs.length;
      const avgAct2b = act2bRecs.reduce((s, r) => s + r.suspenseDelta, 0) / act2bRecs.length;
      if (avgAct2a >= 1.3 && avgAct2b < avgAct2a * 0.7) {
        issues.push({
          location: `Act 2 (Scenes ${act2aStart}–${act2bEnd - 1})`,
          rule: 'SECOND_ACT_INVERSION',
          description: `Act 2a (Scenes ${act2aStart}–${act2bStart - 1}) averages ${avgAct2a.toFixed(1)} suspense but Act 2b (Scenes ${act2bStart}–${act2bEnd - 1}) drops to ${avgAct2b.toFixed(1)} — the second half of Act 2 de-escalates when it should build toward the climax.`,
          severity: 'major',
          suggestedFix: 'Raise the stakes in Act 2b: escalate the antagonist\'s pressure, tighten the deadline, or create a new complication that makes the protagonist\'s situation worse in the second half of the conflict zone.',
        });
      }
    }
  }

  // MIDPOINT_REVERSAL_ABSENT: The midpoint zone (40%–60%) contains no reversal
  // (suspenseDelta < -1) and no revelation. Great stories pivot at the midpoint —
  // the protagonist's strategy shifts from reaction to action. A midpoint with no
  // catalysing event is a story that passes through its centre without changing
  // direction. Requires 10+ scenes for a meaningful midpoint zone.
  if (n >= 10) {
    const midStart   = Math.floor(n * 0.4);
    const midEnd     = Math.ceil(n * 0.6);
    const midRecords = records.slice(midStart, midEnd);
    const hasMidEvent = midRecords.some(r =>
      r.suspenseDelta < -1 || r.revelation !== null,
    );
    if (!hasMidEvent) {
      issues.push({
        location: `Midpoint zone (Scenes ${midStart}–${midEnd - 1})`,
        rule: 'MIDPOINT_REVERSAL_ABSENT',
        description: `The midpoint zone (Scenes ${midStart}–${midEnd - 1}) has no reversal and no revelation — the story passes through its structural centre without the pivot that shifts protagonist strategy from reaction to action.`,
        severity: 'major',
        suggestedFix: 'Place a major reversal or revelatory beat near the midpoint: a discovery that recontextualises the threat, or a setback that forces the protagonist to abandon their first strategy and commit to a new one.',
      });
    }
  }

  // INCITING_INCIDENT_TOO_LATE: The very first dramatic event (reversal or
  // revelation) occurs past the 40% mark. The story takes too long to generate
  // the event that sets the central conflict in motion — the audience sits through
  // 40%+ of the story with no catalytic moment to orient them. Distinct from
  // MISSING_INCITING_INCIDENT (which fires when Act 1 lacks clues/shifts/clock):
  // this fires on the absolute lateness of the first dramatic event.
  if (n >= 10) {
    const lateCutoff = Math.floor(n * 0.4);
    const firstEventIdx = records.findIndex(r =>
      r.suspenseDelta < -1 || r.revelation !== null,
    );
    if (firstEventIdx > lateCutoff) {
      issues.push({
        location: `First dramatic event at Scene ${firstEventIdx}`,
        rule: 'INCITING_INCIDENT_TOO_LATE',
        description: `The first reversal or revelation occurs at Scene ${firstEventIdx} — ${Math.round(firstEventIdx / n * 100)}% through the story. The central conflict doesn't launch until after 40% has elapsed; the audience has no dramatic anchor for the opening.`,
        severity: 'major',
        suggestedFix: 'Move the inciting event before the 40% mark. The audience needs a dramatic anchor — a reversal, revelation, or shock — early enough to understand what the story is about before the midpoint arrives.',
      });
    }
  }

  // ── Wave 198: Act 3 excess, tension abrupt drop, Act 1 revelation absent ──

  // ACT3_SCENE_EXCESS: Act 3 (from 75% to end) has more scenes than Act 1
  // (from 0 to 25%). The resolution is longer than the setup — narrative weight
  // is inverted. A prolonged resolution dilutes the climax's impact by dwelling
  // past its emotional conclusion rather than landing and leaving.
  if (n >= 8) {
    const act1SceneCount = Math.floor(n * 0.25);
    const act3SceneStart = Math.floor(n * 0.75);
    const act3SceneCount = n - act3SceneStart;
    // Wave 1188: generic ratio 1 (Act 3 merely has to out-count Act 1), genre-shifted
    // per GENRE_RULE_MODIFIERS (see the file-header comment). Absent/unknown genre
    // falls through to the pre-wave ratio of 1.
    const act3ExcessRatio1188 = genreMod1184?.act3ExcessRatio ?? 1;
    if (act3SceneCount > act1SceneCount * act3ExcessRatio1188) {
      const genreNote1188b = genreMod1184?.act3ExcessRatio !== undefined ? ` (threshold adjusted for ${genre1184})` : '';
      issues.push({
        location: `Act 1 (${act1SceneCount} scenes) vs Act 3 (${act3SceneCount} scenes)`,
        rule: 'ACT3_SCENE_EXCESS',
        description: `Act 3 has ${act3SceneCount} scenes while Act 1 has only ${act1SceneCount} — the resolution takes longer than the setup. Extended resolutions undercut the climax's finality by making the aftermath longer than the premise.${genreNote1188b}`,
        severity: 'minor',
        suggestedFix: 'Trim Act 3 to match or be shorter than Act 1. The denouement should be crisp: show the new equilibrium, land the emotional note, and leave. Resolution scenes that outlast the setup are usually filling silence, not delivering story.',
      });
    }
  }

  // TENSION_DROP_ABRUPT: The highest-suspense scene in the climax zone (last 30%,
  // suspenseDelta > 2) is immediately followed by a scene that is neither a
  // resolution beat nor carries any suspense (< 0.5). The tension collapses too
  // sharply — the story needs at least one landing-beat between peak and silence.
  if (n >= 6) {
    const climaxZoneActual = Math.floor(n * 0.7);
    let dropPeakScene = -1;
    let dropPeakSuspense = -Infinity;
    for (let i = climaxZoneActual; i < n; i++) {
      if (records[i].suspenseDelta > dropPeakSuspense) {
        dropPeakSuspense = records[i].suspenseDelta;
        dropPeakScene = i;
      }
    }
    if (dropPeakScene >= 0 && dropPeakScene < n - 1 && dropPeakSuspense > 2) {
      const afterPeak = records[dropPeakScene + 1];
      if (afterPeak.suspenseDelta < 0.5 && afterPeak.purpose !== 'resolution') {
        issues.push({
          location: `Scene ${dropPeakScene} → Scene ${dropPeakScene + 1}`,
          rule: 'TENSION_DROP_ABRUPT',
          description: `The climax peak (Scene ${dropPeakScene}, suspense ${dropPeakSuspense.toFixed(1)}) is immediately followed by a flat, non-resolution scene (suspense ${afterPeak.suspenseDelta.toFixed(1)}) — the tension collapses without a landing beat`,
          severity: 'major',
          suggestedFix: 'Insert a transitional beat between the climax and resolution: a moment of consequence, a brief silence with emotional weight, or a reaction scene that lets the audience breathe down from the peak before the story settles.',
        });
      }
    }
  }

  // ACT1_REVELATION_ABSENT: The story contains 3+ revelations but none land in
  // Act 1 (first 25%). All revelations are held back — the audience enters Act 2
  // with no anchoring discovery. Without at least one Act 1 revelation to frame
  // the situation, the setup is all mystery and no orientation.
  if (n >= 8) {
    const totalRevs198 = records.filter(r => r.revelation !== null).length;
    if (totalRevs198 >= 3) {
      const act1RevEnd = Math.floor(n * 0.25);
      const act1HasRev = records.slice(0, act1RevEnd).some(r => r.revelation !== null);
      if (!act1HasRev) {
        issues.push({
          location: `Act 1 (Scenes 0–${act1RevEnd - 1})`,
          rule: 'ACT1_REVELATION_ABSENT',
          description: `The story has ${totalRevs198} revelations but none land in Act 1 — the audience enters the conflict without any anchoring discovery. All revelation is held back, leaving the setup informationally dark.`,
          severity: 'minor',
          suggestedFix: 'Give the audience at least one revelation in Act 1: an early truth about the situation, a character\'s past, or a fact that frames the stakes. The opening should orient the audience toward what the story is about — not just pose questions.',
        });
      }
    }
  }

  // ── Wave 209: Cold open inert, denouement overlong, pre-climax lull ──────────

  // COLD_OPEN_INERT: The screenplay's first scene delivers no narrative hook —
  // no revelation, no planted clue, no clock pressure, no relationship shift,
  // and low suspense. The audience's first impression of the story has nothing
  // to hold onto; they arrive in a scene that simply exists rather than
  // beginning the story's central question. Distinct from MISSING_INCITING_INCIDENT
  // (which audits all of Act 1): this fires specifically on the opening scene itself.
  if (n >= 8) {
    const first209 = records[0];
    const isInert209 =
      first209.revelation === null &&
      (first209.seededClueIds?.length ?? 0) === 0 &&
      !first209.clockRaised &&
      (first209.relationshipShifts?.length ?? 0) === 0 &&
      first209.suspenseDelta <= 1;
    if (isInert209) {
      issues.push({
        location: 'Scene 0 (cold open)',
        rule: 'COLD_OPEN_INERT',
        severity: 'minor',
        description: `The screenplay's first scene has no narrative hook — no revelation, clue, clock pressure, or relationship shift, and low suspense (${first209.suspenseDelta.toFixed(1)}). The audience's first impression contains nothing to orient them toward the story's central question.`,
        suggestedFix: 'Open with a scene that immediately signals what is at stake: plant a clue, reveal an inciting tension, establish a ticking clock, or begin a relationship in jeopardy. The first scene earns the audience\'s attention by beginning the story, not introducing the setting.',
      });
    }
  }

  // DENOUEMENT_OVERLONG: The story's climax peak (highest-suspense scene in the
  // final 30%) is followed by three or more additional scenes. An extended
  // denouement — more scenes than Act 1 typically offers — dissipates the
  // climax's emotional impact and allows the audience to disengage before the
  // screenplay finishes. Distinct from UNRESOLVED_ENDING (still high suspense at
  // the end) and ACT3_SCENE_EXCESS (whole-act vs whole-Act-1 count).
  if (n >= 12) {
    const climaxZoneD209 = Math.floor(n * 0.7);
    let peakD209 = -1;
    let peakSusD209 = -Infinity;
    for (let i = climaxZoneD209; i < n; i++) {
      if (records[i].suspenseDelta > peakSusD209) {
        peakSusD209 = records[i].suspenseDelta;
        peakD209 = i;
      }
    }
    if (peakD209 >= 0 && peakSusD209 > 2 && n - 1 - peakD209 >= 3) {
      issues.push({
        location: `Scenes ${peakD209 + 1}–${n - 1} (post-climax)`,
        rule: 'DENOUEMENT_OVERLONG',
        severity: 'minor',
        description: `The climax peak (Scene ${peakD209}, suspense ${peakSusD209.toFixed(1)}) is followed by ${n - 1 - peakD209} more scenes — the denouement is longer than most Act 1s. Extended aftermath dilutes the climax by giving the audience time to disengage before the screenplay ends.`,
        suggestedFix: 'Compress the post-climax into no more than 2 scenes: one scene of immediate consequence (what changed), one scene of new equilibrium (the world after). Land and leave — a long denouement signals unconfidence in the climax\'s finality.',
      });
    }
  }

  // PRE_CLIMAX_LULL: The two scenes immediately preceding the climax zone (last 30%)
  // both have low suspense — the approach to the climax is flat. A story should build
  // toward its climax, not arrive at it from a valley. When the pre-climax approach
  // is inert, the escalation into the climax feels abrupt and unmotivated rather than
  // earned through rising pressure.
  if (n >= 10) {
    const preClimaxEnd209 = Math.floor(n * 0.7);
    if (preClimaxEnd209 >= 2) {
      const sceneA209 = records[preClimaxEnd209 - 2];
      const sceneB209 = records[preClimaxEnd209 - 1];
      if (sceneA209.suspenseDelta < 1 && sceneB209.suspenseDelta < 1) {
        issues.push({
          location: `Scenes ${preClimaxEnd209 - 2}–${preClimaxEnd209 - 1} (pre-climax approach)`,
          rule: 'PRE_CLIMAX_LULL',
          severity: 'major',
          description: `The two scenes before the climax zone (Scenes ${preClimaxEnd209 - 2} and ${preClimaxEnd209 - 1}) both have low suspense (${sceneA209.suspenseDelta.toFixed(1)} and ${sceneB209.suspenseDelta.toFixed(1)}) — the story enters its final act from a valley rather than a rising wave.`,
          suggestedFix: 'Build the pre-climax approach: raise the stakes in the two scenes before the climax zone through a complication, a failed attempt, or a tightening deadline. The climax lands hardest when it arrives as the peak of already-rising pressure, not as an abrupt acceleration from flat.',
        });
      }
    }
  }

  // ── Wave 222: Structural-physics — global event gap, suspense center-of-mass,
  //    try/fail oscillation count. These read the whole dramatic-event sequence as a
  //    structured signal rather than checking individual act-zone proportions. ──
  {
    const isDramaticEvent222 = (r: any): boolean =>
      r.suspenseDelta < -1 ||
      r.revelation !== null ||
      r.clockRaised === true ||
      (r.relationshipShifts ?? []).some((s: any) => Math.abs(s.amount) >= 0.3);

    // DRAMATIC_VACUUM_STRETCH (major): the single longest consecutive run of scenes with
    // NO dramatic event (reversal, revelation, clock raise, or major relationship shift)
    // exceeds a quarter of the story. Distinct from ACT2_DEAD_ZONE (act-2-specific): a long
    // inert stretch can straddle an act boundary and slip past every zone-bounded check
    // while still leaving the audience adrift for a fifth or more of the runtime.
    if (n >= 8) {
      let curGap222 = 0, maxGap222 = 0, gapEnd222 = 0;
      for (let i = 0; i < n; i++) {
        if (isDramaticEvent222(records[i])) {
          curGap222 = 0;
        } else {
          curGap222++;
          if (curGap222 > maxGap222) { maxGap222 = curGap222; gapEnd222 = i; }
        }
      }
      const vacuumThreshold222 = Math.max(4, Math.floor(n * 0.25));
      if (maxGap222 > vacuumThreshold222) {
        const gapStart222 = gapEnd222 - maxGap222 + 1;
        issues.push({
          location: `Scenes ${gapStart222}–${gapEnd222}`,
          rule: 'DRAMATIC_VACUUM_STRETCH',
          severity: 'major',
          description: `Scenes ${gapStart222}–${gapEnd222} form a run of ${maxGap222} consecutive scenes with no dramatic event — no reversal, revelation, clock, or major relationship shift across ${Math.round(maxGap222 / n * 100)}% of the story. This vacuum straddles the act structure and leaves the audience without a catalytic beat for a sustained stretch.`,
          suggestedFix: 'Inject a dramatic event into the middle of this run: a reversal, a revelation, or a relationship rupture that re-orients the story. No quarter of the runtime should pass without at least one beat that changes the protagonist\'s situation.',
        });
      }
    }

    // TENSION_FRONTLOADED_COM (major): the centre of mass of suspense (each scene's index
    // weighted by its positive suspense) sits in the front 45% of the story. The dramatic
    // energy is structurally front-loaded — its weight peaks early and thins toward the
    // climax. A single principled scalar over the whole suspense curve, distinct from the
    // act-zone comparisons elsewhere.
    if (n >= 8) {
      let massSum222 = 0, weightedIdxSum222 = 0;
      for (let i = 0; i < n; i++) {
        const mass222 = Math.max(records[i].suspenseDelta ?? 0, 0);
        massSum222 += mass222;
        weightedIdxSum222 += i * mass222;
      }
      if (massSum222 > 0) {
        const comPos222 = (weightedIdxSum222 / massSum222) / (n - 1);
        if (comPos222 < 0.45) {
          issues.push({
            location: 'Suspense distribution',
            rule: 'TENSION_FRONTLOADED_COM',
            severity: 'major',
            description: `The centre of mass of the story's suspense sits at ${Math.round(comPos222 * 100)}% of the runtime — well into the front half. The dramatic energy is structurally front-loaded: tension peaks early and thins toward the climax, so the back half coasts downhill from a high it already spent.`,
            suggestedFix: 'Shift suspense mass later: temper the early peaks and build the largest tension beats into the final third. The weight of the story\'s pressure should accumulate toward the climax, not be discharged in the opening movement.',
          });
        }
      }
    }

    // TRY_FAIL_RHYTHM_ABSENT (major): the suspense curve has at most one prominent local
    // maximum (a scene whose suspense strictly exceeds both neighbours and reaches ≥2). Great
    // structure is built from try/fail cycles — repeated rise-and-collapse of tension — each
    // of which registers as a peak. A curve with one bump or none is a single arc with no
    // internal oscillation, the structural signature of a story that never makes the
    // protagonist try, fail, and try again. Requires 10+ scenes.
    if (n >= 10) {
      let peakCount222 = 0;
      for (let i = 1; i < n - 1; i++) {
        const s222 = records[i].suspenseDelta ?? 0;
        if (s222 >= 2 && s222 > (records[i - 1].suspenseDelta ?? 0) && s222 > (records[i + 1].suspenseDelta ?? 0)) {
          peakCount222++;
        }
      }
      if (peakCount222 <= 1) {
        issues.push({
          location: 'Suspense oscillation',
          rule: 'TRY_FAIL_RHYTHM_ABSENT',
          severity: 'major',
          description: `The suspense curve has only ${peakCount222} prominent peak${peakCount222 === 1 ? '' : 's'} across ${n} scenes — the story is a single arc with no internal oscillation. Structure is built from try/fail cycles, each a rise and collapse of tension; a curve this smooth means the protagonist never visibly tries, fails, and re-commits.`,
          suggestedFix: 'Build at least two or three distinct try/fail cycles into the structure: let the protagonist mount an effort that spikes tension, have it collapse, then mount another. Each peak-and-trough is a unit of dramatic momentum; one smooth hump is not a structure.',
        });
      }
    }
  }

  // ── Wave 236: Purpose monoculture, clock raised late, Act 2 revelation absent ──

  // PURPOSE_MONOCULTURE (minor, ≥8 scenes): More than 70% of scenes share the
  // same purpose label. A well-structured story rotates through different scene
  // purposes — setup, character development, reversal, climax, resolution — each
  // serving a different structural function. When one purpose dominates, the script
  // repeats the same structural register for scene after scene with no variation in
  // narrative intent. Distinct from SETUP_RESOLUTION_IMBALANCE (setup vs payoff
  // ratio): this fires on any single purpose that crowds out all others.
  if (n >= 8) {
    const purposeCounts236 = new Map<string, number>();
    for (const r of records) {
      purposeCounts236.set(r.purpose, (purposeCounts236.get(r.purpose) ?? 0) + 1);
    }
    if (purposeCounts236.size >= 2) {
      const [domPurpose236, domCount236] = [...purposeCounts236.entries()].sort((a, b) => b[1] - a[1])[0];
      if (domCount236 / n > 0.7) {
        issues.push({
          location: 'Scene purpose distribution',
          rule: 'PURPOSE_MONOCULTURE',
          severity: 'minor',
          description: `${domCount236} of ${n} scenes (${Math.round(domCount236 / n * 100)}%) carry the same purpose "${domPurpose236}" — the script repeats the same structural register with no variation in narrative intent. Stories need setup, escalation, reversal, character moments, and resolution woven together.`,
          suggestedFix: `Replace some "${domPurpose236}" scenes with different structural functions: a reversal, a character-moment that reframes the protagonist's motivation, or a setup scene that plants future payoffs. Varied purposes keep the audience oriented to where the story is in its arc.`,
        });
      }
    }
  }

  // CLOCK_RAISED_LATE (minor, ≥8 scenes): The first ticking-clock or deadline
  // scene (clockRaised === true) comes after the halfway point. A clock is the
  // engine of dramatic pressure; when no deadline is established until the second
  // half, the story's opening operates in a pressure vacuum — the audience doesn't
  // know what the stakes of time are. Distinct from MISSING_INCITING_INCIDENT
  // (which checks for clock in Act 1 as one of several possible inciting elements):
  // this fires whenever the first clock appears past 50% regardless of other events.
  if (n >= 8) {
    const firstClockIdx236 = records.findIndex((r: any) => r.clockRaised === true);
    if (firstClockIdx236 > Math.floor(n * 0.5)) {
      issues.push({
        location: `Scene ${firstClockIdx236} (first clock)`,
        rule: 'CLOCK_RAISED_LATE',
        severity: 'minor',
        description: `The story's first ticking clock or deadline appears at Scene ${firstClockIdx236} — ${Math.round(firstClockIdx236 / n * 100)}% through the story, after the halfway point. Without a deadline established in the first half, the opening lacks urgency; the audience doesn't feel the cost of time.`,
        suggestedFix: 'Introduce a clock or deadline before the midpoint: a looming event, an expiring window, or a countdown that the protagonist must beat. Even an implied deadline changes the tension of every scene that precedes the climax.',
      });
    }
  }

  // ACT2_REVELATION_ABSENT (minor, ≥10 scenes): Act 2 (25%–75%) contains zero
  // revelations, but the story has 2+ revelations elsewhere (Act 1 or Act 3).
  // The middle act should deliver new information that reframes the protagonist's
  // understanding — the dramatic engine of Act 2 is progressively raising the
  // informational stakes. When all revelations cluster at the ends, Act 2 becomes
  // pure action with no discovery, and the audience stops learning while watching.
  if (n >= 10) {
    const act2Start236 = Math.floor(n * 0.25);
    const act2End236   = Math.floor(n * 0.75);
    const totalRevs236 = records.filter((r: any) => r.revelation !== null).length;
    if (totalRevs236 >= 2) {
      const act2Revs236 = records.slice(act2Start236, act2End236).filter((r: any) => r.revelation !== null).length;
      if (act2Revs236 === 0) {
        issues.push({
          location: `Act 2 (Scenes ${act2Start236}–${act2End236 - 1})`,
          rule: 'ACT2_REVELATION_ABSENT',
          severity: 'minor',
          description: `Act 2 (Scenes ${act2Start236}–${act2End236 - 1}) contains no revelations despite ${totalRevs236} total revelations elsewhere. The middle act's dramatic engine is discovery — progressively raising the informational stakes. An Act 2 with no revelations is pure action; the audience stops learning while watching.`,
          suggestedFix: "Plant at least one revelation in Act 2: a truth about the antagonist, a new dimension of the protagonist's situation, or information that reframes everything the audience thought they knew about the central conflict.",
        });
      }
    }
  }

  // ── Wave 250: Curiosity void, Act 3 purpose monotone, Act 2b suspense decay ──

  // STRUCTURE_CURIOSITY_VOID (minor, n≥8): No scene raises curiosityDelta above 1
  // across the entire story. The structure poses no strong questions — no moment
  // of mystery, hook, or withheld revelation pulls the audience forward. Distinct
  // from CAUSAL: CURIOSITY_OPEN_LOOP (which fires when spikes exist but are never
  // answered); this fires when the structure NEVER CREATES a curiosity spike at all.
  // A story that never makes the audience want to know something is a story that
  // doesn't invite investment.
  if (n >= 8) {
    const hasCuriosity250 = records.some((r: any) => (r.curiosityDelta ?? 0) > 1);
    if (!hasCuriosity250) {
      issues.push({
        location: 'Structure — curiosity layer',
        rule: 'STRUCTURE_CURIOSITY_VOID',
        severity: 'minor',
        description: `No scene in the entire story raises curiosity above 1 — the structure poses no strong questions to the audience. Without moments of mystery, unanswered hooks, or deliberately withheld information, the story is a report, not a puzzle. The audience watches without wondering.`,
        suggestedFix: 'Engineer at least 2-3 curiosity spikes: a question the story opens but delays answering, an anomaly the audience notices before a character does, or an unexplained event planted early that the second half pays off. Curiosity is the structural glue that holds the audience to their seat between scenes.',
      });
    }
  }

  // ACT3_PURPOSE_MONOTONE (minor, n≥8): Act 3 (last 25%) has ≥3 scenes but
  // they all share the same purpose label. The resolution wears one structural
  // costume throughout — every scene in the finale serves the same narrative
  // function. Distinct from PURPOSE_MONOCULTURE (whole-story) and SETUP_RESOLUTION_
  // IMBALANCE (setup vs payoff ratio): this fires specifically when the ACT 3
  // scenes are functionally undifferentiated.
  if (n >= 8) {
    const act3Start250 = Math.floor(n * 0.75);
    const act3Recs250 = records.slice(act3Start250);
    if (act3Recs250.length >= 3) {
      const act3Purposes250 = new Set(act3Recs250.map((r: any) => r.purpose));
      if (act3Purposes250.size === 1) {
        const [onlyPurpose250] = act3Purposes250;
        issues.push({
          location: `Act 3 (Scenes ${act3Start250}–${n - 1}) — purpose layer`,
          rule: 'ACT3_PURPOSE_MONOTONE',
          severity: 'minor',
          description: `Act 3 (${act3Recs250.length} scenes) is entirely composed of "${onlyPurpose250}" scenes — every scene in the resolution wears the same structural label. A resolution needs variety: the confrontation, the aftermath, the final beat. When all scenes serve the same function, the finale is a single extended register rather than a structured landing.`,
          suggestedFix: `Differentiate Act 3 scenes: not every scene should be "${onlyPurpose250}". The climax needs a confrontation, a consequence, and a denouement — each serving a distinct purpose. Build in a scene of revelation, a scene of relational closure, and a scene that marks the new equilibrium.`,
        });
      }
    }
  }

  // ACT2B_SUSPENSE_DECAY (minor, n≥10): Average suspenseDelta in Act 2b (50%–75%)
  // is lower than in Act 2a (25%–50%). The engine slows before the climax instead
  // of building. Act 2b should be the pressure cooker — where the protagonist's
  // situation deteriorates and the antagonistic force reaches maximum strength.
  // When Act 2b has lower average suspense than Act 2a, the story runs out of
  // pressure just when it needs the most.
  if (n >= 10) {
    const act2aStart250 = Math.floor(n * 0.25);
    const act2bStart250 = Math.floor(n * 0.5);
    const act2bEnd250  = Math.floor(n * 0.75);
    const avgSuspense250 = (recs: typeof records) => {
      if (recs.length === 0) return 0;
      return recs.reduce((s: number, r: any) => s + (r.suspenseDelta ?? 0), 0) / recs.length;
    };
    const act2aAvg250 = avgSuspense250(records.slice(act2aStart250, act2bStart250));
    const act2bAvg250 = avgSuspense250(records.slice(act2bStart250, act2bEnd250));
    if (act2bAvg250 < act2aAvg250 - 0.5) {
      issues.push({
        location: `Act 2b (Scenes ${act2bStart250}–${act2bEnd250 - 1})`,
        rule: 'ACT2B_SUSPENSE_DECAY',
        severity: 'minor',
        description: `Act 2b (Scenes ${act2bStart250}–${act2bEnd250 - 1}) averages ${act2bAvg250.toFixed(2)} suspenseDelta vs ${act2aAvg250.toFixed(2)} in Act 2a — the story loses pressure in the run-up to the climax instead of building it. Act 2b should be the pressure cooker; a falling suspense average here signals a pre-climax stall.`,
        suggestedFix: "Build Act 2b pressure: introduce a new threat, escalate an existing one, or reveal a complication that makes the protagonist's situation measurably worse. The scene just before the climax should feel like the most impossible situation yet — not a recovery.",
      });
    }
  }
  // ── End Wave 250 ─────────────────────────────────────────────────────────────

  // ── Wave 264: Revelation clustered, Act 1 curiosity absent, Act 1 purpose single ──

  // REVELATION_CLUSTERED (minor, n≥8, ≥3 revelations): All revelations occur
  // within a 4-scene window — the story concentrates its discoveries into a
  // single burst rather than distributing them for sustained mystery. Clustered
  // revelations create an exposition dump and rob each discovery of individual
  // weight. Distinct from REVELATION_DROUGHT (long absence) and ACT2/ACT1
  // revelation checks (zone-specific absence).
  if (n >= 8) {
    const revScenes264 = records
      .map((r: any, i: number) => r.revelation !== null ? i : -1)
      .filter((i: number) => i >= 0);
    if (revScenes264.length >= 3) {
      const span264 = revScenes264[revScenes264.length - 1] - revScenes264[0];
      if (span264 <= 3) {
        issues.push({
          location: `Scenes ${revScenes264[0]}–${revScenes264[revScenes264.length - 1]} (revelation cluster)`,
          rule: 'REVELATION_CLUSTERED',
          severity: 'minor',
          description: `All ${revScenes264.length} revelations occur within a ${span264 + 1}-scene window (Scenes ${revScenes264[0]}–${revScenes264[revScenes264.length - 1]}) — the story dumps all its discoveries in a single burst. Clustered revelations rob each discovery of individual weight and create an exposition dump rather than sustained mystery.`,
          suggestedFix: 'Distribute revelations across the story: plant one in Act 1 to hook the audience, one in Act 2 to deepen the situation, and one near Act 3 to recontextualise everything. Spacing allows each revelation to breathe and reframe the scenes that follow it.',
        });
      }
    }
  }

  // ACT1_CURIOSITY_ABSENT (minor, n≥10): No Act 1 scene raises curiosityDelta
  // above 0.5 while the story has ≥2 curiosity spikes elsewhere. The opening
  // generates no audience questions despite later mystery — the premise is
  // announced without anticipation, squandering the hook opportunity of Act 1.
  if (n >= 10) {
    const act1End264 = Math.floor(n * 0.25);
    const storyCurious264 = records.filter((r: any) => (r.curiosityDelta ?? 0) > 0.5).length;
    if (storyCurious264 >= 2) {
      const act1Curious264 = records.slice(0, act1End264).filter((r: any) => (r.curiosityDelta ?? 0) > 0.5).length;
      if (act1Curious264 === 0) {
        issues.push({
          location: `Act 1 (Scenes 0–${act1End264 - 1})`,
          rule: 'ACT1_CURIOSITY_ABSENT',
          severity: 'minor',
          description: `No Act 1 scene raises curiosity above 0.5 despite ${storyCurious264} curiosity spikes later in the story. The opening generates no audience questions — the premise is announced without mystery. The hook opportunity of Act 1 is surrendered; the audience has nothing to wonder about during the setup.`,
          suggestedFix: 'Plant a curiosity spike in Act 1: an anomaly, a withheld identity, an unexplained event, or a question the story raises but deliberately delays answering. The first act should make the audience lean forward wondering what comes next.',
        });
      }
    }
  }

  // ACT1_PURPOSE_SINGLE (minor, n≥8): Act 1 (first 25%) has ≥3 scenes but all
  // share the same purpose label — the opening wears one structural costume
  // throughout. Distinct from ACT3_PURPOSE_MONOTONE (Act 3 specific) and
  // PURPOSE_MONOCULTURE (whole story dominant purpose).
  if (n >= 8) {
    const act1End264b = Math.floor(n * 0.25);
    const act1Recs264 = records.slice(0, act1End264b);
    if (act1Recs264.length >= 3) {
      const act1Purposes264 = new Set(act1Recs264.map((r: any) => r.purpose));
      if (act1Purposes264.size === 1) {
        const [singlePurpose264] = act1Purposes264;
        issues.push({
          location: `Act 1 (Scenes 0–${act1End264b - 1})`,
          rule: 'ACT1_PURPOSE_SINGLE',
          severity: 'minor',
          description: `Act 1 (${act1Recs264.length} scenes) is entirely composed of "${singlePurpose264}" scenes — the opening wears one structural label throughout. A well-crafted Act 1 moves through setup, incitement, and character introduction, each scene serving a different narrative function.`,
          suggestedFix: `Differentiate Act 1 structurally: not every opening scene should be "${singlePurpose264}". Mix a world-establishment scene, a character-moment, and an inciting event so each scene advances the setup differently. Structural variety in Act 1 ensures the audience is oriented before the conflict begins.`,
        });
      }
    }
  }

  // ── Wave 278: Act 2a suspense void, climax purpose absent, emotional arc uniform ──

  // ACT2A_SUSPENSE_VOID (minor, n≥10): No scene in Act 2a (25%–50%) reaches a
  // suspenseDelta above 1. The first half of the conflict zone is entirely flat.
  // Early Act 2 should escalate from the inciting incident — the protagonist
  // should already be in trouble. A void of meaningful tension in Act 2a signals
  // a failure to engage the conflict before the midpoint. Distinct from ACT2_DEAD_ZONE
  // (40%–60% flatness) and SECOND_ACT_INVERSION (Act 2b drops below Act 2a):
  // this fires on Act 2a's absolute absence of tension, not relative comparison.
  if (n >= 10) {
    const act2aStart278 = Math.floor(n * 0.25);
    const act2bStart278 = Math.floor(n * 0.5);
    const hasAct2aTension278 = records.slice(act2aStart278, act2bStart278).some(r => r.suspenseDelta > 1);
    if (!hasAct2aTension278) {
      issues.push({
        location: `Act 2a (Scenes ${act2aStart278}–${act2bStart278 - 1})`,
        rule: 'ACT2A_SUSPENSE_VOID',
        severity: 'minor',
        description: `No scene in Act 2a (Scenes ${act2aStart278}–${act2bStart278 - 1}) reaches a suspenseDelta above 1 — the first half of the conflict zone is entirely flat. Early Act 2 should escalate from the inciting incident; a void of tension here signals a failure to engage the conflict before the midpoint.`,
        suggestedFix: 'Raise the stakes in early Act 2: add a complication, a new obstacle, or a ticking-clock moment that pushes suspense above baseline. The conflict should be demonstrably live in Act 2a, not just implied.',
      });
    }
  }

  // PURPOSE_CLIMAX_ABSENT (major, n≥8): No scene carries purpose 'climax'. The
  // story's structure has no designated climactic moment — it generates suspense
  // without the author formally committing to which scene is the peak confrontation.
  // Distinct from PROTAGONIST_PASSIVITY_CLIMAX (which audits the highest-suspense
  // scene in the climax zone) — this fires when no scene declares itself the
  // structural climax at all. A story without a climax scene has no clear summit;
  // the audience has no moment against which all others are measured.
  if (n >= 8) {
    const hasClimax278 = records.some(r => r.purpose === 'climax');
    if (!hasClimax278) {
      issues.push({
        location: 'Story structure — climax layer',
        rule: 'PURPOSE_CLIMAX_ABSENT',
        severity: 'major',
        description: `No scene carries purpose "climax" — the structure has no designated highest moment. The story may generate suspense but never formally commits to a climax scene. Without a structural climax, the audience has no clear peak against which all other scenes are measured.`,
        suggestedFix: "Identify the story's highest-stakes confrontation and designate it as the structural climax: the scene where the central conflict is directly engaged and the protagonist's situation is irrevocably changed. The climax is not just the most intense scene — it is the one the entire story has been building toward.",
      });
    }
  }

  // EMOTIONAL_ARC_UNIFORM (minor, n≥8): More than 70% of scenes share the same
  // emotionalShift value (all neutral, all positive, or all negative). The
  // protagonist's emotional trajectory is monotone — no rise, fall, or change
  // across the story's dramatic events. A complete arc requires the audience to
  // move with the protagonist through at least two distinct emotional registers.
  // Distinct from NO_REVERSALS (suspense-based): this fires on emotional-register
  // uniformity rather than directional suspense uniformity.
  if (n >= 8) {
    const emotionCounts278 = new Map<string, number>();
    for (const r of records) {
      emotionCounts278.set(r.emotionalShift, (emotionCounts278.get(r.emotionalShift) ?? 0) + 1);
    }
    const [topEmotion278, topCount278] = [...emotionCounts278.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topCount278 / n > 0.7) {
      issues.push({
        location: 'Emotional arc',
        rule: 'EMOTIONAL_ARC_UNIFORM',
        severity: 'minor',
        description: `${topCount278} of ${n} scenes (${Math.round(topCount278 / n * 100)}%) carry the same emotional register ("${topEmotion278}") — the protagonist's emotional trajectory is monotone. A full dramatic arc moves the character through distinct emotional phases: hope, fear, loss, recovery, and resolution.`,
        suggestedFix: 'Vary the emotional register: if the story is uniformly neutral, inject scenes of genuine positive momentum (a win, a connection, a moment of clarity) and scenes of genuine negative pressure (a setback, a cost, a loss). Emotional variety is the mechanism by which the audience empathises with the protagonist across the full arc.',
      });
    }
  }

  // ── Wave 292: ACT3_CURIOSITY_SPIKE_ABSENT ────────────────────────────────
  // No scene in the final quarter (75%–100%) has a curiosityDelta above 1,
  // despite the story having at least one such spike earlier. The climax zone
  // should be the story's most curious moment — audiences should desperately
  // want to know how it ends. A finale without any curiosity spike means the
  // audience already knows (or has stopped wondering) what will happen.
  // Requires 10+ records and 1+ curiosity spikes (>1) anywhere before the
  // final quarter.
  if (n >= 10) {
    const finalStart292 = Math.floor(n * 0.75);
    const preFinalSpike292 = records.slice(0, finalStart292).some(r => r.curiosityDelta > 1);
    if (preFinalSpike292) {
      const finalSpike292 = records.slice(finalStart292).some(r => r.curiosityDelta > 1);
      if (!finalSpike292) {
        issues.push({
          location: `Final quarter (Scenes ${finalStart292}+) — curiosity flatline`,
          rule: 'ACT3_CURIOSITY_SPIKE_ABSENT',
          severity: 'minor',
          description: `The story generates curiosity spikes (curiosityDelta > 1) before the final quarter but none in the finale (scenes ${finalStart292}+). The climax zone fails to intensify the audience's need to know — entering the resolution without peak curiosity means the answer arrives to an audience that has stopped asking the question.`,
          suggestedFix: "Introduce a late complication or revelation in the final quarter that reintensifies the audience's central question. The climax should feel like the most urgent answer to the most urgent question — if curiosity flatlines before the finale, the question has been implicitly resolved too early.",
        });
      }
    }
  }

  // ── Wave 292: CLOCK_PRESSURE_FINALE_ABSENT ───────────────────────────────
  // The story raises clocks (clockRaised) in earlier acts but no clock is
  // raised in the final quarter. The ticking deadline engine — which should
  // peak at the climax — goes silent before the resolution. A story that
  // establishes time pressure and then abandons it at the finale gives the
  // audience permission to relax when they should be most tense.
  // Requires 8+ records and 2+ clockRaised scenes before the final quarter.
  if (n >= 8) {
    const finalStart292b = Math.floor(n * 0.75);
    const earlyClocks292 = records.slice(0, finalStart292b).filter(r => r.clockRaised).length;
    if (earlyClocks292 >= 2) {
      const finalClocks292 = records.slice(finalStart292b).filter(r => r.clockRaised).length;
      if (finalClocks292 === 0) {
        issues.push({
          location: `Final quarter (Scenes ${finalStart292b}+) — no clock pressure`,
          rule: 'CLOCK_PRESSURE_FINALE_ABSENT',
          severity: 'minor',
          description: `${earlyClocks292} clock-raising scene(s) appear before the final quarter but the finale (scenes ${finalStart292b}+) has zero clock events. The ticking deadline engine — which should peak at the climax — goes silent before the resolution. Resolving the story without time pressure relaxes the audience when they should be most tense.`,
          suggestedFix: 'Add a clock event in the final quarter: a deadline arriving, a window closing, a countdown reaching zero. The clocks established in Act 2 should all come due at the climax — their convergence is what makes the finale feel like a reckoning rather than a conclusion.',
        });
      }
    }
  }

  // ── Wave 292: OPENING_SUSPENSE_FLATLINE ──────────────────────────────────
  // The first 3 scenes of the story all have suspenseDelta ≤ 0. The opening
  // fails to generate any tension before the Act 1 turn — the audience is
  // invited into a world of zero stakes. Even the most character-driven story
  // needs to establish at least some tension in the opening to signal that
  // things will get worse. Requires 5+ records (so the check is meaningful).
  if (n >= 5) {
    const openingSize292 = Math.min(3, n);
    const openingRecs292 = records.slice(0, openingSize292);
    const allFlatOpening292 = openingRecs292.every(r => r.suspenseDelta <= 0);
    if (allFlatOpening292) {
      issues.push({
        location: `Opening scenes (0–${openingSize292 - 1}) — no tension`,
        rule: 'OPENING_SUSPENSE_FLATLINE',
        severity: 'minor',
        description: `The first ${openingSize292} scene(s) all have suspenseDelta ≤ 0 — the story opens with zero tension. A flat opening fails to signal to the audience that stakes exist and things will escalate. Even a slow-burn story needs a tension seed in the opening that promises rising danger ahead.`,
        suggestedFix: 'Introduce a tension signal in the first scene: an unexplained threat, a simmering conflict, a hint of danger, or a question the protagonist urgently needs answered. The opening establishes the world\'s stakes — if stakes are absent, the audience has no reason to keep watching.',
      });
    }
  }

  // ── Wave 306: MIDPOINT_EMOTIONAL_FLATLINE ────────────────────────────────
  // The scene at the story's structural midpoint (50%) is emotionally neutral
  // AND carries no suspense (suspenseDelta ≤ 0). The midpoint is the spine of
  // the second act — where the protagonist's situation should pivot hardest.
  // A midpoint that is both emotionally inert and tensionless squanders the
  // story's central pivot. Distinct from WEAK_MIDPOINT (suspense-magnitude
  // proxy) and MIDPOINT_REVERSAL_ABSENT (no directional flip): this requires
  // the midpoint scene to be flat on both the emotional AND suspense channels.
  // Requires 8+ records.
  if (n >= 8) {
    const midIdx306 = Math.floor(n / 2);
    const midRec306 = records[midIdx306];
    if (midRec306 && midRec306.emotionalShift === 'neutral' && (midRec306.suspenseDelta ?? 0) <= 0) {
      issues.push({
        location: `Midpoint (Scene ${midRec306.sceneIdx})`,
        rule: 'MIDPOINT_EMOTIONAL_FLATLINE',
        severity: 'minor',
        description: `The midpoint scene (Scene ${midRec306.sceneIdx}) is emotionally neutral and carries no suspense (suspenseDelta ${midRec306.suspenseDelta ?? 0}). The midpoint is the second act's spine — the moment the protagonist's situation should pivot hardest, raising the stakes for everything after. A flat, tensionless midpoint leaves the story without a central fulcrum.`,
        suggestedFix: 'Charge the midpoint: stage a reversal, a revelation, or a point-of-no-return decision that resets the stakes and pushes the protagonist from reaction into action. The audience should feel the story change gears here — emotionally and in tension.',
      });
    }
  }

  // ── Wave 306: FINAL_IMAGE_WEAK ───────────────────────────────────────────
  // The final scene carries no charge on any channel: neutral emotional shift,
  // no suspense (≤ 0), and no relationship movement. The last image is what
  // the audience carries out of the theatre — a final scene that registers on
  // no channel sends them off with nothing. Distinct from RESOLUTION_TOO_BRIEF
  // (page length) and UNRESOLVED_ENDING (open loops): this audits the dramatic
  // charge of the closing beat. Requires 6+ records.
  if (n >= 6) {
    const lastRec306 = records[n - 1];
    const lastInert306 = lastRec306 &&
      lastRec306.emotionalShift === 'neutral' &&
      (lastRec306.suspenseDelta ?? 0) <= 0 &&
      ((lastRec306.relationshipShifts ?? []) as any[]).length === 0;
    if (lastInert306) {
      issues.push({
        location: `Final scene (Scene ${lastRec306.sceneIdx})`,
        rule: 'FINAL_IMAGE_WEAK',
        severity: 'minor',
        description: `The final scene (Scene ${lastRec306.sceneIdx}) carries no charge on any channel — neutral emotion, no suspense, no relationship movement. The last image is what the audience carries out of the theatre; a closing beat that registers on nothing sends them off empty-handed, undercutting whatever the story built.`,
        suggestedFix: 'Give the final scene a deliberate charge: a last emotional turn (acceptance, grief, hard-won peace), a final relational note (a bond sealed or severed), or a resonant image that answers the opening. The ending does not need spectacle, but it must leave a mark.',
      });
    }
  }

  // ── Wave 306: ACT_BALANCE_EXTREME ────────────────────────────────────────
  // One of the three acts (Act 1: 0–25%, Act 2: 25–75%, Act 3: 75–100%) holds
  // more than 55% of all scenes. Act 2 is expected to be the largest (~50%),
  // so this fires when ANY act is grossly oversized — an Act 1 or Act 3 over
  // 55% is a severe imbalance, and an Act 2 over 55% means the bookends are
  // starved. Distinct from the page-weight pacing checks (line counts): this
  // audits scene-count distribution. Requires 10+ records.
  if (n >= 10) {
    const act1Count306 = records.filter(r => r.sceneIdx < n * 0.25).length;
    const act2Count306 = records.filter(r => r.sceneIdx >= n * 0.25 && r.sceneIdx < n * 0.75).length;
    const act3Count306 = records.filter(r => r.sceneIdx >= n * 0.75).length;
    const acts306 = [
      { name: 'Act 1', count: act1Count306 },
      { name: 'Act 2', count: act2Count306 },
      { name: 'Act 3', count: act3Count306 },
    ];
    const biggest306 = acts306.reduce((a, b) => (b.count > a.count ? b : a));
    if (biggest306.count / n > 0.55) {
      issues.push({
        location: `${biggest306.name} (${biggest306.count} of ${n} scenes)`,
        rule: 'ACT_BALANCE_EXTREME',
        severity: 'minor',
        description: `${biggest306.name} holds ${biggest306.count} of ${n} scenes (${Math.round(biggest306.count / n * 100)}%) — a severe structural imbalance. ${biggest306.name === 'Act 2' ? 'An oversized Act 2 starves the setup and resolution, leaving the bookends too thin to establish and land the story.' : `An oversized ${biggest306.name} crowds out the complication zone where the story's real work happens.`}`,
        suggestedFix: biggest306.name === 'Act 2'
          ? 'Redistribute scenes toward Act 1 and Act 3 so the setup has room to establish stakes and the resolution has room to land. Act 2 should be the largest act but not by starving the others.'
          : `Move scenes out of ${biggest306.name} into Act 2. The complication zone (Act 2) should be the story's largest act; a bloated ${biggest306.name} signals the setup or resolution is doing work that belongs in the middle.`,
      });
    }
  }

  // ── Wave 320: CLIMAX_REVELATION_ABSENT ───────────────────────────────────
  // The story carries 2+ revelations but none of them lands in Act 3 (final
  // 25%). The climax act resolves without a single disclosure — the audience
  // arrives at the ending already knowing everything, so the climax delivers
  // confirmation rather than discovery. Distinct from REVELATION_DROUGHT
  // (long gap between any revelations) and ACT2_REVELATION_ABSENT (Act 2
  // specifically): this fires when revelations exist but are all spent before
  // the climax. Requires 8+ records.
  if (n >= 8) {
    const act3Start320 = Math.floor(n * 0.75);
    const totalRevs320 = records.filter(r => r.revelation).length;
    const act3Revs320 = records.filter(r => r.revelation && r.sceneIdx >= act3Start320).length;
    if (totalRevs320 >= 2 && act3Revs320 === 0) {
      issues.push({
        location: `Act 3 (Scenes ${act3Start320}–${n - 1}) — no revelation`,
        rule: 'CLIMAX_REVELATION_ABSENT',
        severity: 'minor',
        description: `The story carries ${totalRevs320} revelations but none lands in Act 3 (Scenes ${act3Start320}+). Every disclosure is spent before the climax, so the audience arrives at the ending already knowing everything. The climax delivers confirmation rather than discovery — the most charged structural position holds no new truth.`,
        suggestedFix: 'Reserve at least one significant revelation for Act 3: the final piece that recontextualizes the climax, the truth the protagonist has been missing, or the cost they only now understand. A climax without discovery is an outcome the audience has already calculated.',
      });
    }
  }

  // ── Wave 320: ACT2_CURIOSITY_VALLEY ──────────────────────────────────────
  // Act 2 (25%–75%) has an average curiosityDelta below BOTH Act 1 (0–25%)
  // and Act 3 (75%–100%). The complication zone — the longest stretch of the
  // story — is the least curious, sagging between a curious setup and a
  // curious finale. Distinct from ACT1_CURIOSITY_ABSENT (no spike in Act 1)
  // and ACT3_CURIOSITY_SPIKE_ABSENT (no spike in the final quarter): this
  // audits Act 2 relative to its neighbours. Requires 12+ records with ≥3
  // scenes in each act.
  if (n >= 12) {
    const a1End320 = Math.floor(n * 0.25);
    const a2End320 = Math.floor(n * 0.75);
    const a1Recs320 = records.slice(0, a1End320);
    const a2Recs320 = records.slice(a1End320, a2End320);
    const a3Recs320 = records.slice(a2End320);
    if (a1Recs320.length >= 3 && a2Recs320.length >= 3 && a3Recs320.length >= 3) {
      const avgCur320 = (rs: typeof records) => rs.reduce((s, r) => s + (r.curiosityDelta ?? 0), 0) / rs.length;
      const a1Cur320 = avgCur320(a1Recs320);
      const a2Cur320 = avgCur320(a2Recs320);
      const a3Cur320 = avgCur320(a3Recs320);
      if (a2Cur320 < a1Cur320 && a2Cur320 < a3Cur320) {
        issues.push({
          location: `Act 2 (Scenes ${a1End320}–${a2End320 - 1}) — curiosity valley`,
          rule: 'ACT2_CURIOSITY_VALLEY',
          severity: 'minor',
          description: `Act 2's average curiosityDelta (${a2Cur320.toFixed(2)}) is below both Act 1 (${a1Cur320.toFixed(2)}) and Act 3 (${a3Cur320.toFixed(2)}) — the complication zone is the least curious stretch of the story. The longest act sags between a curious setup and a curious finale, exactly where the audience spends most of their time. Curiosity that dips in the middle invites disengagement before the climax can re-grab them.`,
          suggestedFix: 'Plant fresh questions through Act 2: each complication should open a new line of inquiry, and the midpoint should raise a question that reframes everything before it. The middle act is where curiosity must be actively renewed, not coasted through on the opening hook.',
        });
      }
    }
  }

  // ── Wave 320: EMOTIONAL_OPENING_NEUTRAL ──────────────────────────────────
  // The first three scenes are all emotionally neutral. The opening establishes
  // nothing on the emotional channel — the audience meets the story through a
  // flat affect and is given no feeling to attach to before the plot machinery
  // starts. Distinct from OPENING_SUSPENSE_FLATLINE (first 3 scenes suspense ≤ 0)
  // and COLD_OPEN_INERT (scene 0 lacks all hooks): this audits the emotional
  // register specifically across the opening run. Requires 6+ records.
  if (n >= 6) {
    const opening320 = records.slice(0, 3);
    if (opening320.every(r => r.emotionalShift === 'neutral')) {
      issues.push({
        location: 'Opening (Scenes 0–2) — emotional flatline',
        rule: 'EMOTIONAL_OPENING_NEUTRAL',
        severity: 'minor',
        description: `The first three scenes are all emotionally neutral — the opening establishes nothing on the emotional channel. The audience meets the story through flat affect and is given no feeling to attach to before the plot begins. An opening that engages the mind (plot, questions) but not the heart risks the audience watching from a distance rather than investing.`,
        suggestedFix: 'Charge at least one of the first three scenes emotionally: a moment of warmth, dread, grief, or longing that gives the audience a feeling to carry into the story. Emotional investment in the opening is what makes the later stakes matter — the audience must care before they can be made anxious.',
      });
    }
  }

  // ── Wave 331: ACT3_EMOTIONAL_FLATLINE, ACT1_WARMTH_ABSENT, DRAMATIC_TURN_OPENING_ABSENT ──

  // ACT3_EMOTIONAL_FLATLINE (minor, n≥10, ≥3 Act 3 scenes): All scenes in Act 3
  // (final 25%) carry emotionalShift='neutral'. The finale generates no emotional
  // charge — neither the climax nor the denouement gives the audience a feeling to
  // land on. Stories that resolve without emotional register leave their audiences
  // intellectually closed but emotionally untouched. Distinct from
  // EMOTIONAL_OPENING_NEUTRAL (first 3 scenes, not Act 3), MIDPOINT_EMOTIONAL_FLATLINE
  // (midpoint only), EMOTIONAL_ARC_UNIFORM (>70% of ALL scenes same shift, any value).
  if (n >= 10) {
    const act3Start331 = Math.floor(n * 0.75);
    const act3Scenes331 = records.slice(act3Start331);
    if (act3Scenes331.length >= 3 && act3Scenes331.every(r => r.emotionalShift === 'neutral')) {
      issues.push({
        location: `Act 3 (Scenes ${act3Start331}–${n - 1}) — emotional flatline`,
        rule: 'ACT3_EMOTIONAL_FLATLINE',
        severity: 'minor',
        description: `All ${act3Scenes331.length} Act 3 scenes (${act3Start331}–${n - 1}) are emotionally neutral — the finale generates no emotional charge. Stories that resolve without emotional register close their audience intellectually but leave them untouched at the feeling level. A climax and denouement that carry no emotional weight miss the cathartic function of the final act.`,
        suggestedFix: 'Charge the finale emotionally: the climax should reach the highest (or lowest) emotional register in the story, and the denouement should deliver either earned warmth or productive grief. The audience needs a feeling to carry out of the theatre — give the resolution an emotional signature.',
      });
    }
  }

  // ACT1_WARMTH_ABSENT (minor, n≥8, ≥2 Act 1 scenes): No scene in the first 25%
  // carries emotionalShift='positive'. The opening act never establishes emotional
  // warmth — the story's world is introduced without a baseline of care, hope, or
  // connection. Without warmth to contrast against, the darker elements of Acts 2
  // and 3 have no emotional leverage point. Distinct from EMOTIONAL_OPENING_NEUTRAL
  // (first 3 scenes all neutral — could include negative scenes; this fires when
  // no scene is specifically positive), EMOTIONAL_ARC_UNIFORM (all scenes same shift).
  if (n >= 8) {
    const act1End331 = Math.floor(n * 0.25);
    const act1Scenes331 = records.slice(0, act1End331);
    if (act1Scenes331.length >= 2 && !act1Scenes331.some(r => r.emotionalShift === 'positive')) {
      issues.push({
        location: `Act 1 (Scenes 0–${act1End331 - 1}) — no warmth established`,
        rule: 'ACT1_WARMTH_ABSENT',
        severity: 'minor',
        description: `None of the ${act1Scenes331.length} Act 1 scene(s) carry a positive emotional shift — the opening act never establishes warmth, hope, or connection. Without a baseline of care, the later darkness has no emotional leverage; the audience has nothing to lose. A world introduced without warmth is harder to invest in.`,
        suggestedFix: 'Give at least one Act 1 scene a positive emotional register: a relationship that works, a moment of competence or joy, a world worth fighting for. This baseline is what the protagonist will spend the rest of the story trying to recover or protect — without it, the stakes are abstract.',
      });
    }
  }

  // DRAMATIC_TURN_OPENING_ABSENT (minor, n≥10): No scene in the opening 30%
  // carries a dramaticTurn. The opening act never pivots direction. A screenplay's
  // first act should contain at least one turning point that launches the
  // protagonist out of their ordinary world — without a turn, the opening is
  // pure setup with no dramatic event to orient the audience's expectations.
  // Distinct from MIDPOINT_REVERSAL_ABSENT (checks suspenseDelta<-1 OR revelation
  // in the midpoint zone, not dramaticTurn), ACT1_BOUNDARY_WEAK (Act 1 boundary
  // scene suspense, not dramaticTurn), INCITING_INCIDENT_TOO_LATE (any dramatic
  // event past 40%, not specifically dramaticTurn field).
  if (n >= 10) {
    const openingEnd331 = Math.floor(n * 0.30);
    const hasTurn331 = records.slice(0, openingEnd331).some(
      r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
    );
    if (!hasTurn331) {
      issues.push({
        location: `Opening 30% (Scenes 0–${openingEnd331 - 1}) — no dramatic turn`,
        rule: 'DRAMATIC_TURN_OPENING_ABSENT',
        severity: 'minor',
        description: `No scene in the opening 30% (scenes 0–${openingEnd331 - 1}) carries a dramatic turn — the opening act never pivots. A screenplay's first act should contain at least one turning point that disrupts the protagonist's ordinary world and launches the central conflict. Without a turn, the opening is pure setup with no event to signal that the story has actually started.`,
        suggestedFix: 'Place a dramatic turn in the opening act: the discovery of a problem, the arrival of an antagonist, a decision that changes the protagonist\'s direction. This turn is what separates the story from its backstory — it is the moment the audience knows the clock has started.',
      });
    }
  }

  // ── Wave 345: ACT2B_SUSPENSE_VOID, ACT2A_EMOTIONAL_FLATLINE, MIDPOINT_CURIOSITY_VOID ──

  // ACT2B_SUSPENSE_VOID (minor, n≥10): No scene in Act 2b (50%–75%) reaches a
  // suspenseDelta above 1. The run-up to the climax is entirely flat. Act 2b is the
  // pressure cooker — the protagonist's lowest point and the approach to the final
  // confrontation should be the tensest stretch before the climax itself. A void of
  // meaningful tension here means the story coasts into its peak instead of building
  // toward it. Distinct from ACT2A_SUSPENSE_VOID (the 25%–50% zone), SECOND_ACT_
  // INVERSION (Act 2b avg falls relative to Act 2a — a comparison, not an absolute
  // absence), and DARK_NIGHT_ABSENT (emotional low point, not a suspense spike).
  if (n >= 10) {
    const act2bStart345 = Math.floor(n * 0.5);
    const act2bEnd345 = Math.floor(n * 0.75);
    const act2bRecs345 = records.slice(act2bStart345, act2bEnd345);
    if (act2bRecs345.length >= 2 && !act2bRecs345.some(r => r.suspenseDelta > 1)) {
      issues.push({
        location: `Act 2b (Scenes ${act2bStart345}–${act2bEnd345 - 1})`,
        rule: 'ACT2B_SUSPENSE_VOID',
        severity: 'minor',
        description: `No scene in Act 2b (Scenes ${act2bStart345}–${act2bEnd345 - 1}) reaches a suspenseDelta above 1 — the run-up to the climax is entirely flat. Act 2b should be the pressure cooker, the tensest stretch before the final confrontation; a void of meaningful tension here means the story coasts into its peak instead of building toward it, and the climax inherits no momentum.`,
        suggestedFix: 'Escalate through Act 2b: tighten a deadline, spring a setback, or close off an escape route so the suspense climbs above baseline on the approach to the climax. The audience should feel the walls closing in during the stretch just before the peak.',
      });
    }
  }

  // ACT2A_EMOTIONAL_FLATLINE (minor, n≥10, ≥3 Act 2a scenes): Every scene in Act 2a
  // (25%–50%) carries emotionalShift='neutral'. The first half of the conflict zone
  // generates no emotional movement — the protagonist meets the rising complications
  // without feeling anything about them. Act 2a is where the audience's investment
  // should deepen as the cost of the conflict starts to register; a flatline here means
  // the story advances the plot while the emotional arc stalls. Distinct from ACT3_
  // EMOTIONAL_FLATLINE (finale zone), MIDPOINT_EMOTIONAL_FLATLINE (the central scene),
  // and EMOTIONAL_ARC_UNIFORM (>70% of ALL scenes share one shift, any value).
  if (n >= 10) {
    const act2aStart345 = Math.floor(n * 0.25);
    const act2bStart345b = Math.floor(n * 0.5);
    const act2aRecs345 = records.slice(act2aStart345, act2bStart345b);
    if (act2aRecs345.length >= 3 && act2aRecs345.every(r => r.emotionalShift === 'neutral')) {
      issues.push({
        location: `Act 2a (Scenes ${act2aStart345}–${act2bStart345b - 1}) — emotional flatline`,
        rule: 'ACT2A_EMOTIONAL_FLATLINE',
        severity: 'minor',
        description: `All ${act2aRecs345.length} Act 2a scenes (${act2aStart345}–${act2bStart345b - 1}) are emotionally neutral — the first half of the conflict zone generates no emotional movement. Act 2a is where the audience's investment should deepen as the cost of the conflict starts to register; a flatline here means the plot advances while the emotional arc stalls, and the protagonist meets rising complications without feeling anything about them.`,
        suggestedFix: 'Charge Act 2a emotionally: let the early complications land on the protagonist as a flare of fear, a flicker of hope, a wound to a relationship. The conflict should not just happen to the protagonist — it should move them, so the audience deepens its stake as the story climbs toward the midpoint.',
      });
    }
  }

  // MIDPOINT_CURIOSITY_VOID (minor, n≥10, ≥2 midpoint scenes): The midpoint zone
  // (40%–60%) has an average curiosityDelta of zero or less, in a story that otherwise
  // generates curiosity (some scene exceeds curiosityDelta 1). The midpoint is where a
  // strong structure reframes the central question — a revelation that recasts the goal,
  // a twist that opens a deeper mystery — and curiosity should spike there. A curiosity
  // void at the exact center means the story passes its pivot without renewing the
  // audience's need to know. Distinct from ACT2_CURIOSITY_VALLEY (the whole 25%–75% act
  // averaged below both bookends) and STRUCTURE_CURIOSITY_VOID (no curiosity spike
  // anywhere in the story): this targets the narrow midpoint window specifically.
  if (n >= 10) {
    const midStart345 = Math.floor(n * 0.4);
    const midEnd345 = Math.floor(n * 0.6);
    const midRecs345 = records.slice(midStart345, midEnd345);
    const storyCurious345 = records.some(r => (r.curiosityDelta ?? 0) > 1);
    if (midRecs345.length >= 2 && storyCurious345) {
      const midAvg345 = midRecs345.reduce((s, r) => s + (r.curiosityDelta ?? 0), 0) / midRecs345.length;
      if (midAvg345 <= 0) {
        issues.push({
          location: `Midpoint (Scenes ${midStart345}–${midEnd345 - 1}) — curiosity void`,
          rule: 'MIDPOINT_CURIOSITY_VOID',
          severity: 'minor',
          description: `The midpoint zone (Scenes ${midStart345}–${midEnd345 - 1}) averages a curiosityDelta of ${midAvg345.toFixed(2)} while the story generates curiosity spikes elsewhere — the pivot of the story passes without renewing the audience's need to know. A strong midpoint reframes the central question: a revelation that recasts the goal, a twist that opens a deeper mystery. A curiosity void at the exact center means the engine of intrigue stalls precisely where it should re-ignite.`,
          suggestedFix: 'Reframe the central question at the midpoint: introduce a revelation, a reversal, or a new piece of information that changes what the audience thought the story was about. The middle of the story is the most dangerous place to let curiosity flatten — it is where a slack structure loses the room.',
        });
      }
    }
  }

  // ── Wave 359: OPENING_CURIOSITY_FLATLINE, ACT3_DRAMATIC_TURN_ABSENT, ACT1_RELATIONSHIP_VOID ──

  // OPENING_CURIOSITY_FLATLINE (minor, n≥10, ≥2 Act 1 scenes): Act 1 (first 25%)
  // averages curiosityDelta ≤ 0, while the story has at least 2 scenes elsewhere with
  // curiosityDelta > 0.8. The opening act not only fails to spike curiosity — it
  // actively depresses it: the sum of audience questions raised is zero or negative.
  // The premise is presented without mystery, and the hook of Act 1 is surrendered.
  // Distinct from ACT1_CURIOSITY_ABSENT (no single spike > 0.5 in Act 1 — a peak check;
  // this is an average check that fires even when one scene has a small positive
  // curiosity but others drag the average below zero) and OPENING_SUSPENSE_FLATLINE
  // (suspenseDelta, not curiosityDelta).
  if (n >= 10) {
    const act1End359 = Math.floor(n * 0.25);
    const act1Recs359 = records.slice(0, act1End359);
    const storyCurious359 = records.filter((r: any) => (r.curiosityDelta ?? 0) > 0.8).length;
    if (act1Recs359.length >= 2 && storyCurious359 >= 2) {
      const act1CurAvg359 = act1Recs359.reduce((s: number, r: any) => s + (r.curiosityDelta ?? 0), 0) / act1Recs359.length;
      if (act1CurAvg359 <= 0) {
        issues.push({
          location: `Act 1 (Scenes 0–${act1End359 - 1}) — curiosity flatline`,
          rule: 'OPENING_CURIOSITY_FLATLINE',
          severity: 'minor',
          description: `Act 1 averages a curiosityDelta of ${act1CurAvg359.toFixed(2)} — the opening not only fails to generate audience questions, it closes them. With ${storyCurious359} curiosity spikes later in the story, the first act is the one stretch where the audience is left with nothing to wonder about. A hook that suppresses curiosity surrenders the narrative contract before it's been established.`,
          suggestedFix: 'Seed Act 1 with open questions: an anomaly the story withholds the answer to, an unexplained behavior, a hint of stakes the audience can sense but not yet see. The first act should make the audience lean forward wanting more — an Act 1 that averages negative curiosity means the audience has been given less to wonder about than they started with.',
        });
      }
    }
  }

  // ACT3_DRAMATIC_TURN_ABSENT (minor, n≥10): No scene in the final 25% of the story
  // carries a dramatic turn (dramaticTurn ≠ 'nothing'), even though ≥3 dramatic turns
  // exist in the first 75%. The finale proceeds to resolution without any reversals or
  // escalations — the plot simply coasts to its end. Act 3 should be the most
  // dynamically structured zone: reversals, complications, climactic pivots. A finale
  // with no turns plays as inevitable rather than earned. Distinct from DRAMATIC_TURN_
  // OPENING_ABSENT (checks the first 30%), and from climax checks (ACT2B_SUSPENSE_VOID,
  // CLIMAX_PURPOSE_ABSENT) which use different fields.
  if (n >= 10) {
    const act3Start359 = Math.floor(n * 0.75);
    const act3Recs359 = records.slice(act3Start359);
    const act1to2Turns359 = records.slice(0, act3Start359).filter((r: any) =>
      r.dramaticTurn != null && r.dramaticTurn !== 'nothing',
    ).length;
    const act3HasTurn359 = act3Recs359.some((r: any) =>
      r.dramaticTurn != null && r.dramaticTurn !== 'nothing',
    );
    if (act1to2Turns359 >= 3 && !act3HasTurn359) {
      issues.push({
        location: `Act 3 (Scenes ${act3Start359}–${n - 1}) — no dramatic turns`,
        rule: 'ACT3_DRAMATIC_TURN_ABSENT',
        severity: 'minor',
        description: `No scene in Act 3 (Scenes ${act3Start359}–${n - 1}) carries a dramatic turn, even though ${act1to2Turns359} turns punctuate Acts 1 and 2. The finale proceeds to resolution without reversals or escalations — the climax plays as a straight line rather than a dynamic sequence of pivots. Act 3 should be the most structurally charged zone; an absence of turns there makes the resolution feel inevitable rather than earned.`,
        suggestedFix: 'Build at least one reversal into Act 3: a setback before the climax, an unexpected complication that forces the protagonist to adapt, or a twist that reframes the resolution. The finale should contain the story\'s final structural surprise — the turn that makes the ending land with weight rather than arriving on schedule.',
      });
    }
  }

  // ACT1_RELATIONSHIP_VOID (minor, n≥10): No relationship shift of any kind occurs
  // in Act 1 (first 25%) while the story overall carries ≥3 relationship shifts. The
  // opening act introduces the characters but establishes no relational dynamic —
  // the audience meets people without learning how their bonds work or what's at stake
  // between them. Distinct from NO_RELATIONSHIP_MOVEMENT (zero shifts total — this
  // fires when Act 1 alone is void), LATE_RELATIONSHIP_INTRODUCTION (a specific pair
  // first shifts after midpoint), and RELATIONSHIP_OPENING_BURST (opposite: all shifts
  // in the first 25%, nothing later).
  if (n >= 10) {
    const act1End359b = Math.floor(n * 0.25);
    const totalShifts359 = records.reduce((s: number, r: any) =>
      s + ((r.relationshipShifts ?? []) as any[]).length, 0,
    );
    const act1Shifts359 = records.slice(0, act1End359b).reduce((s: number, r: any) =>
      s + ((r.relationshipShifts ?? []) as any[]).length, 0,
    );
    if (totalShifts359 >= 3 && act1Shifts359 === 0) {
      issues.push({
        location: `Act 1 (Scenes 0–${act1End359b - 1}) — no relationship shifts`,
        rule: 'ACT1_RELATIONSHIP_VOID',
        severity: 'minor',
        description: `Act 1 carries no relationship shifts despite ${totalShifts359} relational movements later in the story. The opening act introduces the characters but establishes no bond dynamics — the audience meets people without learning how their relationships work or what stakes exist between them. When Act 1 is relationally silent, the audience enters Act 2 without caring about any of the bonds being tested.`,
        suggestedFix: 'Establish at least one relational dynamic in Act 1: a bond that strengthens, a first friction, or a status shift between two characters. The opening act should make the audience understand what the relationships are so they can feel what\'s at stake when those bonds are tested in Act 2.',
      });
    }
  }

  // ── Wave 373: MIDPOINT_SUSPENSE_VOID, ACT2_PURPOSE_SINGLE, ACT2B_EMOTIONAL_FLATLINE ──

  // MIDPOINT_SUSPENSE_VOID (minor, n≥10, ≥2 midpoint scenes): The midpoint zone
  // (40%–60%) contains no scene with suspenseDelta > 1, in a story that spikes suspense
  // elsewhere (some scene exceeds suspenseDelta 1). The structural pivot passes without
  // tension — the moment the story should be tightening its grip is its slackest. Completes
  // the midpoint-zone channel set alongside MIDPOINT_CURIOSITY_VOID and MIDPOINT_EMOTIONAL_
  // FLATLINE. Distinct from ACT2A_SUSPENSE_VOID (25%–50%) and ACT2B_SUSPENSE_VOID (50%–75%):
  // this targets the narrow 40%–60% center window.
  if (n >= 10) {
    const midStart373 = Math.floor(n * 0.4);
    const midEnd373 = Math.floor(n * 0.6);
    const midRecs373 = records.slice(midStart373, midEnd373);
    const storyTense373 = records.some(r => (r.suspenseDelta ?? 0) > 1);
    if (midRecs373.length >= 2 && storyTense373 && !midRecs373.some(r => (r.suspenseDelta ?? 0) > 1)) {
      issues.push({
        location: `Midpoint (Scenes ${midStart373}–${midEnd373 - 1}) — suspense void`,
        rule: 'MIDPOINT_SUSPENSE_VOID',
        severity: 'minor',
        description: `The midpoint zone (Scenes ${midStart373}–${midEnd373 - 1}) contains no scene reaching a suspenseDelta above 1, while the story spikes tension elsewhere — the structural pivot passes without pressure. The midpoint is where a strong story raises the stakes and tightens its grip; a tension void at the exact center means the engine of suspense stalls precisely where the second half should be accelerating out of the turn.`,
        suggestedFix: 'Raise the tension at the midpoint: let the pivot that reframes the story also escalate the danger — a deadline imposed, a threat revealed, an escape route closed. The middle of the story is the most dangerous place to let suspense flatten, because it is where the audience decides whether the back half is worth the wait.',
      });
    }
  }

  // ACT2_PURPOSE_SINGLE (minor, n≥10, ≥4 Act 2 scenes): Every scene in Act 2 (25%–75%)
  // shares the same purpose label — the long middle act wears one structural costume
  // throughout. Act 2 is the most varied stretch of a well-built story: testing, escalation,
  // reversal, the midpoint turn, the approach to the low point. A single purpose across all
  // of it signals a middle that repeats one beat. Distinct from ACT1_PURPOSE_SINGLE (Act 1),
  // ACT3_PURPOSE_MONOTONE (Act 3), and PURPOSE_MONOCULTURE (whole-story dominant purpose):
  // this targets the central act.
  if (n >= 10) {
    const act2Start373 = Math.floor(n * 0.25);
    const act2End373 = Math.floor(n * 0.75);
    const act2Recs373 = records.slice(act2Start373, act2End373);
    if (act2Recs373.length >= 4) {
      const act2Purposes373 = new Set(act2Recs373.map((r: any) => r.purpose));
      if (act2Purposes373.size === 1) {
        const [singlePurpose373] = act2Purposes373;
        issues.push({
          location: `Act 2 (Scenes ${act2Start373}–${act2End373 - 1})`,
          rule: 'ACT2_PURPOSE_SINGLE',
          severity: 'minor',
          description: `Act 2 (${act2Recs373.length} scenes) is entirely composed of "${singlePurpose373}" scenes — the long middle act wears one structural label throughout. Act 2 is the most functionally varied stretch of a well-built story: testing, escalation, the midpoint reversal, the approach to the low point. A single purpose across all of it means the middle repeats one beat instead of building through distinct phases.`,
          suggestedFix: `Differentiate Act 2 structurally: not every middle scene should be "${singlePurpose373}". Move through rising complications, a genuine midpoint turn, setbacks, and the approach to the darkest moment — each serving a different function — so the long act escalates rather than treads water.`,
        });
      }
    }
  }

  // ACT2B_EMOTIONAL_FLATLINE (minor, n≥10, ≥3 Act 2b scenes): Every scene in Act 2b
  // (50%–75%) carries emotionalShift='neutral'. The run-up to the climax generates no
  // emotional movement — the protagonist approaches the story's peak without feeling the
  // mounting cost. Act 2b is where the stakes should be landing hardest emotionally as the
  // low point nears. The emotional mirror of ACT2A_EMOTIONAL_FLATLINE (25%–50%); distinct
  // from ACT3_EMOTIONAL_FLATLINE (finale) and MIDPOINT_EMOTIONAL_FLATLINE (the central scene).
  if (n >= 10) {
    const act2bStart373 = Math.floor(n * 0.5);
    const act2bEnd373 = Math.floor(n * 0.75);
    const act2bRecs373 = records.slice(act2bStart373, act2bEnd373);
    if (act2bRecs373.length >= 3 && act2bRecs373.every(r => r.emotionalShift === 'neutral')) {
      issues.push({
        location: `Act 2b (Scenes ${act2bStart373}–${act2bEnd373 - 1}) — emotional flatline`,
        rule: 'ACT2B_EMOTIONAL_FLATLINE',
        severity: 'minor',
        description: `All ${act2bRecs373.length} Act 2b scenes (${act2bStart373}–${act2bEnd373 - 1}) are emotionally neutral — the run-up to the climax generates no emotional movement. Act 2b is where the cost of the conflict should be landing hardest as the protagonist approaches their lowest point; a flatline here means the story climbs toward its peak with the emotional arc stalled, so the climax inherits no accumulated feeling.`,
        suggestedFix: 'Charge Act 2b emotionally: the approach to the climax should be the protagonist\'s most harrowing stretch — mounting dread, deepening loss, the strain of everything closing in. Let the run-up to the peak move the protagonist so the audience arrives at the climax already invested in what it will cost them.',
      });
    }
  }

  // ── Wave 387: ACT1_EMOTIONAL_FLATLINE, ACT2A_CURIOSITY_VOID, ACT2_DRAMATIC_TURN_ABSENT ──

  // ACT1_EMOTIONAL_FLATLINE (minor, n≥8, ≥3 Act 1 scenes): Every scene in Act 1 (the
  // first 25%) is emotionally neutral, while the story carries emotion elsewhere. The
  // opening establishes the world without giving the audience anything to feel, so they
  // are oriented but not invested before the conflict begins. Completes the emotional-
  // flatline zone set with ACT2A/ACT2B/ACT3_EMOTIONAL_FLATLINE and MIDPOINT_EMOTIONAL_
  // FLATLINE; distinct from EMOTIONAL_OPENING_NEUTRAL (only the first three scenes) and
  // ACT1_WARMTH_ABSENT (no POSITIVE beat — this fires even when negatives are also absent).
  if (n >= 8) {
    const a1End387 = Math.floor(n * 0.25);
    const a1Recs387 = records.slice(0, a1End387);
    const emotionElsewhere387 = records.slice(a1End387).some(r => r.emotionalShift !== 'neutral');
    if (a1Recs387.length >= 3 && a1Recs387.every(r => r.emotionalShift === 'neutral') && emotionElsewhere387) {
      issues.push({
        location: `Act 1 (Scenes 0–${a1End387 - 1}) — emotional flatline`,
        rule: 'ACT1_EMOTIONAL_FLATLINE',
        severity: 'minor',
        description: `All ${a1Recs387.length} Act 1 scenes are emotionally neutral, while the story carries emotion later. The opening establishes the world without giving the audience anything to feel, so they are oriented but not invested before the conflict begins — an Act 1 with no emotional charge asks the audience to wait for a reason to care.`,
        suggestedFix: 'Charge Act 1 emotionally: let the protagonist\'s ordinary world carry a flicker of longing, fear, or joy so the audience bonds with them before the inciting incident. An emotional beat early is what makes the audience willing to follow the character into the story\'s trouble.',
      });
    }
  }

  // ACT2A_CURIOSITY_VOID (minor, n≥10, ≥2 Act 2a scenes): Act 2a (the 25%–50% zone)
  // averages curiosityDelta ≤ 0 in a story that otherwise spikes curiosity (some scene
  // exceeds curiosityDelta 1). The first half of the complication zone — where the early
  // investigation should be opening questions — generates no intrigue, so the run toward
  // the midpoint loses the audience's need to know. Completes the curiosity-zone set;
  // distinct from ACT2_CURIOSITY_VALLEY (whole Act 2 averaged below both bookend acts — a
  // comparison) and MIDPOINT_CURIOSITY_VOID (the narrow 40%–60% window).
  if (n >= 10) {
    const a2aStart387 = Math.floor(n * 0.25);
    const a2aEnd387 = Math.floor(n * 0.5);
    const a2aRecs387 = records.slice(a2aStart387, a2aEnd387);
    const storyCurious387 = records.some(r => (r.curiosityDelta ?? 0) > 1);
    if (a2aRecs387.length >= 2 && storyCurious387) {
      const a2aAvg387 = a2aRecs387.reduce((s, r) => s + (r.curiosityDelta ?? 0), 0) / a2aRecs387.length;
      if (a2aAvg387 <= 0) {
        issues.push({
          location: `Act 2a (Scenes ${a2aStart387}–${a2aEnd387 - 1}) — curiosity void`,
          rule: 'ACT2A_CURIOSITY_VOID',
          severity: 'minor',
          description: `Act 2a (Scenes ${a2aStart387}–${a2aEnd387 - 1}) averages a curiosityDelta of ${a2aAvg387.toFixed(2)} while the story spikes curiosity elsewhere — the first half of the complication zone generates no intrigue. The early investigation, where new questions should be opening as the protagonist tests the world, instead coasts, so the run toward the midpoint loses the audience's need to know.`,
          suggestedFix: 'Open questions in Act 2a: let the protagonist\'s first moves uncover something unexpected — a complication, a partial answer that raises a deeper question, a hint the situation is not what it seemed. Early-Act-2 curiosity is what pulls the audience across the long middle toward the midpoint turn.',
        });
      }
    }
  }

  // ACT2_DRAMATIC_TURN_ABSENT (minor, n≥12, ≥4 Act 2 scenes): The long middle act
  // (25%–75%) contains no dramatic turn, even though ≥2 turns land outside it. The
  // complication zone — the stretch most prone to sagging — proceeds without a single
  // reversal or recognition, so the middle plays as a flat extension of the setup rather
  // than a sequence of escalating pivots. Distinct from MIDPOINT_REVERSAL_ABSENT (the
  // midpoint scene specifically), ACT3_DRAMATIC_TURN_ABSENT (the finale), DRAMATIC_TURN_
  // OPENING_ABSENT (first 30%), and NO_REVERSALS (the whole story has none).
  if (n >= 12) {
    const a2Start387 = Math.floor(n * 0.25);
    const a2End387 = Math.floor(n * 0.75);
    const a2Recs387 = records.slice(a2Start387, a2End387);
    const turnsOutside387 = [...records.slice(0, a2Start387), ...records.slice(a2End387)]
      .filter((r: any) => r.dramaticTurn != null && r.dramaticTurn !== 'nothing').length;
    const a2HasTurn387 = a2Recs387.some((r: any) => r.dramaticTurn != null && r.dramaticTurn !== 'nothing');
    if (a2Recs387.length >= 4 && turnsOutside387 >= 2 && !a2HasTurn387) {
      issues.push({
        location: `Act 2 (Scenes ${a2Start387}–${a2End387 - 1}) — no dramatic turns`,
        rule: 'ACT2_DRAMATIC_TURN_ABSENT',
        severity: 'minor',
        description: `The long middle act (Scenes ${a2Start387}–${a2End387 - 1}) contains no dramatic turn, even though ${turnsOutside387} turns land in Acts 1 and 3. The complication zone — the stretch most prone to sagging — proceeds without a single reversal or recognition, so the middle plays as a flat extension of the setup rather than a sequence of escalating pivots that keeps the audience off balance.`,
        suggestedFix: 'Build reversals into Act 2: a midpoint twist, a setback that forces a new plan, an alliance that flips. The middle act is where a story most often loses momentum; punctuating it with genuine turns is what keeps the long stretch between setup and climax dynamic.',
      });
    }
  }

  // ── Wave 401: ACT2B_CURIOSITY_VOID, MIDPOINT_DRAMATIC_TURN_VOID, ACT3_SUSPENSE_VOID ──

  // ACT2B_CURIOSITY_VOID (minor, n≥10, ≥2 Act 2b scenes, overall curiosity present):
  // No scene in Act 2b (50%–75%) raises curiosity — the escalation zone generates no new
  // questions while the story otherwise does. Act 2b is where the story should deepen its
  // central mystery and build anticipation for the climax; if nothing in this zone raises a
  // question, the run-up to the finale feels like a succession of events the audience can
  // already predict. Completes the curiosity-zone set alongside ACT1_CURIOSITY_ABSENT,
  // ACT2A_CURIOSITY_VOID, and ACT3_CURIOSITY_SPIKE_ABSENT. Distinct from MIDPOINT_
  // CURIOSITY_VOID (40%–60% pivot zone) and ACT2_CURIOSITY_VALLEY (comparative valley,
  // not an absolute absence in the back half).
  if (n >= 10) {
    const a2bStart401a = Math.floor(n * 0.5);
    const a2bEnd401a = Math.floor(n * 0.75);
    const a2bRecs401a = records.slice(a2bStart401a, a2bEnd401a);
    const anyOverallCurio401a = records.some((r: any) => (r.curiosityDelta ?? 0) > 0);
    if (a2bRecs401a.length >= 2 && anyOverallCurio401a) {
      const a2bHasCurio401a = a2bRecs401a.some((r: any) => (r.curiosityDelta ?? 0) > 0);
      if (!a2bHasCurio401a) {
        issues.push({
          location: `Act 2b (Scenes ${a2bStart401a}–${a2bEnd401a - 1}) — curiosity void`,
          rule: 'ACT2B_CURIOSITY_VOID',
          severity: 'minor',
          description: `No scene in Act 2b (Scenes ${a2bStart401a}–${a2bEnd401a - 1}) raises curiosity — the escalation zone generates no new questions while the story does so elsewhere. Act 2b should deepen the central mystery and build anticipation for the climax; a curiosity void here means the run-up to the finale is a sequence of events the audience can predict rather than questions they are eager to have answered.`,
          suggestedFix: 'Plant a new question in Act 2b: a discovery that recasts the central problem, a character whose motives become suddenly unclear, or a clue that implies more is at stake than the audience realized. The escalation zone should not just raise the tension but renew the mystery.',
        });
      }
    }
  }

  // MIDPOINT_DRAMATIC_TURN_VOID (minor, n≥10, ≥2 dramatic turns outside midpoint):
  // No dramatic turn lands in the 40%–60% pivot zone while at least 2 turns exist in the
  // rest of the story. The structural midpoint is typically the story's sharpest reversal —
  // where the protagonist's approach must change because the world has shifted. A pivot zone
  // with no pivot is a structural non-event: the story reaches its geographic center, nothing
  // changes direction, and the second half must inherit the same momentum as the first rather
  // than a new trajectory. Completes the midpoint channel set alongside MIDPOINT_SUSPENSE_VOID,
  // MIDPOINT_CURIOSITY_VOID, and MIDPOINT_EMOTIONAL_FLATLINE. Distinct from ACT2_DRAMATIC_TURN_
  // ABSENT (the entire 25%–75% zone — a broader absence) and ACT3_DRAMATIC_TURN_ABSENT
  // (the finale zone).
  if (n >= 10) {
    const midStart401b = Math.floor(n * 0.4);
    const midEnd401b = Math.ceil(n * 0.6);
    const midRecs401b = records.slice(midStart401b, midEnd401b);
    const outsideRecs401b = [...records.slice(0, midStart401b), ...records.slice(midEnd401b)];
    const turnsOutside401b = outsideRecs401b.filter(
      (r: any) => r.dramaticTurn != null && r.dramaticTurn !== 'nothing',
    ).length;
    const midHasTurn401b = midRecs401b.some(
      (r: any) => r.dramaticTurn != null && r.dramaticTurn !== 'nothing',
    );
    if (midRecs401b.length >= 2 && turnsOutside401b >= 2 && !midHasTurn401b) {
      issues.push({
        location: `Midpoint zone (Scenes ${midStart401b}–${midEnd401b - 1}) — no dramatic turn`,
        rule: 'MIDPOINT_DRAMATIC_TURN_VOID',
        severity: 'minor',
        description: `No dramatic turn lands in the 40%–60% pivot zone (Scenes ${midStart401b}–${midEnd401b - 1}), though ${turnsOutside401b} turns exist elsewhere. The structural midpoint is typically the story's sharpest reversal — the moment where the protagonist's approach must change because the world has shifted. A pivot zone with no pivot passes the geographic center of the story without changing direction, and the second half inherits the same momentum as the first.`,
        suggestedFix: 'Place a genuine reversal at the midpoint: a revelation that recasts the protagonist\'s goal, an unexpected alliance or betrayal, or a discovery that forces a new plan. The midpoint turn is what separates Act 2a (approach) from Act 2b (escalation) — without it, the middle is one long undifferentiated stretch.',
      });
    }
  }

  // ACT3_SUSPENSE_VOID (minor, n≥10, ≥2 Act 3 scenes, overall suspense > 0):
  // No scene in Act 3 (75%–100%) generates meaningful suspense (suspenseDelta > 1) while
  // the story builds tension elsewhere. The finale should be the story's most tense stretch;
  // a suspense-void climax means the ending resolves without the audience being under
  // pressure. The action happens, the resolution arrives — but nothing is at stake in the
  // physical pace of the final act. Distinct from ACT2B_SUSPENSE_VOID (the 50%–75% run-up),
  // OPENING_SUSPENSE_FLATLINE (the first 3 scenes), CLIMAX_PLATEAU (a flat peak that is too
  // uniformly distributed, not an absence), and UNRESOLVED_ENDING (which fires when the final
  // scene is too tense, the opposite case).
  if (n >= 10) {
    const a3Start401c = Math.floor(n * 0.75);
    const a3Recs401c = records.slice(a3Start401c);
    const anyOverallSusp401c = records.some((r: any) => (r.suspenseDelta ?? 0) > 1);
    if (a3Recs401c.length >= 2 && anyOverallSusp401c && !a3Recs401c.some((r: any) => (r.suspenseDelta ?? 0) > 1)) {
      issues.push({
        location: `Act 3 (Scenes ${a3Start401c}–${n - 1}) — suspense void`,
        rule: 'ACT3_SUSPENSE_VOID',
        severity: 'minor',
        description: `No scene in Act 3 (Scenes ${a3Start401c}–${n - 1}) reaches a suspenseDelta above 1, even though the story builds meaningful tension elsewhere. The finale resolves without the audience being under pressure — the action happens and the resolution arrives, but no scene in the final act generates the sense of threat and uncertainty that makes an ending feel earned rather than merely arrived at.`,
        suggestedFix: 'Build genuine tension in Act 3: a complication that threatens the resolution, a last-moment reversal, or a confrontation that could go either way. The audience should not be confident of the outcome until it arrives — Act 3 tension is what converts a satisfying plot conclusion into a felt experience.',
      });
    }
  }

  // ── Wave 415: ACT1_SUSPENSE_VOID, ACT2A_DRAMATIC_TURN_VOID, ACT2B_DRAMATIC_TURN_VOID ──

  // ACT1_SUSPENSE_VOID (minor, n≥10, ≥2 Act 1 scenes, overall suspense > 1): No scene in Act 1
  // (0%–25%) reaches a suspenseDelta above 1, even though the story builds meaningful tension
  // elsewhere. The setup establishes the world with no flicker of threat or uncertainty, so the
  // audience has nothing pulling them forward through the opening — the first quarter reads as
  // pure exposition with no pressure. Completes the suspense-void zone set alongside ACT2A_
  // SUSPENSE_VOID (25%–50%), ACT2B_SUSPENSE_VOID (50%–75%), MIDPOINT_SUSPENSE_VOID (40%–60%),
  // and ACT3_SUSPENSE_VOID (75%–100%). Distinct from OPENING_SUSPENSE_FLATLINE (the first 3
  // scenes all ≤ 0 — a stricter, narrower opener check): this audits the whole Act 1 zone for
  // the absence of any genuine spike.
  if (n >= 10) {
    const a1End415 = Math.floor(n * 0.25);
    const a1Recs415 = records.slice(0, a1End415);
    const anyOverallSusp415 = records.some((r: any) => (r.suspenseDelta ?? 0) > 1);
    if (a1Recs415.length >= 2 && anyOverallSusp415 && !a1Recs415.some((r: any) => (r.suspenseDelta ?? 0) > 1)) {
      issues.push({
        location: `Act 1 (Scenes 0–${a1End415 - 1}) — suspense void`,
        rule: 'ACT1_SUSPENSE_VOID',
        severity: 'minor',
        description: `No scene in Act 1 (Scenes 0–${a1End415 - 1}) reaches a suspenseDelta above 1, even though the story builds meaningful tension elsewhere. The setup establishes the world with no flicker of threat or uncertainty, so the audience has nothing pulling them forward through the opening — the first quarter reads as pure exposition, and the story asks for patience before it has given a reason to keep watching.`,
        suggestedFix: 'Introduce a thread of tension in Act 1: a threat glimpsed, a deadline implied, a question of safety raised. The opening does not need a set-piece, but it needs at least one beat where something is at stake — a low hum of suspense in the setup is what makes the audience trust that the story is going somewhere.',
      });
    }
  }

  // ACT2A_DRAMATIC_TURN_VOID (minor, n≥12, ≥3 Act 2a scenes, ≥2 turns outside): The Act 2a
  // approach zone (25%–50%) contains no dramatic turn, even though ≥2 turns land outside it. The
  // stretch where the protagonist first engages the central problem proceeds without a single
  // reversal or recognition — the approach plays as a flat ramp rather than a series of
  // course-corrections. Completes the per-half dramatic-turn zone set; distinct from ACT2_
  // DRAMATIC_TURN_ABSENT (the whole 25%–75% middle — this isolates the front half), MIDPOINT_
  // DRAMATIC_TURN_VOID (the 40%–60% pivot), and ACT2B_DRAMATIC_TURN_VOID (the back half).
  if (n >= 12) {
    const a2aStart415 = Math.floor(n * 0.25);
    const a2aEnd415 = Math.floor(n * 0.5);
    const a2aRecs415 = records.slice(a2aStart415, a2aEnd415);
    const turnsOutside415a = [...records.slice(0, a2aStart415), ...records.slice(a2aEnd415)]
      .filter((r: any) => r.dramaticTurn != null && r.dramaticTurn !== 'nothing').length;
    const a2aHasTurn415 = a2aRecs415.some((r: any) => r.dramaticTurn != null && r.dramaticTurn !== 'nothing');
    if (a2aRecs415.length >= 3 && turnsOutside415a >= 2 && !a2aHasTurn415) {
      issues.push({
        location: `Act 2a (Scenes ${a2aStart415}–${a2aEnd415 - 1}) — no dramatic turns`,
        rule: 'ACT2A_DRAMATIC_TURN_VOID',
        severity: 'minor',
        description: `The Act 2a approach zone (Scenes ${a2aStart415}–${a2aEnd415 - 1}) contains no dramatic turn, even though ${turnsOutside415a} turns land elsewhere. The stretch where the protagonist first engages the central problem proceeds without a single reversal or recognition, so the approach plays as a flat ramp into the midpoint rather than a series of course-corrections that keep the audience recalibrating.`,
        suggestedFix: 'Build a reversal into Act 2a: a first attempt that fails and forces a new tack, an ally who turns out to have an agenda, a discovery that complicates the protagonist\'s plan. The approach to the midpoint is more compelling as a sequence of small turns than as an uninterrupted build.',
      });
    }
  }

  // ACT2B_DRAMATIC_TURN_VOID (minor, n≥12, ≥3 Act 2b scenes, ≥2 turns outside): The Act 2b
  // escalation zone (50%–75%) contains no dramatic turn, even though ≥2 turns land outside it.
  // The run-up to the climax — where stakes should compound and the situation should keep
  // shifting under the protagonist — proceeds without a single reversal, so the back half of
  // the middle act builds in a straight line into the finale. Completes the per-half dramatic-
  // turn zone set; distinct from ACT2_DRAMATIC_TURN_ABSENT (the whole 25%–75% middle), MIDPOINT_
  // DRAMATIC_TURN_VOID (40%–60%), ACT3_DRAMATIC_TURN_ABSENT (the finale), and ACT2A_DRAMATIC_
  // TURN_VOID (the front half).
  if (n >= 12) {
    const a2bStart415 = Math.floor(n * 0.5);
    const a2bEnd415 = Math.floor(n * 0.75);
    const a2bRecs415 = records.slice(a2bStart415, a2bEnd415);
    const turnsOutside415b = [...records.slice(0, a2bStart415), ...records.slice(a2bEnd415)]
      .filter((r: any) => r.dramaticTurn != null && r.dramaticTurn !== 'nothing').length;
    const a2bHasTurn415 = a2bRecs415.some((r: any) => r.dramaticTurn != null && r.dramaticTurn !== 'nothing');
    if (a2bRecs415.length >= 3 && turnsOutside415b >= 2 && !a2bHasTurn415) {
      issues.push({
        location: `Act 2b (Scenes ${a2bStart415}–${a2bEnd415 - 1}) — no dramatic turns`,
        rule: 'ACT2B_DRAMATIC_TURN_VOID',
        severity: 'minor',
        description: `The Act 2b escalation zone (Scenes ${a2bStart415}–${a2bEnd415 - 1}) contains no dramatic turn, even though ${turnsOutside415b} turns land elsewhere. The run-up to the climax — where stakes should compound and the situation should keep shifting under the protagonist — proceeds without a single reversal, so the back half of the middle act builds in a straight line into the finale instead of tightening through a series of pivots.`,
        suggestedFix: 'Place a reversal in Act 2b: a betrayal that strips away an advantage, a plan that backfires and raises the cost, a revelation that changes what winning requires. The escalation zone earns the climax by repeatedly raising the stakes through turns, not by simply accelerating toward it.',
      });
    }
  }

  // ── Wave 429: INCITING_AFTERMATH_STALL, CLIMAX_UNPREPARED, PURPOSE_MONOTONE_RUN ──

  // INCITING_AFTERMATH_STALL (minor, n≥10): The first dramatic catalyst in the opening 40% of the
  // story (the earliest scene carrying a revelation, a dramatic turn, or a suspenseDelta > 1.5) is
  // followed by two scenes that neither raise suspense nor curiosity — both have suspenseDelta ≤ 0
  // AND curiosityDelta ≤ 0. The story fires its inciting spark and then immediately stalls: the
  // event that should propel the protagonist into the central problem generates no momentum in its
  // wake, so the audience feels the engine catch and die. An inciting incident earns its name by
  // what it sets in motion; a catalyst followed by two inert scenes is a catalyst that catalysed
  // nothing.
  // Analytical mode: sequence/aftermath (the beats AFTER the first catalyst), the first such check
  // in this pass. Distinct from MISSING_INCITING_INCIDENT (no catalyst exists at all — this
  // requires one to exist, then audits its consequence), OPENING_SUSPENSE_FLATLINE (first 3 scenes
  // all ≤ 0 regardless of any catalyst), and COLD_OPEN_INERT (the very first scene only).
  if (n >= 10) {
    const catalystZoneEnd429 = Math.floor(n * 0.4);
    const isCatalyst429 = (r: any): boolean =>
      !!r.revelation ||
      (r.dramaticTurn != null && r.dramaticTurn !== 'nothing') ||
      (r.suspenseDelta ?? 0) > 1.5;
    let firstCatalystIdx429 = -1;
    for (let i = 0; i < catalystZoneEnd429 && i < n; i++) {
      if (isCatalyst429(records[i])) { firstCatalystIdx429 = i; break; }
    }
    if (firstCatalystIdx429 >= 0 && firstCatalystIdx429 + 2 < n) {
      const after1_429 = records[firstCatalystIdx429 + 1];
      const after2_429 = records[firstCatalystIdx429 + 2];
      const flat429 = (r: any) => (r.suspenseDelta ?? 0) <= 0 && (r.curiosityDelta ?? 0) <= 0;
      if (flat429(after1_429) && flat429(after2_429)) {
        issues.push({
          location: `Scenes ${firstCatalystIdx429 + 1}–${firstCatalystIdx429 + 2} (after first catalyst at Scene ${firstCatalystIdx429})`,
          rule: 'INCITING_AFTERMATH_STALL',
          severity: 'minor',
          description: `The story's first dramatic catalyst (Scene ${firstCatalystIdx429}) is followed by two scenes that raise neither suspense nor curiosity — both flat on both channels. The inciting spark fires and the story immediately stalls: the event that should launch the protagonist into the central problem generates no momentum in its wake, so the audience feels the engine catch and die before the journey begins.`,
          suggestedFix: 'Let the catalyst propel the next two scenes: a consequence the protagonist must react to, a question the event opens, a new pressure it introduces. An inciting incident is defined by what it sets in motion — the scenes immediately after it should accelerate, not idle.',
        });
      }
    }
  }

  // CLIMAX_UNPREPARED (minor, n≥10): The peak-suspense scene in the final 30% of the story (the
  // climax), together with the two scenes immediately before it, carries no revelation and no
  // dramatic turn — even though the story uses revelations or turns elsewhere (≥2 such scenes
  // total). The climax erupts without structural run-up: nothing in its approach discloses, pivots,
  // or recontextualises, so the peak arrives as raw intensity with no preparation. A climax lands
  // because the scenes feeding it have armed it — a truth surfacing, a reversal landing, the ground
  // shifting under the protagonist just before the confrontation. When the run-up is dramatically
  // inert, the climax is a loud event the audience has not been set up to feel.
  // Analytical mode: backward-cause (looking back from the peak for its preparation). Distinct from
  // FALSE_CLIMAX (peak located too EARLY — this concerns a correctly-placed peak with no run-up),
  // PROTAGONIST_PASSIVITY_CLIMAX (the peak scene's own emotion/clock/discovery, not the 2-scene
  // run-up), and CLIMAX_REVELATION_ABSENT (whole Act-3 zone, revelations only — this is anchored to
  // the specific peak scene's immediate approach and also counts dramatic turns, so it fires even
  // when Act 3 holds a revelation that is not in the climax's run-up).
  if (n >= 10) {
    const climaxZoneStart429 = Math.floor(n * 0.7);
    let climaxIdx429 = -1;
    let climaxSusp429 = -Infinity;
    for (let i = climaxZoneStart429; i < n; i++) {
      if ((records[i].suspenseDelta ?? 0) > climaxSusp429) {
        climaxSusp429 = records[i].suspenseDelta ?? 0;
        climaxIdx429 = i;
      }
    }
    const deviceScenes429 = records.filter(
      (r: any) => !!r.revelation || (r.dramaticTurn != null && r.dramaticTurn !== 'nothing'),
    ).length;
    if (climaxIdx429 >= 2 && climaxSusp429 > 1 && deviceScenes429 >= 2) {
      const runUpStart429 = Math.max(0, climaxIdx429 - 2);
      const runUp429 = records.slice(runUpStart429, climaxIdx429 + 1);
      const runUpHasDevice429 = runUp429.some(
        (r: any) => !!r.revelation || (r.dramaticTurn != null && r.dramaticTurn !== 'nothing'),
      );
      if (!runUpHasDevice429) {
        issues.push({
          location: `Scenes ${runUpStart429}–${climaxIdx429} (climax run-up, peak suspense ${climaxSusp429.toFixed(1)})`,
          rule: 'CLIMAX_UNPREPARED',
          severity: 'minor',
          description: `The climax (Scene ${climaxIdx429}, peak suspense ${climaxSusp429.toFixed(1)}) and the two scenes before it carry no revelation and no dramatic turn, even though the story uses ${deviceScenes429} such device scenes elsewhere. The peak erupts without structural run-up — nothing in its approach discloses, pivots, or recontextualises — so the climax arrives as raw intensity the audience has not been armed to feel.`,
          suggestedFix: 'Arm the climax in its approach: place a revelation or a dramatic turn in the two scenes feeding it — a truth that surfaces, a reversal that lands, an advantage that vanishes just before the confrontation. The climax should be the detonation of a charge the run-up has been setting, not a sudden spike with no fuse.',
        });
      }
    }
  }

  // PURPOSE_MONOTONE_RUN (minor, n≥10): Five or more consecutive scenes share the same purpose
  // label, while the story as a whole uses at least two distinct purposes. A localized stretch of
  // identical structural intent — five scenes in a row all "development", or all "raise_stakes" —
  // reads as a plateau where the story stops rotating through structural functions, even when the
  // global purpose distribution is varied. The audience loses their sense of forward structural
  // motion across the run: scene after scene serves the same narrative job with no change of gear.
  // Analytical mode: run-based (a local consecutive run). Distinct from PURPOSE_MONOCULTURE (a
  // GLOBAL proportion — one purpose across >70% of ALL scenes), and from ACT1/ACT2/ACT3_PURPOSE_
  // SINGLE (which require an entire ACT ZONE to be one purpose): a 5-scene run can sit inside a
  // varied zone or straddle a zone boundary, firing where none of those zone-complete or global
  // checks would. The run < n guard ensures it is a local plateau, not whole-story monoculture.
  if (n >= 10) {
    let bestRunStart429 = 0, bestRunLen429 = 1;
    let curRunStart429 = 0, curRunLen429 = 1;
    for (let i = 1; i < n; i++) {
      const same429 = (records[i].purpose ?? 'unknown') === (records[i - 1].purpose ?? 'unknown');
      if (same429) {
        curRunLen429++;
        if (curRunLen429 > bestRunLen429) { bestRunLen429 = curRunLen429; bestRunStart429 = curRunStart429; }
      } else {
        curRunStart429 = i;
        curRunLen429 = 1;
      }
    }
    if (bestRunLen429 >= 5 && bestRunLen429 < n) {
      const runPurpose429 = records[bestRunStart429].purpose ?? 'unknown';
      issues.push({
        location: `Scenes ${bestRunStart429}–${bestRunStart429 + bestRunLen429 - 1} (purpose: "${runPurpose429}")`,
        rule: 'PURPOSE_MONOTONE_RUN',
        severity: 'minor',
        description: `${bestRunLen429} consecutive scenes (Scenes ${bestRunStart429}–${bestRunStart429 + bestRunLen429 - 1}) all carry the purpose "${runPurpose429}" — a localized structural plateau where the story stops rotating through narrative functions. Even though the script uses other purposes elsewhere, this run serves the same structural job scene after scene with no change of gear, so the audience loses the sense of forward structural motion across the stretch.`,
        suggestedFix: `Break the run by varying scene purpose: between the "${runPurpose429}" scenes, insert a reversal, a character-moment that reframes the stakes, or a setup that plants a later payoff. A run of one structural function reads as the story marking time; rotating purposes keeps each scene advancing the architecture, not just the page count.`,
      });
    }
  }

  // ── Wave 443: REVELATION_CURIOSITY_DECOUPLED, PEAK_SUSPENSE_EMOTIONAL_VACUUM, POSITIVE_SCENE_DROUGHT ──

  // REVELATION_CURIOSITY_DECOUPLED (co-occurrence/decoupling, n≥10, ≥2 revelation scenes, ≥2 curiosity scenes):
  // Every scene carrying a revelation has curiosityDelta ≤ 0 — revelations never co-occur with a
  // curiosity spike. Good structural disclosure ties revelation to mystery: each truth uncovered
  // should simultaneously open a new question (positive curiosityDelta), cycling the audience between
  // knowing and wondering. When revelations and curiosity permanently decouple — disclosures flatten
  // curiosity rather than generating it — the story's information layer and its mystery layer operate
  // as separate channels that never reinforce each other. Revelations feel like closures; the audience
  // leaves each disclosure scene with less to wonder about, not more.
  // Distinctness: ACT_1_CURIOSITY_ABSENT checks a zone for any curiosity spike. REVELATION_DROUGHT
  // checks for long runs without revelation. This is the first CO-OCCURRENCE check in the pass: it
  // asks whether revelation and curiosity ever appear IN THE SAME SCENE — a granular coincidence
  // test orthogonal to all zone-presence and channel-isolation checks.
  if (n >= 10) {
    const revScenes443a = (records as any[]).filter(r => !!r.revelation);
    const curScenes443a = (records as any[]).filter(r => (r.curiosityDelta ?? 0) > 0);
    if (revScenes443a.length >= 2 && curScenes443a.length >= 2) {
      const hasCoOccurrence443a = revScenes443a.some(r => (r.curiosityDelta ?? 0) > 0);
      if (!hasCoOccurrence443a) {
        issues.push({
          location: `${revScenes443a.length} revelation scene(s) — none carries curiosityDelta > 0`,
          rule: 'REVELATION_CURIOSITY_DECOUPLED',
          severity: 'minor',
          description: `The story has ${revScenes443a.length} revelation scene(s) and ${curScenes443a.length} scene(s) with positive curiosityDelta, but they never coincide — no revelation scene raises curiosity. Good structural disclosure cycles the audience between knowing and wondering: each truth uncovered should open a new question. When revelations and curiosity decouple, disclosures feel like closures rather than catalysts; the audience leaves each revelation scene with less to wonder about, not more.`,
          suggestedFix: 'Pair each revelation with a mystery: the truth revealed should simultaneously expose a new unknown. After disclosing who did it, let the audience wonder why. After revealing the secret, show that solving it creates a bigger problem. Revelations that open questions generate forward pull; revelations that only close them feel like dead ends.',
        });
      }
    }
  }

  // PEAK_SUSPENSE_EMOTIONAL_VACUUM (single-peak isolation × valence, n≥8, peakSuspense > 2, ≥2 emotional scenes):
  // The single scene with the highest suspenseDelta in the entire story — the global suspense peak —
  // has emotionalShift = 'neutral' (or no emotionalShift) while ≥2 other scenes carry a non-neutral
  // emotional register. The single tensest moment in the script is emotionally blank: maximum tension
  // without an emotional charge. A story's peak suspense moment should fuse both channels — the tension
  // of stakes and the feeling of what those stakes mean — so the audience is gripped at both levels
  // simultaneously. When the peak is emotionally inert, it generates spectacle without resonance: the
  // audience feels the machinery of danger but not the human cost of it.
  // Distinctness: All existing structure.ts checks that reference the suspense peak use it to locate
  // a zone or anchor a backward-cause check (CLIMAX_UNPREPARED, FALSE_CLIMAX). None audit the
  // emotional valence of the peak scene itself. MIDPOINT_EMOTIONAL_FLATLINE checks the midpoint
  // zone for emotional neutrality. This is the only check that isolates the SINGLE GLOBAL PEAK by
  // suspenseDelta and then audits an orthogonal channel (emotional valence) of that specific scene.
  if (n >= 8) {
    const emotionalScenes443b = (records as any[]).filter(r =>
      r.emotionalShift === 'positive' || r.emotionalShift === 'negative',
    );
    if (emotionalScenes443b.length >= 2) {
      let peakIdx443b = -1;
      let peakSusp443b = -Infinity;
      for (let i = 0; i < n; i++) {
        const s = (records as any[])[i].suspenseDelta ?? 0;
        if (s > peakSusp443b) { peakSusp443b = s; peakIdx443b = i; }
      }
      if (peakSusp443b > 2 && peakIdx443b >= 0) {
        const peakRec443b = (records as any[])[peakIdx443b];
        const peakEmotion443b = peakRec443b.emotionalShift ?? 'neutral';
        if (peakEmotion443b !== 'positive' && peakEmotion443b !== 'negative') {
          issues.push({
            location: `Scene ${peakIdx443b} (peak suspense ${peakSusp443b.toFixed(1)}, emotionalShift: ${peakEmotion443b})`,
            rule: 'PEAK_SUSPENSE_EMOTIONAL_VACUUM',
            severity: 'minor',
            description: `The single highest-suspense scene in the story (Scene ${peakIdx443b}, suspenseDelta ${peakSusp443b.toFixed(1)}) carries no emotional charge — emotionalShift is "${peakEmotion443b}" — even though ${emotionalScenes443b.length} other scenes use a non-neutral emotional register. The tensest moment in the script is emotionally blank: the audience feels the machinery of danger but not the human cost of it. A story's suspense peak should fuse both channels simultaneously — the weight of stakes and the feeling of what those stakes mean — so tension and emotion amplify each other rather than operating on separate tracks.`,
            suggestedFix: 'Give the peak suspense scene an emotional charge: what does this moment cost the protagonist personally? What relationship hangs in the balance? What hope or fear is crystallised here? The highest-tension scene is the moment when the audience most needs to feel something — align the emotional register with the dramatic register so the peak lands on both levels at once.',
          });
        }
      }
    }
  }

  // POSITIVE_SCENE_DROUGHT (valence × underweight, n≥10, negativeCount≥3, positiveRatio<0.15):
  // Fewer than 15% of scenes carry emotionalShift = 'positive' while ≥3 scenes carry 'negative'.
  // The story is heavily negatively valenced — darkness vastly outweighs uplift, with near-zero
  // emotional counterweight. While dramatic tension requires conflict and darkness, a story with
  // almost no positive emotional scenes becomes tonally relentless and narratively exhausting: the
  // audience has nowhere to breathe, no small victories to latch onto, no warmth to make the
  // darkness meaningful by contrast. Positive emotional moments — not saccharine relief, but genuine
  // moments of connection, agency, or earned uplift — create the contrast that makes the dark scenes
  // feel like a cost rather than just a baseline.
  // Distinctness: ACT_1_WARMTH_ABSENT checks only the first 25% zone. EMOTIONAL_ARC_UNIFORM fires
  // when one register exceeds 70% of all scenes (dominance threshold). ACT_3_EMOTIONAL_FLATLINE
  // checks the finale for neutral (not negative). This is the only check auditing the global
  // RATIO of positive scenes — the positive register can be chronically absent even when
  // no single zone or proportion threshold trips any existing check.
  if (n >= 10) {
    const positiveCount443c = (records as any[]).filter(r => r.emotionalShift === 'positive').length;
    const negativeCount443c = (records as any[]).filter(r => r.emotionalShift === 'negative').length;
    if (negativeCount443c >= 3 && positiveCount443c / n < 0.15) {
      issues.push({
        location: `Emotional valence — ${positiveCount443c} positive scene(s) vs ${negativeCount443c} negative (${(positiveCount443c / n * 100).toFixed(0)}% positive of ${n} total)`,
        rule: 'POSITIVE_SCENE_DROUGHT',
        severity: 'minor',
        description: `Only ${positiveCount443c} of ${n} scenes (${(positiveCount443c / n * 100).toFixed(0)}%) carry positive emotionalShift, while ${negativeCount443c} carry negative. The story's emotional register is heavily skewed toward darkness with almost no uplifting counterweight. Positive emotional moments — earned connections, small victories, moments of agency — create the contrast that makes darkness feel like a cost rather than a baseline. Without them, the story risks becoming tonally relentless: the audience has nowhere to breathe and nothing to lose that they have first been given.`,
        suggestedFix: 'Introduce positive emotional scenes as deliberate structural anchors, not as softening: a moment of genuine connection before a separation, a small victory before a reversal, a hopeful choice before a betrayal. These create the emotional debt that makes the dark scenes land. The ratio need not balance — but some positive register is needed for contrast to function.',
      });
    }
  }

  // ── Wave 457: REVELATION_SUSPENSE_DECOUPLED, NEGATIVE_SCENE_DROUGHT, DRAMATIC_TURN_CAUSELESS ──

  // REVELATION_SUSPENSE_DECOUPLED — Co-occurrence/decoupling × suspense channel × revelation
  // (n≥8, ≥2 revelation scenes, every revelation has suspenseDelta ≤ 0). Every revelation scene
  // arrives in a moment of zero or falling tension — disclosures never land under pressure. Revelations
  // are most powerful when the audience is already alert: truth that surfaces during a chase, a
  // confrontation, or under a deadline registers differently from truth surfacing in calm. When every
  // disclosure arrives in a tension-free scene, the story systematically separates its informational
  // machinery from its dramatic pressure — the two engines that most powerfully reinforce each other
  // are kept apart. Co-occurrence mode × suspense channel × revelation.
  // Distinct from REVELATION_CURIOSITY_DECOUPLED (Wave 443: curiosity channel — revelations don't
  // spike questions; this checks suspense channel — revelations don't land under tension), REVELATION_
  // DROUGHT (Wave 152: revelations absent from long sequences — count/distribution, not co-occurrence),
  // and all zone-based revelation checks (zone × revelation, not co-occurrence × channel).
  if (n >= 8) {
    const revScenes457a = (records as any[]).filter(r => (r.revelation ?? null) === true);
    if (revScenes457a.length >= 2) {
      const allRevSuspFlat457a = revScenes457a.every(r => (r.suspenseDelta ?? 0) <= 0);
      if (allRevSuspFlat457a) {
        issues.push({
          location: `All ${revScenes457a.length} revelation scene(s) — suspense decoupled`,
          rule: 'REVELATION_SUSPENSE_DECOUPLED',
          severity: 'minor',
          description: `All ${revScenes457a.length} revelation scenes arrive when suspenseDelta ≤ 0 — disclosures never land under dramatic tension. Revelations are most powerful when the audience is already primed: truth surfacing during confrontation, in the middle of a chase, or under a ticking deadline hits harder than truth arriving in a calm scene because the heightened alertness of a suspense beat amplifies the disclosure's weight. When every revelation is suspense-flat, the story keeps its informational machinery and its dramatic pressure systematically separate — the two most powerful engines for generating audience engagement never reinforce each other within a single beat.`,
          suggestedFix: `Move at least one revelation into a scene with rising tension (suspenseDelta > 0): let a truth surface during a confrontation, have a character make a disclosure under deadline pressure, or embed an answer inside a scene where stakes are already elevated. A revelation that arrives when the audience is already leaning forward from suspense hits at both the intellectual and visceral level simultaneously.`,
        });
      }
    }
  }

  // NEGATIVE_SCENE_DROUGHT — Valence × underweight × negative register (n≥10, ≥3 positive scenes,
  // negativeRatio < 0.15). Fewer than 15% of scenes carry emotionalShift = 'negative' while at least
  // 3 scenes carry 'positive'. The story is relentlessly upbeat with almost no darkness for contrast.
  // While positive emotional moments create relief and connection, they require negative moments to
  // give them meaning: a victory only feels earned after a cost, a reconciliation only feels warm after
  // a rupture, hope only registers against a background of despair. Without negative emotional scenes,
  // the story has no shadow — nothing makes the brightness bright. Valence mode × negative underweight.
  // Distinct from POSITIVE_SCENE_DROUGHT (Wave 443: positive register underrepresented while negatives
  // dominate — this is the mirror, negative underrepresented while positives dominate), EMOTIONAL_ARC_
  // UNIFORM (Wave 278: any single register dominates at >70% — this fires at <15% negative with ≥3
  // positives, a different threshold and direction), ACT_1_WARMTH_ABSENT (Wave 331: zone-scoped, first
  // 25%; this is a global structural ratio check).
  if (n >= 10) {
    const positiveCount457b = (records as any[]).filter(r => (r as any).emotionalShift === 'positive').length;
    const negativeCount457b = (records as any[]).filter(r => (r as any).emotionalShift === 'negative').length;
    if (positiveCount457b >= 3 && negativeCount457b / n < 0.15) {
      issues.push({
        location: `Emotional valence — ${negativeCount457b} negative scene(s) vs ${positiveCount457b} positive (${(negativeCount457b / n * 100).toFixed(0)}% negative of ${n} total)`,
        rule: 'NEGATIVE_SCENE_DROUGHT',
        severity: 'minor',
        description: `Only ${negativeCount457b} of ${n} scenes (${(negativeCount457b / n * 100).toFixed(0)}%) carry negative emotionalShift, while ${positiveCount457b} scenes carry positive. The story's emotional register is heavily skewed toward the positive with almost no darkness for contrast. Negative emotional moments — cost, grief, loss, disillusionment — give positive moments their meaning: a victory is only felt as a victory against a background of risk, connection only registers against separation, hope only lands against despair. Without negative emotional scenes, the positive scenes have nothing to contrast with and the story risks feeling tonally safe, frictionless, and emotionally unearned.`,
        suggestedFix: `Introduce negative emotional scenes as deliberate structural anchors: a setback before a triumph, a loss that makes a later recovery feel earned, a moment of grief that gives subsequent warmth its weight. The ratio need not balance — but some darkness is needed for the positive register to carry meaning. Without shadow, there is no light.`,
      });
    }
  }

  // DRAMATIC_TURN_CAUSELESS — Backward-cause × dramatic turn (n≥8, ≥2 turn scenes, all turns
  // lack upstream cause in prior 3 scenes). Every scene with dramaticTurn ≠ 'nothing' is preceded
  // in the 3 scenes before it by no revelation, no high suspense (>1), and no clock raise. Pivots
  // erupt without structural build-up: the story reverses direction without the pressure, information,
  // or deadline that earns a turn. Dramatic turns should be the visible consequence of rising tension
  // or new information — when they arrive causeless, they feel arbitrary, like the plot changing
  // direction for authorial convenience rather than narrative necessity.
  // Distinct from CLIMAX_UNPREPARED (Wave 429: backward-cause × CLIMAX SCENE SPECIFICALLY — the
  // peak-suspense scene in the final 30%; this checks ALL dramatic turns across the full script, not
  // just the climax), REVELATION_CURIOSITY_DECOUPLED (Wave 443: co-occurrence within the same scene),
  // and all zone-based turn-void checks (zone × turn absent — those check where turns DO NOT exist;
  // this checks why the turns that DO exist appear without upstream motivation).
  if (n >= 8) {
    const turnScenes457c = (records as any[]).filter(r => (r.dramaticTurn ?? 'nothing') !== 'nothing');
    if (turnScenes457c.length >= 2) {
      const hasPriorCause457c = (idx: number): boolean => {
        for (let off = 1; off <= 3; off++) {
          if (idx - off < 0) continue;
          const prev = (records as any[])[idx - off];
          if ((prev?.revelation ?? null) === true) return true;
          if ((prev?.suspenseDelta ?? 0) > 1) return true;
          if ((prev?.clockRaised ?? false) === true) return true;
        }
        return false;
      };
      const allTurnsCauseless457c = turnScenes457c.every((r: any) => {
        const idx = (records as any[]).indexOf(r);
        return !hasPriorCause457c(idx);
      });
      if (allTurnsCauseless457c) {
        issues.push({
          location: `All ${turnScenes457c.length} dramatic turn scene(s) — causeless`,
          rule: 'DRAMATIC_TURN_CAUSELESS',
          severity: 'minor',
          description: `All ${turnScenes457c.length} scenes with dramatic turns (dramaticTurn ≠ 'nothing') are preceded in the prior three scenes by no revelation, no high-suspense moment (suspenseDelta > 1), and no clock raise — the story's pivots erupt without structural build-up. Dramatic turns are the moments when the story changes direction: they work when they feel inevitable-in-retrospect, as if everything leading to that point made this reversal necessary. When every turn arrives without a preceding escalation — no truth surfacing, no pressure building, no deadline closing in — the pivot feels arbitrary and the story changes direction for structural convenience rather than narrative necessity.`,
          suggestedFix: `Before at least one dramatic turn, build structural runway in the prior two or three scenes: let a revelation surface that makes the reversal feel like its consequence, raise suspense so the turn arrives as release rather than interruption, or introduce a clock that makes the pivot feel necessary. A dramatic turn that follows from something the audience has been shown to be building feels earned; one that arrives from narrative dead air feels like a plot reset.`,
        });
      }
    }
  }

  // ── Wave 471: CURIOSITY_PEAK_EMOTIONAL_VOID, POSITIVE_SCENE_RUN, REVELATION_TURN_DECOUPLED ──

  // CURIOSITY_PEAK_EMOTIONAL_VOID — Single-peak isolation × curiosity channel × emotional valence
  // (n≥8, maxCuriosityDelta > 0, peak scene emotionalShift = 'neutral', ≥2 non-neutral scenes).
  // The scene that most intensely raises new questions (highest curiosityDelta) arrives emotionally
  // blank. Curiosity and emotion are the two primary engagement engines: intellectual (what happens
  // next?) and affective (do I care?). When the peak question-raising moment is emotionally neutral,
  // the question is generated in a tone vacuum — the audience wonders without urgency, because no
  // emotional stake makes answering the question feel vital. Questions raised in the middle of grief,
  // hope, or fear register as more urgent than questions raised in a calm neutral scene.
  // Distinct from PEAK_SUSPENSE_EMOTIONAL_VACUUM (Wave 443: single-peak isolation × SUSPENSE channel;
  // this is CURIOSITY channel — orthogonal peak-isolation × valence check on a different axis), all
  // zone-based curiosity checks (those examine zone averages, not single-peak isolation × valence).
  if (n >= 8) {
    const maxCurDelta471a = Math.max(...(records as any[]).map((r: any) => r.curiosityDelta ?? 0));
    if (maxCurDelta471a > 0) {
      const peakCurScene471a = (records as any[]).find((r: any) => (r.curiosityDelta ?? 0) === maxCurDelta471a);
      const nonNeutralCount471a = (records as any[]).filter((r: any) => r.emotionalShift !== 'neutral').length;
      if (peakCurScene471a !== undefined && peakCurScene471a.emotionalShift === 'neutral' && nonNeutralCount471a >= 2) {
        issues.push({
          location: `Scene ${peakCurScene471a.sceneIdx ?? '?'} — peak curiosity scene (curiosityDelta ${maxCurDelta471a}) is emotionally neutral`,
          rule: 'CURIOSITY_PEAK_EMOTIONAL_VOID',
          severity: 'minor',
          description: `The scene with the highest curiosityDelta (${maxCurDelta471a}) has emotionalShift = 'neutral' while ${nonNeutralCount471a} other scene(s) carry emotional charge. The script's strongest intellectual hook — the moment that most intensely raises new questions — arrives in an emotionally inert scene. Curiosity without emotional stake is cold: the audience will wonder, but without a concurrent feeling of risk, loss, or hope they lack urgency about finding out. Questions raised during a moment of grief, fear, or joy are felt as more pressing because the emotional investment makes the answer matter, not merely interest.`,
          suggestedFix: `Give scene ${peakCurScene471a.sceneIdx ?? '?'} an emotional charge — shift its emotionalShift to 'positive' or 'negative' so the peak question arrives when the audience already has something at stake. Alternatively, move the question-raising moment to an existing emotionally charged scene so the intellectual and affective engines reinforce each other in the same beat.`,
        });
      }
    }
  }

  // POSITIVE_SCENE_RUN — Run-based × positive emotional valence (n≥8, longest consecutive run
  // of emotionalShift='positive' scenes ≥ 5). Five or more consecutive positive-emotional scenes
  // create an uninterrupted tonal plateau: no shadow, no cost, no friction for an extended stretch.
  // Good news keeps arriving without interruption, which paradoxically numbs the audience to each
  // individual victory — the register flattens through repetition, and no scene feels meaningfully
  // positive because all scenes are. Even a comedy needs occasional setbacks to earn its moments of
  // relief; prolonged positivity without contrast is tonally monotonous.
  // Distinct from NEGATIVE_SCENE_DROUGHT (Wave 457: global ratio <15% negative while ≥3 positive —
  // a proportion check; this fires on a LOCAL consecutive run of positives that can fire even when
  // negatives are globally well-represented if they avoid this specific run), EMOTIONAL_ARC_UNIFORM
  // (Wave 278: any single register dominates at >70% globally — global proportion, not run-based),
  // PURPOSE_MONOTONE_RUN (Wave 429: run-based × purpose field; this is run-based × emotional valence,
  // an orthogonal field).
  if (n >= 8) {
    let maxPosRun471b = 0, curPosRun471b = 0;
    for (const r of (records as any[])) {
      if (r.emotionalShift === 'positive') {
        curPosRun471b++;
        if (curPosRun471b > maxPosRun471b) maxPosRun471b = curPosRun471b;
      } else {
        curPosRun471b = 0;
      }
    }
    if (maxPosRun471b >= 5) {
      issues.push({
        location: `Consecutive positive scenes — run of ${maxPosRun471b}`,
        rule: 'POSITIVE_SCENE_RUN',
        severity: 'minor',
        description: `${maxPosRun471b} consecutive scenes all carry emotionalShift = 'positive' — an uninterrupted tonal plateau with no shadow, cost, or friction. A run of positive scenes without contrast numbs the audience: when good news keeps arriving without interruption, no individual victory feels like good news anymore because the positive register has become ambient. Dramatic impact requires contrast — the relief only lands if there was something to be relieved from.`,
        suggestedFix: `Break the run of ${maxPosRun471b} positive scenes with a scene of cost, setback, ambiguity, or loss before it completes. A single negative or neutral scene inside a positive run restores contrast and makes every positive moment around it feel more earned and distinct. Even the most optimistic stories need shadow to give the light its meaning.`,
      });
    }
  }

  // REVELATION_TURN_DECOUPLED — Co-occurrence/decoupling × revelation × dramaticTurn (n≥10,
  // ≥2 revelation scenes, ≥2 turn scenes, no scene carries both). The story's truth-surfacing
  // and direction-changing machinery always operate in separate beats: revelations arrive in
  // non-pivot scenes, and pivots arrive without a coincident disclosure. The most powerful
  // structural single-scene combination is the revelation-that-reverses — a truth surfaces and
  // immediately changes everything — and its complete absence means the story never achieves
  // this double-impact moment. Disclosures close chapters; turns open new ones; when they never
  // coincide, each scene does only one job where a well-structured script would do both.
  // Distinct from REVELATION_CURIOSITY_DECOUPLED (Wave 443: revelation × curiosityDelta same-scene
  // co-occurrence — different field), REVELATION_SUSPENSE_DECOUPLED (Wave 457: revelation ×
  // suspenseDelta co-occurrence), DRAMATIC_TURN_CAUSELESS (Wave 457: backward-cause — checks
  // prior-scene buildup for turns; this checks SAME-SCENE co-occurrence, not antecedent causality).
  if (n >= 10) {
    const revScenes471c = (records as any[]).filter(r => !!r.revelation);
    const turnScenes471c = (records as any[]).filter(r => (r.dramaticTurn ?? 'nothing') !== 'nothing');
    if (revScenes471c.length >= 2 && turnScenes471c.length >= 2) {
      const anyCoOccur471c = (records as any[]).some(
        r => !!r.revelation && (r.dramaticTurn ?? 'nothing') !== 'nothing',
      );
      if (!anyCoOccur471c) {
        issues.push({
          location: `${revScenes471c.length} revelation scene(s) and ${turnScenes471c.length} dramatic-turn scene(s) — never co-occurring`,
          rule: 'REVELATION_TURN_DECOUPLED',
          severity: 'minor',
          description: `The script has ${revScenes471c.length} revelation scene(s) and ${turnScenes471c.length} dramatic-turn scene(s), but no scene carries both — revelations always arrive in non-pivot moments, and pivots always arrive without a coincident disclosure. The most powerful structural single-scene move is the revelation-that-reverses: truth surfaces, and in the same beat the story's direction changes because of what has been learned. This double-impact moment is structurally absent; the script's truth-surfacing and direction-changing machinery are always operating in isolation, and no scene achieves the compressive force that comes from combining both.`,
          suggestedFix: `Arrange at least one scene that carries both a revelation and a dramatic turn: let the disclosed truth be the thing that pivots the story in a new direction within the same scene. The character learns something — and as a direct consequence in that scene — everything about the story's direction changes. This single-scene combination is the most efficient structural unit in dramatic writing, and the script currently has all the ingredients but keeps them apart.`,
        });
      }
    }
  }

  // ── Wave 485: NEGATIVE_SCENE_RUN, REVELATION_CLOCK_DECOUPLED, CLIMAX_AFTERMATH_FLAT ──

  // NEGATIVE_SCENE_RUN (run-based × negative emotional valence, n≥8, longest consecutive run
  // of emotionalShift='negative' ≥ 5): Five or more consecutive scenes carry negative emotional
  // charge without interruption — a sustained descent into darkness without any contrast, cost-
  // and-recovery beat, or moment of relief. Where POSITIVE_SCENE_RUN (Wave 471) flags prolonged
  // tonal warmth, this flags prolonged tonal darkness. Uninterrupted darkness numbs as surely as
  // uninterrupted light: after four or five consecutive negative scenes, each new setback stops
  // registering as a specific loss and starts feeling like the story's permanent condition. The
  // audience has no emotional reference point from which to feel the depth of any particular
  // negative beat. Even the darkest tragedies need contrast — a moment of memory, warmth, or
  // even dark comedy — to make the audience feel each individual blow rather than process them
  // collectively as wallpaper. Run-based mode × negative emotional valence. Distinct from
  // POSITIVE_SCENE_RUN (Wave 471: positive valence — same mode, opposite pole),
  // EMOTIONAL_ARC_UNIFORM (Wave 278: >70% globally in one register — global proportion, not run),
  // POSITIVE_SCENE_DROUGHT (Wave 443: global ratio check, not consecutive run).
  if (n >= 8) {
    let maxNegRun485a = 0, curNegRun485a = 0;
    for (const r of (records as any[])) {
      if (r.emotionalShift === 'negative') {
        curNegRun485a++;
        if (curNegRun485a > maxNegRun485a) maxNegRun485a = curNegRun485a;
      } else {
        curNegRun485a = 0;
      }
    }
    if (maxNegRun485a >= 5) {
      issues.push({
        location: `Consecutive negative scenes — run of ${maxNegRun485a}`,
        rule: 'NEGATIVE_SCENE_RUN',
        severity: 'minor',
        description: `${maxNegRun485a} consecutive scenes all carry emotionalShift = 'negative' — an uninterrupted tonal descent without any contrast, recovery beat, or relief. Sustained darkness numbs as surely as sustained warmth: after four or five consecutive negative scenes, each new setback stops registering as a specific loss and starts feeling like the permanent condition of the story's world. The audience has no emotional reference point from which to feel the depth of any particular blow — without contrast, the darkness becomes ambient and individual losses merge into a single monotonous register.`,
        suggestedFix: `Break the run of ${maxNegRun485a} negative scenes with a scene of neutral or positive register before it completes — not a false reprieve, but a breath: a moment of dark humour, a memory of warmth, a brief alliance between characters, a tactical success that costs something. The single scene of contrast makes every negative scene around it register more specifically and more deeply than a fifth consecutive low point in a row.`,
      });
    }
  }

  // REVELATION_CLOCK_DECOUPLED (co-occurrence/decoupling × revelation × clock channel, n≥10,
  // ≥2 revelation scenes, ≥2 clock scenes, no scene carries both): The story has revelations and
  // clock events but no scene delivers a disclosure under deadline pressure — truth is always
  // surfaced in calm moments while urgency operates in a separate informational world. A revelation
  // that arrives under a ticking clock is doubly charged: the audience must process new information
  // while time is running out, and the deadline makes the disclosure more consequential because the
  // window to act on it is closing. When the two engines never coincide, revelations land without
  // urgency and clock events land without the cognitive load of new information — each is half as
  // intense as it could be. Co-occurrence/decoupling mode × revelation × clock. Distinct from
  // REVELATION_CURIOSITY_DECOUPLED (Wave 443: curiosity channel), REVELATION_SUSPENSE_DECOUPLED
  // (Wave 457: suspense), REVELATION_TURN_DECOUPLED (Wave 471: dramatic turn): this completes the
  // revelation co-occurrence family with the clock channel.
  if (n >= 10) {
    const revScenes485b = (records as any[]).filter(r => !!r.revelation);
    const clockScenes485b = (records as any[]).filter(r =>
      r.clockRaised === true || (r.clockDelta ?? 0) > 0,
    );
    if (revScenes485b.length >= 2 && clockScenes485b.length >= 2) {
      const anyCoOccur485b = (records as any[]).some(
        r => !!r.revelation && (r.clockRaised === true || (r.clockDelta ?? 0) > 0),
      );
      if (!anyCoOccur485b) {
        issues.push({
          location: `${revScenes485b.length} revelation scene(s) and ${clockScenes485b.length} clock scene(s) — never co-occurring`,
          rule: 'REVELATION_CLOCK_DECOUPLED',
          severity: 'minor',
          description: `The script has ${revScenes485b.length} revelation scene(s) and ${clockScenes485b.length} clock scene(s), but no scene delivers a disclosure under deadline pressure — truth is always surfaced in calm moments while urgency operates in a separate informational world. A revelation that arrives under a ticking clock is doubly charged: the audience must process new information while time is running out, and the deadline makes the disclosure more consequential because the window to act on it is closing. When revelation and clock never coincide, each engine runs at half its potential intensity.`,
          suggestedFix: 'Arrange at least one scene that delivers both a revelation and a clock event simultaneously: the truth surfaces as the deadline tightens, or the disclosure itself starts a countdown. "She tells him the truth — and they have thirty seconds before the door locks" is a single scene that does double work: the information matters more because time is running out, and the deadline matters more because it determines what can be done with the revealed information.',
        });
      }
    }
  }

  // CLIMAX_AFTERMATH_FLAT (sequence/aftermath × climax trigger, n≥8, climax scene in final 30%,
  // room for 2 scenes after): The story's highest-suspense scene in the final 30% is followed by
  // two scenes that carry neither an emotional shift nor a relationship shift — the climax produces
  // no human ripple. A climactic moment should detonate consequences: characters should feel what
  // just happened, bonds should shift under the weight of the resolution. When the 2 scenes after
  // the highest-tension beat are both emotionally neutral and relationally static, the climax has
  // been delivered but not processed — the audience experiences the peak and then watches the story
  // return to baseline without any human acknowledgement of what just occurred. Sequence/aftermath
  // mode × climax trigger. Distinct from CLIMAX_UNPREPARED (Wave 429: backward-cause — what comes
  // BEFORE the climax; this checks what comes AFTER), INCITING_AFTERMATH_STALL (Wave 429: inciting
  // incident trigger, not climax), FINAL_IMAGE_WEAK (Wave 306: the last scene's charge — not
  // the aftermath window of the climax specifically): first aftermath check triggered by climax.
  if (n >= 8) {
    const climaxStart485c = Math.floor(n * 0.70);
    let climaxPos485c = -1;
    let climaxSusp485c = -Infinity;
    for (let i = climaxStart485c; i < n; i++) {
      const sd = (records as any[])[i].suspenseDelta ?? 0;
      if (sd > climaxSusp485c) {
        climaxSusp485c = sd;
        climaxPos485c = i;
      }
    }
    if (climaxPos485c >= 0 && climaxSusp485c > 0 && climaxPos485c + 2 < n) {
      const next1485c = (records as any[])[climaxPos485c + 1];
      const next2485c = (records as any[])[climaxPos485c + 2];
      const hasEmoAftermath485c = (next1485c?.emotionalShift ?? 'neutral') !== 'neutral' ||
        (next2485c?.emotionalShift ?? 'neutral') !== 'neutral';
      const hasRelAftermath485c = ((next1485c?.relationshipShifts ?? []) as any[]).length > 0 ||
        ((next2485c?.relationshipShifts ?? []) as any[]).length > 0;
      if (!hasEmoAftermath485c && !hasRelAftermath485c) {
        issues.push({
          location: `Scene ${climaxPos485c} — highest-suspense finale scene followed by 2 flat aftermath scenes`,
          rule: 'CLIMAX_AFTERMATH_FLAT',
          severity: 'minor',
          description: `The story's climactic peak (Scene ${climaxPos485c}, suspenseDelta: ${climaxSusp485c}) is followed by two scenes that carry neither an emotional shift nor a relationship shift — the climax produces no human ripple. A climactic moment should detonate consequences: characters should feel what just happened, bonds should shift under the weight of what was resolved. When the two scenes after the highest-tension finale beat are emotionally neutral and relationally static, the climax has been delivered but not processed — the story reaches its peak and then returns to baseline without any character acknowledging what just occurred.`,
          suggestedFix: `Let Scenes ${climaxPos485c + 1}–${climaxPos485c + 2} carry at least one emotional or relational consequence of what happened at the climax: a character registers relief, grief, or resolution; a bond shifts in the wake of what was just decided or revealed. The aftermath of a climax is where the audience learns what the story meant to the people who lived it — the scenes immediately after the peak are structurally as important as the peak itself.`,
        });
      }
    }
  }

  // ── Wave 499: CLOCK_CURIOSITY_DECOUPLED, REVELATION_AFTERMATH_CLOCK_VOID, SUSPENSE_RUN ──

  // CLOCK_CURIOSITY_DECOUPLED (co-occurrence/decoupling × clock × curiosity, n≥10, ≥2 clock
  // scenes [clockRaised or clockDelta > 0], ≥2 curiosity-spike scenes [curiosityDelta > 0], no
  // scene carries both): The story has deadline moments and wonder-generating moments, but never
  // in the same scene — urgency and curiosity never coincide. A scene that simultaneously raises
  // a clock and spikes curiosity is doubly productive: the audience feels time running out AND
  // wonders what will happen next, creating compound tension greater than either channel alone.
  // When the two engines always operate in separate scenes, clocks generate urgency without
  // wonder and curiosity moments generate wonder without urgency — both run at half their
  // potential intensity. Co-occurrence/decoupling mode × clock × curiosity. Distinct from
  // REVELATION_CLOCK_DECOUPLED (Wave 485: revelation × clock; same mode, different channel pair
  // — this uses curiosity instead of revelation as the co-occurrence target), REVELATION_CURIOSITY_
  // DECOUPLED (Wave 443: revelation × curiosity; same mode, different trigger — this uses clock
  // not revelation), ACT_2B_CURIOSITY_VOID (zone-scoped presence/absence, not co-occurrence),
  // DRAMATIC_TURN_CAUSELESS (backward-cause, not co-occurrence). First co-occurrence check with
  // clock as one channel and curiosity as the other.
  if (n >= 10) {
    const clockScenes499a = (records as any[]).filter(r =>
      r.clockRaised === true || (r.clockDelta ?? 0) > 0,
    );
    const curiosityScenes499a = (records as any[]).filter(r => (r.curiosityDelta ?? 0) > 0);
    if (clockScenes499a.length >= 2 && curiosityScenes499a.length >= 2) {
      const anyCoOccur499a = (records as any[]).some(
        r => (r.clockRaised === true || (r.clockDelta ?? 0) > 0) && (r.curiosityDelta ?? 0) > 0,
      );
      if (!anyCoOccur499a) {
        issues.push({
          location: `${clockScenes499a.length} clock scene(s) and ${curiosityScenes499a.length} curiosity-spike scene(s) — never co-occurring`,
          rule: 'CLOCK_CURIOSITY_DECOUPLED',
          severity: 'minor',
          description: `The script has ${clockScenes499a.length} clock scene(s) (clockRaised or clockDelta > 0) and ${curiosityScenes499a.length} curiosity-spike scene(s) (curiosityDelta > 0), but no scene simultaneously delivers deadline pressure and a curiosity spike — urgency and wonder operate in permanently separate moments. A scene that raises a clock while also generating audience questions is doubly productive: time runs out AND the audience wonders what will happen next, creating compound tension more intense than either channel alone. When the two engines are always decoupled, clocks generate urgency without wonder and curiosity scenes generate wonder without urgency — both run at half their potential intensity.`,
          suggestedFix: 'Arrange at least one scene that both raises or extends the clock and spikes curiosity simultaneously: the countdown starts just as a new question is opened, or the deadline itself raises the question of whether something can be accomplished in time. A clock event tied to an unanswered question forces the audience to hold both pressure and wonder at once — which is more uncomfortable and more gripping than either alone.',
        });
      }
    }
  }

  // REVELATION_AFTERMATH_CLOCK_VOID (sequence/aftermath × revelation trigger × clock aftermath,
  // n≥8, ≥3 qualifying revelation scenes [pos < n-2], ≥2 clock scenes globally, no qualifying
  // revelation scene followed by clockRaised or clockDelta > 0 in the next 2 scenes): Every
  // disclosure lands and the urgency machinery stays quiet for the next two scenes — revelations
  // never trigger a countdown. In a well-constructed story a revelation often starts a clock: once
  // characters know the truth, the window to act on it should close. When no disclosure ever sets
  // a clock ticking in the two scenes immediately following it, the story treats information as
  // inert — something to be absorbed rather than acted upon against a deadline. Sequence/aftermath
  // mode × revelation trigger × clock aftermath. Distinct from REVELATION_CLOCK_DECOUPLED (Wave
  // 485: co-occurrence — checks whether revelation and clock appear on the SAME scene; this checks
  // whether clock appears in the 2 scenes AFTER a revelation), INCITING_AFTERMATH_STALL (Wave 429:
  // single inciting incident trigger, checks suspense/curiosity aftermath — different trigger type,
  // different aftermath channel), CLIMAX_AFTERMATH_FLAT (Wave 485: climax trigger, checks
  // emotional/relational aftermath — different trigger and different aftermath channel). First
  // aftermath check using the clock channel as the aftermath signal.
  if (n >= 8) {
    const qualRevScenes499b = (records as any[]).filter((r, pos) => !!r.revelation && pos < n - 2);
    const clockScenes499b = (records as any[]).filter(r =>
      r.clockRaised === true || (r.clockDelta ?? 0) > 0,
    );
    if (qualRevScenes499b.length >= 3 && clockScenes499b.length >= 2) {
      const anyRevFollowedByClock499b = qualRevScenes499b.some(r => {
        const pos = (records as any[]).indexOf(r);
        const next1 = (records as any[])[pos + 1];
        const next2 = (records as any[])[pos + 2];
        return (next1?.clockRaised === true || (next1?.clockDelta ?? 0) > 0) ||
               (next2?.clockRaised === true || (next2?.clockDelta ?? 0) > 0);
      });
      if (!anyRevFollowedByClock499b) {
        issues.push({
          location: `${qualRevScenes499b.length} revelation scene(s) — none followed by a clock raise in the next 2 scenes`,
          rule: 'REVELATION_AFTERMATH_CLOCK_VOID',
          severity: 'minor',
          description: `The script has ${qualRevScenes499b.length} revelation scene(s), but in none of them does a clock event appear in the next two scenes — disclosures never trigger urgency. In a well-constructed story, a revelation often starts a countdown: once characters know the truth, the window to act on it matters and should close. When no disclosure ever sets a clock ticking in the scenes immediately following it, the story treats information as inert — something to be absorbed without consequence for available time. The revelation scenes land without urgency, and the clock scenes operate without being prompted by new information.`,
          suggestedFix: 'After at least one disclosure, introduce a clock raise in the next one or two scenes: the revelation creates a deadline (the character now knows the bomb is real and has thirty minutes), or the disclosure accelerates an existing countdown (learning the truth reveals they have less time than they thought). The revelation that starts a clock transforms information into pressure and makes the disclosure structurally load-bearing rather than merely informational.',
        });
      }
    }
  }

  // SUSPENSE_RUN (run-based × suspense channel, n≥8, ≥4 scenes with suspenseDelta > 0, longest
  // consecutive run of suspenseDelta > 0 ≥ 5): Five or more consecutive scenes all spike suspense
  // without a single release, relief, or recalibration. Sustained high suspense produces a
  // paradoxical effect: instead of each scene feeling more tense than the last, prolonged
  // elevation becomes the ambient baseline and individual spikes lose impact. An audience
  // experiencing five or more consecutive suspenseful scenes stops registering each beat as a
  // specific escalation and begins processing the tension as the story's permanent condition.
  // Tension requires contrast to register — a single scene of release between spikes makes the
  // surrounding tension land with more specific force. Run-based mode × suspense channel.
  // Distinct from POSITIVE_SCENE_RUN (Wave 471: emotional positive valence, not suspense),
  // NEGATIVE_SCENE_RUN (Wave 485: emotional negative valence, not suspense), PURPOSE_MONOTONE_RUN
  // (Wave 429: purpose channel, not suspense), OPENING_SUSPENSE_FLATLINE (Wave 292: checks ABSENCE
  // of suspense in the opening 3 scenes, not a run of presence), ACT_2A_SUSPENSE_VOID (Wave 278:
  // zone-scoped absence, not run). First run-based check on the suspense channel.
  if (n >= 8) {
    const totalSuspenseScenes499c = (records as any[]).filter(r => (r.suspenseDelta ?? 0) > 0).length;
    if (totalSuspenseScenes499c >= 4) {
      let maxSuspRun499c = 0, curSuspRun499c = 0;
      for (const r of (records as any[])) {
        if ((r.suspenseDelta ?? 0) > 0) {
          curSuspRun499c++;
          if (curSuspRun499c > maxSuspRun499c) maxSuspRun499c = curSuspRun499c;
        } else {
          curSuspRun499c = 0;
        }
      }
      if (maxSuspRun499c >= 5) {
        issues.push({
          location: `Consecutive suspense scenes — run of ${maxSuspRun499c}`,
          rule: 'SUSPENSE_RUN',
          severity: 'minor',
          description: `${maxSuspRun499c} consecutive scenes all carry suspenseDelta > 0 — an unbroken run of escalating tension without any release, relief, or recalibration. Sustained high suspense produces a paradoxical effect: instead of each scene feeling more tense than the last, prolonged elevation becomes the ambient baseline and individual spikes lose impact. An audience experiencing five or more consecutive suspenseful scenes stops registering each beat as a specific escalation and begins processing the tension as the story's permanent condition. Tension requires contrast to register — a single scene of release or recalibration between suspense spikes makes the surrounding tension land with more specific force.`,
          suggestedFix: `Break the run of ${maxSuspRun499c} suspenseful scenes with at least one scene where suspenseDelta ≤ 0 — not a false resolution, but a breath: a scene that lets the audience recalibrate before the next spike. The interlude doesn't need to be warm or peaceful; it just needs to release the mechanical tension so that the next escalation registers as a specific event rather than a continuation of ambient pressure.`,
        });
      }
    }
  }

  // ── Wave 513: CLOCK_TURN_DECOUPLED, CURIOSITY_RUN, TURN_AFTERMATH_SUSPENSE_VOID ──

  // CLOCK_TURN_DECOUPLED (co-occurrence/decoupling × clock × dramatic-turn, n≥10, ≥2 clock
  // scenes [clockRaised or clockDelta > 0], ≥2 dramatic-turn scenes, no scene carries both):
  // The story has deadline events and pivotal reversals, but never in the same scene — urgency
  // and direction-change always operate apart. A clock event at the moment of a dramatic turn
  // is compounded: the story changes direction AND the window to respond shrinks simultaneously,
  // creating a beat where both the narrative stakes and the temporal stakes are raised together.
  // When the two always operate separately, clocks tighten time without pivoting the story and
  // turns change direction without adding urgency — both are weaker than if they coincided.
  // Co-occurrence/decoupling mode × clock × dramatic-turn. Distinct from REVELATION_CLOCK_
  // DECOUPLED (Wave 485: revelation × clock), CLOCK_CURIOSITY_DECOUPLED (Wave 499: clock ×
  // curiosity), REVELATION_TURN_DECOUPLED (Wave 471: revelation × turn) — first check combining
  // clock with the dramatic-turn channel.
  if (n >= 10) {
    const clockScenes513a = (records as any[]).filter(r =>
      r.clockRaised === true || (r.clockDelta ?? 0) > 0,
    );
    const turnScenes513a = (records as any[]).filter(r =>
      (r.dramaticTurn ?? 'nothing') !== 'nothing' && r.dramaticTurn !== '',
    );
    if (clockScenes513a.length >= 2 && turnScenes513a.length >= 2) {
      const anyCoOccur513a = (records as any[]).some(
        r => (r.clockRaised === true || (r.clockDelta ?? 0) > 0) &&
             (r.dramaticTurn ?? 'nothing') !== 'nothing' && r.dramaticTurn !== '',
      );
      if (!anyCoOccur513a) {
        issues.push({
          location: `${clockScenes513a.length} clock scene(s) and ${turnScenes513a.length} dramatic-turn scene(s) — never co-occurring`,
          rule: 'CLOCK_TURN_DECOUPLED',
          severity: 'minor',
          description: `The script has ${clockScenes513a.length} clock scene(s) and ${turnScenes513a.length} dramatic-turn scene(s), but no scene simultaneously delivers both deadline pressure and a story pivot — urgency and direction-change always operate in separate moments. A clock event at the moment of a dramatic turn is doubly weighted: the story changes direction AND the window to act on the new direction shrinks at the same time, creating a beat where both narrative and temporal stakes are raised simultaneously. When the two always operate apart, clock scenes tighten time without pivoting the story, and turn scenes change direction without adding urgency — both run at reduced intensity.`,
          suggestedFix: 'Let at least one dramatic turn also raise the clock — the moment the story changes direction is also the moment time becomes shorter. The turn reveals that the situation is different from what the protagonist believed, and the revelation also removes time: the option that was available yesterday is no longer available, the window the protagonist was relying on has closed, or the new threat requires an immediate response. A pivot under deadline pressure is always more kinetic than a pivot in open time.',
        });
      }
    }
  }

  // CURIOSITY_RUN (run-based × curiosity channel, n≥8, ≥4 curiosity-positive scenes
  // [curiosityDelta > 0], longest consecutive run ≥5): Five or more consecutive scenes all
  // spike curiosity without a resolution, redirect, or recalibration. Sustained wondering
  // generates its own paradox: five or more scenes in a row that only open questions without
  // answering any create a rising question-debt the audience stops trusting will be repaid.
  // Each additional curiosity-raising scene in the run signals that the story is accumulating
  // questions mechanically rather than generating them as consequences of events. Run-based
  // mode × curiosity channel. Distinct from SUSPENSE_RUN (Wave 499: suspense channel), POSITIVE_
  // SCENE_RUN (Wave 471: emotional positive valence, not curiosity), NEGATIVE_SCENE_RUN (Wave 485:
  // emotional negative valence), PURPOSE_MONOTONE_RUN (Wave 429: purpose channel). First run-based
  // check on the curiosity channel.
  if (n >= 8) {
    const totalCurScenes513b = (records as any[]).filter(r => (r.curiosityDelta ?? 0) > 0).length;
    if (totalCurScenes513b >= 4) {
      let maxCurRun513b = 0, curCurRun513b = 0;
      for (const r of records as any[]) {
        if ((r.curiosityDelta ?? 0) > 0) {
          curCurRun513b++;
          if (curCurRun513b > maxCurRun513b) maxCurRun513b = curCurRun513b;
        } else {
          curCurRun513b = 0;
        }
      }
      if (maxCurRun513b >= 5) {
        issues.push({
          location: `Consecutive curiosity scenes — run of ${maxCurRun513b}`,
          rule: 'CURIOSITY_RUN',
          severity: 'minor',
          description: `${maxCurRun513b} consecutive scenes all carry curiosityDelta > 0 — an unbroken run of question-opening without any resolution, redirect, or recalibration. Sustained wondering generates its own paradox: five or more consecutive scenes that only open questions and never answer them create a rising question-debt that the audience begins to distrust. Instead of each question feeling like a fresh mystery, the run of unanswered questions starts to feel like a structural pattern — the story is accumulating mystery as a technique rather than as a consequence of events. Curiosity requires contrast to register as anticipation rather than as anxiety.`,
          suggestedFix: `Break the run of ${maxCurRun513b} curiosity scenes with at least one scene where curiosityDelta ≤ 0 — not a resolution of everything, but a beat where one of the open questions is addressed (even partially) or the story pauses the wondering to let the audience absorb what they've already been given. A small answer inside a long question-run converts the accumulation from anxiety into investment, because the audience now believes the questions are going somewhere.`,
        });
      }
    }
  }

  // TURN_AFTERMATH_SUSPENSE_VOID (sequence/aftermath × suspense × dramatic-turn trigger, n≥8,
  // ≥2 qualifying turn scenes [pos < n-2], ≥3 suspense scenes overall, no qualifying turn
  // scene followed by suspenseDelta > 0 in next 2 scenes): Every dramatic turn is followed by
  // two scenes without a suspense spike — pivots never escalate danger in their wake. A dramatic
  // turn should reorient the stakes: the reversal reveals that the situation is more dangerous than
  // the protagonist knew, and the scenes immediately after confirm this with rising tension. When
  // every turn is followed by suspense silence, pivots redirect without sharpening — the story
  // changes direction but the felt pressure doesn't climb. Sequence/aftermath mode × suspense ×
  // dramatic-turn trigger. Distinct from REVELATION_AFTERMATH_CLOCK_VOID (Wave 499: revelation
  // trigger × clock channel), INCITING_AFTERMATH_STALL (Wave 429: inciting-incident trigger ×
  // curiosity/suspense channels), CLIMAX_AFTERMATH_FLAT (Wave 485: climax trigger × emotional/
  // relational channels) — first aftermath check using the dramatic-turn trigger.
  if (n >= 8) {
    const suspScenes513c = (records as any[]).filter(r => (r.suspenseDelta ?? 0) > 0);
    const qualTurnScenes513c = (records as any[]).filter((r, pos) =>
      (r.dramaticTurn ?? 'nothing') !== 'nothing' && r.dramaticTurn !== '' && pos < n - 2,
    );
    if (qualTurnScenes513c.length >= 2 && suspScenes513c.length >= 3) {
      const anyTurnFollowedBySusp513c = qualTurnScenes513c.some((r: any) => {
        const pos513c = (records as any[]).indexOf(r);
        const next1 = (records as any[])[pos513c + 1];
        const next2 = (records as any[])[pos513c + 2];
        return (next1 && (next1.suspenseDelta ?? 0) > 0) ||
               (next2 && (next2.suspenseDelta ?? 0) > 0);
      });
      if (!anyTurnFollowedBySusp513c) {
        issues.push({
          location: `All ${qualTurnScenes513c.length} dramatic turn scene(s) — no suspense spike within 2 scenes`,
          rule: 'TURN_AFTERMATH_SUSPENSE_VOID',
          severity: 'minor',
          description: `None of the story's ${qualTurnScenes513c.length} dramatic turns is followed by a suspense spike (suspenseDelta > 0) in the next two scenes, even though ${suspScenes513c.length} suspense scenes exist elsewhere. A pivot should reorient the stakes: the reversal reveals that the situation is more dangerous than the protagonist understood, and the scenes immediately after confirm this with rising pressure. When every turn is followed by two scenes of suspense silence, pivots redirect the narrative direction without escalating the felt danger — the story changes course but the tension doesn't climb. The turn's structural weight is not confirmed by the story's immediate pressure response.`,
          suggestedFix: `Let at least one dramatic turn be followed within two scenes by a suspense spike: the reversal should expose a new threat, remove a protection, or accelerate a danger that arrives in the next scene or two. The suspense spike doesn't need to be climactic; a single scene of rising pressure after a turn signals that the pivot had real consequences — the world is now more dangerous because the direction changed, and the audience feels this immediately.`,
        });
      }
    }
  }

  // ── Wave 527: CLOCK_RUN, TURN_EMOTION_DECOUPLED, REVELATION_AFTERMATH_EMOTION_VOID ──

  // CLOCK_RUN (run-based × clock channel × consecutive scenes, n≥8, ≥4 clockRaised scenes,
  // longest clockRaised run ≥5): Five or more consecutive scenes all with clockRaised=true —
  // a relentless run of deadline pressure without rhythmic relief. Clock pressure is powerful
  // when it arrives against a prior absence and is released in cycles; a run of five or more
  // consecutive urgency beats forces the audience to sustain maximum alertness without any
  // moment of absorption or recalibration. The accumulation saturates the urgency register:
  // the fifth consecutive clock scene cannot escalate beyond what the audience already feels,
  // and the structural tool exhausts itself through unbroken repetition. Run-based mode × clock
  // channel × consecutive scenes. Distinct from SUSPENSE_RUN (Wave 499: suspense channel not
  // clock), CURIOSITY_RUN (Wave 513: curiosity channel), POSITIVE/NEGATIVE_SCENE_RUN (Wave 471/
  // 485: emotional-valence runs), CLOCK_PRESSURE_FINALE_ABSENT (Wave 292: zone check × clock —
  // zone presence not run length), CLOCK_CURIOSITY_DECOUPLED (Wave 499: co-occurrence × clock —
  // simultaneous, not consecutive run).
  if (n >= 8) {
    const clockScenes527a = (records as any[]).filter(r => r.clockRaised === true);
    if (clockScenes527a.length >= 4) {
      let maxClockRun527a = 0;
      let curClockRun527a = 0;
      for (const r of records as any[]) {
        if (r.clockRaised === true) {
          curClockRun527a++;
          if (curClockRun527a > maxClockRun527a) maxClockRun527a = curClockRun527a;
        } else {
          curClockRun527a = 0;
        }
      }
      if (maxClockRun527a >= 5) {
        issues.push({
          location: `${maxClockRun527a} consecutive scene(s) with clockRaised — unbroken deadline run`,
          rule: 'CLOCK_RUN',
          severity: 'minor',
          description: `${maxClockRun527a} consecutive scenes all raise a clock or deadline pressure — an unbroken run of urgency that gives the audience no moment of release or recalibration. Clock pressure derives its power from contrast: a deadline is acute when it arrives against a prior absence of pressure, and it is released when the tension temporarily resolves. A run of ${maxClockRun527a} consecutive clock-raised scenes creates a sustained alarm in which each new deadline cannot escalate beyond the audience's already-elevated baseline. The accumulation saturates the urgency register: the fifth consecutive clock scene no longer reads as an escalation but as a continuation of maximum alert, and the structural tool exhausts its effect through unbroken repetition.`,
          suggestedFix: `Break the run of ${maxClockRun527a} clock-raised scenes with at least one scene that does not raise a new deadline — a moment of apparent resolution, a scene that acknowledges the current pressure without adding urgency, or a scene that redirects attention to a different register (emotional, relational, revelatory) before the next clock is raised. Clock pressure is most effective when it punctuates a baseline of non-urgency rather than sustains an unbroken alarm.`,
        });
      }
    }
  }

  // TURN_EMOTION_DECOUPLED (co-occurrence/decoupling × dramatic turn × emotional shift,
  // n≥8, ≥2 turn scenes, ≥2 emotional scenes [positive or negative], zero overlap): The
  // story has ≥2 dramatic turns and ≥2 emotionally charged scenes but no scene carries
  // both — pivots and emotion never coincide. A dramatic turn should carry emotional charge:
  // the reversal that reorients the story should also register as a felt experience for the
  // protagonist and the audience. When every turn is emotionally neutral and every emotional
  // scene is free of any reversal, the mechanics of plot and the experience of feeling operate
  // in fully separate zones — the audience can follow the logic of pivots without feeling them,
  // and feel the emotions without tracking them to a structural cause. Co-occurrence/decoupling
  // mode × dramatic-turn × emotional-shift channels. Distinct from REVELATION_TURN_DECOUPLED
  // (Wave 471: revelation × turn — revelation not emotion), CLOCK_TURN_DECOUPLED (Wave 513:
  // clock × turn), PEAK_SUSPENSE_EMOTIONAL_VACUUM (Wave 443: single-peak × suspense × emotion
  // — isolates the single tensest scene, not the full turn set), DRAMATIC_TURN_CAUSELESS
  // (Wave 457: backward-cause × turn — checks what precedes a turn, not what co-occurs).
  if (n >= 8) {
    const turnScenes527b = (records as any[]).filter(r =>
      (r.dramaticTurn ?? 'nothing') !== 'nothing' && r.dramaticTurn !== '',
    );
    const emotionalScenes527b = (records as any[]).filter(r =>
      (r.emotionalShift ?? 'neutral') !== 'neutral',
    );
    if (turnScenes527b.length >= 2 && emotionalScenes527b.length >= 2) {
      const overlap527b = turnScenes527b.some(r =>
        (r.emotionalShift ?? 'neutral') !== 'neutral',
      );
      if (!overlap527b) {
        issues.push({
          location: `${turnScenes527b.length} turn scene(s) — all neutral; ${emotionalScenes527b.length} emotional scene(s) — none with a turn`,
          rule: 'TURN_EMOTION_DECOUPLED',
          severity: 'minor',
          description: `The story has ${turnScenes527b.length} dramatic turn(s) and ${emotionalScenes527b.length} emotionally charged scene(s), but no scene carries both — every pivot is emotionally neutral and every emotional scene is free of any reversal. A dramatic turn should register as a felt experience: the reversal that reorients the story should also land in the protagonist's affective register, communicating to the audience that the change matters not just structurally but personally. When the mechanics of plot change and the experience of feeling operate in fully separate scenes, the pivots can be followed logically without being felt, and the emotions can be felt without being traceable to a structural cause. The story's structure and its affect run in parallel without ever touching.`,
          suggestedFix: `Ensure at least one dramatic turn scene also carries emotional charge — positive or negative. At the moment a reversal lands, let the protagonist's emotional response register in the same scene, even briefly. A turn that reorients the plot and registers in the character's feeling simultaneously gives the audience two concurrent signals — things changed, and the change matters — which is the structural and emotional coherence a pivot is supposed to deliver.`,
        });
      }
    }
  }

  // REVELATION_AFTERMATH_EMOTION_VOID (sequence/aftermath × emotional shift × revelation
  // trigger, n≥8, ≥3 qualifying revelation scenes [pos < n-2], ≥2 emotional scenes overall,
  // no qualifying revelation followed by emotional charge in next 2 scenes): Every revelation
  // is followed by two emotionally neutral scenes — disclosures produce no felt response.
  // A revelation is an information event that should trigger an emotional reaction: the
  // character learns something that changes what they understand and therefore what they feel.
  // When every disclosure is followed by two scenes of emotional neutrality, revelations
  // function as information transfers rather than dramatic events. Sequence/aftermath mode ×
  // emotional-shift channel × revelation trigger. Distinct from REVELATION_AFTERMATH_CLOCK_VOID
  // (Wave 499: clock channel — same trigger, different aftermath signal), CLIMAX_AFTERMATH_FLAT
  // (Wave 485: climax trigger × emotional channel — different trigger), TURN_AFTERMATH_SUSPENSE_VOID
  // (Wave 513: turn trigger × suspense channel), REVELATION_CURIOSITY_DECOUPLED (Wave 443:
  // co-occurrence decoupling — simultaneous presence not aftermath sequence).
  if (n >= 8) {
    const qualRevScenes527c = (records as any[]).filter((r, pos) =>
      r.revelation && r.revelation !== null && r.revelation !== '' && pos < n - 2,
    );
    const emotionalScenes527c = (records as any[]).filter(r =>
      (r.emotionalShift ?? 'neutral') !== 'neutral',
    );
    if (qualRevScenes527c.length >= 3 && emotionalScenes527c.length >= 2) {
      const anyRevFollowedByEmotion527c = qualRevScenes527c.some((r: any) => {
        const pos527c = (records as any[]).indexOf(r);
        const next1 = (records as any[])[pos527c + 1];
        const next2 = (records as any[])[pos527c + 2];
        return ((next1 && (next1.emotionalShift ?? 'neutral') !== 'neutral') ||
                (next2 && (next2.emotionalShift ?? 'neutral') !== 'neutral'));
      });
      if (!anyRevFollowedByEmotion527c) {
        issues.push({
          location: `All ${qualRevScenes527c.length} revelation scene(s) — no emotional response within 2 scenes`,
          rule: 'REVELATION_AFTERMATH_EMOTION_VOID',
          severity: 'minor',
          description: `None of the story's ${qualRevScenes527c.length} revelations is followed by an emotionally charged scene (positive or negative emotionalShift) within the next two scenes, even though ${emotionalScenes527c.length} emotional scenes exist elsewhere. A revelation is an information event that should trigger a felt response: the character learns something that changes what they understand and therefore what they feel. When every disclosure is followed by two scenes of emotional neutrality, revelations function as information transfers rather than as dramatic events — they change what the audience knows without changing how the story feels. The gap between learning and feeling is the gap between exposition and drama.`,
          suggestedFix: `Let at least one revelation be followed within two scenes by an emotionally charged beat — a scene where the character responds to what they've learned with visible positive or negative feeling. The response doesn't need to be extreme; even a scene of quiet realization qualifies if the emotionalShift is non-neutral. The revelation and its emotional aftermath together form one complete dramatic unit: disclosure plus response, information plus feeling.`,
        });
      }
    }
  }

  // ── Wave 541: REVELATION_AFTERMATH_SUSPENSE_VOID, TURN_AFTERMATH_CURIOSITY_VOID, EMOTIONAL_NEUTRAL_RUN ──

  // REVELATION_AFTERMATH_SUSPENSE_VOID (sequence/aftermath × suspense × revelation trigger,
  // n≥8, ≥3 qualifying revelations [pos < n-2], ≥2 suspense-spike scenes): No qualifying
  // revelation is followed by a suspense spike (suspenseDelta > 0) within the next 2 scenes,
  // despite suspense-spike scenes existing elsewhere. Disclosures should activate tension in their
  // aftermath: learning a truth changes the stakes for what follows, and that changed-stakes feeling
  // should manifest as rising tension in the scenes immediately after the revelation. When every
  // disclosure is followed by two tension-free scenes, revelations function as informational pauses
  // rather than as catalysts — the audience learns something without the story's pressure rising to
  // account for it. Sequence/aftermath mode × suspense channel × revelation trigger. Distinct from
  // REVELATION_SUSPENSE_DECOUPLED (Wave 457: co-occurrence — revelation and suspense never in the
  // same scene), REVELATION_AFTERMATH_CLOCK_VOID (Wave 499: clock channel, same trigger), REVELATION_
  // AFTERMATH_EMOTION_VOID (Wave 527: emotion channel, same trigger).
  if (n >= 8) {
    const qualRevs541a = (records as any[]).filter((r, pos) =>
      r.revelation && r.revelation !== null && r.revelation !== '' && pos < n - 2,
    );
    const suspScenes541a = (records as any[]).filter(r => (r.suspenseDelta ?? 0) > 0);
    if (qualRevs541a.length >= 3 && suspScenes541a.length >= 2) {
      const anyRevFollowedBySusp541a = qualRevs541a.some((r: any) => {
        const pos541a = (records as any[]).indexOf(r);
        for (let off = 1; off <= 2; off++) {
          const nxt = (records as any[])[pos541a + off];
          if (nxt && (nxt.suspenseDelta ?? 0) > 0) return true;
        }
        return false;
      });
      if (!anyRevFollowedBySusp541a) {
        issues.push({
          location: `All ${qualRevs541a.length} revelation scene(s) — no suspense spike within 2 scenes`,
          rule: 'REVELATION_AFTERMATH_SUSPENSE_VOID',
          severity: 'minor',
          description: `None of the story's ${qualRevs541a.length} revelation scene(s) is followed by a suspense spike (suspenseDelta > 0) within the next two scenes, even though ${suspScenes541a.length} tension-raising scenes exist elsewhere. A revelation is a disclosure that should raise the stakes: learning a truth changes what the characters are now facing, and that changed-stakes awareness should manifest as rising tension in the scenes immediately following. When every disclosure is followed by two tension-free scenes, revelations function as informational pauses — the audience learns something new, but the story's pressure dial does not rise to account for the new information. The revelation and its suspense aftermath together form a catalytic unit: disclosure plus escalation, information plus consequence. Without that aftermath, revelations close prior questions without opening the pressure that makes the answers matter.`,
          suggestedFix: `After at least one revelation, introduce a scene with positive suspenseDelta in the following one or two scenes — a threat that now feels more real because of what was just disclosed, an obstacle that the newly revealed truth makes more urgent, or a complication that the revelation directly enables. The suspense spike confirms that the audience is not just receiving information but watching the story's stakes change as a result of it.`,
        });
      }
    }
  }

  // TURN_AFTERMATH_CURIOSITY_VOID (sequence/aftermath × curiosity × dramatic-turn trigger,
  // n≥8, ≥3 qualifying turns [pos < n-2], ≥2 curiosity-spike scenes): No qualifying dramatic
  // turn is followed by a curiosity spike (curiosityDelta > 0) within the next 2 scenes, despite
  // curiosity scenes existing elsewhere. A dramatic turn should generate new questions: when the
  // story reverses direction, the audience should be asking what this new direction means, where it
  // leads, and what consequences will follow. When every pivot is followed by two curiosity-flat
  // scenes, turns reorient the plot without opening any new questions — the story changes direction
  // without the audience wondering where the new direction goes. Sequence/aftermath mode × curiosity
  // channel × dramatic-turn trigger. Distinct from TURN_AFTERMATH_SUSPENSE_VOID (Wave 513: suspense
  // channel, same trigger), REVELATION_TURN_DECOUPLED (Wave 471: co-occurrence, revelation trigger),
  // CLOCK_TURN_DECOUPLED (Wave 513: co-occurrence, clock trigger).
  if (n >= 8) {
    const qualTurns541b = (records as any[]).filter((r, pos) =>
      (r.dramaticTurn ?? 'nothing') !== 'nothing' && r.dramaticTurn !== '' && pos < n - 2,
    );
    const curiosityScenes541b = (records as any[]).filter(r => (r.curiosityDelta ?? 0) > 0);
    if (qualTurns541b.length >= 3 && curiosityScenes541b.length >= 2) {
      const anyTurnFollowedByCuriosity541b = qualTurns541b.some((r: any) => {
        const pos541b = (records as any[]).indexOf(r);
        for (let off = 1; off <= 2; off++) {
          const nxt = (records as any[])[pos541b + off];
          if (nxt && (nxt.curiosityDelta ?? 0) > 0) return true;
        }
        return false;
      });
      if (!anyTurnFollowedByCuriosity541b) {
        issues.push({
          location: `All ${qualTurns541b.length} turn scene(s) — no curiosity spike within 2 scenes`,
          rule: 'TURN_AFTERMATH_CURIOSITY_VOID',
          severity: 'minor',
          description: `None of the story's ${qualTurns541b.length} dramatic turn(s) is followed by a curiosity spike (curiosityDelta > 0) within the next two scenes, even though ${curiosityScenes541b.length} curiosity-generating scenes exist elsewhere. A dramatic turn should open new questions: when the story reverses direction, the audience should be asking what this new direction means, where it leads, and what consequences the pivot will bring. When every turn is followed by two curiosity-flat scenes, pivots reorient the plot without the audience wondering where the new direction goes — the story changes its trajectory without generating any new forward pull. A turn that does not produce curiosity is a structural pivot without narrative momentum: it redirects the vehicle but does not point it toward anything the audience wants to see.`,
          suggestedFix: `After at least one dramatic turn, introduce a scene with positive curiosityDelta in the following one or two scenes — a question opened by the new direction, an implication of the reversal that the audience now wants to track, or a character discovery enabled by the turn. The curiosity spike confirms that the pivot changed not just what is happening but what the audience is wondering about as a result.`,
        });
      }
    }
  }

  // EMOTIONAL_NEUTRAL_RUN (run-based × neutral emotional valence, n≥8, ≥4 emotionally charged
  // scenes): Six or more consecutive scenes all emotionally neutral (emotionalShift='neutral')
  // while at least 4 emotionally charged scenes exist elsewhere. The story goes affectively flat
  // for a sustained stretch — six or more beats without any positive or negative emotional charge —
  // even though the story has demonstrated the capacity for emotional range. Unlike the zone-based
  // flatline checks (ACT_EMOTIONAL_FLATLINE, MIDPOINT_EMOTIONAL_FLATLINE) that audit specific
  // structural positions, this fires for any local contiguous run of neutral scenes regardless of
  // its position. A 6+-scene neutral run is a drought in the story's felt experience: the audience
  // tracks events without registering them emotionally, experiencing the plot as information rather
  // than as something they care about. Run-based mode × neutral-valence channel. Distinct from
  // ACT_1_EMOTIONAL_FLATLINE / ACT_2A_EMOTIONAL_FLATLINE / etc. (zone-specific, position-based),
  // EMOTIONAL_ARC_UNIFORM (>70% of all scenes same register — global proportion), POSITIVE_SCENE_RUN
  // (Wave 471: positive valence), NEGATIVE_SCENE_RUN (Wave 485: negative valence — this completes
  // the three-valence run family by auditing the neutral register).
  if (n >= 8) {
    const emotionalScenes541c = (records as any[]).filter(r =>
      (r.emotionalShift ?? 'neutral') !== 'neutral',
    );
    if (emotionalScenes541c.length >= 4) {
      let maxNeutralRun541c = 0;
      let curNeutralRun541c = 0;
      for (const r of records as any[]) {
        if ((r.emotionalShift ?? 'neutral') === 'neutral') {
          curNeutralRun541c++;
          if (curNeutralRun541c > maxNeutralRun541c) maxNeutralRun541c = curNeutralRun541c;
        } else {
          curNeutralRun541c = 0;
        }
      }
      if (maxNeutralRun541c >= 6) {
        issues.push({
          location: `${maxNeutralRun541c} consecutive emotionally neutral scene(s)`,
          rule: 'EMOTIONAL_NEUTRAL_RUN',
          severity: 'minor',
          description: `${maxNeutralRun541c} consecutive scenes carry no emotional charge (all emotionalShift='neutral'), even though ${emotionalScenes541c.length} emotionally charged scenes exist elsewhere in the story. In a ${maxNeutralRun541c}-scene neutral run, the audience tracks events without registering them as felt experience — the plot advances as information rather than as something that matters to anyone. Emotional engagement requires recurrence: the audience's investment is maintained by regular emotional signals that remind them the events have stakes. A 6+-scene neutral stretch severs that connection: the audience is watching rather than feeling, and by the end of the run the story's emotional temperature has cooled enough that even the next emotional beat arrives against a lowered baseline of investment.`,
          suggestedFix: `Introduce at least one emotionally charged scene (positive or negative emotionalShift) within the ${maxNeutralRun541c}-scene neutral run — a moment where what is happening registers as felt experience for the protagonist. The charge need not be large; even a small positive shift (a brief moment of relief or connection) or a small negative shift (a flash of fear or loss) within the run re-engages the audience's emotional tracking and prevents the stretch from becoming an affect-free zone.`,
        });
      }
    }
  }

  {
    // CLOCK_SUSPENSE_DECOUPLED — co-occurrence/decoupling × clock × suspense.
    // n≥8, ≥2 clock-raised scenes, ≥2 suspense-positive scenes (suspenseDelta>0). No scene
    // carries both clockRaised=true AND suspenseDelta>0 → fire. Deadline pressure and narrative
    // tension are the story's most powerful co-occurring amplifiers: a scene where a clock ticks
    // AND suspense rises simultaneously compounds urgency with anxiety, making both signals more
    // forceful than either alone. When these two channels always operate in separate scenes, the
    // audience never experiences the compound beat of a ticking deadline that also escalates
    // tension — the pressure of time and the pressure of uncertainty pass in different moments.
    // Distinct from: CLOCK_CURIOSITY_DECOUPLED (Wave 499: curiosity channel — this adds the
    // suspense channel), CLOCK_TURN_DECOUPLED (Wave 513: dramatic-turn channel), REVELATION_
    // CLOCK_DECOUPLED (Wave 485: revelation trigger rather than clock trigger). Completes the
    // clock co-occurrence family with the suspense-channel entry.
    if (n >= 8) {
      const clockScenes555a = (records as any[]).filter(r => r.clockRaised === true);
      const suspenseScenes555a = (records as any[]).filter(r => (r.suspenseDelta ?? 0) > 0);
      if (clockScenes555a.length >= 2 && suspenseScenes555a.length >= 2) {
        const clockIdxSet555a = new Set(clockScenes555a.map(r => r.sceneIdx));
        const anyOverlap555a = suspenseScenes555a.some(r => clockIdxSet555a.has(r.sceneIdx));
        if (!anyOverlap555a) {
          issues.push({
            location: `${clockScenes555a.length} clock scene(s), ${suspenseScenes555a.length} suspense scene(s) — no overlap`,
            rule: 'CLOCK_SUSPENSE_DECOUPLED',
            severity: 'minor',
            description: `The story has ${clockScenes555a.length} scenes that raise a deadline (clockRaised) and ${suspenseScenes555a.length} scenes that escalate suspense (suspenseDelta>0), but no scene carries both simultaneously. Deadline pressure and narrative tension are the story's two most potent co-occurring amplifiers: a scene where a ticking clock coincides with a suspense spike compounds urgency with anxiety, making both signals more forceful than either alone. When these channels always operate separately, the audience never experiences the most electrifying structural beat — the moment where time is running out AND something awful might happen inside that contracting window. The clock and the suspense axis pass each other in separate scenes, reducing their combined force.`,
            suggestedFix: `Let at least one clock-raising scene also carry a suspense escalation — introduce a ticking deadline into a scene that already heightens anxiety, or allow the revelation of a deadline to itself create tension. The simultaneous activation of both channels is dramatically more powerful than either alone: the clock makes the suspense feel urgent, and the suspense makes the clock feel dangerous rather than merely logistical.`,
          });
        }
      }
    }
  }

  {
    // REVELATION_CAUSELESS — backward-cause × revelation signal.
    // n≥8, ≥3 revelation scenes at positions i≥3. Every revelation lacks a structural
    // build-up in the prior 3 scenes: no suspenseDelta>0, no clockRaised=true, no
    // dramaticTurn≠'nothing' → fire. Disclosures land with greatest force when the preceding
    // scenes have elevated tension, raised a deadline, or pivoted the story's direction — the
    // prior action creates a pressure vessel that the revelation discharges. When every
    // revelation arrives into a flat, unpressurised context, the disclosures feel arbitrary:
    // they deliver information rather than releasing accumulated structural energy.
    // Distinct from: DRAMATIC_TURN_CAUSELESS (Wave 457: backward-cause × turn trigger — this
    // uses revelation trigger), CLIMAX_UNPREPARED (Wave 429: backward-cause × climax position —
    // this audits any revelation regardless of position), REVELATION_SUSPENSE_DECOUPLED (Wave
    // 457: co-occurrence mode — fires when no revelation scene has suspenseDelta>0 in the
    // same scene; this checks PRIOR scenes, not the revelation scene itself).
    if (n >= 8) {
      const qualRevs555b = (records as any[])
        .map((r, pos) => ({ r, pos }))
        .filter(({ r, pos }) =>
          r.revelation !== null && r.revelation !== undefined && r.revelation !== '' && pos >= 3,
        );
      if (qualRevs555b.length >= 3) {
        const allCauseless555b = qualRevs555b.every(({ pos }) => {
          for (let off = 1; off <= 3; off++) {
            if (pos - off < 0) break;
            const prior = (records as any[])[pos - off];
            if ((prior.suspenseDelta ?? 0) > 0) return false;
            if (prior.clockRaised === true) return false;
            if ((prior.dramaticTurn ?? 'nothing') !== 'nothing' && prior.dramaticTurn !== '') return false;
          }
          return true;
        });
        if (allCauseless555b) {
          issues.push({
            location: `${qualRevs555b.length} revelation scene(s) — none preceded by structural build-up`,
            rule: 'REVELATION_CAUSELESS',
            severity: 'minor',
            description: `Every revelation in the story (${qualRevs555b.length} scene(s)) arrives without any structural build-up in the prior three scenes: no scene before the disclosure escalates suspense, raises a deadline, or pivots the story's direction. A revelation is not just information — it is a structural discharge. It lands with maximum force when the prior scenes have pressurised the context: a suspense spike primes the audience for something terrible or transformative; a clock raise makes the disclosure feel like a race-against-time answer; a dramatic turn just before a revelation makes the disclosure feel like the consequence of the pivot. When revelations always arrive into narratively flat contexts, they deliver facts rather than release structural energy, and the audience receives the information without the full weight the story could have placed on it.`,
            suggestedFix: `Introduce at least one escalating signal within the three scenes before a revelation: raise suspense (let the prior scene suggest something terrible is about to emerge), activate a clock (give the revelation an urgency by placing it under deadline), or stage a dramatic turn immediately before it (so the pivot creates the question that the revelation then answers). Even one such pairing lifts the revelation from information-delivery into structural event.`,
          });
        }
      }
    }
  }

  {
    // TURN_AFTERMATH_EMOTION_VOID — sequence/aftermath × emotion × dramatic-turn trigger.
    // n≥8, ≥3 qualifying turn scenes (dramaticTurn≠'nothing', not in last 2 positions),
    // ≥2 emotional scenes (emotionalShift≠'neutral'). Every qualifying turn is followed by
    // 2 scenes with neutral emotionalShift → fire. A dramatic pivot should reorient the
    // characters' felt experience — the story changes direction, and that change should
    // register as felt consequence in the immediately following scenes. When no turn generates
    // any emotional aftermath, pivots reroute the plot without touching the characters' inner
    // states, making the reversals feel structural rather than experienced.
    // Distinct from: TURN_AFTERMATH_SUSPENSE_VOID (Wave 513: suspense channel), TURN_AFTERMATH_
    // CURIOSITY_VOID (Wave 541: curiosity channel), REVELATION_AFTERMATH_EMOTION_VOID (Wave 527:
    // revelation trigger vs. turn trigger here), TURN_EMOTION_DECOUPLED (Wave 527: co-occurrence
    // mode, same scene — this is the aftermath version, checking 2 scenes after). Completes the
    // turn-trigger aftermath family with the emotional-register channel.
    if (n >= 8) {
      const qualTurns555c = (records as any[]).filter((r, pos) =>
        (r.dramaticTurn ?? 'nothing') !== 'nothing' && r.dramaticTurn !== '' && pos < n - 2,
      );
      const emotionalScenes555c = (records as any[]).filter(r =>
        (r.emotionalShift ?? 'neutral') !== 'neutral',
      );
      if (qualTurns555c.length >= 3 && emotionalScenes555c.length >= 2) {
        const allTurnNoEmotionAftermath555c = qualTurns555c.every((r: any) => {
          const pos = (records as any[]).indexOf(r);
          for (let off = 1; off <= 2; off++) {
            const nxt = (records as any[])[pos + off];
            if (nxt && (nxt.emotionalShift ?? 'neutral') !== 'neutral') return false;
          }
          return true;
        });
        if (allTurnNoEmotionAftermath555c) {
          issues.push({
            location: `${qualTurns555c.length} turn scene(s) — no emotional shift in any aftermath window`,
            rule: 'TURN_AFTERMATH_EMOTION_VOID',
            severity: 'minor',
            description: `Every scene that pivots the story (${qualTurns555c.length} scene(s) with a dramatic turn) is followed by two scenes with neutral emotional tone, despite ${emotionalScenes555c.length} emotionally charged scenes existing elsewhere. A reversal or shift in direction should reorient what the characters feel, not just what happens to them: the story turns, and the turn should register in the immediate emotional aftermath of those who have to navigate the new reality. When no turn is followed by emotional charge in its wake, pivots are purely informational — they reroute the plot without touching the characters' inner states, making the reversals feel mechanical rather than lived. The audience watches the story change direction without feeling what it is like to be inside the change.`,
            suggestedFix: `After at least one dramatic turn, introduce an emotionally charged scene within the following two beats — a scene where a character registers what the pivot means for them (grief at a loss of direction, relief at a new opportunity, fear at the new exposure). The emotional aftermath need not be large; even a brief non-neutral beat confirms that the turn changed what it felt like to be in the story, not just where the story was going.`,
          });
        }
      }
    }
  }

  // ── Wave 569: TURN_AFTERMATH_CLOCK_VOID, TURN_CURIOSITY_DECOUPLED, MIDPOINT_CLOCK_VOID ──

  {
    // TURN_AFTERMATH_CLOCK_VOID — sequence/aftermath × clock × dramatic-turn trigger.
    // n≥8, ≥3 qualifying turn scenes (dramaticTurn≠'nothing', not in last 2 positions), ≥2
    // clock-raised scenes globally. Every qualifying turn is followed by 2 scenes with no clock
    // raised → fire. A dramatic pivot reorients the story; the scenes that follow are the natural
    // place for a new deadline to crystallize — the reversal exposes a threat that is now
    // time-bound, the recognition reveals the window to act is closing. When no turn is ever
    // followed by a clock in its wake, pivots reroute the plot without translating into time
    // pressure: the story changes direction but the urgency engine never engages with the change,
    // so the reversal's stakes stay abstract rather than becoming a race against the clock.
    // Distinct from: TURN_AFTERMATH_SUSPENSE_VOID (Wave 513: suspense channel), TURN_AFTERMATH_
    // CURIOSITY_VOID (Wave 541: curiosity channel), TURN_AFTERMATH_EMOTION_VOID (Wave 555: emotion
    // channel) — this adds the clock channel, completing the turn-trigger aftermath family. Distinct
    // from REVELATION_AFTERMATH_CLOCK_VOID (Wave 499: revelation trigger vs. turn trigger here) and
    // from CLOCK_TURN_DECOUPLED (Wave 513: co-occurrence — turn and clock in the SAME scene, not the
    // 2 scenes after). First clock-channel aftermath check on the dramatic-turn trigger.
    if (n >= 8) {
      const qualTurns569a = (records as any[]).filter((r, pos) =>
        (r.dramaticTurn ?? 'nothing') !== 'nothing' && r.dramaticTurn !== '' && pos < n - 2,
      );
      const clockScenes569a = (records as any[]).filter(r => r.clockRaised === true);
      if (qualTurns569a.length >= 3 && clockScenes569a.length >= 2) {
        const allTurnNoClockAftermath569a = qualTurns569a.every((r: any) => {
          const pos = (records as any[]).indexOf(r);
          for (let off = 1; off <= 2; off++) {
            const nxt = (records as any[])[pos + off];
            if (nxt && nxt.clockRaised === true) return false;
          }
          return true;
        });
        if (allTurnNoClockAftermath569a) {
          issues.push({
            location: `${qualTurns569a.length} turn scene(s) — no clock raised in any aftermath window`,
            rule: 'TURN_AFTERMATH_CLOCK_VOID',
            severity: 'minor',
            description: `Every scene that pivots the story (${qualTurns569a.length} scene(s) with a dramatic turn) is followed by two scenes in which no clock is raised, despite ${clockScenes569a.length} clock-raising scenes existing elsewhere. A reversal or recognition is a natural trigger for new urgency: the pivot exposes a threat that is now time-bound, or reveals that the window to act has narrowed. When no turn is ever followed by a clock in its immediate wake, pivots reroute the plot without engaging the urgency engine — the story changes direction but the new direction carries no deadline, so the reversal's stakes remain abstract rather than becoming a race against time. The pivot and the clock operate in permanently separate stretches of the story.`,
            suggestedFix: `After at least one dramatic turn, raise a clock within the following two scenes — let the pivot create the deadline. A reversal that exposes a ticking threat, a recognition that reveals time is shorter than believed, or a twist that starts a countdown all convert the structural turn into felt urgency. The most propulsive pivots don't just change where the story is going; they make getting there suddenly time-critical.`,
          });
        }
      }
    }
  }

  {
    // TURN_CURIOSITY_DECOUPLED — co-occurrence/decoupling × curiosity × dramatic-turn trigger.
    // n≥8, ≥2 dramatic-turn scenes, ≥2 curiosity-positive scenes (curiosityDelta>0). No turn scene
    // also carries curiosityDelta>0 → fire. A dramatic turn should reframe what the audience does
    // not yet know — a reversal that opens new questions, a recognition that reveals prior
    // understanding was incomplete. The most generative pivots raise curiosity in the very scene
    // they turn: the audience both registers the change of direction AND wonders where the new
    // direction leads. When turns and curiosity spikes always occupy separate scenes, pivots deliver
    // structural reorientation without epistemic opening — the story turns but the turn itself raises
    // no new question, so the reversal feels like a closed event rather than a door into the unknown.
    // Distinct from: TURN_AFTERMATH_CURIOSITY_VOID (Wave 541: aftermath mode — checks the 2 scenes
    // AFTER a turn; this checks the turn scene ITSELF for same-scene co-occurrence), TURN_EMOTION_
    // DECOUPLED (Wave 527: same co-occurrence mode but the emotion channel), CLOCK_CURIOSITY_
    // DECOUPLED (Wave 499: clock trigger) and REVELATION_CURIOSITY_DECOUPLED (Wave 457: revelation
    // trigger) — this adds the dramatic-turn trigger to the curiosity co-occurrence family.
    if (n >= 8) {
      const turnScenes569b = (records as any[]).filter(
        r => (r.dramaticTurn ?? 'nothing') !== 'nothing' && r.dramaticTurn !== '',
      );
      const curiosityScenes569b = (records as any[]).filter(r => (r.curiosityDelta ?? 0) > 0);
      if (turnScenes569b.length >= 2 && curiosityScenes569b.length >= 2) {
        const turnIdxSet569b = new Set(turnScenes569b.map(r => r.sceneIdx));
        const anyOverlap569b = curiosityScenes569b.some(r => turnIdxSet569b.has(r.sceneIdx));
        if (!anyOverlap569b) {
          issues.push({
            location: `${turnScenes569b.length} turn scene(s), ${curiosityScenes569b.length} curiosity scene(s) — no overlap`,
            rule: 'TURN_CURIOSITY_DECOUPLED',
            severity: 'minor',
            description: `The story has ${turnScenes569b.length} scenes that pivot the narrative (dramatic turns) and ${curiosityScenes569b.length} scenes that raise curiosity (curiosityDelta>0), but no scene carries both simultaneously. A dramatic turn should reframe what the audience does not yet know — a reversal that opens new questions, a recognition that exposes incomplete understanding. The most generative pivots raise curiosity in the very scene they turn, so the audience registers the change of direction AND wonders where it leads. When turns and curiosity spikes always occupy separate scenes, pivots deliver structural reorientation without epistemic opening: the story turns, but the turn itself raises no new question, and the reversal reads as a closed event rather than a door into the unknown.`,
            suggestedFix: `Let at least one dramatic turn also raise curiosity in the same scene — stage the pivot so it opens a question rather than merely closing one. A reversal that reveals a new mystery, a recognition that makes the audience re-examine what they thought they understood, or a twist that implies more is hidden all fuse the structural turn with epistemic pull. A pivot that turns the story and opens a question in the same beat is far more propulsive than one that only redirects.`,
          });
        }
      }
    }
  }

  {
    // MIDPOINT_CLOCK_VOID — zone presence/absence × clock × midpoint zone (40%–60%).
    // n≥10, ≥2 midpoint scenes, ≥2 clock-raised scenes globally, no clock raised within the
    // 40%–60% center window → fire. The midpoint is the structural pivot where a strong story
    // tightens its grip and accelerates the second half out of the turn; a deadline imposed at the
    // midpoint is one of the most reliable engines for that acceleration. When the story raises
    // clocks elsewhere but the exact center carries no time pressure, the structural pivot passes
    // without urgency — the second half launches without the contracting window that would give the
    // back half its drive. The urgency engine goes quiet precisely where the story most needs to
    // re-energize.
    // Distinct from: MIDPOINT_SUSPENSE_VOID (Wave 373: suspense channel — same 40%–60% zone, the
    // clock channel here), MIDPOINT_CURIOSITY_VOID / MIDPOINT_DRAMATIC_TURN_VOID / MIDPOINT_
    // EMOTIONAL_FLATLINE (same midpoint zone, different channels — this adds clock, completing the
    // midpoint-channel set), CLOCK_RAISED_LATE (Wave: the FIRST clock arrives late — a single
    // first-occurrence check, not a zone-absence audit), CLOCK_PRESSURE_FINALE_ABSENT (the finale
    // zone, not the midpoint). First clock-channel zone-absence check on the midpoint in this pass.
    if (n >= 10) {
      const midStart569c = Math.floor(n * 0.4);
      const midEnd569c = Math.floor(n * 0.6);
      const midRecs569c = (records as any[]).slice(midStart569c, midEnd569c);
      const clockScenes569c = (records as any[]).filter(r => r.clockRaised === true);
      if (midRecs569c.length >= 2 && clockScenes569c.length >= 2 && !midRecs569c.some(r => r.clockRaised === true)) {
        issues.push({
          location: `Midpoint (Scenes ${midStart569c}–${midEnd569c - 1}) — clock void`,
          rule: 'MIDPOINT_CLOCK_VOID',
          severity: 'minor',
          description: `The midpoint zone (Scenes ${midStart569c}–${midEnd569c - 1}) contains no scene that raises a clock, even though the story raises deadlines in ${clockScenes569c.length} scenes elsewhere. The midpoint is the structural pivot where a strong story tightens its grip and accelerates the second half out of the turn, and a deadline imposed at the center is one of the most reliable engines for that acceleration. When the exact middle carries no time pressure while clocks fire elsewhere, the pivot passes without urgency — the back half launches without a contracting window to drive it, and the urgency engine goes quiet precisely where the story most needs to re-energize. The audience reaches the center with no felt sense that time is now working against the protagonist.`,
          suggestedFix: `Raise a clock at the midpoint: let the pivot that reframes the story also impose a deadline — a countdown that starts at the center, a window that begins to close as the second half opens, a threat that now carries a timer. The middle of the story is one of the most powerful places to introduce time pressure, because it gives the back half a concrete reason to accelerate rather than merely continue.`,
        });
      }
    }
  }

  // ── Wave 583: TURN_SUSPENSE_DECOUPLED, CLOCK_AFTERMATH_EMOTION_VOID, PEAK_SUSPENSE_CURIOSITY_VOID ──

  {
    // TURN_SUSPENSE_DECOUPLED — co-occurrence/decoupling × dramatic turn × suspense.
    // n≥8, ≥2 dramatic-turn scenes (dramaticTurn≠'nothing'), ≥2 suspense-positive scenes
    // (suspenseDelta>0), no scene carries both → fire. The most charged pivots co-occur with
    // a suspense spike in the same scene — the reversal lands while tension is high, combining
    // structural change with felt urgency. When turns and suspense always occupy separate scenes,
    // pivots are emotionally cool at the moment they happen: the story changes direction without
    // danger and builds danger without direction change, so the two engines never combine.
    // Distinct from: TURN_CURIOSITY_DECOUPLED (Wave 569: curiosity channel — this uses suspense),
    // TURN_EMOTION_DECOUPLED (Wave 527: emotion channel), TURN_AFTERMATH_SUSPENSE_VOID (Wave 513:
    // aftermath mode — 2 scenes AFTER a turn; this checks the turn scene ITSELF), CLOCK_SUSPENSE_
    // DECOUPLED (Wave 555: clock trigger vs. turn trigger here), DRAMATIC_TURN_CAUSELESS (Wave 457:
    // backward-cause — prior build-up, not same-scene co-occurrence). Completes the dramatic-turn
    // co-occurrence family with the suspense channel alongside curiosity and emotion channels.
    if (n >= 8) {
      const turnScenes583a = (records as any[]).filter(
        r => (r.dramaticTurn ?? 'nothing') !== 'nothing' && r.dramaticTurn !== '',
      );
      const suspScenes583a = (records as any[]).filter(r => (r.suspenseDelta ?? 0) > 0);
      if (turnScenes583a.length >= 2 && suspScenes583a.length >= 2) {
        const turnIdxSet583a = new Set(turnScenes583a.map((r: any) => r.sceneIdx));
        const anyOverlap583a = suspScenes583a.some((r: any) => turnIdxSet583a.has(r.sceneIdx));
        if (!anyOverlap583a) {
          issues.push({
            location: `${turnScenes583a.length} turn scene(s), ${suspScenes583a.length} suspense scene(s) — no overlap`,
            rule: 'TURN_SUSPENSE_DECOUPLED',
            severity: 'minor',
            description: `The story has ${turnScenes583a.length} scenes that pivot the narrative (dramatic turns) and ${suspScenes583a.length} scenes that raise suspense (suspenseDelta>0), but no scene carries both. A dramatic pivot is naturally a moment of heightened tension — the reversal lands while the audience is electrified, combining direction change with felt urgency. The most charged pivots co-occur with a suspense spike in the same scene so the audience registers the change as a genuinely dangerous shift. When turns and suspense always occupy separate scenes, pivots are emotionally cool at the moment they happen: the story changes direction in scenes without tension, and builds tension in scenes without direction change, so the two engines never combine into the explosive beat that makes a reversal feel threatening.`,
            suggestedFix: `Stage at least one dramatic turn so it also spikes suspense in the same scene — let the pivot arrive at a high-tension moment, or let the reversal itself be the source of a new threat. A chase that turns when the route is blocked, a revelation that pivots and simultaneously ratchets the danger, or a confrontation that reverses and leaves the protagonist more exposed all fuse structural direction change with felt urgency.`,
          });
        }
      }
    }
  }

  {
    // CLOCK_AFTERMATH_EMOTION_VOID — sequence/aftermath × clock trigger × emotion channel.
    // n≥8, ≥3 qualifying clock-raise scenes (clockRaised=true, not in last 2 positions), ≥2
    // emotionally-charged scenes (emotionalShift≠'neutral'). Every qualifying clock scene is
    // followed by 2 scenes both emotionally neutral → fire. Raising a clock should expand the
    // emotional stakes alongside the urgency: the deadline that crystallizes is not only an
    // intellectual fact but an emotional experience — fear, dread, or galvanizing determination
    // should appear in the immediate aftermath. When every clock raise is followed by emotionally
    // inert scenes, urgency operates in affective isolation: the story grows more time-pressured
    // without the human cost of that pressure appearing in the aftermath.
    // Distinct from: TURN_AFTERMATH_EMOTION_VOID (Wave 555: turn trigger), REVELATION_AFTERMATH_
    // EMOTION_VOID (Wave 527: revelation trigger), CLIMAX_AFTERMATH_FLAT (Wave 485: climax trigger,
    // checks both emotion and relationship), CLOCK_SUSPENSE_DECOUPLED (Wave 555: same-scene co-
    // occurrence not aftermath), MIDPOINT_CLOCK_VOID (Wave 569: zone absence, not aftermath).
    // First clock-trigger aftermath check in this pass — completes the trigger-type dimension.
    if (n >= 8) {
      const qualClocks583b = (records as any[]).filter(
        (r, pos) => r.clockRaised === true && pos < n - 2,
      );
      const emotionScenes583b = (records as any[]).filter(
        r => (r.emotionalShift ?? 'neutral') !== 'neutral',
      );
      if (qualClocks583b.length >= 3 && emotionScenes583b.length >= 2) {
        const allClockNoEmotion583b = qualClocks583b.every((r: any) => {
          const pos = (records as any[]).indexOf(r);
          for (let off = 1; off <= 2; off++) {
            const nxt = (records as any[])[pos + off];
            if (nxt && (nxt.emotionalShift ?? 'neutral') !== 'neutral') return false;
          }
          return true;
        });
        if (allClockNoEmotion583b) {
          issues.push({
            location: `${qualClocks583b.length} clock-raise scene(s) — no emotional shift in any aftermath window`,
            rule: 'CLOCK_AFTERMATH_EMOTION_VOID',
            severity: 'minor',
            description: `Every scene that raises a clock (${qualClocks583b.length} scene(s)) is followed by two scenes both emotionally neutral, despite ${emotionScenes583b.length} emotionally charged scenes existing elsewhere. A deadline crystallizing is not only an intellectual structural event — it is an emotional experience that should register immediately in the characters facing it. Fear, dread, galvanizing resolve, or desperate urgency in the aftermath is how the audience feels the clock's weight rather than merely noting it. When every clock raise is followed by affective inertia, the urgency engine operates in emotional isolation: the story grows more time-pressured without the human cost of that pressure appearing in the aftermath.`,
            suggestedFix: `After at least one clock-raise scene, let the following scene carry an emotional charge — dread, fear, or galvanized determination as characters absorb the deadline. The clock's weight should register emotionally in the aftermath, not just structurally. A scene imposing a deadline followed immediately by an emotionally neutral scene misses the moment when urgency becomes feeling.`,
          });
        }
      }
    }
  }

  {
    // PEAK_SUSPENSE_CURIOSITY_VOID — single-peak isolation × suspense peak × curiosity channel.
    // n≥8, ≥2 curiosity-positive scenes (curiosityDelta>0), the scene with the single highest
    // suspenseDelta has curiosityDelta≤0 → fire. The story's most tense scene fails to open a
    // question — the peak is a closed pocket of high stakes without the wondering that pulls the
    // audience forward through the danger. Peak tension and curiosity coinciding is the hallmark
    // of a thriller's best moments: not only does the adrenaline spike but the wondering intensifies.
    // When the tensest scene generates no curiosity, the audience is locked in the moment of danger
    // without being propelled into what comes next.
    // Distinct from: PEAK_SUSPENSE_EMOTIONAL_VACUUM (Wave 443: emotion channel — this is the
    // curiosity-channel sibling of that check; same peak-isolation mode, different tested attribute),
    // CURIOSITY_PEAK_EMOTIONAL_VOID (Wave 471: the curiosity channel is the PEAK, not the tested
    // attribute — here suspense is the peak and curiosity is the tested attribute), CLOCK_CURIOSITY_
    // DECOUPLED (Wave 499: co-occurrence/decoupling across all clock scenes, not single-peak
    // isolation at the one maximum scene), TURN_CURIOSITY_DECOUPLED (Wave 569: same-scene
    // co-occurrence across all turn scenes). First single-peak isolation check combining the
    // suspense peak with the curiosity channel.
    if (n >= 8) {
      const curiosityScenes583c = (records as any[]).filter(r => (r.curiosityDelta ?? 0) > 0);
      if (curiosityScenes583c.length >= 2) {
        const peakSusp583c = Math.max(...(records as any[]).map(r => r.suspenseDelta ?? 0));
        if (peakSusp583c > 0) {
          const peakIdx583c = (records as any[]).findIndex(r => (r.suspenseDelta ?? 0) === peakSusp583c);
          const peakRec583c = (records as any[])[peakIdx583c];
          if ((peakRec583c.curiosityDelta ?? 0) <= 0) {
            issues.push({
              location: `Scene ${peakIdx583c} (peak suspenseDelta ${peakSusp583c}) — curiosityDelta ≤ 0`,
              rule: 'PEAK_SUSPENSE_CURIOSITY_VOID',
              severity: 'minor',
              description: `The story's highest-tension scene (Scene ${peakIdx583c}, suspenseDelta ${peakSusp583c}) generates no curiosity (curiosityDelta ≤ 0), while ${curiosityScenes583c.length} other scenes raise questions. The tensest scene is a closed pocket of high stakes — the audience's adrenaline spikes without their wondering intensifying. Peak suspense and peak curiosity coinciding makes for a thriller's best moments: not only does the danger spike, but a question opens that pulls the audience forward through it. When the tensest scene raises no question, the peak is climactic without being propulsive: the audience is locked into the moment of danger without the wondering that drives them to find out what comes next.`,
              suggestedFix: `Stage the peak suspense scene so it also opens a question — an unknown that the high-tension moment forces but does not yet answer. A confrontation peaking in danger while leaving the outcome uncertain, a chase that explodes in tension and reveals new information the audience wants to decipher, or a threat at its worst that implies a secret not yet understood all make the peak both gripping and propulsive.`,
            });
          }
        }
      }
    }
  }

  // ── Rewrite ───────────────────────────────────────────────────────────────
  // ── Wave 597: UNRESOLVED_CLUE_DEBT_ESCALATION_ABSENT, DIALOGUE_HIGHLIGHT_DROUGHT_RUN,
  //              DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE ──────────────────────────────────────────

  // UNRESOLVED_CLUE_DEBT_ESCALATION_ABSENT — Distribution/timing × unresolvedClues trend.
  // n≥10. Requires at least 5 total unresolvedClues entries across the story (otherwise there's
  // no meaningful debt to track). Splits the story in half; if the second half's average
  // unresolved-clue count per scene is NOT lower than the first half's → fire. Narrative debt —
  // clues planted but not yet paid off — should generally pay down as the story approaches its
  // resolution; a story where the back half carries as much or more open debt than the front half
  // is accumulating unanswered threads rather than resolving them.
  // Distinct from: REVELATION_DROUGHT (run-based × revelation absence — a different signal:
  // whether disclosures happen at all, not how much OPEN debt is outstanding), SETUP_RESOLUTION_
  // IMBALANCE (compares scene-count budget for setup vs. resolution, not the unresolvedClues
  // field directly). First check in this pass to use the unresolvedClues signal at all — this
  // file's macro-structure lens has audited revelation/clock/suspense/curiosity trends, but never
  // the trajectory of unpaid narrative debt.
  if (records.length >= 10) {
    const debtCounts597a = (records as any[]).map(r => ((r.unresolvedClues ?? []) as unknown[]).length);
    const totalDebt597a = debtCounts597a.reduce((s, v) => s + v, 0);
    if (totalDebt597a >= 5) {
      const half597a = Math.floor(debtCounts597a.length / 2);
      const firstAvg597a = debtCounts597a.slice(0, half597a).reduce((s, v) => s + v, 0) / half597a;
      const secondAvg597a = debtCounts597a.slice(half597a).reduce((s, v) => s + v, 0) / (debtCounts597a.length - half597a);
      if (secondAvg597a >= firstAvg597a) {
        issues.push({
          location: `first-half avg unresolved clues ${firstAvg597a.toFixed(1)} vs. second-half avg ${secondAvg597a.toFixed(1)}`,
          rule: 'UNRESOLVED_CLUE_DEBT_ESCALATION_ABSENT',
          severity: 'minor',
          description: `The story's outstanding narrative debt does not pay down in the back half: the first-half average of unresolved planted clues per scene (${firstAvg597a.toFixed(1)}) is not exceeded by the second-half average (${secondAvg597a.toFixed(1)}) — in fact the second half carries as much or more open debt. A well-structured mystery or thriller accumulates questions in its first half and spends its second half answering them; when open threads never meaningfully decrease, the audience's sense of the story closing in on its answers never arrives, even if individual payoffs do occur.`,
          suggestedFix: `Resolve more of the clues planted in the first half before introducing new ones in the second — let the back half's balance of new-seeds-to-payoffs tilt toward payoffs. The audience should feel the story's list of open questions shrinking as it approaches the climax, not holding steady or growing.`,
        });
      }
    }
  }

  // DIALOGUE_HIGHLIGHT_DROUGHT_RUN — Run-based × dialogueHighlights absence.
  // Built on checkDroughtRun from the shared check-template library (audit M2.2). n≥10, ≥3
  // scenes with dialogueHighlights present elsewhere, longest consecutive run of highlight-free
  // scenes ≥6 → fire. An extended stretch where no character states a belief or claim worth
  // tracking — the story's spoken-conviction engine goes dark for six or more scenes running.
  // Distinct from: every other run-based check in this pass (CLOCK_RUN, CURIOSITY_RUN, SUSPENSE_
  // RUN, POSITIVE/NEGATIVE_SCENE_RUN, PURPOSE_MONOTONE_RUN), none of which touch dialogueHighlights
  // — a signal this file had never used before this wave.
  {
    const r597b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r597b.fires) {
      issues.push({
        location: `longest dialogue-highlight drought: ${r597b.longestRun} consecutive scenes without a tracked belief statement`,
        rule: 'DIALOGUE_HIGHLIGHT_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r597b.longestRun} consecutive scenes with no dialogueHighlights — no character states a belief or claim worth tracking — even though ${r597b.presentCount} such scenes exist elsewhere. An extended stretch where nobody says anything the story bothers to track suggests the dialogue has gone structurally quiet: characters may be talking, but nothing they say advances what the audience knows about anyone's convictions.`,
        suggestedFix: `Break the drought by giving at least one character a stated belief, claim, or conviction somewhere within the ${r597b.longestRun}-scene stretch — even a brief, pointed line that reveals what a character thinks is true keeps the story's belief-tracking engine alive through a long scene run.`,
      });
    }
  }

  // DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE — Underweight/bloat × dialogueHighlights × four zones.
  // Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 highlight-bearing scenes
  // total, divided across four equal structural zones. Fires only when one zone has zero
  // highlight-bearing scenes while another holds ≥50% of the total — the zone-based sibling of
  // DIALOGUE_HIGHLIGHT_DROUGHT_RUN above; both are the first checks in this file to use the
  // dialogueHighlights signal, differentiated by mode (run-based vs. four-zone void+bloat) exactly
  // as this file's existing channel families (clock, curiosity, suspense) are each audited by
  // multiple distinct modes.
  {
    const r597c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r597c.fires) {
      const emptyNames597c = r597c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName597c = FOUR_ZONE_NAMES[r597c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames597c} empty; ${bloatName597c} has ${r597c.counts[r597c.bloatZoneIdx]}/${r597c.totalCount} dialogue-highlight scenes`,
        rule: 'DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r597c.totalCount} dialogue-highlight scenes (scenes where a character states a tracked belief) are unevenly distributed across its four structural zones: ${bloatName597c} contains ${r597c.counts[r597c.bloatZoneIdx]} of them (${Math.round((r597c.counts[r597c.bloatZoneIdx] / r597c.totalCount) * 100)}%) while ${emptyNames597c} contains none. The story's spoken-conviction engine bloats in one zone and vanishes from another: one structural quarter carries a burst of characters stating what they believe, while another passes with no one's convictions on record.`,
        suggestedFix: `Redistribute tracked belief-statements: move at least one dialogue highlight from ${bloatName597c} into the empty zone(s) — ${emptyNames597c} — so every structural quarter carries some evidence of characters stating what they think is true.`,
      });
    }
  }

  // ── Wave 611: VISUAL_BEAT_STRUCTURAL_IMBALANCE, PAYOFF_SCENE_TURN_DECOUPLED,
  //              PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID ───────────────────────────────────

  // VISUAL_BEAT_STRUCTURAL_IMBALANCE — Underweight/bloat × visualBeats × four structural zones.
  // Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 scenes with substantial
  // physical staging (visualBeats.length≥2), divided into four equal structural zones. Fires only
  // when one zone has zero visually dense scenes while another holds ≥50% of the total. First use
  // of the visualBeats field anywhere in this 110-rule pass — its last completely untouched
  // record field, despite this file's macro-structure lens already covering revelation, clock,
  // suspense, curiosity, dialogueHighlights, and unresolvedClues trends. Distinct from
  // DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE (Wave 597: same template, dialogueHighlights channel).
  {
    const r611a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r611a.fires) {
      const emptyNames611a = r611a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName611a = FOUR_ZONE_NAMES[r611a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames611a} empty; ${bloatName611a} has ${r611a.counts[r611a.bloatZoneIdx]}/${r611a.totalCount} visually dense scenes`,
        rule: 'VISUAL_BEAT_STRUCTURAL_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r611a.totalCount} physically staged scenes are unevenly distributed across its four structural zones: ${bloatName611a} contains ${r611a.counts[r611a.bloatZoneIdx]} of them (${Math.round((r611a.counts[r611a.bloatZoneIdx] / r611a.totalCount) * 100)}%) while ${emptyNames611a} contains none. Physical staging bloats in one structural quarter and vanishes from another, giving the story's macro-structural balance between staged and unstaged scenes an uneven rhythm.`,
        suggestedFix: `Redistribute physical staging: bring at least one heavily staged scene into ${emptyNames611a}, or thin out ${bloatName611a}'s concentration by letting one of its visually dense scenes lean more on dialogue instead. A more even spread keeps physical presence active across the story's full structural range.`,
      });
    }
  }

  // PAYOFF_SCENE_TURN_DECOUPLED — Co-occurrence/decoupling × payoffSetupIds × dramaticTurn. Built
  // on checkCoOccurrenceDecoupled from the shared checks library. n≥8, ≥2 payoff scenes, ≥2
  // dramatic-turn scenes. Zero overlap → fire. A thread resolving and a structural pivot never
  // happen in the same scene — every payoff lands in a scene with no reversal, revelation, or
  // turning point, and every pivot lands in a scene where nothing is being resolved. First
  // standalone use of the payoffSetupIds field in this file — it had exactly one prior use, as an
  // incidental OR-condition inside a different check, never as its own signal. Distinct from
  // PAYOFF_DRAMATIC_TURN_DECOUPLED (payoff.ts, Wave 342: same concept in a different pass, whose
  // own coverage matrix this check doesn't affect) — the two files' payoff/turn checks are
  // independent per-file coverage, not a duplicate within this pass.
  {
    const r611b = checkCoOccurrenceDecoupled({
      records, minRecords: 8, minACount: 2, minBCount: 2,
      isA: r => (r.payoffSetupIds ?? []).length > 0,
      isB: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
    });
    if (r611b.fires) {
      issues.push({
        location: `${r611b.aCount} payoff scene(s), ${r611b.bCount} dramatic-turn scene(s) — zero overlap`,
        rule: 'PAYOFF_SCENE_TURN_DECOUPLED',
        severity: 'minor',
        description: `The ${r611b.aCount} scenes where a planted thread resolves never coincide with the ${r611b.bCount} scenes carrying a dramatic turn — thread resolution and structural pivot run on entirely separate tracks. A payoff often lands hardest when it doubles as a pivot — the resolved thread reframes what a character will do next — and when the two never combine, resolutions read as closing a loop rather than propelling the story forward.`,
        suggestedFix: `Let at least one payoff scene also carry a dramatic turn — the resolved thread should reframe a choice, trigger a reversal, or reveal something that changes the story's direction, rather than simply closing an open question in isolation.`,
      });
    }
  }

  // PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID — Sequence/aftermath × payoff trigger →
  // dialogueHighlights absence. Built on checkAftermathVoid from the shared checks library. n≥8,
  // ≥2 qualifying payoff scenes (pos<n-2), ≥3 scenes anywhere with a dialogue highlight, a
  // 2-scene lookahead window. Fires when every payoff's two-scene aftermath contains no
  // highlighted dialogue, while highlighted dialogue does occur elsewhere in the story. First
  // aftermath-mode check on the dialogueHighlights channel in this file — Wave 597 covered it
  // with drought-run and zone-imbalance only. Distinct from DIALOGUE_HIGHLIGHT_DROUGHT_RUN
  // (Wave 597: global consecutive-absence run, not tied to a specific trigger) and from
  // PAYOFF_SCENE_TURN_DECOUPLED above (payoff is the same-scene co-occurrence subject there, not
  // the windowed trigger here).
  {
    const r611c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 3, window: 2,
      isTrigger: r => (r.payoffSetupIds ?? []).length > 0,
      isAftermath: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r611c.fires) {
      issues.push({
        location: `${r611c.triggerCount} payoff scene(s) — no highlighted dialogue within 2 scenes of any`,
        rule: 'PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r611c.triggerCount} payoff scenes is followed by two scenes with no highlighted dialogue, even though ${r611c.aftermathCount} such scenes exist elsewhere in the script. A resolution's aftermath is where a character often gets to say what the resolved thread meant; when that aftermath never carries a memorable line, the payoff's emotional residue goes unvoiced.`,
        suggestedFix: `After at least one payoff, let one of the following two scenes carry a line worth remembering — a character naming what the resolution cost or what it means now that it's settled. Give the payoff's aftermath a voice, not just a structural close.`,
      });
    }
  }

  // ── Wave 625: STRUCTURAL_STAGING_OPEN_THREAD_DECOUPLED, DRAMATIC_TURN_STAGING_AFTERMATH_VOID,
  //              STRUCTURAL_STAGING_PEAK_UNCAUSED ───────────────────────────────────────────

  // STRUCTURAL_STAGING_OPEN_THREAD_DECOUPLED — Co-occurrence/decoupling × visualBeats ×
  // unresolvedClues. Built on checkCoOccurrenceDecoupled from the shared checks library. n≥6, ≥2
  // visually-staged scenes (visualBeats.length≥2), ≥2 scenes carrying outstanding clue-debt. Zero
  // overlap → fire. First pairing of these two fields in this 113-rule pass. Physical staging and
  // open narrative debt never occupy the same scene, so a mystery hanging open never gets a
  // physical anchor in the story's macro-structure.
  {
    const r625a = checkCoOccurrenceDecoupled({
      records, minRecords: 6, minACount: 2, minBCount: 2,
      isA: r => (r.visualBeats ?? []).length >= 2,
      isB: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r625a.fires) {
      issues.push({
        location: `${r625a.aCount} visually-staged scene(s), ${r625a.bCount} open-thread scene(s) — zero overlap`,
        rule: 'STRUCTURAL_STAGING_OPEN_THREAD_DECOUPLED',
        severity: 'minor',
        description: `The ${r625a.aCount} scenes leaning heavily on physical staging never coincide with the ${r625a.bCount} scenes carrying outstanding clue-debt — physical presence and unresolved mystery run on separate tracks throughout the story's structure. A scene rich in staging is a natural place to give an open thread a physical anchor, but that opportunity is never taken.`,
        suggestedFix: `Let at least one heavily staged scene also carry open clue-debt — physical details tied to what's still unresolved, giving the mystery a tangible presence rather than existing only as a dangling narrative thread.`,
      });
    }
  }

  // DRAMATIC_TURN_STAGING_AFTERMATH_VOID — Sequence/aftermath × dramaticTurn trigger →
  // visualBeats absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying dramatic-turn scenes (pos<n-2), ≥3 scenes anywhere with substantial physical
  // staging, a 2-scene lookahead window. Fires when every turn's two-scene aftermath contains no
  // visually dense scene, while such scenes do occur elsewhere. First pairing of dramaticTurn
  // with visualBeats in this file, despite dramaticTurn already being paired with clockDelta,
  // clockRaised, emotionalShift, and payoffSetupIds. A pivot's consequences often play out
  // physically; when that aftermath consistently stays unstaged, the turn's impact is only
  // discussed, never shown.
  {
    const r625b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 3, window: 2,
      isTrigger: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
      isAftermath: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r625b.fires) {
      issues.push({
        location: `${r625b.triggerCount} dramatic-turn scene(s) — no visually dense scene within 2 scenes of any`,
        rule: 'DRAMATIC_TURN_STAGING_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r625b.triggerCount} dramatic-turn scenes is followed by two scenes with no substantial physical staging, even though ${r625b.aftermathCount} such scenes exist elsewhere in the script. A pivot's consequences often play out physically — a character acting differently because of what just changed — and when that aftermath consistently stays unstaged, the turn's impact is only ever discussed.`,
        suggestedFix: `After at least one dramatic turn, let one of the following two scenes carry substantial physical staging — the pivot's consequences made visible through action rather than only through what characters say.`,
      });
    }
  }

  // STRUCTURAL_STAGING_PEAK_UNCAUSED — Backward-cause × visualBeats-density peak ×
  // revelation/dramaticTurn cause. Built on checkPeakUncaused from the shared checks library.
  // n≥8, ≥2 scenes with visualBeats present, a 2-scene lookback. Finds the single scene with the
  // most physical staging beats and fires when neither that scene nor either of the 2 scenes
  // before it contains a revelation or a dramatic turn. First backward-cause check in this file —
  // the story's single most visually dense scene should be motivated by something the macro-
  // structure is dramatizing, not simply appear as unmotivated staging.
  {
    const r625c = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.visualBeats ?? []).length,
      hasCause: r => r.revelation != null || (r.dramaticTurn ?? 'nothing') !== 'nothing',
    });
    if (r625c.fires) {
      issues.push({
        location: `Scene at position ${r625c.peakIdx + 1} — peak physical staging (${r625c.peakMagnitude} beats) with no revelation or dramatic turn nearby`,
        rule: 'STRUCTURAL_STAGING_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The scene with the story's single densest physical staging (${r625c.peakMagnitude} visual beats, out of ${r625c.qualifyingCount} scenes with any staging at all) has no revelation and no dramatic turn in itself or in either of the 2 scenes before it. The moment the macro-structure invests most heavily in physical description arrives with no disclosure or pivot explaining why.`,
        suggestedFix: `Add a revelation or a dramatic turn in the scene with the densest physical staging, or in one of the two scenes before it, so the audience understands why this particular moment earns such heavy physical attention.`,
      });
    }
  }

  // ── Wave 639: STRUCTURE_DIALOGUE_HIGHLIGHT_ZONE_CLUSTER, STRUCTURE_HIGHLIGHT_OPEN_THREAD_
  //              DECOUPLED, STRUCTURE_OPEN_THREAD_HIGHLIGHT_AFTERMATH_VOID ──────────────────

  // STRUCTURE_DIALOGUE_HIGHLIGHT_ZONE_CLUSTER — Distribution/timing × dialogueHighlights ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // dialogue-highlight scenes, more than 75% falling in a single structural third → fire. First
  // use of the zone-cluster mode applied to any record field in this 116-rule pass — every prior
  // distribution-style check here used the four-zone imbalance template instead. Memorable
  // dialogue clustered overwhelmingly in one third of the macro-structure means the audience
  // learns which stretch of the script carries the story's verbal high points.
  {
    const r639a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r639a.fires) {
      const zoneName639a = r639a.zoneNames[r639a.maxZoneIdx];
      issues.push({
        location: `${zoneName639a} third — ${r639a.maxZoneCount}/${r639a.count} dialogue-highlight scenes`,
        rule: 'STRUCTURE_DIALOGUE_HIGHLIGHT_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r639a.maxZoneCount} of the story's ${r639a.count} dialogue-highlight scenes (${Math.round((r639a.maxZoneCount / r639a.count) * 100)}%) cluster in the ${zoneName639a} third. Memorable dialogue concentrates almost exclusively in that stretch of the macro-structure, leaving the other thirds without a comparable verbal high point.`,
        suggestedFix: `Let at least one standout line of dialogue land outside the ${zoneName639a} third, spreading the story's verbal high points more evenly across its macro-structure.`,
      });
    }
  }

  // STRUCTURE_HIGHLIGHT_OPEN_THREAD_DECOUPLED — Co-occurrence/decoupling × dialogueHighlights ×
  // unresolvedClues. Built on checkCoOccurrenceDecoupled from the shared checks library. n≥6, ≥2
  // scenes carrying a dialogue highlight, ≥2 scenes carrying outstanding clue-debt. Zero overlap
  // → fire. First pairing of these two fields in this pass. A line the story flags as memorable
  // never lands while a mystery sits open at the macro-structural level.
  {
    const r639b = checkCoOccurrenceDecoupled({
      records, minRecords: 6, minACount: 2, minBCount: 2,
      isA: r => (r.dialogueHighlights ?? []).length > 0,
      isB: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r639b.fires) {
      issues.push({
        location: `${r639b.aCount} dialogue-highlight scene(s), ${r639b.bCount} open-thread scene(s) — zero overlap`,
        rule: 'STRUCTURE_HIGHLIGHT_OPEN_THREAD_DECOUPLED',
        severity: 'minor',
        description: `The ${r639b.aCount} scenes flagged as containing a standout line of dialogue never coincide with the ${r639b.bCount} scenes carrying outstanding clue-debt — the story's most memorable dialogue and its open setups run on separate macro-structural tracks.`,
        suggestedFix: `Let at least one standout line of dialogue land in a scene that is also carrying open clue-debt — a character voicing suspicion or naming what's still unresolved.`,
      });
    }
  }

  // STRUCTURE_OPEN_THREAD_HIGHLIGHT_AFTERMATH_VOID — Sequence/aftermath × heavy unresolved-
  // clue-debt trigger → dialogueHighlights absence. Built on checkAftermathVoid from the shared
  // checks library. n≥8, ≥2 qualifying heavy-debt scenes (unresolvedClues.length≥3, pos<n-2), ≥3
  // scenes anywhere with a dialogue highlight, a 2-scene lookahead window. Fires when every
  // heavy-debt scene's two-scene aftermath contains no highlighted dialogue, while such scenes do
  // occur elsewhere. First pairing of these two fields in this pass.
  {
    const r639c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 3, window: 2,
      isTrigger: r => (r.unresolvedClues ?? []).length >= 3,
      isAftermath: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r639c.fires) {
      issues.push({
        location: `${r639c.triggerCount} heavy clue-debt scene(s) — no highlighted dialogue within 2 scenes of any`,
        rule: 'STRUCTURE_OPEN_THREAD_HIGHLIGHT_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every scene carrying heavy unresolved clue-debt (${r639c.triggerCount} instances) is followed by two full scenes with no highlighted dialogue, even though ${r639c.aftermathCount} such scenes occur elsewhere in the story. The heaviest concentrations of open mystery never earn a memorable line nearby at the macro-structural level.`,
        suggestedFix: `In the two scenes following at least one heavy clue-debt moment, give a character a line worth remembering — pressing on what's unresolved or voicing the stakes of not knowing.`,
      });
    }
  }

  // ── Wave 653: STRUCTURE_HIGHLIGHT_PEAK_UNCAUSED, STRUCTURE_OPEN_THREAD_DROUGHT_RUN,
  //              STRUCTURE_SEED_ZONE_CLUSTER ─────────────────────────────────────────────────

  // STRUCTURE_HIGHLIGHT_PEAK_UNCAUSED — Single-peak isolation/backward-cause × dialogueHighlights
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 scenes carrying
  // a dialogue highlight, a 2-scene lookback. Finds the single scene with the most highlighted
  // lines; fires when neither that scene nor either of the two before it contains a dramatic turn
  // or revelation. Wave 625's STRUCTURAL_STAGING_PEAK_UNCAUSED applied the peak-uncaused mode to
  // visualBeats; this is the first application to the highlighted-dialogue channel.
  {
    const r653a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.dialogueHighlights ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r653a.fires) {
      issues.push({
        location: `scene ${r653a.peakIdx + 1} — peak highlighted-dialogue density (${r653a.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'STRUCTURE_HIGHLIGHT_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for highlighted dialogue (scene ${r653a.peakIdx + 1}, with ${r653a.peakMagnitude} standout lines) has no dramatic turn or revelation in itself or the two scenes before it. The moment where the script's most memorable dialogue concentrates arrives without any structural pivot or disclosure driving it — the peak of verbal craft and the peak of structural causality never coincide.`,
        suggestedFix: `Give scene ${r653a.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most quotable moment is earned by a structural shift rather than arriving in a causal vacuum.`,
      });
    }
  }

  // STRUCTURE_OPEN_THREAD_DROUGHT_RUN — Run-based × unresolvedClues absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 open-thread scenes overall, fires
  // when the longest consecutive run of scenes with zero outstanding clue-debt reaches 6. Wave
  // 597's DIALOGUE_HIGHLIGHT_DROUGHT_RUN applied the drought-run mode to dialogueHighlights;
  // unresolvedClues itself has never been drought-audited here despite being used in
  // co-occurrence (Wave 639) and aftermath (Wave 639) contexts.
  {
    const r653b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r653b.fires) {
      issues.push({
        location: `longest stretch with no outstanding clue-debt: ${r653b.longestRun} consecutive scenes`,
        rule: 'STRUCTURE_OPEN_THREAD_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r653b.longestRun} consecutive scenes with no outstanding clue-debt at all, even though ${r653b.presentCount} scenes elsewhere do carry open mysteries. A long stretch where nothing is left unresolved means the story's structural sense of active mystery goes dark for an extended run.`,
        suggestedFix: `Seed a new thread somewhere within the ${r653b.longestRun}-scene stretch so the story maintains some outstanding mystery throughout, keeping its structural sense of open questions alive.`,
      });
    }
  }

  // STRUCTURE_SEED_ZONE_CLUSTER — Distribution/timing × seededClueIds × structural thirds. Built
  // on checkZoneCluster from the shared checks library. n≥9, ≥3 seed scenes, fires when >75% of
  // them fall in a single structural third. Wave 639's STRUCTURE_DIALOGUE_HIGHLIGHT_ZONE_CLUSTER
  // applied the zone-cluster mode to dialogueHighlights; seededClueIds itself has never been
  // cluster-audited here.
  {
    const r653c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.seededClueIds ?? []).length > 0,
    });
    if (r653c.fires) {
      const zoneName653c = r653c.zoneNames[r653c.maxZoneIdx];
      issues.push({
        location: `${zoneName653c} third — ${r653c.maxZoneCount}/${r653c.count} seed scenes`,
        rule: 'STRUCTURE_SEED_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r653c.maxZoneCount} of the story's ${r653c.count} clue-planting scenes (${Math.round((r653c.maxZoneCount / r653c.count) * 100)}%) cluster in the ${zoneName653c} third. Foreshadowing concentrates almost exclusively in that stretch of the story rather than surfacing throughout, leaving other structural thirds with no new seed being planted.`,
        suggestedFix: `Plant at least one clue outside the ${zoneName653c} third — spreading foreshadowing across the story lets each structural third carry its own share of setup for later payoffs.`,
      });
    }
  }

  // ── Wave 667: STRUCTURE_PAYOFF_PEAK_UNCAUSED, STRUCTURE_RELATIONSHIP_DROUGHT_RUN,
  //              STRUCTURE_CLOCK_ZONE_CLUSTER ────────────────────────────────────────────────

  // STRUCTURE_PAYOFF_PEAK_UNCAUSED — Single-peak isolation/backward-cause × payoffSetupIds
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 payoff scenes,
  // a 2-scene lookback. Finds the single scene with the most simultaneous thread resolutions;
  // fires when neither that scene nor either of the two before it contains a dramatic turn or
  // revelation. Waves 625/653 applied the peak-uncaused mode to visualBeats and dialogueHighlights;
  // payoffSetupIds itself has never been backward-cause peak-audited.
  {
    const r667a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.payoffSetupIds ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r667a.fires) {
      issues.push({
        location: `scene ${r667a.peakIdx + 1} — peak payoff density (${r667a.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'STRUCTURE_PAYOFF_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for thread resolution (scene ${r667a.peakIdx + 1}, with ${r667a.peakMagnitude} payoffs resolving at once) has no dramatic turn or revelation in itself or the two scenes before it. The moment where the most convergent resolution lands arrives without any structural pivot or disclosure driving it — the peak of narrative payoff carries no causal weight behind it.`,
        suggestedFix: `Give scene ${r667a.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most convergent resolution is earned by a structural shift rather than arriving in a causal vacuum.`,
      });
    }
  }

  // STRUCTURE_RELATIONSHIP_DROUGHT_RUN — Run-based × relationshipShifts absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 relationship-shift scenes overall,
  // fires when the longest consecutive run of scenes with zero bond changes reaches 6. The
  // drought-run mode has covered emotion/suspense/curiosity/clock/purpose channels via hand-rolled
  // logic and unresolvedClues via the shared helper (Wave 653); relationshipShifts itself has
  // never been drought-audited despite being used extensively elsewhere.
  {
    const r667b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r667b.fires) {
      issues.push({
        location: `longest stretch with no relationship shift: ${r667b.longestRun} consecutive scenes`,
        rule: 'STRUCTURE_RELATIONSHIP_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r667b.longestRun} consecutive scenes with no relationship shift at all, even though ${r667b.presentCount} scenes elsewhere do move a bond. A long unbroken stretch where no relationship moves leaves the story's structural rhythm running on plot mechanics alone for an extended run.`,
        suggestedFix: `Let a bond shift somewhere within the ${r667b.longestRun}-scene stretch — even a small movement keeps the story's structural rhythm tied to its characters' relationships throughout.`,
      });
    }
  }

  // STRUCTURE_CLOCK_ZONE_CLUSTER — Distribution/timing × clockRaised × structural thirds. Built
  // on checkZoneCluster from the shared checks library. n≥9, ≥3 clock-raised scenes, fires when
  // >75% of them fall in a single structural third. Wave 639 applied the zone-cluster mode to
  // dialogueHighlights; clockRaised itself has never been cluster-audited despite anchoring an
  // entire hand-rolled run-based check family (CLOCK_RUN).
  {
    const r667c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.clockRaised === true,
    });
    if (r667c.fires) {
      const zoneName667c = r667c.zoneNames[r667c.maxZoneIdx];
      issues.push({
        location: `${zoneName667c} third — ${r667c.maxZoneCount}/${r667c.count} clock-raised scenes`,
        rule: 'STRUCTURE_CLOCK_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r667c.maxZoneCount} of the story's ${r667c.count} clock-raised scenes (${Math.round((r667c.maxZoneCount / r667c.count) * 100)}%) cluster in the ${zoneName667c} third. Time pressure concentrates almost exclusively in that stretch of the story rather than surfacing throughout, leaving other structural thirds with no urgency bearing on the plot.`,
        suggestedFix: `Raise a clock in at least one scene outside the ${zoneName667c} third — spreading time pressure across the story lets every structural third carry some urgency.`,
      });
    }
  }

  // ── Wave 681: STRUCTURE_CLOCK_DELTA_PEAK_UNCAUSED, STRUCTURE_STAGING_DROUGHT_RUN,
  //              STRUCTURE_STAKES_ZONE_CLUSTER ───────────────────────────────────────────────

  // STRUCTURE_CLOCK_DELTA_PEAK_UNCAUSED — Single-peak isolation/backward-cause × clockDelta
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 scenes with
  // clockDelta>0, a 2-scene lookback. Finds the single scene with the highest clockDelta; fires
  // when neither that scene nor either of the two before it contains a dramatic turn or
  // revelation. clockDelta has only ever appeared as an OR-condition alongside clockRaised
  // inside decoupled/aftermath triggers; the backward-cause peak mode applied to it standalone
  // for the first time.
  {
    const r681a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => r.clockDelta ?? 0,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r681a.fires) {
      issues.push({
        location: `scene ${r681a.peakIdx + 1} — peak clockDelta (${r681a.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'STRUCTURE_CLOCK_DELTA_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The scene with the story's single highest clockDelta (scene ${r681a.peakIdx + 1}, at ${r681a.peakMagnitude}) has no dramatic turn or revelation in itself or the two scenes before it. The moment time pressure compresses most sharply arrives without any structural pivot or disclosure driving it — the peak of urgency carries no causal weight behind it.`,
        suggestedFix: `Give scene ${r681a.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's sharpest deadline compression is earned by a structural shift rather than arriving in a causal vacuum.`,
      });
    }
  }

  // STRUCTURE_STAGING_DROUGHT_RUN — Run-based × visualBeats absence. Built on checkDroughtRun
  // from the shared checks library. n≥10, ≥3 visually-staged scenes overall, fires when the
  // longest consecutive run of scenes with zero physical staging reaches 6. Waves 625/667 applied
  // the peak-uncaused and zone-imbalance modes to visualBeats; the drought-run mode has never
  // been applied to this channel.
  {
    const r681b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.visualBeats ?? []).length > 0,
    });
    if (r681b.fires) {
      issues.push({
        location: `longest stretch with no visual staging: ${r681b.longestRun} consecutive scenes`,
        rule: 'STRUCTURE_STAGING_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r681b.longestRun} consecutive scenes with no visual staging beats at all, even though ${r681b.presentCount} scenes elsewhere do carry physical staging. A long unbroken stretch with nothing physically shown leaves the story's structural rhythm running on pure dialogue and exposition for an extended run.`,
        suggestedFix: `Add a physical staging beat somewhere within the ${r681b.longestRun}-scene stretch — a gesture, an object, a piece of blocking — so the story's structure stays visually grounded throughout.`,
      });
    }
  }

  // STRUCTURE_STAKES_ZONE_CLUSTER — Distribution/timing × purpose === 'raise_stakes' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // stakes-raising scenes, fires when >75% of them fall in a single structural third. `purpose`
  // has only ever appeared inside incidental filter/set-collection contexts here, never as the
  // standalone subject of its own check.
  {
    const r681c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'raise_stakes',
    });
    if (r681c.fires) {
      const zoneName681c = r681c.zoneNames[r681c.maxZoneIdx];
      issues.push({
        location: `${zoneName681c} third — ${r681c.maxZoneCount}/${r681c.count} stakes-raising scenes`,
        rule: 'STRUCTURE_STAKES_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r681c.maxZoneCount} of the story's ${r681c.count} scenes purposed to raise stakes (${Math.round((r681c.maxZoneCount / r681c.count) * 100)}%) cluster in the ${zoneName681c} third. Escalation concentrates almost exclusively in that stretch of the story rather than compounding throughout, leaving other structural thirds with no mounting pressure.`,
        suggestedFix: `Purpose at least one scene outside the ${zoneName681c} third to raise stakes — spreading escalation across the story lets every structural third carry its own share of mounting pressure.`,
      });
    }
  }

  // ── Wave 695: STRUCTURE_OPEN_THREAD_PEAK_UNCAUSED, STRUCTURE_SEED_DROUGHT_RUN,
  //              STRUCTURE_STAGING_ZONE_CLUSTER ────────────────────────────────────────────────

  // STRUCTURE_OPEN_THREAD_PEAK_UNCAUSED — Single-peak isolation/backward-cause × unresolvedClues
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 scenes carrying
  // outstanding clue-debt, a 2-scene lookback. Finds the single scene with the most simultaneous
  // open threads; fires when neither that scene nor either of the two before it contains a
  // dramatic turn or revelation. unresolvedClues anchors a drought-run check (Wave 653) plus
  // decoupling/aftermath checks (Wave 639); the backward-cause peak mode has never been applied.
  {
    const r695a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.unresolvedClues ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r695a.fires) {
      issues.push({
        location: `scene ${r695a.peakIdx + 1} — peak open-thread density (${r695a.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'STRUCTURE_OPEN_THREAD_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for outstanding clue-debt (scene ${r695a.peakIdx + 1}, with ${r695a.peakMagnitude} open threads) has no dramatic turn or revelation in itself or the two scenes before it. The moment where unresolved mystery concentrates most heavily arrives without any structural pivot or disclosure driving it — the peak of accumulated question carries no causal weight behind it.`,
        suggestedFix: `Give scene ${r695a.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most mystery-dense moment is earned by a structural shift rather than arriving in a causal vacuum.`,
      });
    }
  }

  // STRUCTURE_SEED_DROUGHT_RUN — Run-based × seededClueIds absence. Built on checkDroughtRun from
  // the shared checks library. n≥10, ≥3 seed scenes overall, fires when the longest consecutive
  // run of scenes with zero clue seeded reaches 6. Wave 653 applied the zone-cluster mode to
  // seededClueIds; the drought-run mode has never been applied to this channel.
  {
    const r695b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.seededClueIds ?? []).length > 0,
    });
    if (r695b.fires) {
      issues.push({
        location: `longest stretch with no clue seeded: ${r695b.longestRun} consecutive scenes`,
        rule: 'STRUCTURE_SEED_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r695b.longestRun} consecutive scenes with no clue seeded at all, even though ${r695b.presentCount} scenes elsewhere do plant new material. A long unbroken stretch where nothing new is planted leaves the story's structure coasting on prior setups with nothing fresh to draw on.`,
        suggestedFix: `Seed a new clue or thread somewhere within the ${r695b.longestRun}-scene stretch so the story's structure keeps planting forward momentum throughout, not only in isolated bursts.`,
      });
    }
  }

  // STRUCTURE_STAGING_ZONE_CLUSTER — Distribution/timing × visualBeats × structural thirds. Built
  // on checkZoneCluster from the shared checks library. n≥9, ≥3 visually-staged scenes, fires when
  // >75% of them fall in a single structural third. visualBeats anchors a four-zone imbalance
  // check (Wave 611), a backward-cause peak check (Wave 625), and a drought-run check (Wave 681);
  // the thirds-based zone-cluster mode has never been applied to it.
  {
    const r695c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r695c.fires) {
      const zoneName695c = r695c.zoneNames[r695c.maxZoneIdx];
      issues.push({
        location: `${zoneName695c} third — ${r695c.maxZoneCount}/${r695c.count} visually dense scenes`,
        rule: 'STRUCTURE_STAGING_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r695c.maxZoneCount} of the story's ${r695c.count} visually dense scenes (${Math.round((r695c.maxZoneCount / r695c.count) * 100)}%) cluster in the ${zoneName695c} third. Physical staging concentrates almost exclusively in that stretch of the story rather than surfacing throughout, leaving other structural thirds with no physically embodied anchor.`,
        suggestedFix: `Give at least one scene outside the ${zoneName695c} third substantial physical staging — spreading staged action across the story lets each structural third carry its own physical weight.`,
      });
    }
  }

  // ── Wave 709: STRUCTURE_HIGHLIGHT_DROUGHT_RUN, STRUCTURE_OPEN_THREAD_ZONE_CLUSTER,
  //              STRUCTURE_SEED_PEAK_UNCAUSED ──────────────────────────────────────────────────

  // STRUCTURE_HIGHLIGHT_DROUGHT_RUN — Run-based × dialogueHighlights absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 highlighted-dialogue scenes overall,
  // fires when the longest consecutive run of scenes with no highlighted dialogue reaches 6.
  // Waves 639/653 applied the zone-cluster and backward-cause peak modes to dialogueHighlights;
  // the drought-run mode has never been applied to it, completing the trio.
  {
    const r709a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r709a.fires) {
      issues.push({
        location: `longest stretch with no highlighted dialogue: ${r709a.longestRun} consecutive scenes`,
        rule: 'STRUCTURE_HIGHLIGHT_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r709a.longestRun} consecutive scenes with no highlighted dialogue at all, even though ${r709a.presentCount} scenes elsewhere carry a standout line. A long unbroken stretch with nothing verbally memorable leaves the story's structure running on unremarkable dialogue for an extended run.`,
        suggestedFix: `Give at least one scene within the ${r709a.longestRun}-scene stretch a standout line of dialogue — keeping the structure's verbal register alive throughout that stretch.`,
      });
    }
  }

  // STRUCTURE_OPEN_THREAD_ZONE_CLUSTER — Distribution/timing × unresolvedClues × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 open-thread scenes,
  // fires when >75% of them fall in a single structural third. Waves 653/695 applied the
  // drought-run and backward-cause peak modes to unresolvedClues; the zone-cluster mode has never
  // been applied to it, completing the trio.
  {
    const r709b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r709b.fires) {
      const zoneName709b = r709b.zoneNames[r709b.maxZoneIdx];
      issues.push({
        location: `${zoneName709b} third — ${r709b.maxZoneCount}/${r709b.count} open-thread scenes`,
        rule: 'STRUCTURE_OPEN_THREAD_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r709b.maxZoneCount} of the story's ${r709b.count} scenes carrying outstanding clue-debt (${Math.round((r709b.maxZoneCount / r709b.count) * 100)}%) cluster in the ${zoneName709b} third. Open questions concentrate almost exclusively in that stretch of the story rather than persisting throughout, leaving other structural thirds with no live mystery pressing on the plot.`,
        suggestedFix: `Let a clue remain unresolved into a scene outside the ${zoneName709b} third — spreading open threads across the story gives every structural third some unresolved pressure.`,
      });
    }
  }

  // STRUCTURE_SEED_PEAK_UNCAUSED — Single-peak isolation/backward-cause × seededClueIds
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 seed scenes, a
  // 2-scene lookback. Finds the single scene with the most simultaneous clues planted; fires when
  // neither that scene nor either of the two before it contains a dramatic turn or revelation.
  // Waves 653/695 applied the zone-cluster and drought-run modes to seededClueIds; the
  // backward-cause peak mode has never been applied to it, completing the trio.
  {
    const r709c = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.seededClueIds ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r709c.fires) {
      issues.push({
        location: `scene ${r709c.peakIdx + 1} — peak seed density (${r709c.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'STRUCTURE_SEED_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for planting new clues (scene ${r709c.peakIdx + 1}, with ${r709c.peakMagnitude} clues seeded at once) has no dramatic turn or revelation in itself or the two scenes before it. The moment where foreshadowing concentrates most heavily arrives without any structural pivot or disclosure driving it — the peak of setup carries no causal weight behind it.`,
        suggestedFix: `Give scene ${r709c.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most seed-dense moment is earned by a structural shift rather than arriving in a causal vacuum.`,
      });
    }
  }

  // ── Wave 723: STRUCTURE_PAYOFF_ZONE_CLUSTER, STRUCTURE_RELATIONSHIP_ZONE_CLUSTER,
  //              STRUCTURE_CLOCK_DROUGHT_RUN ─────────────────────────────────────────────────

  // STRUCTURE_PAYOFF_ZONE_CLUSTER — Distribution/timing × payoffSetupIds × structural thirds.
  // Built on checkZoneCluster from the shared checks library. n≥9, ≥3 payoff scenes, fires when
  // >75% of them fall in a single structural third. Wave 667 applied the backward-cause peak
  // mode to payoffSetupIds; the zone-cluster mode has never been applied to it.
  {
    const r723a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.payoffSetupIds ?? []).length > 0,
    });
    if (r723a.fires) {
      const zoneName723a = r723a.zoneNames[r723a.maxZoneIdx];
      issues.push({
        location: `${zoneName723a} third — ${r723a.maxZoneCount}/${r723a.count} payoff scenes`,
        rule: 'STRUCTURE_PAYOFF_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r723a.maxZoneCount} of the story's ${r723a.count} thread-resolution scenes (${Math.round((r723a.maxZoneCount / r723a.count) * 100)}%) cluster in the ${zoneName723a} third. Resolution concentrates almost exclusively in that stretch of the story rather than landing throughout, leaving other structural thirds with no sense of accumulated payoff.`,
        suggestedFix: `Let at least one thread resolve outside the ${zoneName723a} third — spreading resolutions across the story lets each structural third carry its own sense of the story's structure paying off.`,
      });
    }
  }

  // STRUCTURE_RELATIONSHIP_ZONE_CLUSTER — Distribution/timing × relationshipShifts × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 relationship-shift
  // scenes, fires when >75% of them fall in a single structural third. Wave 667 applied the
  // drought-run mode to relationshipShifts; the zone-cluster mode has never been applied to it.
  {
    const r723b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r723b.fires) {
      const zoneName723b = r723b.zoneNames[r723b.maxZoneIdx];
      issues.push({
        location: `${zoneName723b} third — ${r723b.maxZoneCount}/${r723b.count} relationship-shift scenes`,
        rule: 'STRUCTURE_RELATIONSHIP_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r723b.maxZoneCount} of the story's ${r723b.count} relationship-shift scenes (${Math.round((r723b.maxZoneCount / r723b.count) * 100)}%) cluster in the ${zoneName723b} third. Bond changes concentrate almost exclusively in that stretch rather than surfacing throughout, leaving other structural thirds with no relational movement bearing on the plot.`,
        suggestedFix: `Let a bond shift in at least one scene outside the ${zoneName723b} third — spreading relational movement across the story lets each structural third carry its own sense of changing dynamics.`,
      });
    }
  }

  // STRUCTURE_CLOCK_DROUGHT_RUN — Run-based × clockRaised absence. Built on checkDroughtRun from
  // the shared checks library. n≥10, ≥3 clock-raised scenes overall, fires when the longest
  // consecutive run of scenes with no clock raised reaches 6. Wave 667 applied the zone-cluster
  // mode to clockRaised; the drought-run mode has never been applied to it.
  {
    const r723c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.clockRaised === true,
    });
    if (r723c.fires) {
      issues.push({
        location: `longest stretch with no clock raised: ${r723c.longestRun} consecutive scenes`,
        rule: 'STRUCTURE_CLOCK_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r723c.longestRun} consecutive scenes with no clock raised at all, even though ${r723c.presentCount} scenes elsewhere do establish time pressure. A long unbroken stretch with no deadline in play leaves the story's structure without any urgency for an extended run.`,
        suggestedFix: `Raise a clock somewhere within the ${r723c.longestRun}-scene stretch — a deadline, a closing window, a ticking consequence — so the story's structure stays under some time pressure throughout that stretch.`,
      });
    }
  }

  // ── Wave 737: STRUCTURE_PAYOFF_DROUGHT_RUN, STRUCTURE_RELATIONSHIP_PEAK_UNCAUSED,
  //              STRUCTURE_CLOCK_DELTA_DROUGHT_RUN ─────────────────────────────────────────

  // STRUCTURE_PAYOFF_DROUGHT_RUN — Run-based × payoffSetupIds absence. Built on checkDroughtRun
  // from the shared checks library. n≥10, ≥3 payoff scenes overall, fires when the longest
  // consecutive run of scenes with no thread resolution reaches 6. Waves 667/723 applied the
  // backward-cause peak and zone-cluster modes to payoffSetupIds; the drought-run mode has never
  // been applied to it, completing the trio.
  {
    const r737a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.payoffSetupIds ?? []).length > 0,
    });
    if (r737a.fires) {
      issues.push({
        location: `longest stretch with no payoff: ${r737a.longestRun} consecutive scenes`,
        rule: 'STRUCTURE_PAYOFF_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r737a.longestRun} consecutive scenes with no thread resolution at all, even though ${r737a.presentCount} scenes elsewhere do deliver a payoff. A long unbroken stretch with nothing resolving leaves the story's structure without a satisfying beat for an extended run.`,
        suggestedFix: `Resolve at least one planted thread within the ${r737a.longestRun}-scene stretch so the structure keeps delivering satisfaction throughout that stretch.`,
      });
    }
  }

  // STRUCTURE_RELATIONSHIP_PEAK_UNCAUSED — Single-peak isolation/backward-cause ×
  // relationshipShifts magnitude. Built on checkPeakUncaused from the shared checks library. n≥8,
  // ≥2 scenes carrying a relationship shift, a 2-scene lookback. Finds the single scene with the
  // most simultaneous bond changes; fires when neither that scene nor either of the two before it
  // contains a dramatic turn or revelation. Waves 667/723 applied the run-based drought and
  // zone-cluster modes to relationshipShifts; the backward-cause peak mode has never been applied
  // to it, completing the trio.
  {
    const r737b = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.relationshipShifts ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r737b.fires) {
      issues.push({
        location: `scene ${r737b.peakIdx + 1} — peak relationship-shift density (${r737b.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'STRUCTURE_RELATIONSHIP_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for relationship shifts (scene ${r737b.peakIdx + 1}, with ${r737b.peakMagnitude} simultaneous bond changes) has no dramatic turn or revelation in itself or the two scenes before it. The moment where relational upheaval concentrates most heavily arrives without any structural pivot or disclosure driving it — an uncaused spike that undercuts the sense that the story's structure is causally connected.`,
        suggestedFix: `Give scene ${r737b.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most relationally dense moment is earned by a structural shift rather than arriving in a causal vacuum.`,
      });
    }
  }

  // STRUCTURE_CLOCK_DELTA_DROUGHT_RUN — Run-based × clockDelta≠0 absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 clock-shifting scenes overall, fires
  // when the longest consecutive run of scenes with zero clock movement reaches 6. Wave 681
  // applied the backward-cause peak mode to clockDelta; the drought-run mode has never been
  // applied to it.
  {
    const r737c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.clockDelta ?? 0) !== 0,
    });
    if (r737c.fires) {
      issues.push({
        location: `longest stretch with no clock movement: ${r737c.longestRun} consecutive scenes`,
        rule: 'STRUCTURE_CLOCK_DELTA_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r737c.longestRun} consecutive scenes with zero movement on the ticking clock at all, even though ${r737c.presentCount} scenes elsewhere do shift it. A long unbroken stretch where nothing tightens or loosens the deadline leaves the story's structure without any mechanical pressure driving events forward for an extended run.`,
        suggestedFix: `Move the clock — tighten or ease the deadline — somewhere within the ${r737c.longestRun}-scene stretch so the structure keeps a mechanical pressure acting on events throughout that stretch.`,
      });
    }
  }

  // ── Wave 751: STRUCTURE_CLOCK_DELTA_ZONE_CLUSTER, STRUCTURE_TURN_DROUGHT_RUN,
  //              STRUCTURE_STAKES_DROUGHT_RUN ────────────────────────────────────────────

  // STRUCTURE_CLOCK_DELTA_ZONE_CLUSTER — Distribution/timing × clockDelta≠0 presence ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // clock-shifting scenes, fires when more than 75% of those scenes cluster in a single third.
  // Waves 681/737 applied the backward-cause peak and run-based drought modes to clockDelta; the
  // zone-cluster mode has never been applied to it, completing the trio.
  {
    const r751a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.clockDelta ?? 0) !== 0,
    });
    if (r751a.fires) {
      issues.push({
        location: `${r751a.zoneNames[r751a.maxZoneIdx]} third — ${r751a.maxZoneCount} of ${r751a.count} clock-shifting scenes`,
        rule: 'STRUCTURE_CLOCK_DELTA_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r751a.maxZoneCount / r751a.count) * 100)}% of the scenes that move the ticking clock cluster in the ${r751a.zoneNames[r751a.maxZoneIdx]} third. When every clock movement lands in the same structural window, the story's structure loses any sense of mounting time pressure recurring across the whole story.`,
        suggestedFix: `Move at least one clock-shifting beat outside the ${r751a.zoneNames[r751a.maxZoneIdx]} third so the structure keeps mounting time pressure more evenly across the story.`,
      });
    }
  }

  // STRUCTURE_TURN_DROUGHT_RUN — Run-based × dramaticTurn !== 'nothing' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 turn scenes overall, fires when the
  // longest consecutive run of scenes with no dramatic turn reaches 6. dramaticTurn is this
  // pass's second most heavily used field and has never anchored any of the three shared-library
  // modes as a primary signal; the run-based drought mode has never been applied to it.
  {
    const r751b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
    });
    if (r751b.fires) {
      issues.push({
        location: `longest stretch with no dramatic turn: ${r751b.longestRun} consecutive scenes`,
        rule: 'STRUCTURE_TURN_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r751b.longestRun} consecutive scenes with no dramatic turn at all, even though ${r751b.presentCount} scenes elsewhere do pivot. A long unbroken stretch with nothing reversing or complicating the situation leaves the story's structure coasting without a pivot to organize around for an extended run.`,
        suggestedFix: `Introduce a dramatic turn somewhere within the ${r751b.longestRun}-scene stretch so the structure keeps a pivot to organize around throughout that stretch.`,
      });
    }
  }

  // STRUCTURE_STAKES_DROUGHT_RUN — Run-based × purpose === 'raise_stakes' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 stakes-raising scenes overall, fires
  // when the longest consecutive run of scenes purposed otherwise reaches 6. Wave 681 applied the
  // zone-cluster mode to this signal; the drought-run mode has never been applied to it.
  {
    const r751c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'raise_stakes',
    });
    if (r751c.fires) {
      issues.push({
        location: `longest stretch with no scene raising stakes: ${r751c.longestRun} consecutive scenes`,
        rule: 'STRUCTURE_STAKES_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r751c.longestRun} consecutive scenes with no scene purposed to raise stakes, even though ${r751c.presentCount} scenes elsewhere do escalate. A long unbroken stretch with nothing pushing the stakes higher leaves the story's structure flat without mounting pressure for an extended run.`,
        suggestedFix: `Purpose at least one scene within the ${r751c.longestRun}-scene stretch to raise stakes — even a small escalation keeps the structure under mounting pressure throughout that stretch.`,
      });
    }
  }

  // ── Wave 765: STRUCTURE_SUSPENSE_ZONE_CLUSTER, STRUCTURE_CURIOSITY_ZONE_CLUSTER,
  //              STRUCTURE_CURIOSITY_PEAK_UNCAUSED ─────────────────────────────────────

  // STRUCTURE_SUSPENSE_ZONE_CLUSTER — Distribution/timing × suspenseDelta>0 presence × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 suspense-positive
  // scenes, fires when more than 75% of those scenes cluster in a single third. Existing suspense
  // checks in this pass are average/aggregate, zone-imbalance, presence-run, co-occurrence-at-the-
  // peak, and a hand-rolled backward-cause check restricted to the climax zone; the shared-library
  // thirds-based cluster mode has never been applied to suspenseDelta across the whole story.
  {
    const r765a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r765a.fires) {
      issues.push({
        location: `${r765a.zoneNames[r765a.maxZoneIdx]} third — ${r765a.maxZoneCount} of ${r765a.count} suspense-positive scenes`,
        rule: 'STRUCTURE_SUSPENSE_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r765a.maxZoneCount / r765a.count) * 100)}% of the scenes where tension rises cluster in the ${r765a.zoneNames[r765a.maxZoneIdx]} third. When every suspense spike lands in the same structural window, the story's architecture has no rising pressure testing it anywhere else across the whole shape of the piece.`,
        suggestedFix: `Raise suspense in at least one scene outside the ${r765a.zoneNames[r765a.maxZoneIdx]} third so tension keeps pressurizing the structure more evenly across the story.`,
      });
    }
  }

  // STRUCTURE_CURIOSITY_ZONE_CLUSTER — Distribution/timing × curiosityDelta>0 presence ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // curiosity-positive scenes, fires when more than 75% of those scenes cluster in a single third.
  // Existing curiosity checks are average/aggregate, zone-scoped absence, and presence-run; the
  // shared-library zone-cluster mode has never been applied to it.
  {
    const r765b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r765b.fires) {
      issues.push({
        location: `${r765b.zoneNames[r765b.maxZoneIdx]} third — ${r765b.maxZoneCount} of ${r765b.count} curiosity-positive scenes`,
        rule: 'STRUCTURE_CURIOSITY_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r765b.maxZoneCount / r765b.count) * 100)}% of the scenes where curiosity rises cluster in the ${r765b.zoneNames[r765b.maxZoneIdx]} third. When every question the story raises lands in the same structural window, the architecture has no fresh mystery pulling the audience through the rest of the piece.`,
        suggestedFix: `Raise curiosity in at least one scene outside the ${r765b.zoneNames[r765b.maxZoneIdx]} third so questions keep pulling the audience through the structure more evenly across the story.`,
      });
    }
  }

  // STRUCTURE_CURIOSITY_PEAK_UNCAUSED — Backward-cause × curiosityDelta-as-magnitude × 2-scene
  // lookback. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 curiosity-
  // positive scenes, fires when the peak curiosity scene has no dramatic turn, revelation, or
  // clock raise in the 2 scenes preceding it. The existing curiosity-peak checks
  // (CURIOSITY_PEAK_EMOTIONAL_VOID, PEAK_SUSPENSE_CURIOSITY_VOID) audit the co-occurring channel
  // AT the peak scene itself; none looks backward from the peak for a preparing cause, so the
  // shared-library backward-cause mode has never been applied to curiosityDelta.
  {
    const r765c = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => r.curiosityDelta ?? 0,
      hasCause: r => (r.dramaticTurn ?? 'nothing') !== 'nothing' || r.revelation != null || r.clockRaised === true,
    });
    if (r765c.fires) {
      issues.push({
        location: `scene ${r765c.peakIdx} (peak curiosityDelta ${r765c.peakMagnitude}) — no preparing cause nearby`,
        rule: 'STRUCTURE_CURIOSITY_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single highest-curiosity scene (Scene ${r765c.peakIdx}, curiosityDelta ${r765c.peakMagnitude}) arrives with no dramatic turn, revelation, or clock raise in the 2 scenes leading into it, even though ${r765c.qualifyingCount} scenes elsewhere do spark wonder. The moment the audience is most gripped by an open question lands out of nowhere — the structure hasn't built toward the mystery it's about to pose.`,
        suggestedFix: `Add a dramatic turn, revelation, or clock raise in one of the 2 scenes before scene ${r765c.peakIdx} so the structure earns its peak curiosity instead of springing it without preparation.`,
      });
    }
  }

  // ── Wave 779: STRUCTURE_TURN_ZONE_CLUSTER, STRUCTURE_SUSPENSE_DROUGHT_RUN,
  //              STRUCTURE_CURIOSITY_DROUGHT_RUN ──────────────────────────────────────

  // STRUCTURE_TURN_ZONE_CLUSTER — Distribution/timing × dramaticTurn !== 'nothing' presence ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 turn
  // scenes, fires when more than 75% of those scenes cluster in a single third. dramaticTurn has
  // only ever had the run-based drought mode applied to it as a primary signal; the zone-cluster
  // mode has never been applied to it, completing the trio.
  {
    const r779a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
    });
    if (r779a.fires) {
      issues.push({
        location: `${r779a.zoneNames[r779a.maxZoneIdx]} third — ${r779a.maxZoneCount} of ${r779a.count} turn scenes`,
        rule: 'STRUCTURE_TURN_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r779a.maxZoneCount / r779a.count) * 100)}% of the story's dramatic turns cluster in the ${r779a.zoneNames[r779a.maxZoneIdx]} third. When every pivot lands in the same structural window, the story's architecture has no reversal testing it anywhere else across the whole shape of the piece.`,
        suggestedFix: `Introduce a dramatic turn in at least one scene outside the ${r779a.zoneNames[r779a.maxZoneIdx]} third so the structure keeps pivots redirecting it more evenly across the story.`,
      });
    }
  }

  // STRUCTURE_SUSPENSE_DROUGHT_RUN — Run-based × suspenseDelta>0 absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 suspense-positive scenes overall,
  // fires when the longest consecutive run of scenes with no rising tension reaches 6. Wave 765
  // applied the zone-cluster mode and the hand-rolled CLIMAX_UNPREPARED already covers the
  // backward-cause peak mode restricted to the climax zone; the general run-based drought mode
  // has never been applied to it, completing the trio.
  {
    const r779b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r779b.fires) {
      issues.push({
        location: `longest stretch with no rising suspense: ${r779b.longestRun} consecutive scenes`,
        rule: 'STRUCTURE_SUSPENSE_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r779b.longestRun} consecutive scenes with no rise in suspense at all, even though ${r779b.presentCount} scenes elsewhere do spike. A long unbroken stretch with nothing tightening the danger leaves the story's architecture without mounting pressure for an extended run.`,
        suggestedFix: `Raise suspense somewhere within the ${r779b.longestRun}-scene stretch so the structure keeps mounting pressure acting on it throughout that stretch.`,
      });
    }
  }

  // STRUCTURE_CURIOSITY_DROUGHT_RUN — Run-based × curiosityDelta>0 absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 curiosity-positive scenes overall,
  // fires when the longest consecutive run of scenes with no curiosity rise reaches 6. Wave 765
  // applied the zone-cluster and backward-cause peak modes to curiosityDelta; the run-based
  // drought mode has never been applied to it, completing the trio.
  {
    const r779c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r779c.fires) {
      issues.push({
        location: `longest stretch with no rising curiosity: ${r779c.longestRun} consecutive scenes`,
        rule: 'STRUCTURE_CURIOSITY_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r779c.longestRun} consecutive scenes with no rise in curiosity at all, even though ${r779c.presentCount} scenes elsewhere do spark wonder. A long unbroken stretch with nothing new to wonder about leaves the story's architecture without a driving question for an extended run.`,
        suggestedFix: `Raise curiosity somewhere within the ${r779c.longestRun}-scene stretch so the structure keeps a live question driving it throughout that stretch.`,
      });
    }
  }

  // ── Wave 793: STRUCTURE_NEGATIVE_EMOTION_ZONE_CLUSTER, STRUCTURE_REVELATION_ZONE_CLUSTER,
  //              STRUCTURE_REVELATION_DROUGHT_RUN ──────────────────────────────────────

  // STRUCTURE_NEGATIVE_EMOTION_ZONE_CLUSTER — Distribution/timing × emotionalShift='negative' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // negative-emotion scenes, fires when more than 75% of them fall in a single structural third.
  // Distinct from NEGATIVE_SCENE_DROUGHT (global ratio underweight, not positional), NEGATIVE_
  // SCENE_RUN (consecutive-run presence, not thirds distribution), and ACT2A/ACT2B/ACT3_
  // EMOTIONAL_FLATLINE (fixed named-act zones testing 'neutral', not the general thirds-based
  // test on 'negative').
  {
    const r793a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.emotionalShift === 'negative',
    });
    if (r793a.fires) {
      issues.push({
        location: `${r793a.zoneNames[r793a.maxZoneIdx]} third — ${r793a.maxZoneCount} of ${r793a.count} negative-emotion scenes`,
        rule: 'STRUCTURE_NEGATIVE_EMOTION_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r793a.maxZoneCount / r793a.count) * 100)}% of the story's negative-emotion scenes cluster in the ${r793a.zoneNames[r793a.maxZoneIdx]} third. When all the darkness concentrates in one structural window, the rest of the story's shape carries no emotional cost to contrast against whatever positive or neutral scenes surround it.`,
        suggestedFix: `Introduce a negative-emotion scene outside the ${r793a.zoneNames[r793a.maxZoneIdx]} third so the story's structure carries emotional cost more evenly across its full shape.`,
      });
    }
  }

  // STRUCTURE_REVELATION_ZONE_CLUSTER — Distribution/timing × revelation × structural thirds.
  // Built on checkZoneCluster from the shared checks library. n≥9, ≥3 revelation scenes, fires
  // when more than 75% of them fall in a single structural third. Distinct from the existing
  // REVELATION_CLUSTERED (Wave 264), which fires on a fixed 4-scene span found anywhere in the
  // story regardless of structural position — this instead tests whether disclosures concentrate
  // in one of the three fixed structural thirds, a positional test rather than a span-width test.
  {
    const r793b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.revelation != null,
    });
    if (r793b.fires) {
      issues.push({
        location: `${r793b.zoneNames[r793b.maxZoneIdx]} third — ${r793b.maxZoneCount} of ${r793b.count} revelation scenes`,
        rule: 'STRUCTURE_REVELATION_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r793b.maxZoneCount / r793b.count) * 100)}% of the story's revelation scenes cluster in the ${r793b.zoneNames[r793b.maxZoneIdx]} third. When every disclosure lands in the same structural window, the story's architecture goes silent on new information for the rest of its shape.`,
        suggestedFix: `Move at least one revelation outside the ${r793b.zoneNames[r793b.maxZoneIdx]} third so the structure keeps disclosures punctuating it more evenly across the story.`,
      });
    }
  }

  // STRUCTURE_REVELATION_DROUGHT_RUN — Run-based × revelation absence. Built on checkDroughtRun
  // from the shared checks library. n≥10, ≥3 revelation scenes overall, fires when the longest
  // consecutive run of scenes with no revelation reaches 6. Distinct from the existing
  // REVELATION_DROUGHT (Wave 152), which fires at a 4-scene threshold on a COMPOSITE absence of
  // revelation OR seededClueIds OR relationshipShifts together — any one of the three breaks the
  // drought there. This instead isolates revelation alone at the shared-library's 6-scene
  // threshold, so a story could satisfy REVELATION_DROUGHT (clues or shifts keep appearing) while
  // still going twice as long without any actual revelation specifically.
  {
    const r793c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.revelation != null,
    });
    if (r793c.fires) {
      issues.push({
        location: `longest stretch with no revelation: ${r793c.longestRun} consecutive scenes`,
        rule: 'STRUCTURE_REVELATION_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r793c.longestRun} consecutive scenes with no revelation at all, even though ${r793c.presentCount} scenes elsewhere disclose a truth. A long unbroken stretch with nothing new coming to light leaves the story's architecture without a disclosure punctuating it for an extended run — even if clues or relationship shifts keep the composite REVELATION_DROUGHT check satisfied elsewhere.`,
        suggestedFix: `Let a truth surface somewhere within the ${r793c.longestRun}-scene stretch so the structure keeps a disclosure punctuating it throughout that stretch.`,
      });
    }
  }

  // ── Wave 807: STRUCTURE_NEGATIVE_EMOTION_DROUGHT_RUN, STRUCTURE_REVELATION_PEAK_UNCAUSED,
  //              STRUCTURE_CHARACTER_MOMENT_ZONE_CLUSTER ──────────────────────────────────────

  // STRUCTURE_NEGATIVE_EMOTION_DROUGHT_RUN — Run-based × emotionalShift === 'negative' absence.
  // Built on checkDroughtRun from the shared checks library. n≥10, ≥3 negative-emotion scenes
  // overall, fires when the longest consecutive run of scenes with no negative charge reaches 6.
  // Wave 793 applied the zone-cluster mode to this valence; the drought-run mode has never been
  // applied to it, completing 2 of 3 slots for this categorical field (peak conventionally
  // skipped).
  {
    const r807a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.emotionalShift === 'negative',
    });
    if (r807a.fires) {
      issues.push({
        location: `longest stretch with no negative-emotion charge: ${r807a.longestRun} consecutive scenes`,
        rule: 'STRUCTURE_NEGATIVE_EMOTION_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r807a.longestRun} consecutive scenes with no negative-emotion charge at all, even though ${r807a.presentCount} scenes elsewhere carry one. A long unbroken stretch with no setback leaves the story's architecture without any adversity testing it for an extended run.`,
        suggestedFix: `Give the story a setback within the ${r807a.longestRun}-scene stretch so the structure keeps testing it with adversity throughout that stretch.`,
      });
    }
  }

  // STRUCTURE_REVELATION_PEAK_UNCAUSED — Backward-cause × revelation-as-magnitude (0/1) ×
  // 2-scene lookback. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2
  // revelation scenes, fires when the (first) revelation scene has no dramatic turn in itself or
  // the 2 scenes preceding it. Completes the trio for revelation. Distinct from the existing
  // REVELATION_CAUSELESS, which requires ALL revelations in the story to be causeless with a
  // broader 3-signal/3-scene lookback, not a single-peak backward-cause test with a 2-scene
  // lookback. hasCause deliberately omits revelation to avoid circularity.
  {
    const r807b = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.revelation != null ? 1 : 0),
      hasCause: r => r.dramaticTurn !== 'nothing',
    });
    if (r807b.fires) {
      issues.push({
        location: `scene ${r807b.peakIdx + 1} — revelation with no dramatic turn nearby`,
        rule: 'STRUCTURE_REVELATION_PEAK_UNCAUSED',
        severity: 'minor',
        description: `Scene ${r807b.peakIdx + 1} discloses a revelation with no dramatic turn in itself or the two scenes before it, even though ${r807b.qualifyingCount} scenes elsewhere disclose a truth. A revelation that lands without any preceding pivot reads as a coincidence rather than something the structure's own turns forced into the open.`,
        suggestedFix: `Add a dramatic turn in scene ${r807b.peakIdx + 1} or one of the two scenes before it so the revelation reads as a consequence of the story's own turning points rather than arriving unprepared.`,
      });
    }
  }

  // STRUCTURE_CHARACTER_MOMENT_ZONE_CLUSTER — Distribution/timing × purpose ===
  // 'character_moment' × structural thirds. Built on checkZoneCluster from the shared checks
  // library. n≥9, ≥3 character-moment scenes, fires when more than 75% of them fall in a single
  // structural third. This purpose value has only ever appeared inside the SETUP_RESOLUTION_
  // IMBALANCE composite set (union with 'establish_world'); it has never been audited as its own
  // standalone signal by any of the three shared-library trio modes.
  {
    const r807c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'character_moment',
    });
    if (r807c.fires) {
      issues.push({
        location: `${r807c.zoneNames[r807c.maxZoneIdx]} third — ${r807c.maxZoneCount} of ${r807c.count} character-moment scenes`,
        rule: 'STRUCTURE_CHARACTER_MOMENT_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r807c.maxZoneCount / r807c.count) * 100)}% of the story's character-moment scenes cluster in the ${r807c.zoneNames[r807c.maxZoneIdx]} third. When every beat of interior reflection lands in the same structural window, the story's architecture has no room for the protagonist's inner life anywhere else across the story.`,
        suggestedFix: `Purpose at least one scene outside the ${r807c.zoneNames[r807c.maxZoneIdx]} third as a character moment so the structure keeps room for interior reflection more evenly across the story.`,
      });
    }
  }

  // ── Wave 821: STRUCTURE_CHARACTER_MOMENT_DROUGHT_RUN, STRUCTURE_TURNING_POINT_ZONE_CLUSTER,
  //              STRUCTURE_TURNING_POINT_DROUGHT_RUN ──────────────────────────────────────

  // STRUCTURE_CHARACTER_MOMENT_DROUGHT_RUN — Run-based × purpose === 'character_moment'
  // absence. Built on checkDroughtRun from the shared checks library. n≥10, ≥3 character-moment
  // scenes overall, fires when the longest consecutive run of scenes with no character-moment
  // purpose reaches 6. Completing 2 of 3 slots for this purpose value alongside the zone-cluster
  // mode added in Wave 807 (peak mode conventionally skipped for this categorical field).
  {
    const r821a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'character_moment',
    });
    if (r821a.fires) {
      issues.push({
        location: `longest stretch with no character moment: ${r821a.longestRun} consecutive scenes`,
        rule: 'STRUCTURE_CHARACTER_MOMENT_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r821a.longestRun} consecutive scenes with no character-moment purpose at all, even though ${r821a.presentCount} scenes elsewhere pause for interior reflection. A long unbroken stretch with nothing but plot mechanics leaves the story's architecture without room for the protagonist's inner life for an extended run.`,
        suggestedFix: `Purpose at least one scene within the ${r821a.longestRun}-scene stretch as a character moment so the structure keeps room for interior reflection throughout that stretch.`,
      });
    }
  }

  // STRUCTURE_TURNING_POINT_ZONE_CLUSTER — Distribution/timing × purpose === 'turning_point' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // turning-point scenes, fires when more than 75% of them fall in a single structural third.
  // This purpose value has only ever appeared inside the payoffPurposes composite set (union
  // with 'climax', 'resolution'); it has never been audited as its own standalone signal by any
  // of the three shared-library trio modes.
  {
    const r821b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'turning_point',
    });
    if (r821b.fires) {
      issues.push({
        location: `${r821b.zoneNames[r821b.maxZoneIdx]} third — ${r821b.maxZoneCount} of ${r821b.count} turning-point scenes`,
        rule: 'STRUCTURE_TURNING_POINT_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r821b.maxZoneCount / r821b.count) * 100)}% of the story's turning-point scenes cluster in the ${r821b.zoneNames[r821b.maxZoneIdx]} third. When every scene purposed as a turning point lands in the same structural window, the story's architecture has no redirection anywhere else across the story.`,
        suggestedFix: `Purpose at least one scene outside the ${r821b.zoneNames[r821b.maxZoneIdx]} third as a turning point so the structure keeps redirecting the story more evenly across its full shape.`,
      });
    }
  }

  // STRUCTURE_TURNING_POINT_DROUGHT_RUN — Run-based × purpose === 'turning_point' absence. Built
  // on checkDroughtRun from the shared checks library. n≥10, ≥3 turning-point scenes overall,
  // fires when the longest consecutive run of scenes with no turning-point purpose reaches 6.
  // Completing 2 of 3 slots for this purpose value alongside the zone-cluster mode added in this
  // same wave (peak mode conventionally skipped for this categorical field).
  {
    const r821c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'turning_point',
    });
    if (r821c.fires) {
      issues.push({
        location: `longest stretch with no turning point: ${r821c.longestRun} consecutive scenes`,
        rule: 'STRUCTURE_TURNING_POINT_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r821c.longestRun} consecutive scenes with no turning-point purpose at all, even though ${r821c.presentCount} scenes elsewhere redirect events. A long unbroken stretch with no redirection leaves the story's architecture coasting without a pivot for an extended run.`,
        suggestedFix: `Purpose at least one scene within the ${r821c.longestRun}-scene stretch as a turning point so the structure keeps redirecting the story throughout that stretch.`,
      });
    }
  }

  // ── Wave 835: STRUCTURE_INTRODUCE_CONFLICT_ZONE_CLUSTER, STRUCTURE_INTRODUCE_CONFLICT_DROUGHT_RUN,
  //              STRUCTURE_POSITIVE_EMOTION_ZONE_CLUSTER ──────────────────────────────────────

  // STRUCTURE_INTRODUCE_CONFLICT_ZONE_CLUSTER — Distribution/timing × purpose ===
  // 'introduce_conflict' × structural thirds. Built on checkZoneCluster from the shared checks
  // library. n≥9, ≥3 conflict-introducing scenes, fires when more than 75% of them fall in a
  // single structural third. This purpose value has never been referenced anywhere in this pass,
  // not even inside the setupPurposes/payoffPurposes composite sets — a virgin field for all
  // three shared-library trio modes.
  {
    const r835a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'introduce_conflict',
    });
    if (r835a.fires) {
      issues.push({
        location: `${r835a.zoneNames[r835a.maxZoneIdx]} third — ${r835a.maxZoneCount} of ${r835a.count} conflict-introducing scenes`,
        rule: 'STRUCTURE_INTRODUCE_CONFLICT_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r835a.maxZoneCount / r835a.count) * 100)}% of the scenes purposed to introduce conflict cluster in the ${r835a.zoneNames[r835a.maxZoneIdx]} third. When every new front of conflict opens in the same structural window, the story's architecture has no fresh friction anywhere else across its full shape.`,
        suggestedFix: `Purpose at least one scene outside the ${r835a.zoneNames[r835a.maxZoneIdx]} third to introduce conflict so the structure keeps opening fresh friction more evenly across its full shape.`,
      });
    }
  }

  // STRUCTURE_INTRODUCE_CONFLICT_DROUGHT_RUN — Run-based × purpose === 'introduce_conflict'
  // absence. Built on checkDroughtRun from the shared checks library. n≥10, ≥3 conflict-
  // introducing scenes overall, fires when the longest consecutive run of scenes with no
  // conflict-introducing purpose reaches 6. Completing 2 of 3 slots for this purpose value
  // alongside the zone-cluster mode added in this same wave (peak mode conventionally skipped
  // for this categorical field).
  {
    const r835b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'introduce_conflict',
    });
    if (r835b.fires) {
      issues.push({
        location: `longest stretch with no new conflict: ${r835b.longestRun} consecutive scenes`,
        rule: 'STRUCTURE_INTRODUCE_CONFLICT_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r835b.longestRun} consecutive scenes with no conflict-introducing purpose at all, even though ${r835b.presentCount} scenes elsewhere open a new front. A long unbroken stretch with no fresh friction leaves the story's architecture coasting on old conflict for an extended run.`,
        suggestedFix: `Purpose at least one scene within the ${r835b.longestRun}-scene stretch to introduce conflict so the structure keeps opening fresh friction throughout that stretch.`,
      });
    }
  }

  // STRUCTURE_POSITIVE_EMOTION_ZONE_CLUSTER — Distribution/timing × emotionalShift === 'positive'
  // × structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // positive-emotion scenes, fires when more than 75% of them fall in a single structural third.
  // Mirrors the completed negative-valence trio; the positive valence has never been isolated by
  // any of the three shared-library trio modes in this pass.
  {
    const r835c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.emotionalShift === 'positive',
    });
    if (r835c.fires) {
      issues.push({
        location: `${r835c.zoneNames[r835c.maxZoneIdx]} third — ${r835c.maxZoneCount} of ${r835c.count} positive-emotion scenes`,
        rule: 'STRUCTURE_POSITIVE_EMOTION_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r835c.maxZoneCount / r835c.count) * 100)}% of the story's positive-emotion scenes cluster in the ${r835c.zoneNames[r835c.maxZoneIdx]} third. When all the relief concentrates in one structural window, the story's architecture carries its emotional payoff in only one part of the story instead of throughout its full shape.`,
        suggestedFix: `Introduce a positive-emotion scene outside the ${r835c.zoneNames[r835c.maxZoneIdx]} third so the structure delivers its emotional payoff more evenly across its full shape.`,
      });
    }
  }

  // ── Wave 849: STRUCTURE_POSITIVE_EMOTION_DROUGHT_RUN, STRUCTURE_ESTABLISH_WORLD_ZONE_CLUSTER,
  //              STRUCTURE_CLIMAX_ZONE_CLUSTER ──────────────────────────────────────

  // STRUCTURE_POSITIVE_EMOTION_DROUGHT_RUN — Run-based × emotionalShift === 'positive' absence.
  // Built on checkDroughtRun from the shared checks library. n≥10, ≥3 positive-emotion scenes
  // overall, fires when the longest consecutive run of scenes with no positive-emotion charge
  // reaches 6. Completing 2 of 3 slots for this valence alongside the zone-cluster mode added in
  // Wave 835 (peak mode conventionally skipped for this categorical field).
  {
    const r849a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.emotionalShift === 'positive',
    });
    if (r849a.fires) {
      issues.push({
        location: `longest stretch with no positive-emotion charge: ${r849a.longestRun} consecutive scenes`,
        rule: 'STRUCTURE_POSITIVE_EMOTION_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r849a.longestRun} consecutive scenes with no positive-emotion charge at all, even though ${r849a.presentCount} scenes elsewhere carry one. A long unbroken stretch with no relief leaves the story's architecture without an emotional payoff for an extended run.`,
        suggestedFix: `Give the story a moment of relief within the ${r849a.longestRun}-scene stretch so the structure keeps delivering an emotional payoff throughout that stretch.`,
      });
    }
  }

  // STRUCTURE_ESTABLISH_WORLD_ZONE_CLUSTER — Distribution/timing × purpose === 'establish_world'
  // × structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // world-establishing scenes, fires when more than 75% of them fall in a single structural
  // third. This purpose value has only ever appeared inside the setupPurposes composite set
  // (union with 'character_moment'); it has never been audited as its own standalone signal by
  // any of the three shared-library trio modes.
  {
    const r849b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'establish_world',
    });
    if (r849b.fires) {
      issues.push({
        location: `${r849b.zoneNames[r849b.maxZoneIdx]} third — ${r849b.maxZoneCount} of ${r849b.count} world-establishing scenes`,
        rule: 'STRUCTURE_ESTABLISH_WORLD_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r849b.maxZoneCount / r849b.count) * 100)}% of the scenes purposed to establish the world cluster in the ${r849b.zoneNames[r849b.maxZoneIdx]} third. When every act of world-building concentrates in one structural window, the story's architecture has no fresh ground to build from anywhere else across its full shape.`,
        suggestedFix: `Purpose at least one scene outside the ${r849b.zoneNames[r849b.maxZoneIdx]} third to establish the world so the structure keeps fresh ground to build from more evenly across its full shape.`,
      });
    }
  }

  // STRUCTURE_CLIMAX_ZONE_CLUSTER — Distribution/timing × purpose === 'climax' × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 climax-purposed
  // scenes, fires when more than 75% of them fall in a single structural third. This purpose
  // value has only ever appeared inside the payoffPurposes composite set (union with
  // 'resolution', 'turning_point') or the presence-only PURPOSE_CLIMAX_ABSENT check; a virgin
  // standalone signal.
  {
    const r849c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'climax',
    });
    if (r849c.fires) {
      issues.push({
        location: `${r849c.zoneNames[r849c.maxZoneIdx]} third — ${r849c.maxZoneCount} of ${r849c.count} climax-purposed scenes`,
        rule: 'STRUCTURE_CLIMAX_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r849c.maxZoneCount / r849c.count) * 100)}% of the scenes purposed as the climax cluster in the ${r849c.zoneNames[r849c.maxZoneIdx]} third. When every peak moment concentrates in one structural window, the story's architecture builds toward its payoff in only one part of the story instead of throughout its full shape.`,
        suggestedFix: `Reconsider whether every climax-purposed scene belongs in the ${r849c.zoneNames[r849c.maxZoneIdx]} third so the structure builds toward its payoff more evenly across its full shape.`,
      });
    }
  }

  // ── Wave 863: STRUCTURE_CLIMAX_DROUGHT_RUN, STRUCTURE_ESTABLISH_WORLD_DROUGHT_RUN,
  //              STRUCTURE_RESOLUTION_ZONE_CLUSTER ──────────────────────────────────────

  // STRUCTURE_CLIMAX_DROUGHT_RUN — Run-based × purpose === 'climax' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 climax-purposed scenes overall,
  // fires when the longest consecutive run of scenes with no climax purpose reaches 6.
  // Completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in
  // Wave 849 (peak mode conventionally skipped for this categorical field).
  {
    const r863a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'climax',
    });
    if (r863a.fires) {
      issues.push({
        location: `longest stretch with no climax-purposed scene: ${r863a.longestRun} consecutive scenes`,
        rule: 'STRUCTURE_CLIMAX_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r863a.longestRun} consecutive scenes with no scene purposed as the climax, even though ${r863a.presentCount} scenes elsewhere are. A long unbroken stretch between peak moments leaves the story's architecture without a structural high point to build toward for an extended run.`,
        suggestedFix: `Purpose a scene within the ${r863a.longestRun}-scene stretch as the climax, or restructure so the story's peak moments recur rather than clustering into a single distant point.`,
      });
    }
  }

  // STRUCTURE_ESTABLISH_WORLD_DROUGHT_RUN — Run-based × purpose === 'establish_world' absence.
  // Built on checkDroughtRun from the shared checks library. n≥10, ≥3 world-establishing
  // scenes overall, fires when the longest consecutive run of scenes with no world-establishing
  // purpose reaches 6. Completes 2 of 3 slots for this purpose value alongside the zone-cluster
  // mode added in Wave 849 (peak mode conventionally skipped for this categorical field).
  {
    const r863b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'establish_world',
    });
    if (r863b.fires) {
      issues.push({
        location: `longest stretch with no world-establishing scene: ${r863b.longestRun} consecutive scenes`,
        rule: 'STRUCTURE_ESTABLISH_WORLD_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r863b.longestRun} consecutive scenes with no scene purposed to establish the world, even though ${r863b.presentCount} scenes elsewhere are. A long unbroken stretch without new world-building leaves the story's architecture with no fresh ground to build from for an extended run.`,
        suggestedFix: `Purpose a scene within the ${r863b.longestRun}-scene stretch to establish the world, so the structure has fresh ground to build from throughout the story rather than in one isolated pocket.`,
      });
    }
  }

  // STRUCTURE_RESOLUTION_ZONE_CLUSTER — Distribution/timing × purpose === 'resolution' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // resolution-purposed scenes, fires when more than 75% of them fall in a single structural
  // third. This purpose value has only ever appeared inside the payoffPurposes composite set
  // (union with 'climax', 'turning_point') and two incidental last-record disjunctions
  // (`purpose !== 'resolution'`); it has never been audited as its own standalone signal by
  // any of the three shared-library trio modes.
  {
    const r863c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'resolution',
    });
    if (r863c.fires) {
      issues.push({
        location: `${r863c.zoneNames[r863c.maxZoneIdx]} third — ${r863c.maxZoneCount} of ${r863c.count} resolution-purposed scenes`,
        rule: 'STRUCTURE_RESOLUTION_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r863c.maxZoneCount / r863c.count) * 100)}% of the scenes purposed as resolution cluster in the ${r863c.zoneNames[r863c.maxZoneIdx]} third. When every resolution beat concentrates in one structural window, the story's architecture has no room to let threads settle gradually before the ending absorbs them all at once.`,
        suggestedFix: `Purpose at least one resolution scene outside the ${r863c.zoneNames[r863c.maxZoneIdx]} third so the structure's closure is distributed across the story rather than concentrated in a single structural window.`,
      });
    }
  }

  // ── Wave 877: STRUCTURE_RESOLUTION_DROUGHT_RUN, STRUCTURE_COMPLICATE_ZONE_CLUSTER,
  //              STRUCTURE_COMPLICATE_DROUGHT_RUN ──────────────────────────────────────

  // STRUCTURE_RESOLUTION_DROUGHT_RUN — Run-based × purpose === 'resolution' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 resolution-purposed scenes overall,
  // fires when the longest consecutive run of scenes with no resolution purpose reaches 6.
  // Completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in
  // Wave 863 (peak mode conventionally skipped for this categorical field).
  {
    const r877a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'resolution',
    });
    if (r877a.fires) {
      issues.push({
        location: `longest stretch with no resolution-purposed scene: ${r877a.longestRun} consecutive scenes`,
        rule: 'STRUCTURE_RESOLUTION_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r877a.longestRun} consecutive scenes with no scene purposed to resolve the story, even though ${r877a.presentCount} scenes elsewhere are. A long unbroken stretch with nothing settled leaves the story's architecture with no wind-down beat for an extended run.`,
        suggestedFix: `Purpose a scene within the ${r877a.longestRun}-scene stretch to resolve part of the story, so the structure keeps winding down throughout the story rather than only at its very end.`,
      });
    }
  }

  // STRUCTURE_COMPLICATE_ZONE_CLUSTER — Distribution/timing × purpose === 'complicate' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // complicating scenes, fires when more than 75% of them fall in a single structural third.
  // This purpose value has never been referenced anywhere in this pass — a virgin field for
  // all three shared-library trio modes.
  {
    const r877b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'complicate',
    });
    if (r877b.fires) {
      issues.push({
        location: `${r877b.zoneNames[r877b.maxZoneIdx]} third — ${r877b.maxZoneCount} of ${r877b.count} complicating scenes`,
        rule: 'STRUCTURE_COMPLICATE_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r877b.maxZoneCount / r877b.count) * 100)}% of the scenes purposed to complicate the story cluster in the ${r877b.zoneNames[r877b.maxZoneIdx]} third. When every complication lands in the same structural window, the story's architecture stops deepening its trouble anywhere else across the story.`,
        suggestedFix: `Purpose at least one scene outside the ${r877b.zoneNames[r877b.maxZoneIdx]} third to complicate the story so the structure keeps deepening its trouble more evenly across the story.`,
      });
    }
  }

  // STRUCTURE_COMPLICATE_DROUGHT_RUN — Run-based × purpose === 'complicate' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 complicating scenes overall, fires
  // when the longest consecutive run of scenes with no complicating purpose reaches 6.
  // Completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in this
  // same wave (peak mode conventionally skipped for this categorical field).
  {
    const r877c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'complicate',
    });
    if (r877c.fires) {
      issues.push({
        location: `longest stretch with no complication: ${r877c.longestRun} consecutive scenes`,
        rule: 'STRUCTURE_COMPLICATE_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r877c.longestRun} consecutive scenes with no complicating purpose at all, even though ${r877c.presentCount} scenes elsewhere deepen the trouble. A long unbroken stretch with nothing new complicating the situation leaves the story's architecture stalled for an extended run.`,
        suggestedFix: `Purpose at least one scene within the ${r877c.longestRun}-scene stretch to complicate the story so the structure keeps deepening its trouble throughout that stretch.`,
      });
    }
  }

  // ── Wave 891: STRUCTURE_CLIMAX_ZONE_IMBALANCE, STRUCTURE_ESTABLISH_WORLD_ZONE_IMBALANCE,
  //              STRUCTURE_RESOLUTION_ZONE_IMBALANCE ──────────────────────────────────────

  // STRUCTURE_CLIMAX_ZONE_IMBALANCE — Underweight/bloat × purpose === 'climax' × four
  // structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4
  // climax-purposed scenes total, divided across four equal structural zones. Fires only when
  // one zone has zero such scenes while another holds ≥50% of the total. Distinct from the
  // existing 3-zone STRUCTURE_CLIMAX_ZONE_CLUSTER and run-based STRUCTURE_CLIMAX_DROUGHT_RUN —
  // the first application of the 4-zone bloat+empty-zone mode to this purpose value.
  {
    const r891a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'climax',
    });
    if (r891a.fires) {
      const emptyNames891a = r891a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName891a = FOUR_ZONE_NAMES[r891a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames891a} empty; ${bloatName891a} has ${r891a.counts[r891a.bloatZoneIdx]}/${r891a.totalCount} climax-purposed scenes`,
        rule: 'STRUCTURE_CLIMAX_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r891a.totalCount} climax-purposed scenes are unevenly distributed across its four structural zones: ${bloatName891a} contains ${r891a.counts[r891a.bloatZoneIdx]} of them (${Math.round((r891a.counts[r891a.bloatZoneIdx] / r891a.totalCount) * 100)}%) while ${emptyNames891a} contains none. Peak moments bloat in one structural quarter and vanish from another, giving the story's architecture an uneven structural rhythm to its payoff.`,
        suggestedFix: `Redistribute peak moments: move at least one climax-purposed scene into the empty zone(s) — ${emptyNames891a} — so the structure builds toward its payoff more evenly across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // STRUCTURE_ESTABLISH_WORLD_ZONE_IMBALANCE — Underweight/bloat × purpose ===
  // 'establish_world' × four structural zones. Built on checkZoneImbalance from the shared
  // checks library. n≥10, ≥4 world-establishing scenes total, divided across four equal
  // structural zones. Fires only when one zone has zero such scenes while another holds ≥50% of
  // the total. Distinct from the existing 3-zone STRUCTURE_ESTABLISH_WORLD_ZONE_CLUSTER and
  // run-based STRUCTURE_ESTABLISH_WORLD_DROUGHT_RUN — the first application of the 4-zone
  // bloat+empty-zone mode to this purpose value.
  {
    const r891b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'establish_world',
    });
    if (r891b.fires) {
      const emptyNames891b = r891b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName891b = FOUR_ZONE_NAMES[r891b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames891b} empty; ${bloatName891b} has ${r891b.counts[r891b.bloatZoneIdx]}/${r891b.totalCount} world-establishing scenes`,
        rule: 'STRUCTURE_ESTABLISH_WORLD_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r891b.totalCount} world-establishing scenes are unevenly distributed across its four structural zones: ${bloatName891b} contains ${r891b.counts[r891b.bloatZoneIdx]} of them (${Math.round((r891b.counts[r891b.bloatZoneIdx] / r891b.totalCount) * 100)}%) while ${emptyNames891b} contains none. World-building bloats in one structural quarter and vanishes from another, giving the story's architecture an uneven ground to build from.`,
        suggestedFix: `Redistribute world-building beats: move at least one establish_world-purposed scene into the empty zone(s) — ${emptyNames891b} — so the structure keeps fresh ground to build from more evenly across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // STRUCTURE_RESOLUTION_ZONE_IMBALANCE — Underweight/bloat × purpose === 'resolution' × four
  // structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4
  // resolution-purposed scenes total, divided across four equal structural zones. Fires only
  // when one zone has zero such scenes while another holds ≥50% of the total. Distinct from the
  // existing 3-zone STRUCTURE_RESOLUTION_ZONE_CLUSTER and run-based STRUCTURE_RESOLUTION_
  // DROUGHT_RUN — the first application of the 4-zone bloat+empty-zone mode to this purpose
  // value.
  {
    const r891c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'resolution',
    });
    if (r891c.fires) {
      const emptyNames891c = r891c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName891c = FOUR_ZONE_NAMES[r891c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames891c} empty; ${bloatName891c} has ${r891c.counts[r891c.bloatZoneIdx]}/${r891c.totalCount} resolution-purposed scenes`,
        rule: 'STRUCTURE_RESOLUTION_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r891c.totalCount} resolution-purposed scenes are unevenly distributed across its four structural zones: ${bloatName891c} contains ${r891c.counts[r891c.bloatZoneIdx]} of them (${Math.round((r891c.counts[r891c.bloatZoneIdx] / r891c.totalCount) * 100)}%) while ${emptyNames891c} contains none. Settling beats bloat in one structural quarter and vanish from another, giving the story's architecture an uneven structural rhythm to its wind-down.`,
        suggestedFix: `Redistribute settling beats: move at least one resolution-purposed scene into the empty zone(s) — ${emptyNames891c} — so the structure's closure is distributed more evenly across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // STRUCTURE_TURNING_POINT_ZONE_IMBALANCE — Underweight/bloat × purpose === 'turning_point' ×
  // four structural zones. Built on checkZoneImbalance from the shared checks library, continuing
  // the rollout begun in Wave 891. n≥10, ≥4 turning-point scenes total, divided across four equal
  // structural zones. Fires only when one zone has zero such scenes while another holds ≥50% of
  // the total. Distinct from the existing 3-zone STRUCTURE_TURNING_POINT_ZONE_CLUSTER and
  // run-based STRUCTURE_TURNING_POINT_DROUGHT_RUN — the first application of the 4-zone
  // bloat+empty-zone mode to this purpose value.
  {
    const r905a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'turning_point',
    });
    if (r905a.fires) {
      const emptyNames905a = r905a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName905a = FOUR_ZONE_NAMES[r905a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames905a} empty; ${bloatName905a} has ${r905a.counts[r905a.bloatZoneIdx]}/${r905a.totalCount} turning-point scenes`,
        rule: 'STRUCTURE_TURNING_POINT_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r905a.totalCount} turning-point scenes are unevenly distributed across its four structural zones: ${bloatName905a} contains ${r905a.counts[r905a.bloatZoneIdx]} of them (${Math.round((r905a.counts[r905a.bloatZoneIdx] / r905a.totalCount) * 100)}%) while ${emptyNames905a} contains none. Pivots bloat in one structural quarter and vanish from another, leaving the story's architecture lopsided around its major direction changes.`,
        suggestedFix: `Redistribute turning points: move at least one turning_point-purposed scene into the empty zone(s) — ${emptyNames905a} — so the structure's pivots anchor every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // STRUCTURE_COMPLICATE_ZONE_IMBALANCE — Underweight/bloat × purpose === 'complicate' × four
  // structural zones. Built on checkZoneImbalance from the shared checks library, continuing the
  // rollout begun in Wave 891. n≥10, ≥4 complicating scenes total, divided across four equal
  // structural zones. Fires only when one zone has zero such scenes while another holds ≥50% of
  // the total. Distinct from the existing 3-zone STRUCTURE_COMPLICATE_ZONE_CLUSTER and run-based
  // STRUCTURE_COMPLICATE_DROUGHT_RUN — the first application of the 4-zone bloat+empty-zone mode
  // to this purpose value.
  {
    const r905b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'complicate',
    });
    if (r905b.fires) {
      const emptyNames905b = r905b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName905b = FOUR_ZONE_NAMES[r905b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames905b} empty; ${bloatName905b} has ${r905b.counts[r905b.bloatZoneIdx]}/${r905b.totalCount} complicating scenes`,
        rule: 'STRUCTURE_COMPLICATE_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r905b.totalCount} complicating scenes are unevenly distributed across its four structural zones: ${bloatName905b} contains ${r905b.counts[r905b.bloatZoneIdx]} of them (${Math.round((r905b.counts[r905b.bloatZoneIdx] / r905b.totalCount) * 100)}%) while ${emptyNames905b} contains none. Complications bloat in one structural quarter and vanish from another, leaving the story's architecture lopsided around its rising trouble.`,
        suggestedFix: `Redistribute complications: move at least one complicate-purposed scene into the empty zone(s) — ${emptyNames905b} — so the structure's rising trouble anchors every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // STRUCTURE_INTRODUCE_CONFLICT_ZONE_IMBALANCE — Underweight/bloat × purpose ===
  // 'introduce_conflict' × four structural zones. Built on checkZoneImbalance from the shared
  // checks library, continuing the rollout begun in Wave 891. n≥10, ≥4 conflict-introducing
  // scenes total, divided across four equal structural zones. Fires only when one zone has zero
  // such scenes while another holds ≥50% of the total. Distinct from the existing 3-zone
  // STRUCTURE_INTRODUCE_CONFLICT_ZONE_CLUSTER and run-based STRUCTURE_INTRODUCE_CONFLICT_
  // DROUGHT_RUN — the first application of the 4-zone bloat+empty-zone mode to this purpose value.
  {
    const r905c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'introduce_conflict',
    });
    if (r905c.fires) {
      const emptyNames905c = r905c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName905c = FOUR_ZONE_NAMES[r905c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames905c} empty; ${bloatName905c} has ${r905c.counts[r905c.bloatZoneIdx]}/${r905c.totalCount} conflict-introducing scenes`,
        rule: 'STRUCTURE_INTRODUCE_CONFLICT_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r905c.totalCount} conflict-introducing scenes are unevenly distributed across its four structural zones: ${bloatName905c} contains ${r905c.counts[r905c.bloatZoneIdx]} of them (${Math.round((r905c.counts[r905c.bloatZoneIdx] / r905c.totalCount) * 100)}%) while ${emptyNames905c} contains none. New conflicts bloat in one structural quarter and vanish from another, leaving the story's architecture lopsided around where fresh friction enters.`,
        suggestedFix: `Redistribute new conflicts: move at least one introduce_conflict-purposed scene into the empty zone(s) — ${emptyNames905c} — so the structure introduces fresh friction across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // STRUCTURE_REVELATION_PURPOSE_ZONE_CLUSTER — Distribution/timing × purpose === 'revelation' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 scenes
  // purposed as a revelation, fires when more than 75% of them fall in a single structural third.
  // Named distinctly from STRUCTURE_REVELATION_ZONE_CLUSTER, which audits the separate revelation
  // string|null field, not this purpose enum value — purpose === 'revelation' has never been
  // referenced anywhere in this pass; a virgin field for all three trio modes.
  {
    const r919a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'revelation',
    });
    if (r919a.fires) {
      issues.push({
        location: `${r919a.zoneNames[r919a.maxZoneIdx]} third — ${r919a.maxZoneCount} of ${r919a.count} revelation-purposed scenes`,
        rule: 'STRUCTURE_REVELATION_PURPOSE_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r919a.maxZoneCount / r919a.count) * 100)}% of the scenes purposed as a revelation cluster in the ${r919a.zoneNames[r919a.maxZoneIdx]} third. When every purpose-built disclosure lands in the same structural window, the story's architecture front- or back-loads its turns of information instead of spacing them across the whole shape.`,
        suggestedFix: `Purpose at least one scene outside the ${r919a.zoneNames[r919a.maxZoneIdx]} third as a revelation so the structure spaces its disclosures more evenly across the story.`,
      });
    }
  }

  // STRUCTURE_REVELATION_PURPOSE_DROUGHT_RUN — Run-based × purpose === 'revelation' absence. Built
  // on checkDroughtRun from the shared checks library. n≥10, ≥3 revelation-purposed scenes overall,
  // fires when the longest consecutive run of scenes purposed otherwise reaches 6. Completes 2 of
  // 3 slots for this purpose value alongside the zone-cluster mode added in this same wave (peak
  // mode conventionally skipped for this categorical field).
  {
    const r919b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'revelation',
    });
    if (r919b.fires) {
      issues.push({
        location: `longest stretch with no revelation-purposed scene: ${r919b.longestRun} consecutive scenes`,
        rule: 'STRUCTURE_REVELATION_PURPOSE_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r919b.longestRun} consecutive scenes with no scene purposed as a revelation, even though ${r919b.presentCount} scenes elsewhere disclose information by purpose. A long unbroken stretch with no turns of new information leaves the story's architecture structurally flat for an extended run.`,
        suggestedFix: `Purpose a scene within the ${r919b.longestRun}-scene stretch as a revelation so the structure keeps turning on new information throughout that stretch.`,
      });
    }
  }

  // STRUCTURE_CHARACTER_MOMENT_ZONE_IMBALANCE — Underweight/bloat × purpose === 'character_moment'
  // × four structural zones. Built on checkZoneImbalance from the shared checks library, continuing
  // the rollout begun in Wave 891. n≥10, ≥4 character-moment scenes total, divided across four
  // equal structural zones. Fires only when one zone has zero such scenes while another holds ≥50%
  // of the total. Distinct from the existing 3-zone STRUCTURE_CHARACTER_MOMENT_ZONE_CLUSTER and
  // run-based STRUCTURE_CHARACTER_MOMENT_DROUGHT_RUN — the first application of the 4-zone
  // bloat+empty-zone mode to this purpose value.
  {
    const r919c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'character_moment',
    });
    if (r919c.fires) {
      const emptyNames919c = r919c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName919c = FOUR_ZONE_NAMES[r919c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames919c} empty; ${bloatName919c} has ${r919c.counts[r919c.bloatZoneIdx]}/${r919c.totalCount} character-moment scenes`,
        rule: 'STRUCTURE_CHARACTER_MOMENT_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r919c.totalCount} character-moment scenes are unevenly distributed across its four structural zones: ${bloatName919c} contains ${r919c.counts[r919c.bloatZoneIdx]} of them (${Math.round((r919c.counts[r919c.bloatZoneIdx] / r919c.totalCount) * 100)}%) while ${emptyNames919c} contains none. Quiet character beats bloat in one structural quarter and vanish from another, leaving the story's architecture lopsided around where it pauses for character.`,
        suggestedFix: `Redistribute character beats: move at least one character_moment-purposed scene into the empty zone(s) — ${emptyNames919c} — so the structure pauses for character across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // STRUCTURE_STAKES_ZONE_IMBALANCE — Underweight/bloat × purpose === 'raise_stakes' × four
  // structural zones. Built on checkZoneImbalance from the shared checks library, continuing the
  // rollout begun in Wave 891. n≥10, ≥4 stakes-raising scenes total, divided across four equal
  // structural zones. Fires only when one zone has zero such scenes while another holds ≥50% of
  // the total. Distinct from the existing 3-zone STRUCTURE_STAKES_ZONE_CLUSTER and run-based
  // STRUCTURE_STAKES_DROUGHT_RUN — the first application of the 4-zone bloat+empty-zone mode to
  // this purpose value.
  {
    const r933a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'raise_stakes',
    });
    if (r933a.fires) {
      const emptyNames933a = r933a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName933a = FOUR_ZONE_NAMES[r933a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames933a} empty; ${bloatName933a} has ${r933a.counts[r933a.bloatZoneIdx]}/${r933a.totalCount} stakes-raising scenes`,
        rule: 'STRUCTURE_STAKES_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r933a.totalCount} stakes-raising scenes are unevenly distributed across its four structural zones: ${bloatName933a} contains ${r933a.counts[r933a.bloatZoneIdx]} of them (${Math.round((r933a.counts[r933a.bloatZoneIdx] / r933a.totalCount) * 100)}%) while ${emptyNames933a} contains none. Stakes bloat upward in one structural quarter and never rise at all in another, leaving the story's architecture lopsided around where it escalates.`,
        suggestedFix: `Redistribute stakes-raising beats: move at least one raise_stakes-purposed scene into the empty zone(s) — ${emptyNames933a} — so the structure escalates across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // STRUCTURE_REVELATION_PURPOSE_ZONE_IMBALANCE — Underweight/bloat × purpose === 'revelation' ×
  // four structural zones. Built on checkZoneImbalance from the shared checks library, closing the
  // 4-zone gap for this purpose value (its 3-zone/run trio was completed in Wave 919). n≥10, ≥4
  // revelation-purposed scenes total, divided across four equal structural zones. Fires only when
  // one zone has zero such scenes while another holds ≥50% of the total. Distinct from STRUCTURE_
  // REVELATION_PURPOSE_ZONE_CLUSTER/DROUGHT_RUN (Wave 919) and from the revelation-string-field
  // rules — the first application of the 4-zone bloat+empty-zone mode to this purpose value.
  {
    const r933b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'revelation',
    });
    if (r933b.fires) {
      const emptyNames933b = r933b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName933b = FOUR_ZONE_NAMES[r933b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames933b} empty; ${bloatName933b} has ${r933b.counts[r933b.bloatZoneIdx]}/${r933b.totalCount} revelation-purposed scenes`,
        rule: 'STRUCTURE_REVELATION_PURPOSE_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r933b.totalCount} revelation-purposed scenes are unevenly distributed across its four structural zones: ${bloatName933b} contains ${r933b.counts[r933b.bloatZoneIdx]} of them (${Math.round((r933b.counts[r933b.bloatZoneIdx] / r933b.totalCount) * 100)}%) while ${emptyNames933b} contains none. Purpose-built disclosures bloat in one structural quarter and vanish from another, leaving the story's architecture lopsided around where it turns on new information.`,
        suggestedFix: `Redistribute disclosures: move at least one revelation-purposed scene into the empty zone(s) — ${emptyNames933b} — so the structure turns on new information across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // STRUCTURE_NEGATIVE_EMOTION_ZONE_IMBALANCE — Underweight/bloat × emotionalShift === 'negative' ×
  // four structural zones. Built on checkZoneImbalance from the shared checks library, extending
  // the 4-zone mode to the emotionalShift valence signal. n≥10, ≥4 negative-shift scenes total,
  // divided across four equal structural zones. Fires only when one zone has zero such scenes while
  // another holds ≥50% of the total. Distinct from the existing 3-zone STRUCTURE_NEGATIVE_EMOTION_
  // ZONE_CLUSTER and run-based STRUCTURE_NEGATIVE_EMOTION_DROUGHT_RUN — the first application of the
  // 4-zone bloat+empty-zone mode to this valence signal.
  {
    const r933c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.emotionalShift === 'negative',
    });
    if (r933c.fires) {
      const emptyNames933c = r933c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName933c = FOUR_ZONE_NAMES[r933c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames933c} empty; ${bloatName933c} has ${r933c.counts[r933c.bloatZoneIdx]}/${r933c.totalCount} negative-shift scenes`,
        rule: 'STRUCTURE_NEGATIVE_EMOTION_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r933c.totalCount} scenes with a negative emotional shift are unevenly distributed across its four structural zones: ${bloatName933c} contains ${r933c.counts[r933c.bloatZoneIdx]} of them (${Math.round((r933c.counts[r933c.bloatZoneIdx] / r933c.totalCount) * 100)}%) while ${emptyNames933c} contains none. Downturns bloat in one structural quarter and vanish from another, leaving the story's architecture lopsided around where its emotional low points fall.`,
        suggestedFix: `Redistribute downturns: place a negative emotional beat in at least one scene inside the empty zone(s) — ${emptyNames933c} — so the structure's low points fall across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // STRUCTURE_POSITIVE_EMOTION_ZONE_IMBALANCE — Underweight/bloat × emotionalShift === 'positive' ×
  // four structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4
  // positive-shift scenes total, divided across four equal structural zones. Fires only when one
  // zone has zero such scenes while another holds ≥50% of the total. Distinct from the existing
  // 3-zone STRUCTURE_POSITIVE_EMOTION_ZONE_CLUSTER and run-based STRUCTURE_POSITIVE_EMOTION_DROUGHT_
  // RUN — the first application of the 4-zone bloat+empty-zone mode to this valence signal, and the
  // positive-valence mirror of the Wave 933 STRUCTURE_NEGATIVE_EMOTION_ZONE_IMBALANCE.
  {
    const r947a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.emotionalShift === 'positive',
    });
    if (r947a.fires) {
      const emptyNames947a = r947a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName947a = FOUR_ZONE_NAMES[r947a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames947a} empty; ${bloatName947a} has ${r947a.counts[r947a.bloatZoneIdx]}/${r947a.totalCount} positive-shift scenes`,
        rule: 'STRUCTURE_POSITIVE_EMOTION_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r947a.totalCount} scenes with a positive emotional shift are unevenly distributed across its four structural zones: ${bloatName947a} contains ${r947a.counts[r947a.bloatZoneIdx]} of them (${Math.round((r947a.counts[r947a.bloatZoneIdx] / r947a.totalCount) * 100)}%) while ${emptyNames947a} contains none. Upturns bloat in one structural quarter and vanish from another, leaving the story's architecture lopsided around where its emotional high points fall.`,
        suggestedFix: `Redistribute upturns: place a positive emotional beat in at least one scene inside the empty zone(s) — ${emptyNames947a} — so the structure's high points fall across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // STRUCTURE_SUSPENSE_ZONE_IMBALANCE — Underweight/bloat × (suspenseDelta > 0) × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 suspense-raising
  // scenes total, divided across four equal structural zones. Fires only when one zone has zero
  // such scenes while another holds ≥50% of the total. Distinct from the existing 3-zone STRUCTURE_
  // SUSPENSE_ZONE_CLUSTER and run-based STRUCTURE_SUSPENSE_DROUGHT_RUN — the first application of the
  // 4-zone bloat+empty-zone mode to the suspense-delta magnitude signal in this pass, keying on
  // tension change rather than categorical purpose or emotional valence.
  {
    const r947b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r947b.fires) {
      const emptyNames947b = r947b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName947b = FOUR_ZONE_NAMES[r947b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames947b} empty; ${bloatName947b} has ${r947b.counts[r947b.bloatZoneIdx]}/${r947b.totalCount} suspense-raising scenes`,
        rule: 'STRUCTURE_SUSPENSE_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r947b.totalCount} suspense-raising scenes are unevenly distributed across its four structural zones: ${bloatName947b} contains ${r947b.counts[r947b.bloatZoneIdx]} of them (${Math.round((r947b.counts[r947b.bloatZoneIdx] / r947b.totalCount) * 100)}%) while ${emptyNames947b} contains none. Tension bloats in one structural quarter and flatlines in another, leaving the story's architecture lopsided around where its suspense is built.`,
        suggestedFix: `Redistribute suspense: move or add a scene that raises suspense (suspenseDelta > 0) into the empty zone(s) — ${emptyNames947b} — so the structure sustains tension across every structural quarter, not only the quarter currently carrying most of it.`,
      });
    }
  }

  // STRUCTURE_OPEN_THREAD_ZONE_IMBALANCE — Underweight/bloat × (unresolvedClues.length > 0) × four
  // structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 scenes
  // leaving an open thread total, divided across four equal structural zones. Fires only when one
  // zone has zero such scenes while another holds ≥50% of the total. Distinct from the existing
  // 3-zone STRUCTURE_OPEN_THREAD_ZONE_CLUSTER and run-based STRUCTURE_OPEN_THREAD_DROUGHT_RUN — the
  // first application of the 4-zone bloat+empty-zone mode to the open-thread array-field signal in
  // this pass, keying on unresolved-question density rather than purpose, valence, or delta.
  {
    const r947c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r947c.fires) {
      const emptyNames947c = r947c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName947c = FOUR_ZONE_NAMES[r947c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames947c} empty; ${bloatName947c} has ${r947c.counts[r947c.bloatZoneIdx]}/${r947c.totalCount} open-thread scenes`,
        rule: 'STRUCTURE_OPEN_THREAD_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r947c.totalCount} scenes leaving an open thread are unevenly distributed across its four structural zones: ${bloatName947c} contains ${r947c.counts[r947c.bloatZoneIdx]} of them (${Math.round((r947c.counts[r947c.bloatZoneIdx] / r947c.totalCount) * 100)}%) while ${emptyNames947c} contains none. Unresolved questions bloat in one structural quarter and never open in another, leaving the story's architecture lopsided around where its loose ends accumulate.`,
        suggestedFix: `Redistribute open threads: leave an unresolved question (non-empty unresolvedClues) in at least one scene inside the empty zone(s) — ${emptyNames947c} — so the structure keeps forward pull alive across every structural quarter, not only the quarter currently carrying most of it.`,
      });
    }
  }

  // STRUCTURE_CURIOSITY_ZONE_IMBALANCE — Underweight/bloat × (curiosityDelta > 0) × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 curiosity-raising
  // scenes total, divided across four equal structural zones. Fires only when one zone has zero such
  // scenes while another holds ≥50% of the total. Distinct from the existing 3-zone STRUCTURE_
  // CURIOSITY_ZONE_CLUSTER and run-based STRUCTURE_CURIOSITY_DROUGHT_RUN — the first application of
  // the 4-zone bloat+empty-zone mode to the curiosity-delta magnitude signal in this pass, keying on
  // question-raising change rather than the suspense delta audited in Wave 947.
  {
    const r961a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r961a.fires) {
      const emptyNames961a = r961a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName961a = FOUR_ZONE_NAMES[r961a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames961a} empty; ${bloatName961a} has ${r961a.counts[r961a.bloatZoneIdx]}/${r961a.totalCount} curiosity-raising scenes`,
        rule: 'STRUCTURE_CURIOSITY_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r961a.totalCount} curiosity-raising scenes are unevenly distributed across its four structural zones: ${bloatName961a} contains ${r961a.counts[r961a.bloatZoneIdx]} of them (${Math.round((r961a.counts[r961a.bloatZoneIdx] / r961a.totalCount) * 100)}%) while ${emptyNames961a} contains none. New questions bloat in one structural quarter and never open in another, leaving the story's architecture lopsided around where it invites the audience to wonder.`,
        suggestedFix: `Redistribute curiosity: move or add a scene that raises curiosity (curiosityDelta > 0) into the empty zone(s) — ${emptyNames961a} — so the structure keeps opening fresh questions across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // STRUCTURE_PAYOFF_ZONE_IMBALANCE — Underweight/bloat × (payoffSetupIds.length > 0) × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 payoff scenes total,
  // divided across four equal structural zones. Fires only when one zone has zero such scenes while
  // another holds ≥50% of the total. Distinct from the existing 3-zone STRUCTURE_PAYOFF_ZONE_CLUSTER
  // and run-based STRUCTURE_PAYOFF_DROUGHT_RUN — the first application of the 4-zone bloat+empty-zone
  // mode to the payoffSetupIds array field, distinct from the unresolvedClues field audited in Wave 947.
  {
    const r961b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.payoffSetupIds ?? []).length > 0,
    });
    if (r961b.fires) {
      const emptyNames961b = r961b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName961b = FOUR_ZONE_NAMES[r961b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames961b} empty; ${bloatName961b} has ${r961b.counts[r961b.bloatZoneIdx]}/${r961b.totalCount} payoff scenes`,
        rule: 'STRUCTURE_PAYOFF_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r961b.totalCount} payoff scenes are unevenly distributed across its four structural zones: ${bloatName961b} contains ${r961b.counts[r961b.bloatZoneIdx]} of them (${Math.round((r961b.counts[r961b.bloatZoneIdx] / r961b.totalCount) * 100)}%) while ${emptyNames961b} contains none. Payoffs bloat in one structural quarter and never land in another, leaving the story's architecture lopsided around where its setups discharge.`,
        suggestedFix: `Redistribute payoffs: move at least one scene that pays off an earlier setup (non-empty payoffSetupIds) into the empty zone(s) — ${emptyNames961b} — so the structure keeps closing threads across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // STRUCTURE_REVELATION_ZONE_IMBALANCE — Underweight/bloat × (revelation != null) × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 revelation scenes
  // total, divided across four equal structural zones. Fires only when one zone has zero such scenes
  // while another holds ≥50% of the total. Distinct from the existing 3-zone STRUCTURE_REVELATION_
  // ZONE_CLUSTER and run-based STRUCTURE_REVELATION_DROUGHT_RUN — the first application of the 4-zone
  // bloat+empty-zone mode to the revelation STRING field (revelation != null), and distinct from
  // STRUCTURE_REVELATION_PURPOSE_ZONE_IMBALANCE, which audits the separate purpose === 'revelation' enum.
  {
    const r961c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.revelation != null,
    });
    if (r961c.fires) {
      const emptyNames961c = r961c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName961c = FOUR_ZONE_NAMES[r961c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames961c} empty; ${bloatName961c} has ${r961c.counts[r961c.bloatZoneIdx]}/${r961c.totalCount} revelation scenes`,
        rule: 'STRUCTURE_REVELATION_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r961c.totalCount} revelation scenes are unevenly distributed across its four structural zones: ${bloatName961c} contains ${r961c.counts[r961c.bloatZoneIdx]} of them (${Math.round((r961c.counts[r961c.bloatZoneIdx] / r961c.totalCount) * 100)}%) while ${emptyNames961c} contains none. Disclosures bloat in one structural quarter and never land in another, leaving the story's architecture lopsided around where new information reframes it.`,
        suggestedFix: `Redistribute disclosures: land a revelation in at least one scene inside the empty zone(s) — ${emptyNames961c} — so the structure keeps reframing across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // STRUCTURE_CLOCK_ZONE_IMBALANCE — Underweight/bloat × (clockRaised === true) × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 clock-raising scenes
  // total, divided across four equal structural zones. Fires only when one zone has zero such scenes
  // while another holds ≥50% of the total. Uses the same clockRaised === true predicate as the
  // existing 3-zone STRUCTURE_CLOCK_ZONE_CLUSTER and run-based STRUCTURE_CLOCK_DROUGHT_RUN — the
  // first application of the 4-zone bloat+empty-zone mode to the clockRaised BOOLEAN field, distinct
  // from the numeric clockDelta signal audited just below.
  {
    const r975a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.clockRaised === true,
    });
    if (r975a.fires) {
      const emptyNames975a = r975a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName975a = FOUR_ZONE_NAMES[r975a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames975a} empty; ${bloatName975a} has ${r975a.counts[r975a.bloatZoneIdx]}/${r975a.totalCount} clock-raising scenes`,
        rule: 'STRUCTURE_CLOCK_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r975a.totalCount} clock-raising scenes are unevenly distributed across its four structural zones: ${bloatName975a} contains ${r975a.counts[r975a.bloatZoneIdx]} of them (${Math.round((r975a.counts[r975a.bloatZoneIdx] / r975a.totalCount) * 100)}%) while ${emptyNames975a} contains none. Ticking clocks bloat in one structural quarter and are never introduced in another, leaving the story's architecture lopsided around where deadline pressure enters it.`,
        suggestedFix: `Redistribute ticking clocks: introduce a time pressure (clockRaised) in at least one scene inside the empty zone(s) — ${emptyNames975a} — so the structure operates under deadline pressure across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // STRUCTURE_CLOCK_DELTA_ZONE_IMBALANCE — Underweight/bloat × (clockDelta !== 0) × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 clock-moving scenes
  // total, divided across four equal structural zones. Fires only when one zone has zero such scenes
  // while another holds ≥50% of the total. Uses the same clockDelta !== 0 predicate as the existing
  // 3-zone STRUCTURE_CLOCK_DELTA_ZONE_CLUSTER and run-based STRUCTURE_CLOCK_DELTA_DROUGHT_RUN — the
  // first application of the 4-zone bloat+empty-zone mode to this delta signal, distinct from the
  // boolean clockRaised field audited just above.
  {
    const r975b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.clockDelta ?? 0) !== 0,
    });
    if (r975b.fires) {
      const emptyNames975b = r975b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName975b = FOUR_ZONE_NAMES[r975b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames975b} empty; ${bloatName975b} has ${r975b.counts[r975b.bloatZoneIdx]}/${r975b.totalCount} clock-moving scenes`,
        rule: 'STRUCTURE_CLOCK_DELTA_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r975b.totalCount} clock-moving scenes are unevenly distributed across its four structural zones: ${bloatName975b} contains ${r975b.counts[r975b.bloatZoneIdx]} of them (${Math.round((r975b.counts[r975b.bloatZoneIdx] / r975b.totalCount) * 100)}%) while ${emptyNames975b} contains none. Deadline pressure bloats in one structural quarter and never moves in another, leaving the story's architecture lopsided around where urgency compresses.`,
        suggestedFix: `Redistribute clock movement: move or add a scene that changes the clock (clockDelta ≠ 0) into the empty zone(s) — ${emptyNames975b} — so the structure keeps racing a deadline across every structural quarter, not only the quarter currently carrying most of it.`,
      });
    }
  }

  // STRUCTURE_RELATIONSHIP_ZONE_IMBALANCE — Underweight/bloat × (relationshipShifts.length > 0) ×
  // four structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4
  // scenes with a relationship shift total, divided across four equal structural zones. Fires only
  // when one zone has zero such scenes while another holds ≥50% of the total. Distinct from the
  // existing 3-zone STRUCTURE_RELATIONSHIP_ZONE_CLUSTER and run-based STRUCTURE_RELATIONSHIP_DROUGHT_
  // RUN — the first application of the 4-zone bloat+empty-zone mode to the relationshipShifts array
  // field, distinct from all previously audited arrays in this pass.
  {
    const r975c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r975c.fires) {
      const emptyNames975c = r975c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName975c = FOUR_ZONE_NAMES[r975c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames975c} empty; ${bloatName975c} has ${r975c.counts[r975c.bloatZoneIdx]}/${r975c.totalCount} relationship-shift scenes`,
        rule: 'STRUCTURE_RELATIONSHIP_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r975c.totalCount} scenes with a relationship shift are unevenly distributed across its four structural zones: ${bloatName975c} contains ${r975c.counts[r975c.bloatZoneIdx]} of them (${Math.round((r975c.counts[r975c.bloatZoneIdx] / r975c.totalCount) * 100)}%) while ${emptyNames975c} contains none. Bonds change in a bloated cluster in one structural quarter and stay static in another, leaving the story's architecture lopsided around where relationships move.`,
        suggestedFix: `Redistribute relational change: give at least one scene inside the empty zone(s) — ${emptyNames975c} — a relationship shift so the structure keeps carrying relational movement across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // STRUCTURE_SEED_ZONE_IMBALANCE — Underweight/bloat × seededClueIds array × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 seed scenes total,
  // divided across four equal structural zones. Distinct from the existing 3-zone STRUCTURE_SEED_
  // ZONE_CLUSTER and run-based STRUCTURE_SEED_DROUGHT_RUN — the first application of the 4-zone
  // bloat+empty-zone mode to this channel.
  {
    const r989a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.seededClueIds ?? []).length > 0,
    });
    if (r989a.fires) {
      const emptyNames989a = r989a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName989a = FOUR_ZONE_NAMES[r989a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames989a} empty; ${bloatName989a} has ${r989a.counts[r989a.bloatZoneIdx]}/${r989a.totalCount} seed scenes`,
        rule: 'STRUCTURE_SEED_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r989a.totalCount} clue-planting scenes are unevenly distributed across its four structural zones: ${bloatName989a} contains ${r989a.counts[r989a.bloatZoneIdx]} of them (${Math.round((r989a.counts[r989a.bloatZoneIdx] / r989a.totalCount) * 100)}%) while ${emptyNames989a} contains none. Foreshadowing bloats in one structural quarter and never plants in another, leaving the story's architecture lopsided around where future payoffs are seeded.`,
        suggestedFix: `Redistribute foreshadowing: plant a clue in at least one scene inside the empty zone(s) — ${emptyNames989a} — so the structure keeps seeding future payoffs across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // STRUCTURE_TURN_ZONE_IMBALANCE — Underweight/bloat × (dramaticTurn !== 'nothing') × four
  // structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4
  // dramatic-turn scenes total, divided across four equal structural zones. Distinct from the
  // existing 3-zone STRUCTURE_TURN_ZONE_CLUSTER and run-based STRUCTURE_TURN_DROUGHT_RUN — the
  // last of this pass's two remaining clean trio-complete signals (STRUCTURE_STAGING was skipped:
  // its cluster (visualBeats.length>=2) and drought-run (visualBeats.length>0) predicates
  // disagree, so its "trio" doesn't actually audit one consistent signal).
  {
    const r989b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
    });
    if (r989b.fires) {
      const emptyNames989b = r989b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName989b = FOUR_ZONE_NAMES[r989b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames989b} empty; ${bloatName989b} has ${r989b.counts[r989b.bloatZoneIdx]}/${r989b.totalCount} dramatic-turn scenes`,
        rule: 'STRUCTURE_TURN_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r989b.totalCount} dramatic-turn scenes are unevenly distributed across its four structural zones: ${bloatName989b} contains ${r989b.counts[r989b.bloatZoneIdx]} of them (${Math.round((r989b.counts[r989b.bloatZoneIdx] / r989b.totalCount) * 100)}%) while ${emptyNames989b} contains none. Pivots bloat in one structural quarter and never land in another, leaving the story's architecture lopsided around where reversals occur.`,
        suggestedFix: `Redistribute pivots: give at least one scene inside the empty zone(s) — ${emptyNames989b} — a dramatic turn so the structure keeps pivoting across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // STRUCTURE_STAKES_CURIOSITY_AFTERMATH_VOID — with zone-imbalance now exhausted down to the two
  // signals above, this wave completes the trio via the sequence/aftermath mode. Built on
  // checkAftermathVoid from the shared checks library. n≥8, ≥2 qualifying stakes-raise scenes
  // (purpose === 'raise_stakes', pos<n-2), ≥2 curiosity-raising scenes anywhere, 2-scene lookahead.
  // Fires when every stakes-raise's two-scene aftermath opens no new curiosity, while curiosity
  // does occur elsewhere. The existing aftermath-void rules in this pass use payoffSetupIds,
  // dramaticTurn, and unresolvedClues as triggers — this is the first use of raise_stakes.
  {
    const r989c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.purpose === 'raise_stakes',
      isAftermath: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r989c.fires) {
      issues.push({
        location: `${r989c.triggerCount} stakes-raise aftermath(s) — no curiosity raised within 2 scenes`,
        rule: 'STRUCTURE_STAKES_CURIOSITY_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every stakes-raising scene (${r989c.triggerCount} escalations) is followed by two scenes that raise no new curiosity, even though ${r989c.aftermathCount} scenes elsewhere do open fresh questions. Escalating danger that never provokes a new uncertainty about what comes next leaves the story's architecture with an escalation beat that doesn't propel the next section forward.`,
        suggestedFix: `In the two scenes following at least one stakes-raise, plant a new open question so escalation keeps propelling the structure forward rather than sitting in a learnable void.`,
      });
    }
  }

  // STRUCTURE_STAKES_SUSPENSE_AFTERMATH_VOID — Sequence/aftermath × raise_stakes trigger →
  // suspenseDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying stakes-raise scenes (pos<n-2), ≥2 tension-raising scenes anywhere, 2-scene
  // lookahead. Fires when every stakes-raise's two-scene aftermath raises no tension, while
  // tension does rise elsewhere. Distinct from STRUCTURE_STAKES_CURIOSITY_AFTERMATH_VOID (same
  // trigger paired with curiosityDelta) — this pairs raise_stakes with suspenseDelta for the first
  // time in this pass.
  {
    const r1003a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.purpose === 'raise_stakes',
      isAftermath: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r1003a.fires) {
      issues.push({
        location: `${r1003a.triggerCount} stakes-raise aftermath(s) — no suspense raised within 2 scenes`,
        rule: 'STRUCTURE_STAKES_SUSPENSE_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every stakes-raising scene (${r1003a.triggerCount} escalations) is followed by two scenes with no rise in tension, even though ${r1003a.aftermathCount} such rises occur elsewhere. Escalating danger that never tightens the felt sense of jeopardy in the beats right after it leaves the story's architecture with an escalation that reads as stated rather than felt.`,
        suggestedFix: `In the two scenes following at least one stakes-raise, tighten the tension — a ticking complication or a near-miss — so escalating danger registers as felt, not just stated.`,
      });
    }
  }

  // STRUCTURE_PAYOFF_RELATIONAL_AFTERMATH_VOID — Sequence/aftermath × payoffSetupIds trigger →
  // relationshipShifts absence. Built on checkAftermathVoid from the shared checks library. n≥8,
  // ≥2 qualifying payoff scenes (pos<n-2), ≥2 relationship-shift scenes anywhere, 2-scene
  // lookahead. Fires when every payoff's two-scene aftermath carries no relationship shift, while
  // such shifts occur elsewhere. Distinct from PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (same
  // trigger paired with dialogueHighlights) — this pairs payoffSetupIds with relationshipShifts
  // for the first time in this pass.
  {
    const r1003b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.payoffSetupIds ?? []).length > 0,
      isAftermath: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r1003b.fires) {
      issues.push({
        location: `${r1003b.triggerCount} payoff aftermath(s) — no relationship shift within 2 scenes`,
        rule: 'STRUCTURE_PAYOFF_RELATIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every payoff scene (${r1003b.triggerCount} cashed-in setups) is followed by two scenes with no shift in any relationship, even though ${r1003b.aftermathCount} such shifts occur elsewhere. A callback that never bears on how characters treat each other in the scenes right after it lands as narrative bookkeeping rather than a beat that ripples through the architecture's relationships.`,
        suggestedFix: `In the two scenes following at least one payoff, let the resolved setup strain or shift a relationship so the callback pays off interpersonally, not only structurally.`,
      });
    }
  }

  // STRUCTURE_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID — Sequence/aftermath × heavy unresolved-clue-
  // debt trigger → emotionalShift absence. Built on checkAftermathVoid from the shared checks
  // library. n≥8, ≥2 qualifying heavy-debt scenes (unresolvedClues.length≥3, pos<n-2), ≥2
  // emotionally-charged scenes anywhere, 2-scene lookahead. Fires when every heavy-debt scene's
  // two-scene aftermath is emotionally flat, while charged scenes occur elsewhere. Distinct from
  // OPEN_THREAD_REVELATION_DECOUPLED-style (co-occurrence) and this pass's existing heavy-debt →
  // dialogueHighlights aftermath-void pairing — this pairs the same trigger with emotionalShift
  // for the first time.
  {
    const r1003c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.unresolvedClues ?? []).length >= 3,
      isAftermath: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r1003c.fires) {
      issues.push({
        location: `${r1003c.triggerCount} heavy clue-debt scene(s) — no emotional shift within 2 scenes of any`,
        rule: 'STRUCTURE_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every scene carrying heavy unresolved clue-debt (${r1003c.triggerCount} instances) is followed by two emotionally neutral scenes, even though ${r1003c.aftermathCount} emotionally-charged scenes exist elsewhere. Accumulated mystery that never registers as felt weight in the scenes right after it leaves the story's architecture with unresolved material that reads as inert backlog rather than pressing on anyone.`,
        suggestedFix: `In the two scenes following at least one heavy clue-debt moment, show a character reacting emotionally to the accumulated unresolved material so the mystery presses on the story rather than sitting as inert backlog.`,
      });
    }
  }

  // STRUCTURE_TURN_CURIOSITY_AFTERMATH_VOID — Sequence/aftermath × dramaticTurn trigger →
  // curiosityDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying dramatic-turn scenes (pos<n-2), ≥2 curiosity-raising scenes anywhere, 2-scene
  // lookahead. Fires when every turn's two-scene aftermath opens no new curiosity, while curiosity
  // does occur elsewhere. Distinct from this pass's existing dramaticTurn → visualBeats aftermath-
  // void pairing — this pairs the same trigger with curiosityDelta for the first time.
  {
    const r1017a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
      isAftermath: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r1017a.fires) {
      issues.push({
        location: `${r1017a.triggerCount} dramatic-turn aftermath(s) — no curiosity raised within 2 scenes`,
        rule: 'STRUCTURE_TURN_CURIOSITY_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every dramatic-turn scene in the story (${r1017a.triggerCount} pivots) is followed by two scenes that raise no new curiosity, even though ${r1017a.aftermathCount} scenes elsewhere do open fresh questions. A pivot should usually provoke a new question about what changes next; when every turn's aftermath opens no curiosity, the story's architecture treats the reversal as a closed event rather than a springboard for further wondering.`,
        suggestedFix: `In the two scenes following at least one dramatic turn, plant a new open question so the pivot keeps propelling the structure forward rather than closing the matter.`,
      });
    }
  }

  // STRUCTURE_PAYOFF_EMOTIONAL_AFTERMATH_VOID — Sequence/aftermath × payoffSetupIds trigger →
  // emotionalShift absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying payoff scenes (pos<n-2), ≥2 emotionally-charged scenes anywhere, 2-scene lookahead.
  // Fires when every payoff's two-scene aftermath is emotionally flat, while charged scenes occur
  // elsewhere. Distinct from PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (dialogueHighlights) and
  // STRUCTURE_PAYOFF_RELATIONAL_AFTERMATH_VOID (Wave 1003, relationshipShifts) — this is the third
  // consequence channel for this trigger in this pass.
  {
    const r1017b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.payoffSetupIds ?? []).length > 0,
      isAftermath: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r1017b.fires) {
      issues.push({
        location: `${r1017b.triggerCount} payoff aftermath(s) — no emotional shift within 2 scenes`,
        rule: 'STRUCTURE_PAYOFF_EMOTIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every payoff scene (${r1017b.triggerCount} cashed-in setups) is followed by two emotionally neutral scenes, even though ${r1017b.aftermathCount} emotionally-charged scenes exist elsewhere. A callback usually carries some feeling for whoever collects on it; when every payoff's aftermath is affectively flat, the story's architecture registers the resolution as pure mechanics with no felt weight.`,
        suggestedFix: `Let at least one payoff carry feeling in its aftermath: in the scene or two after a setup pays off, show someone reacting to it emotionally — relief, grief, triumph.`,
      });
    }
  }

  // STRUCTURE_STAKES_RELATIONAL_AFTERMATH_VOID — Sequence/aftermath × raise_stakes trigger →
  // relationshipShifts absence. Built on checkAftermathVoid from the shared checks library. n≥8,
  // ≥2 qualifying stakes-raise scenes (pos<n-2), ≥2 relationship-shift scenes anywhere, 2-scene
  // lookahead. Fires when every stakes-raise's two-scene aftermath carries no relationship shift,
  // while such shifts occur elsewhere. Distinct from STRUCTURE_STAKES_CURIOSITY_AFTERMATH_VOID
  // (curiosityDelta) and STRUCTURE_STAKES_SUSPENSE_AFTERMATH_VOID (Wave 1003, suspenseDelta) —
  // this is the third consequence channel for this trigger in this pass.
  {
    const r1017c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.purpose === 'raise_stakes',
      isAftermath: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r1017c.fires) {
      issues.push({
        location: `${r1017c.triggerCount} stakes-raise aftermath(s) — no relationship shift within 2 scenes`,
        rule: 'STRUCTURE_STAKES_RELATIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every stakes-raising scene (${r1017c.triggerCount} escalations) is followed by two scenes with no shift in any relationship, even though ${r1017c.aftermathCount} such shifts occur elsewhere. Escalating danger that never bears on how characters treat each other in the scenes right after it leaves the story's architecture with an escalation beat isolated from the relationships it should be testing.`,
        suggestedFix: `In the two scenes following at least one stakes-raise, let the escalating danger strain or shift a relationship so rising pressure registers on the bonds between characters, not only on the plot.`,
      });
    }
  }

  // STRUCTURE_STAKES_EMOTIONAL_AFTERMATH_VOID — Sequence/aftermath × raise_stakes trigger →
  // emotionalShift absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying raise_stakes scenes (pos<n-2), ≥2 emotionally-charged scenes anywhere, 2-scene
  // lookahead. Fires when every stakes-raise's two-scene aftermath carries no emotional shift,
  // while such shifts occur elsewhere. Distinct from STRUCTURE_STAKES_CURIOSITY_AFTERMATH_VOID,
  // STRUCTURE_STAKES_SUSPENSE_AFTERMATH_VOID, and STRUCTURE_STAKES_RELATIONAL_AFTERMATH_VOID
  // (same trigger paired with curiosityDelta/suspenseDelta/relationshipShifts respectively) — this
  // is the fourth consequence channel for this trigger in this pass.
  {
    const r1031a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.purpose === 'raise_stakes',
      isAftermath: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r1031a.fires) {
      issues.push({
        location: `${r1031a.triggerCount} raise-stakes aftermath(s) — no emotional shift within 2 scenes`,
        rule: 'STRUCTURE_STAKES_EMOTIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every stakes-raising scene in the story (${r1031a.triggerCount} of them) is followed by two emotionally neutral scenes, even though ${r1031a.aftermathCount} emotionally-charged scenes exist elsewhere. A stakes-raise that isn't matched by any feeling in the scenes right after it leaves the structure's escalation registering as a declared beat rather than something anyone visibly feels the weight of.`,
        suggestedFix: `In the two scenes following at least one stakes-raise, let someone's feelings visibly register the new danger so the structural escalation lands emotionally, not only mechanically.`,
      });
    }
  }

  // STRUCTURE_TURN_RELATIONAL_AFTERMATH_VOID — Sequence/aftermath × dramaticTurn trigger →
  // relationshipShifts absence. Built on checkAftermathVoid from the shared checks library. n≥8,
  // ≥2 qualifying dramatic-turn scenes (pos<n-2), ≥2 relationship-shift scenes anywhere, 2-scene
  // lookahead. Fires when every turn's two-scene aftermath carries no bond change, while such
  // changes occur elsewhere. Distinct from the original dramaticTurn → visualBeats rule and
  // STRUCTURE_TURN_CURIOSITY_AFTERMATH_VOID (same trigger paired with visualBeats and
  // curiosityDelta respectively) — this is the third consequence channel for this trigger.
  {
    const r1031b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
      isAftermath: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r1031b.fires) {
      issues.push({
        location: `${r1031b.triggerCount} dramatic-turn aftermath(s) — no relationship shift within 2 scenes`,
        rule: 'STRUCTURE_TURN_RELATIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every dramatic-turn scene in the story (${r1031b.triggerCount} pivots) is followed by two scenes with no shift in any relationship, even though ${r1031b.aftermathCount} such shifts occur elsewhere. A pivot that never bears on how characters treat each other in the scenes right after it lands as a structural beat the story registers mechanically rather than interpersonally.`,
        suggestedFix: `In the two scenes following at least one dramatic turn, let the pivot strain or shift a relationship so the structure's turn registers on the bonds between characters, not only on the plot.`,
      });
    }
  }

  // STRUCTURE_PAYOFF_CURIOSITY_AFTERMATH_VOID — Sequence/aftermath × payoffSetupIds trigger →
  // curiosityDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying payoff scenes (pos<n-2), ≥2 curiosity-rising scenes anywhere, 2-scene lookahead.
  // Fires when every payoff's two-scene aftermath carries no curiosity rise, while such rises
  // occur elsewhere. Distinct from the original payoffSetupIds → dialogueHighlights rule,
  // STRUCTURE_PAYOFF_RELATIONAL_AFTERMATH_VOID, and STRUCTURE_PAYOFF_EMOTIONAL_AFTERMATH_VOID
  // (same trigger paired with dialogueHighlights/relationshipShifts/emotionalShift respectively) —
  // this is the fourth consequence channel for this trigger.
  {
    const r1031c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.payoffSetupIds ?? []).length > 0,
      isAftermath: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r1031c.fires) {
      issues.push({
        location: `${r1031c.triggerCount} payoff aftermath(s) — no curiosity rise within 2 scenes`,
        rule: 'STRUCTURE_PAYOFF_CURIOSITY_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every payoff scene in the story (${r1031c.triggerCount} cashed-in setups) is followed by two scenes with no rise in curiosity, even though ${r1031c.aftermathCount} such rises occur elsewhere. A resolution that closes cleanly with no fresh question in its wake leaves the structure's payoff beats feeling terminal rather than generative of the next stretch of story.`,
        suggestedFix: `In the two scenes following at least one payoff, let a new question rise so the structure keeps generating curiosity instead of only closing threads.`,
      });
    }
  }

  // STRUCTURE_TURN_EMOTIONAL_AFTERMATH_VOID — Sequence/aftermath × dramaticTurn trigger →
  // emotionalShift absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying dramatic-turn scenes (pos<n-2), ≥2 emotionally-charged scenes anywhere, 2-scene
  // lookahead. Fires when every turn's two-scene aftermath carries no emotional shift, while such
  // shifts occur elsewhere. Distinct from the original dramaticTurn → visualBeats rule,
  // STRUCTURE_TURN_CURIOSITY_AFTERMATH_VOID, and STRUCTURE_TURN_RELATIONAL_AFTERMATH_VOID (same
  // trigger paired with visualBeats/curiosityDelta/relationshipShifts respectively) — this is the
  // fourth consequence channel for this trigger in this pass.
  {
    const r1045a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
      isAftermath: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r1045a.fires) {
      issues.push({
        location: `${r1045a.triggerCount} dramatic-turn aftermath(s) — no emotional shift within 2 scenes`,
        rule: 'STRUCTURE_TURN_EMOTIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every dramatic-turn scene in the story (${r1045a.triggerCount} pivots) is followed by two emotionally neutral scenes, even though ${r1045a.aftermathCount} emotionally-charged scenes exist elsewhere. A pivot that never registers as felt in the scenes right after it lands as a structural beat the story tracks mechanically rather than something anyone visibly carries.`,
        suggestedFix: `In the two scenes following at least one dramatic turn, let someone's feelings visibly register the pivot so the structure's turn lands emotionally, not only structurally.`,
      });
    }
  }

  // STRUCTURE_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID — Sequence/aftermath × heavy unresolvedClues
  // debt trigger → curiosityDelta absence. Built on checkAftermathVoid from the shared checks
  // library. n≥8, ≥2 qualifying heavy-debt scenes (pos<n-2, threshold ≥3), ≥2 curiosity-rising
  // scenes anywhere, 2-scene lookahead. Fires when every heavy-debt scene's two-scene aftermath
  // carries no curiosity rise, while such rises occur elsewhere. Distinct from the original
  // unresolvedClues → dialogueHighlights rule and the unresolvedClues → emotionalShift rule (same
  // trigger paired with dialogueHighlights and emotionalShift respectively) — this is the third
  // consequence channel for this trigger.
  {
    const r1045b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.unresolvedClues ?? []).length >= 3,
      isAftermath: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r1045b.fires) {
      issues.push({
        location: `${r1045b.triggerCount} heavy clue-debt scene(s) — no curiosity rise within 2 scenes of any`,
        rule: 'STRUCTURE_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every scene carrying heavy unresolved clue-debt (${r1045b.triggerCount} instances) is followed by two scenes with no rise in curiosity, even though ${r1045b.aftermathCount} such rises occur elsewhere. Accumulated mystery should usually compound into fresh questions rather than sit as inert backlog; when every heavy-debt scene's aftermath opens nothing new, the structure's uncertainty stalls instead of deepening.`,
        suggestedFix: `In the two scenes following at least one heavy clue-debt moment, plant a new open question so accumulated mystery keeps compounding rather than sitting in a learnable lull.`,
      });
    }
  }

  // STRUCTURE_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID — Sequence/aftermath × heavy unresolvedClues
  // debt trigger → relationshipShifts absence. Built on checkAftermathVoid from the shared checks
  // library. n≥8, ≥2 qualifying heavy-debt scenes (pos<n-2, threshold ≥3), ≥2 relationship-shift
  // scenes anywhere, 2-scene lookahead. Fires when every heavy-debt scene's two-scene aftermath
  // carries no bond change, while such changes occur elsewhere. Distinct from STRUCTURE_OPEN_
  // THREAD_CURIOSITY_AFTERMATH_VOID (this wave) and the original unresolvedClues → dialogueHighlights
  // and → emotionalShift rules — this is the fourth consequence channel for this trigger.
  {
    const r1045c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.unresolvedClues ?? []).length >= 3,
      isAftermath: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r1045c.fires) {
      issues.push({
        location: `${r1045c.triggerCount} heavy clue-debt scene(s) — no relationship shift within 2 scenes of any`,
        rule: 'STRUCTURE_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every scene carrying heavy unresolved clue-debt (${r1045c.triggerCount} instances) is followed by two scenes with no shift in any relationship, even though ${r1045c.aftermathCount} such shifts occur elsewhere. A pile-up of open questions that never bears on how characters treat each other nearby leaves the structure's uncertainty purely informational rather than something straining the bonds it's meant to be tracking.`,
        suggestedFix: `In the two scenes following at least one heavy clue-debt moment, let the mounting uncertainty strain or shift a relationship so the structure's open threads register interpersonally, not just as plot backlog.`,
      });
    }
  }

  // STRUCTURE_PAYOFF_SUSPENSE_AFTERMATH_VOID — Sequence/aftermath × payoffSetupIds trigger →
  // suspenseDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying payoff scenes (pos<n-2), ≥2 suspense-rising scenes anywhere, 2-scene lookahead.
  // Fires when every payoff's two-scene aftermath carries no rise in suspense, while such rises
  // occur elsewhere. Distinct from PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID, STRUCTURE_PAYOFF_
  // RELATIONAL_AFTERMATH_VOID, STRUCTURE_PAYOFF_EMOTIONAL_AFTERMATH_VOID, and STRUCTURE_PAYOFF_
  // CURIOSITY_AFTERMATH_VOID (same trigger paired with dialogueHighlights/relationshipShifts/
  // emotionalShift/curiosityDelta respectively) — this is the fifth consequence channel for this
  // trigger.
  {
    const r1059a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.payoffSetupIds ?? []).length > 0,
      isAftermath: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r1059a.fires) {
      issues.push({
        location: `${r1059a.triggerCount} payoff scene(s) — no suspense rise within 2 scenes of any`,
        rule: 'STRUCTURE_PAYOFF_SUSPENSE_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r1059a.triggerCount} payoff scenes is followed by two scenes with no rise in suspense, even though ${r1059a.aftermathCount} such rises occur elsewhere. A resolved setup that never re-tightens tension right after it lands leaves the structure's payoffs registering as a closed loop with nothing left pressing on the reader.`,
        suggestedFix: `In the two scenes following at least one payoff, let a new tension rise so resolution doesn't flatten the structure's forward pressure entirely.`,
      });
    }
  }

  // STRUCTURE_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID — Sequence/aftermath × dramaticTurn trigger
  // → dialogueHighlights absence. Built on checkAftermathVoid from the shared checks library. n≥8,
  // ≥2 qualifying dramatic-turn scenes (pos<n-2), ≥2 scenes anywhere with a highlighted line of
  // dialogue, 2-scene lookahead. Fires when every turn's two-scene aftermath contains no
  // highlighted dialogue, while such dialogue occurs elsewhere. Distinct from DRAMATIC_TURN_
  // STAGING_AFTERMATH_VOID, STRUCTURE_TURN_CURIOSITY_AFTERMATH_VOID, STRUCTURE_TURN_RELATIONAL_
  // AFTERMATH_VOID, and STRUCTURE_TURN_EMOTIONAL_AFTERMATH_VOID (same trigger paired with
  // visualBeats/curiosityDelta/relationshipShifts/emotionalShift respectively) — this is the fifth
  // consequence channel for this trigger.
  {
    const r1059b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
      isAftermath: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r1059b.fires) {
      issues.push({
        location: `${r1059b.triggerCount} dramatic-turn aftermath(s) — no highlighted dialogue within 2 scenes`,
        rule: 'STRUCTURE_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every dramatic-turn scene in the story (${r1059b.triggerCount} pivots) is followed by two scenes with no highlighted dialogue, even though ${r1059b.aftermathCount} such scenes exist elsewhere in the script. A pivot that never earns a memorable line right after it lands leaves the structure's turns registering as plot mechanics without a voice confirming what changed.`,
        suggestedFix: `In the two scenes following at least one dramatic turn, let a character voice what just changed — a line worth remembering, not just a structural pivot passing silently.`,
      });
    }
  }

  // STRUCTURE_OPEN_THREAD_STAGING_AFTERMATH_VOID — Sequence/aftermath × heavy unresolvedClues
  // debt trigger → visualBeats absence. Built on checkAftermathVoid from the shared checks
  // library. n≥8, ≥2 qualifying heavy-debt scenes (pos<n-2, threshold ≥3), ≥2 visually-dense
  // scenes anywhere (visualBeats length≥2), 2-scene lookahead. Fires when every heavy-debt scene's
  // two-scene aftermath contains no visually dense scene, while such scenes occur elsewhere.
  // Distinct from STRUCTURE_OPEN_THREAD_HIGHLIGHT_AFTERMATH_VOID, STRUCTURE_OPEN_THREAD_EMOTIONAL_
  // AFTERMATH_VOID, STRUCTURE_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID, and STRUCTURE_OPEN_THREAD_
  // RELATIONAL_AFTERMATH_VOID (same trigger paired with dialogueHighlights/emotionalShift/
  // curiosityDelta/relationshipShifts respectively) — this is the fifth consequence channel for
  // this trigger.
  {
    const r1059c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.unresolvedClues ?? []).length >= 3,
      isAftermath: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r1059c.fires) {
      issues.push({
        location: `${r1059c.triggerCount} heavy clue-debt scene(s) — no visually dense scene within 2 scenes of any`,
        rule: 'STRUCTURE_OPEN_THREAD_STAGING_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every scene carrying heavy unresolved clue-debt (${r1059c.triggerCount} instances) is followed by two scenes with no substantial physical staging, even though ${r1059c.aftermathCount} such scenes exist elsewhere in the script. Accumulated mystery that never gets a physical presence around it right after it compounds leaves the structure's open threads feeling abstract rather than lodged in the world.`,
        suggestedFix: `In the two scenes following at least one heavy clue-debt moment, let substantial physical staging carry some of the weight — a scene where the unresolved material has a tangible presence, not just narrative backlog.`,
      });
    }
  }

  // STRUCTURE_PAYOFF_STAGING_AFTERMATH_VOID — Sequence/aftermath × payoffSetupIds trigger →
  // visualBeats absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying payoff scenes (pos<n-2), ≥2 visually-dense scenes anywhere (visualBeats length≥2),
  // 2-scene lookahead. Fires when every payoff's two-scene aftermath contains no visually dense
  // scene, while such scenes occur elsewhere. Distinct from PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_
  // VOID, STRUCTURE_PAYOFF_RELATIONAL_AFTERMATH_VOID, STRUCTURE_PAYOFF_EMOTIONAL_AFTERMATH_VOID,
  // STRUCTURE_PAYOFF_CURIOSITY_AFTERMATH_VOID, and STRUCTURE_PAYOFF_SUSPENSE_AFTERMATH_VOID (same
  // trigger paired with dialogueHighlights/relationshipShifts/emotionalShift/curiosityDelta/
  // suspenseDelta respectively) — this is the sixth and final standard-channel pairing for this
  // trigger, completing full saturation.
  {
    const r1073a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.payoffSetupIds ?? []).length > 0,
      isAftermath: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r1073a.fires) {
      issues.push({
        location: `${r1073a.triggerCount} payoff scene(s) — no visually dense scene within 2 scenes of any`,
        rule: 'STRUCTURE_PAYOFF_STAGING_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r1073a.triggerCount} payoff scenes is followed by two scenes with no substantial physical staging, even though ${r1073a.aftermathCount} such scenes exist elsewhere in the script. A resolved setup gains weight when the world briefly holds physical attention right after it lands, but that opportunity consistently passes unstaged in the scenes immediately following every payoff.`,
        suggestedFix: `After at least one payoff, let one of the following two scenes carry substantial physical staging — an action or gesture that gives the resolution a physical anchor before the structure moves on.`,
      });
    }
  }

  // STRUCTURE_TURN_SUSPENSE_AFTERMATH_VOID — Sequence/aftermath × dramaticTurn trigger →
  // suspenseDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying dramatic-turn scenes (pos<n-2), ≥2 suspense-rising scenes anywhere, 2-scene
  // lookahead. Fires when every turn's two-scene aftermath carries no rise in suspense, while such
  // rises occur elsewhere. Distinct from DRAMATIC_TURN_STAGING_AFTERMATH_VOID, STRUCTURE_TURN_
  // CURIOSITY_AFTERMATH_VOID, STRUCTURE_TURN_RELATIONAL_AFTERMATH_VOID, STRUCTURE_TURN_EMOTIONAL_
  // AFTERMATH_VOID, and STRUCTURE_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (same trigger paired with
  // visualBeats/curiosityDelta/relationshipShifts/emotionalShift/dialogueHighlights respectively)
  // — this is the sixth and final standard-channel pairing for this trigger, completing full
  // saturation.
  {
    const r1073b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
      isAftermath: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r1073b.fires) {
      issues.push({
        location: `${r1073b.triggerCount} dramatic-turn aftermath(s) — no suspense rise within 2 scenes`,
        rule: 'STRUCTURE_TURN_SUSPENSE_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every dramatic-turn scene in the story (${r1073b.triggerCount} pivots) is followed by two scenes with no rise in suspense, even though ${r1073b.aftermathCount} such rises occur elsewhere. A pivot that never tightens tension right after it lands leaves the structure's turns registering as isolated events rather than pressure the story keeps building on.`,
        suggestedFix: `In the two scenes following at least one dramatic turn, let suspense rise so the pivot keeps building pressure rather than resolving into a flat aftermath.`,
      });
    }
  }

  // STRUCTURE_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID — Sequence/aftermath × heavy unresolvedClues
  // debt trigger → suspenseDelta absence. Built on checkAftermathVoid from the shared checks
  // library. n≥8, ≥2 qualifying heavy-debt scenes (pos<n-2, threshold≥3), ≥2 suspense-rising
  // scenes anywhere, 2-scene lookahead. Fires when every heavy-debt scene's two-scene aftermath
  // carries no rise in suspense, while such rises occur elsewhere. Distinct from STRUCTURE_OPEN_
  // THREAD_HIGHLIGHT_AFTERMATH_VOID, STRUCTURE_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID, STRUCTURE_
  // OPEN_THREAD_CURIOSITY_AFTERMATH_VOID, STRUCTURE_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID, and
  // STRUCTURE_OPEN_THREAD_STAGING_AFTERMATH_VOID (same trigger paired with dialogueHighlights/
  // emotionalShift/curiosityDelta/relationshipShifts/visualBeats respectively) — this is the sixth
  // and final standard-channel pairing for this trigger, completing full saturation.
  {
    const r1073c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.unresolvedClues ?? []).length >= 3,
      isAftermath: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r1073c.fires) {
      issues.push({
        location: `${r1073c.triggerCount} heavy clue-debt scene(s) — no suspense rise within 2 scenes of any`,
        rule: 'STRUCTURE_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every scene carrying heavy unresolved clue-debt (${r1073c.triggerCount} instances) is followed by two scenes with no rise in suspense, even though ${r1073c.aftermathCount} such rises occur elsewhere. Accumulated mystery that never tightens the felt sense of tension right after it leaves the structure's uncertainty stalling instead of pressuring the story forward.`,
        suggestedFix: `In the two scenes following at least one heavy clue-debt moment, let the tension rise so accumulated mystery keeps pressuring the structure rather than sitting in a learnable lull.`,
      });
    }
  }

  // STRUCTURE_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID — Sequence/aftermath × raise_stakes
  // trigger → dialogueHighlights absence. Built on checkAftermathVoid from the shared checks
  // library. n≥8, ≥2 qualifying stakes-raising scenes (pos<n-2), ≥2 scenes anywhere with a
  // highlighted line of dialogue, 2-scene lookahead. Fires when every stakes-raise's two-scene
  // aftermath contains no highlighted dialogue, while such dialogue occurs elsewhere. Distinct
  // from STRUCTURE_STAKES_CURIOSITY_AFTERMATH_VOID, STRUCTURE_STAKES_SUSPENSE_AFTERMATH_VOID,
  // STRUCTURE_STAKES_RELATIONAL_AFTERMATH_VOID, and STRUCTURE_STAKES_EMOTIONAL_AFTERMATH_VOID
  // (same trigger paired with curiosityDelta/suspenseDelta/relationshipShifts/emotionalShift
  // respectively) — this is the fifth consequence channel for this trigger.
  {
    const r1087a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.purpose === 'raise_stakes',
      isAftermath: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r1087a.fires) {
      issues.push({
        location: `${r1087a.triggerCount} stakes-raising scene(s) — no highlighted dialogue within 2 scenes of any`,
        rule: 'STRUCTURE_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r1087a.triggerCount} stakes-raising scenes is followed by two scenes with no highlighted dialogue, even though ${r1087a.aftermathCount} such scenes exist elsewhere in the script. Escalating danger that lands without a single memorable line reacting to it in the immediate aftermath leaves the structure's stakes registering mechanically, never in a line anyone remembers.`,
        suggestedFix: `In the two scenes following at least one stakes-raise, let a character deliver a memorable line naming or reacting to the new danger so the structure's escalation registers in speech, not just in plot mechanics.`,
      });
    }
  }

  // STRUCTURE_STAKES_STAGING_AFTERMATH_VOID — Sequence/aftermath × raise_stakes trigger →
  // visualBeats absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying stakes-raising scenes (pos<n-2), ≥2 visually-dense scenes anywhere (visualBeats
  // length≥2), 2-scene lookahead. Fires when every stakes-raise's two-scene aftermath contains
  // no visually dense scene, while such scenes occur elsewhere. Distinct from STRUCTURE_STAKES_
  // CURIOSITY_AFTERMATH_VOID, STRUCTURE_STAKES_SUSPENSE_AFTERMATH_VOID, STRUCTURE_STAKES_
  // RELATIONAL_AFTERMATH_VOID, STRUCTURE_STAKES_EMOTIONAL_AFTERMATH_VOID, and STRUCTURE_STAKES_
  // DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (same trigger paired with curiosityDelta/suspenseDelta/
  // relationshipShifts/emotionalShift/dialogueHighlights respectively) — this is the sixth and
  // final standard-channel pairing for this trigger, completing full saturation for all four
  // boolean triggers in this pass.
  {
    const r1087b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.purpose === 'raise_stakes',
      isAftermath: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r1087b.fires) {
      issues.push({
        location: `${r1087b.triggerCount} stakes-raising scene(s) — no visually dense scene within 2 scenes of any`,
        rule: 'STRUCTURE_STAKES_STAGING_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r1087b.triggerCount} stakes-raising scenes is followed by two scenes with no substantial physical staging, even though ${r1087b.aftermathCount} such scenes exist elsewhere in the script. Escalating danger gains weight when the world briefly holds physical attention right after it lands, but that opportunity consistently passes unstaged in the scenes immediately following every stakes-raise.`,
        suggestedFix: `After at least one stakes-raise, let one of the following two scenes carry substantial physical staging — an action or gesture that gives the raised stakes a physical anchor in the world.`,
      });
    }
  }

  // STRUCTURE_REVELATION_CURIOSITY_AFTERMATH_VOID — Sequence/aftermath × revelation trigger →
  // curiosityDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying revelation scenes (pos<n-2), ≥2 curiosity-rising scenes anywhere, 2-scene
  // lookahead. Fires when every revelation's two-scene aftermath carries no rise in curiosity,
  // while such rises occur elsewhere. Distinct from this pass's existing revelation-curiosity
  // co-occurrence/decoupling check (Wave 443, which audits whether curiosityDelta is positive in
  // the SAME scene as the revelation, not in the 2-scene aftermath that follows it) — this is the
  // first sequence/aftermath pairing of revelation in this pass.
  {
    const r1087c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.revelation != null,
      isAftermath: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r1087c.fires) {
      issues.push({
        location: `${r1087c.triggerCount} revelation aftermath(s) — no curiosity rise within 2 scenes`,
        rule: 'STRUCTURE_REVELATION_CURIOSITY_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every revelation in the story (${r1087c.triggerCount} discoveries) is followed by two scenes with no rise in curiosity, even though ${r1087c.aftermathCount} such rises occur elsewhere. A truth that lands without opening a fresh question right after it leaves the structure's revelations registering as closed events rather than developments that generate the next thing to wonder about.`,
        suggestedFix: `After at least one revelation, let one of the following two scenes carry a new open question — what the discovery implies, or what it costs — so the structure's revelations keep generating curiosity, not just delivering closure.`,
      });
    }
  }

  // STRUCTURE_REVELATION_EMOTIONAL_AFTERMATH_VOID — Sequence/aftermath × revelation trigger →
  // emotionalShift absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying revelation scenes (pos<n-2), ≥2 emotionally-charged scenes anywhere, 2-scene
  // lookahead. Fires when every revelation's two-scene aftermath carries no emotional shift,
  // while such shifts occur elsewhere. Distinct from STRUCTURE_REVELATION_CURIOSITY_AFTERMATH_
  // VOID (Wave 1087, same trigger paired with curiosityDelta) — this is the second
  // checkAftermathVoid-based channel for this trigger.
  {
    const r1101a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.revelation != null,
      isAftermath: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r1101a.fires) {
      issues.push({
        location: `${r1101a.triggerCount} revelation aftermath(s) — no emotional shift within 2 scenes`,
        rule: 'STRUCTURE_REVELATION_EMOTIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every revelation in the story (${r1101a.triggerCount} discoveries) is followed by two scenes with no emotional shift, even though ${r1101a.aftermathCount} such shifts occur elsewhere. A truth that lands without registering emotionally right after it leaves the structure's revelations feeling procedural — information delivered without anyone visibly reacting to what it means.`,
        suggestedFix: `In the two scenes following at least one revelation, let a character's emotional register shift in response, so the structure's discoveries carry felt weight, not just informational weight.`,
      });
    }
  }

  // STRUCTURE_REVELATION_SUSPENSE_AFTERMATH_VOID — Sequence/aftermath × revelation trigger →
  // suspenseDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying revelation scenes (pos<n-2), ≥2 suspense-rising scenes anywhere, 2-scene
  // lookahead. Fires when every revelation's two-scene aftermath carries no rise in suspense,
  // while such rises occur elsewhere. Distinct from STRUCTURE_REVELATION_CURIOSITY_AFTERMATH_VOID
  // and STRUCTURE_REVELATION_EMOTIONAL_AFTERMATH_VOID (same trigger paired with curiosityDelta/
  // emotionalShift) — this is the third checkAftermathVoid-based channel for this trigger.
  {
    const r1101b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.revelation != null,
      isAftermath: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r1101b.fires) {
      issues.push({
        location: `${r1101b.triggerCount} revelation aftermath(s) — no suspense rise within 2 scenes`,
        rule: 'STRUCTURE_REVELATION_SUSPENSE_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every revelation in the story (${r1101b.triggerCount} discoveries) is followed by two scenes with no rise in suspense, even though ${r1101b.aftermathCount} such rises occur elsewhere. A truth that lands without re-tightening tension right after it leaves the structure's revelations feeling inert rather than consequential to what follows.`,
        suggestedFix: `In the two scenes following at least one revelation, let a new tension rise from the discovery, so the structure's revelations keep the story pressing forward instead of settling into calm.`,
      });
    }
  }

  // STRUCTURE_REVELATION_RELATIONAL_AFTERMATH_VOID — Sequence/aftermath × revelation trigger →
  // relationshipShifts absence. Built on checkAftermathVoid from the shared checks library. n≥8,
  // ≥2 qualifying revelation scenes (pos<n-2), ≥2 scenes anywhere with a recorded relationship
  // shift, 2-scene lookahead. Fires when every revelation's two-scene aftermath carries no
  // relationship movement, while such movement occurs elsewhere. Distinct from STRUCTURE_
  // REVELATION_CURIOSITY_AFTERMATH_VOID, STRUCTURE_REVELATION_EMOTIONAL_AFTERMATH_VOID, and
  // STRUCTURE_REVELATION_SUSPENSE_AFTERMATH_VOID (same trigger paired with curiosityDelta/
  // emotionalShift/suspenseDelta) — this is the fourth checkAftermathVoid-based channel for this
  // trigger.
  {
    const r1101c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.revelation != null,
      isAftermath: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r1101c.fires) {
      issues.push({
        location: `${r1101c.triggerCount} revelation aftermath(s) — no relationship shift within 2 scenes`,
        rule: 'STRUCTURE_REVELATION_RELATIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every revelation in the story (${r1101c.triggerCount} discoveries) is followed by two scenes with no recorded relationship shift, even though ${r1101c.aftermathCount} such shifts occur elsewhere. A truth that lands without moving how characters stand with each other leaves the structure's revelations registering as private facts rather than developments that ripple through the story's relationships.`,
        suggestedFix: `In the two scenes following at least one revelation, let it shift how a pair of characters relate, so the structure's discoveries carry interpersonal weight, not just informational weight.`,
      });
    }
  }

  // STRUCTURE_REVELATION_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID — Sequence/aftermath × revelation
  // trigger → dialogueHighlights absence. Built on checkAftermathVoid from the shared checks
  // library. n≥8, ≥2 qualifying revelation scenes (pos<n-2), ≥2 scenes anywhere with a
  // highlighted line of dialogue, 2-scene lookahead. Fires when every revelation's two-scene
  // aftermath contains no highlighted dialogue, while such dialogue occurs elsewhere. Distinct
  // from STRUCTURE_REVELATION_CURIOSITY_AFTERMATH_VOID, STRUCTURE_REVELATION_EMOTIONAL_
  // AFTERMATH_VOID, STRUCTURE_REVELATION_SUSPENSE_AFTERMATH_VOID, and STRUCTURE_REVELATION_
  // RELATIONAL_AFTERMATH_VOID (same trigger paired with curiosityDelta/emotionalShift/
  // suspenseDelta/relationshipShifts respectively) — this is the fifth consequence channel for
  // this trigger.
  {
    const r1115a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.revelation != null,
      isAftermath: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r1115a.fires) {
      issues.push({
        location: `${r1115a.triggerCount} revelation aftermath(s) — no highlighted dialogue within 2 scenes`,
        rule: 'STRUCTURE_REVELATION_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every revelation in the story (${r1115a.triggerCount} discoveries) is followed by two scenes with no highlighted dialogue, even though ${r1115a.aftermathCount} such scenes exist elsewhere in the script. A truth that lands without earning a memorable line right after it leaves the structure's revelations unvoiced — no character's speech processes what was just learned.`,
        suggestedFix: `In the two scenes following at least one revelation, give a character a line that processes what was discovered, so the structure's reckoning with new information registers in speech, not just in plot state.`,
      });
    }
  }

  // STRUCTURE_REVELATION_STAGING_AFTERMATH_VOID — Sequence/aftermath × revelation trigger →
  // visualBeats absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying revelation scenes (pos<n-2), ≥2 visually-dense scenes anywhere, 2-scene lookahead.
  // Fires when every revelation's two-scene aftermath has no heavily-staged scene, while such
  // staging occurs elsewhere. Distinct from STRUCTURE_REVELATION_CURIOSITY_AFTERMATH_VOID,
  // STRUCTURE_REVELATION_EMOTIONAL_AFTERMATH_VOID, STRUCTURE_REVELATION_SUSPENSE_AFTERMATH_VOID,
  // STRUCTURE_REVELATION_RELATIONAL_AFTERMATH_VOID, and STRUCTURE_REVELATION_DIALOGUE_
  // HIGHLIGHT_AFTERMATH_VOID (same trigger paired with curiosityDelta/emotionalShift/
  // suspenseDelta/relationshipShifts/dialogueHighlights respectively) — this is the sixth and
  // final consequence channel for this trigger, completing full saturation.
  {
    const r1115b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.revelation != null,
      isAftermath: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r1115b.fires) {
      issues.push({
        location: `${r1115b.triggerCount} revelation aftermath(s) — no heavily-staged scene within 2 scenes`,
        rule: 'STRUCTURE_REVELATION_STAGING_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every revelation in the story (${r1115b.triggerCount} discoveries) is followed by two scenes with no heavily-staged visual beat, even though ${r1115b.aftermathCount} such scenes exist elsewhere in the script. A truth that lands without earning a visually charged follow-through leaves the structure's revelations registering as narrated information rather than something the story visibly dwells on.`,
        suggestedFix: `In the two scenes following at least one revelation, stage at least two concrete visual beats, so the discovery registers in image, not just in plot bookkeeping.`,
      });
    }
  }

  // STRUCTURE_CLOCK_CURIOSITY_AFTERMATH_VOID — Sequence/aftermath × clockRaised trigger →
  // curiosityDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying clock-raise scenes (pos<n-2), ≥2 curiosity-rising scenes anywhere, 2-scene
  // lookahead. Fires when every clock-raise's two-scene aftermath carries no rise in curiosity,
  // while such rises occur elsewhere. Distinct from every existing clockRaised check in this
  // file (all zone-imbalance/zone-cluster, distribution/timing modes, none sequence/aftermath) —
  // this is the first check to use clockRaised as a checkAftermathVoid trigger in this pass.
  {
    const r1115c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.clockRaised === true,
      isAftermath: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r1115c.fires) {
      issues.push({
        location: `${r1115c.triggerCount} clock-raise scene(s) — no curiosity rise within 2 scenes of any`,
        rule: 'STRUCTURE_CLOCK_CURIOSITY_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r1115c.triggerCount} scenes that raise the ticking clock is followed by two scenes with no rise in curiosity, even though ${r1115c.aftermathCount} such rises occur elsewhere. Time pressure that never reopens the field of questions right after it tightens leaves the structure's relationship with urgency feeling mechanical rather than generative.`,
        suggestedFix: `In the two scenes following at least one clock-raise, let a new question surface so the structure's ticking clock keeps deepening curiosity, not just urgency.`,
      });
    }
  }

  // STRUCTURE_CLOCK_SUSPENSE_AFTERMATH_VOID — Sequence/aftermath × clockRaised trigger →
  // suspenseDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying clock-raise scenes (pos<n-2), ≥2 suspense-rising scenes anywhere, 2-scene
  // lookahead. Fires when every clock-raise's two-scene aftermath carries no rise in suspense,
  // while such rises occur elsewhere. Distinct from STRUCTURE_CLOCK_CURIOSITY_AFTERMATH_VOID
  // (Wave 1115) and the hand-rolled CLOCK_AFTERMATH_EMOTION_VOID (Wave 583, same trigger paired
  // with curiosityDelta/emotionalShift) — this is the third consequence channel for this trigger.
  {
    const r1129a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.clockRaised === true,
      isAftermath: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r1129a.fires) {
      issues.push({
        location: `${r1129a.triggerCount} clock-raise scene(s) — no suspense rise within 2 scenes of any`,
        rule: 'STRUCTURE_CLOCK_SUSPENSE_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r1129a.triggerCount} scenes that raise the ticking clock is followed by two scenes with no rise in suspense, even though ${r1129a.aftermathCount} such rises occur elsewhere. A deadline that tightens without making the outcome feel more threatening leaves the structure's clock registering as a schedule rather than a source of dread.`,
        suggestedFix: `In the two scenes following at least one clock-raise, sharpen what's at risk if the deadline is missed, so the tightening clock is felt as danger, not just noted as a fact.`,
      });
    }
  }

  // STRUCTURE_CLOCK_RELATIONAL_AFTERMATH_VOID — Sequence/aftermath × clockRaised trigger →
  // relationshipShifts absence. Built on checkAftermathVoid from the shared checks library.
  // n≥8, ≥2 qualifying clock-raise scenes (pos<n-2), ≥2 scenes anywhere with a recorded
  // relationship shift, 2-scene lookahead. Fires when every clock-raise's two-scene aftermath
  // carries no relationship movement, while such movement occurs elsewhere. Distinct from
  // STRUCTURE_CLOCK_CURIOSITY_AFTERMATH_VOID (Wave 1115), the hand-rolled CLOCK_AFTERMATH_
  // EMOTION_VOID (Wave 583), and STRUCTURE_CLOCK_SUSPENSE_AFTERMATH_VOID (this wave, same
  // trigger paired with curiosityDelta/emotionalShift/suspenseDelta) — this is the fourth
  // consequence channel for this trigger.
  {
    const r1129b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.clockRaised === true,
      isAftermath: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r1129b.fires) {
      issues.push({
        location: `${r1129b.triggerCount} clock-raise scene(s) — no relationship shift within 2 scenes of any`,
        rule: 'STRUCTURE_CLOCK_RELATIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r1129b.triggerCount} scenes that raise the ticking clock is followed by two scenes with no recorded relationship shift, even though ${r1129b.aftermathCount} such shifts occur elsewhere. Time pressure that never moves how characters stand with each other leaves the structure's clock isolated from the interpersonal stakes it should eventually complicate.`,
        suggestedFix: `In the two scenes following at least one clock-raise, let it shift how a pair of characters relate — the deadline forcing an alliance or a rupture — so the clock carries interpersonal weight, not just a tightening number.`,
      });
    }
  }

  // STRUCTURE_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID — Sequence/aftermath × clockRaised
  // trigger → dialogueHighlights absence. Built on checkAftermathVoid from the shared checks
  // library. n≥8, ≥2 qualifying clock-raise scenes (pos<n-2), ≥2 scenes anywhere with a
  // highlighted line of dialogue, 2-scene lookahead. Fires when every clock-raise's two-scene
  // aftermath has no memorable line, while such lines occur elsewhere. Distinct from STRUCTURE_
  // CLOCK_CURIOSITY_AFTERMATH_VOID, the hand-rolled CLOCK_AFTERMATH_EMOTION_VOID, STRUCTURE_
  // CLOCK_SUSPENSE_AFTERMATH_VOID, and STRUCTURE_CLOCK_RELATIONAL_AFTERMATH_VOID (same trigger
  // paired with curiosityDelta/emotionalShift/suspenseDelta/relationshipShifts) — this is the
  // fifth consequence channel for this trigger.
  {
    const r1129c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.clockRaised === true,
      isAftermath: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r1129c.fires) {
      issues.push({
        location: `${r1129c.triggerCount} clock-raise scene(s) — no highlighted dialogue within 2 scenes of any`,
        rule: 'STRUCTURE_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r1129c.triggerCount} scenes that raise the ticking clock is followed by two scenes with no memorable line, even though ${r1129c.aftermathCount} such lines exist elsewhere in the script. A deadline that tightens without earning a line that reckons with it leaves the structure's clock voiced only in narration, never in what a character says.`,
        suggestedFix: `In the two scenes following at least one clock-raise, give a character a line that names what the deadline costs, so the pressure registers in speech, not just in plot mechanics.`,
      });
    }
  }

  // STRUCTURE_CLOCK_STAGING_AFTERMATH_VOID — Sequence/aftermath × clockRaised trigger →
  // visualBeats absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying clock-raise scenes (pos<n-2), ≥2 visually-dense scenes anywhere, 2-scene
  // lookahead. Fires when every clock-raise's two-scene aftermath has no heavily-staged scene,
  // while such staging occurs elsewhere. Distinct from STRUCTURE_CLOCK_CURIOSITY_AFTERMATH_VOID,
  // the hand-rolled CLOCK_AFTERMATH_EMOTION_VOID, STRUCTURE_CLOCK_SUSPENSE_AFTERMATH_VOID,
  // STRUCTURE_CLOCK_RELATIONAL_AFTERMATH_VOID, and STRUCTURE_CLOCK_DIALOGUE_HIGHLIGHT_
  // AFTERMATH_VOID (same trigger paired with curiosityDelta/emotionalShift/suspenseDelta/
  // relationshipShifts/dialogueHighlights) — this is the sixth and final consequence channel
  // for this trigger, completing full saturation.
  {
    const r1143a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.clockRaised === true,
      isAftermath: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r1143a.fires) {
      issues.push({
        location: `${r1143a.triggerCount} clock-raise scene(s) — no heavily-staged scene within 2 scenes of any`,
        rule: 'STRUCTURE_CLOCK_STAGING_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r1143a.triggerCount} scenes that raise the ticking clock is followed by two scenes with no heavily-staged visual beat, even though ${r1143a.aftermathCount} such scenes exist elsewhere in the script. A deadline that tightens without earning a visually charged follow-through leaves the structure's clock registering as narrated information rather than something the story visibly dwells on.`,
        suggestedFix: `In the two scenes following at least one clock-raise, stage at least two concrete visual beats, so the mounting pressure registers in image, not just in plot bookkeeping.`,
      });
    }
  }

  // STRUCTURE_TURN_STAGING_AFTERMATH_VOID — Sequence/aftermath × dramaticTurn trigger →
  // visualBeats absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying dramatic-turn scenes (pos<n-2), ≥2 visually-dense scenes anywhere, 2-scene
  // lookahead. Fires when every turn's two-scene aftermath has no heavily-staged scene, while
  // such staging occurs elsewhere. Distinct from STRUCTURE_TURN_CURIOSITY_AFTERMATH_VOID,
  // STRUCTURE_TURN_RELATIONAL_AFTERMATH_VOID, STRUCTURE_TURN_EMOTIONAL_AFTERMATH_VOID,
  // STRUCTURE_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID, and STRUCTURE_TURN_SUSPENSE_AFTERMATH_
  // VOID (same trigger paired with curiosityDelta/relationshipShifts/emotionalShift/
  // dialogueHighlights/suspenseDelta) — this is the sixth and final consequence channel for
  // this trigger, completing full saturation.
  {
    const r1143b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
      isAftermath: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r1143b.fires) {
      issues.push({
        location: `${r1143b.triggerCount} dramatic-turn aftermath(s) — no heavily-staged scene within 2 scenes`,
        rule: 'STRUCTURE_TURN_STAGING_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every dramatic-turn scene in the story (${r1143b.triggerCount} pivots) is followed by two scenes with no heavily-staged visual beat, even though ${r1143b.aftermathCount} such scenes exist elsewhere in the script. A pivot that never earns a visually charged follow-through leaves the structure's turns registering as narrated information rather than something the story visibly dwells on.`,
        suggestedFix: `In the two scenes following at least one dramatic turn, stage at least two concrete visual beats, so the pivot's consequences register in image, not just in plot bookkeeping.`,
      });
    }
  }

  // STRUCTURE_SUSPENSE_CURIOSITY_AFTERMATH_VOID — Sequence/aftermath × suspenseDelta (>0)
  // trigger → curiosityDelta absence. Built on checkAftermathVoid from the shared checks
  // library. n≥8, ≥2 qualifying suspense-spike scenes (pos<n-2), ≥2 curiosity-rising scenes
  // anywhere, 2-scene lookahead. Fires when every suspense-spike's two-scene aftermath carries
  // no rise in curiosity, while such rises occur elsewhere. Distinct from every existing
  // suspenseDelta check in this file (all aftermath-channel or zone/drought-run uses, none as a
  // checkAftermathVoid trigger) — this is the first check to use suspenseDelta as a trigger in
  // this pass.
  {
    const r1143c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.suspenseDelta ?? 0) > 0,
      isAftermath: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r1143c.fires) {
      issues.push({
        location: `${r1143c.triggerCount} suspense-spike scene(s) — no curiosity rise within 2 scenes of any`,
        rule: 'STRUCTURE_SUSPENSE_CURIOSITY_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r1143c.triggerCount} suspense-spike scenes is followed by two scenes with no rise in curiosity, even though ${r1143c.aftermathCount} such rises occur elsewhere. A spike in danger that never opens a fresh question right after it leaves the structure's tension registering as isolated pressure rather than a source of the next thing worth wondering about.`,
        suggestedFix: `In the two scenes following at least one suspense spike, let a new question surface from the danger, so the tension keeps generating curiosity, not just dread.`,
      });
    }
  }

  // STRUCTURE_SUSPENSE_EMOTIONAL_AFTERMATH_VOID — Sequence/aftermath × suspenseDelta (>0)
  // trigger → emotionalShift absence. Built on checkAftermathVoid from the shared checks
  // library. n≥8, ≥2 qualifying suspense-spike scenes (pos<n-2), ≥2 emotionally-shifted scenes
  // anywhere, 2-scene lookahead. Fires when every suspense-spike's two-scene aftermath carries
  // no emotional shift, while such shifts occur elsewhere. Distinct from STRUCTURE_SUSPENSE_
  // CURIOSITY_AFTERMATH_VOID (Wave 1143, same trigger paired with curiosityDelta) — this is the
  // second consequence channel for this trigger.
  {
    const r1157a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.suspenseDelta ?? 0) > 0,
      isAftermath: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r1157a.fires) {
      issues.push({
        location: `${r1157a.triggerCount} suspense-spike scene(s) — no emotional shift within 2 scenes of any`,
        rule: 'STRUCTURE_SUSPENSE_EMOTIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r1157a.triggerCount} suspense-spike scenes is followed by two scenes with no emotional shift, even though ${r1157a.aftermathCount} such shifts occur elsewhere. A spike in danger that never registers on any character's felt state right after it lands leaves the structure's tension reading as mechanics rather than something anyone actually feels the weight of.`,
        suggestedFix: `In the two scenes following at least one suspense spike, let a character's emotional register shift in response to the danger, so the tension carries felt weight, not just structural pressure.`,
      });
    }
  }

  // STRUCTURE_SUSPENSE_RELATIONAL_AFTERMATH_VOID — Sequence/aftermath × suspenseDelta (>0)
  // trigger → relationshipShifts absence. Built on checkAftermathVoid from the shared checks
  // library. n≥8, ≥2 qualifying suspense-spike scenes (pos<n-2), ≥2 scenes anywhere with a
  // recorded relationship shift, 2-scene lookahead. Fires when every suspense-spike's two-scene
  // aftermath carries no relationship movement, while such movement occurs elsewhere. Distinct
  // from STRUCTURE_SUSPENSE_CURIOSITY_AFTERMATH_VOID (Wave 1143) and STRUCTURE_SUSPENSE_
  // EMOTIONAL_AFTERMATH_VOID (this wave, same trigger paired with curiosityDelta/emotionalShift)
  // — this is the third consequence channel for this trigger.
  {
    const r1157b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.suspenseDelta ?? 0) > 0,
      isAftermath: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r1157b.fires) {
      issues.push({
        location: `${r1157b.triggerCount} suspense-spike scene(s) — no relationship shift within 2 scenes of any`,
        rule: 'STRUCTURE_SUSPENSE_RELATIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r1157b.triggerCount} suspense-spike scenes is followed by two scenes with no recorded relationship shift, even though ${r1157b.aftermathCount} such shifts occur elsewhere. A spike in danger that never moves how a pair of characters stand with each other right after it lands leaves the structure's tension isolated from the interpersonal stakes it should eventually complicate.`,
        suggestedFix: `In the two scenes following at least one suspense spike, let it shift a relationship — an alliance strengthened or a bond strained by the danger — so the tension carries interpersonal weight, not just structural pressure.`,
      });
    }
  }

  // STRUCTURE_SEED_CURIOSITY_AFTERMATH_VOID — Sequence/aftermath × seededClueIds trigger →
  // curiosityDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying seed scenes (pos<n-2), ≥2 curiosity-rising scenes anywhere, 2-scene lookahead.
  // Fires when every seed's two-scene aftermath carries no rise in curiosity, while such rises
  // occur elsewhere. Distinct from every other rule in this file: seededClueIds has never
  // anchored the isTrigger side of a check here — this is the first check to use it as a
  // checkAftermathVoid trigger in this pass. A planted clue that never provokes a fresh question
  // in its immediate wake leaves the seed structurally present but inert as a source of intrigue.
  {
    const r1157c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.seededClueIds ?? []).length > 0,
      isAftermath: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r1157c.fires) {
      issues.push({
        location: `${r1157c.triggerCount} seed scene(s) — no curiosity rise within 2 scenes of any`,
        rule: 'STRUCTURE_SEED_CURIOSITY_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r1157c.triggerCount} scenes that plant a clue is followed by two scenes with no rise in curiosity, even though ${r1157c.aftermathCount} such rises occur elsewhere. A planted clue that never provokes a fresh question in its immediate aftermath leaves the seed structurally present but inert — the story sets something up without letting the audience feel the pull of wondering what it means.`,
        suggestedFix: `In the two scenes following at least one seed, let a new question surface from what was just planted, so the clue generates curiosity rather than passing unnoticed until its eventual payoff.`,
      });
    }
  }

  // STRUCTURE_SUSPENSE_STAGING_AFTERMATH_VOID — Sequence/aftermath × suspenseDelta (>0) trigger
  // → visualBeats absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying suspense-spike scenes (pos<n-2), ≥2 visually-dense scenes anywhere, 2-scene
  // lookahead. Fires when every suspense-spike's two-scene aftermath has no heavily-staged scene,
  // while such staging occurs elsewhere. Distinct from STRUCTURE_SUSPENSE_CURIOSITY_AFTERMATH_
  // VOID (Wave 1143) and STRUCTURE_SUSPENSE_EMOTIONAL_AFTERMATH_VOID / STRUCTURE_SUSPENSE_
  // RELATIONAL_AFTERMATH_VOID (Wave 1157, same trigger paired with curiosityDelta/emotionalShift/
  // relationshipShifts) — this is the fourth consequence channel for this trigger.
  {
    const r1171a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.suspenseDelta ?? 0) > 0,
      isAftermath: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r1171a.fires) {
      issues.push({
        location: `${r1171a.triggerCount} suspense-spike scene(s) — no heavily-staged scene within 2 scenes of any`,
        rule: 'STRUCTURE_SUSPENSE_STAGING_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r1171a.triggerCount} suspense-spike scenes is followed by two scenes with no heavily-staged visual beat, even though ${r1171a.aftermathCount} such scenes exist elsewhere in the script. A spike in danger that never earns a visually charged follow-through leaves the structure's tension registering as narrated information rather than something the story visibly dwells on.`,
        suggestedFix: `In the two scenes following at least one suspense spike, stage at least two concrete visual beats, so the mounting danger registers in image, not just in plot bookkeeping.`,
      });
    }
  }

  // STRUCTURE_SUSPENSE_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID — Sequence/aftermath × suspenseDelta
  // (>0) trigger → dialogueHighlights absence. Built on checkAftermathVoid from the shared checks
  // library. n≥8, ≥2 qualifying suspense-spike scenes (pos<n-2), ≥2 scenes anywhere with a
  // highlighted line of dialogue, 2-scene lookahead. Fires when every suspense-spike's two-scene
  // aftermath contains no highlighted dialogue, while such dialogue occurs elsewhere. Distinct
  // from STRUCTURE_SUSPENSE_CURIOSITY_AFTERMATH_VOID (Wave 1143), STRUCTURE_SUSPENSE_EMOTIONAL_
  // AFTERMATH_VOID, STRUCTURE_SUSPENSE_RELATIONAL_AFTERMATH_VOID (Wave 1157), and STRUCTURE_
  // SUSPENSE_STAGING_AFTERMATH_VOID (this wave, same trigger paired with curiosityDelta/
  // emotionalShift/relationshipShifts/visualBeats) — this is the fifth consequence channel for
  // this trigger.
  {
    const r1171b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.suspenseDelta ?? 0) > 0,
      isAftermath: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r1171b.fires) {
      issues.push({
        location: `${r1171b.triggerCount} suspense-spike scene(s) — no highlighted dialogue within 2 scenes of any`,
        rule: 'STRUCTURE_SUSPENSE_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r1171b.triggerCount} suspense-spike scenes is followed by two scenes with no highlighted dialogue, even though ${r1171b.aftermathCount} such scenes exist elsewhere in the script. A spike in danger that never earns a memorable line in its wake leaves the structure's tension voiced only in narration, never in what a character says.`,
        suggestedFix: `In the two scenes following at least one suspense spike, give a character a standout line that reckons with the danger, so the tension registers in speech, not just in plot mechanics.`,
      });
    }
  }

  // STRUCTURE_SEED_EMOTIONAL_AFTERMATH_VOID — Sequence/aftermath × seededClueIds trigger →
  // emotionalShift absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying seed scenes (pos<n-2), ≥2 emotionally-shifted scenes anywhere, 2-scene lookahead.
  // Fires when every seed's two-scene aftermath registers no emotional shift, while such shifts
  // occur elsewhere. Distinct from STRUCTURE_SEED_CURIOSITY_AFTERMATH_VOID (Wave 1157, same
  // trigger paired with curiosityDelta) — this is the second consequence channel for this
  // trigger.
  {
    const r1171c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.seededClueIds ?? []).length > 0,
      isAftermath: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r1171c.fires) {
      issues.push({
        location: `${r1171c.triggerCount} seed scene(s) — no emotional shift within 2 scenes of any`,
        rule: 'STRUCTURE_SEED_EMOTIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r1171c.triggerCount} scenes that plant a clue is followed by two scenes with no emotional shift, even though ${r1171c.aftermathCount} such shifts occur elsewhere. A planted clue that never registers on any character's felt state right after it lands leaves the structure's setups reading as pure bookkeeping rather than moments that carry any felt weight until their eventual payoff.`,
        suggestedFix: `In the two scenes following at least one seed, let the planting land on a character's emotional register — unease, hope, suspicion — so the setup carries felt weight, not just structural function.`,
      });
    }
  }

  const { revised, usedLLM } = await rewritePass({ fountain, issues, passName: 'structure', approvedSpans, storyContext: input.storyContext, priorPassResults: input.priorPassResults });
  const changed = revised !== fountain;

  return {
    pass: 'structure',
    issues,
    revisedFountain: revised,
    changed,
    summary: issues.length === 0
      ? 'Structure pass: no issues found'
      : `Structure pass: ${issues.length} issue(s) — ${usedLLM ? 'rewritten' : 'flagged (stub mode)'}`,
  };
}
