// Wave 39 — Pass 2: Causality
// Checks for causal logic breaks: consequences without causes, orphaned facts,
// belief reversals without explanation.
// Wave 141 additions: motivation coherence (unmotivated decisions, abandoned goals)
// and action consequence (character actions that fail to affect plot or relationships).
// Wave 155 additions: deus ex machina (late revelation closing the plot with no
// setup), suspense spike without cause (sudden danger with no escalation), and
// goal-conflict absence (protagonist goal never opposed by another force).
// Wave 254 additions: clue-seed cluster (3+ clues planted in one scene), payoff
// without setup (callback to an unseeded thread), and suspense plateau flatline
// (4+ consecutive scenes of flat tension).
// Wave 268 additions: curiosity front loaded (all mystery spikes in first half),
// payoff back loaded (all callbacks deferred to second half),
// clock single scene (only one deadline raised in a long story).
// Wave 282 additions: clock clustering (all clocks in first 40%), revelation
// cascade (>35% of scenes contain a revelation), emotional positive desert
// (Act 2 has negative/neutral but never positive while positive exists elsewhere).
// Wave 296 additions: clock delta without raise (time-pressure effects before any
// clock is established), suspense sawtooth (tension strictly alternates sign for
// 6+ scenes without accumulating), dramatic turn aftermath void (a reversal scene
// followed by two scenes with zero emotional, suspense, or relational ripple).
// Wave 310 additions: emotion without driver run (3+ consecutive non-neutral scenes
// with no suspense/relational/revelation/clock driver), clock relief unexplained (a
// clockDelta<0 release with no revelation or payoff to cause it), dramatic turn
// cluster (3+ dramatic turns within a three-scene window).
// Wave 324 additions: suspense unreleased run (6+ consecutive scenes all raise tension
// with no release valley), clock raised no delta (≥2 clock raises with clockDelta 0 —
// cosmetic deadlines), emotional neutral run (6+ consecutive emotionally neutral scenes).
// Wave 335 additions: payoff curiosity decoupled (payoff scenes avg curiosityDelta ≤ 0 —
// resolutions that generate no new questions), dramatic turn curiosity void (reversal/twist
// scenes avg curiosityDelta ≤ 0 — turns that don't ignite audience wonder), clue seed
// suspense void (clue-planting scenes avg suspenseDelta ≤ 0 — cosmetic foreshadowing).
// Wave 349 additions: clock raised no emotion (every clock-raise scene is emotionally
// neutral — deadlines with no felt pressure), dramatic turn no suspense (turn scenes avg
// suspenseDelta ≤ 0 — pivots that generate no tension), suspense spike no fallout (high-
// suspense scenes produce no downstream consequence within two scenes).
// Wave 363 additions: payoff no emotion (every payoff scene is emotionally neutral —
// threads resolve without anyone feeling the resolution), seed scene curiosity void (clue-
// planting scenes avg curiosityDelta ≤ 0 — foreshadowing that never sparks wonder), clock
// raise curiosity void (clock-raise scenes avg curiosityDelta ≤ 0 — deadlines create dread
// but not the wondering urgency about how the protagonist escapes).
// Wave 377 additions: dramatic turn no emotion (every dramatic-turn scene is emotionally
// neutral — pivots that move no one, completing the turn-channel set), clock raise no suspense
// (clock-raise scenes avg suspenseDelta ≤ 0 — deadlines that generate no tension), suspense
// spike no curiosity (high-suspense scenes avg curiosityDelta ≤ 0 — danger that raises no
// questions about what happens next).
// Wave 391 additions: suspense spike no emotion (every high-suspense scene is emotionally
// neutral — completes the suspense-spike correlation set), clock raise no fallout (a clock
// raise produces no consequence within two scenes — the clock/clue siblings of suspense
// spike no fallout), curiosity spike no fallout (a curiosity spike produces no consequence
// within two scenes — intrigue raised then dropped).
// Wave 405 additions: positive reaction without cause (a positive emotional shift with no
// on-page cause in itself or the prior two scenes — the positive sibling of REACTION_WITHOUT_
// CAUSE, which handles only negative emotion), curiosity spike without cause (a curiosity
// spike with no upstream driver — the curiosity sibling of SUSPENSE_SPIKE_NO_CAUSE), dramatic
// turn without cause (≥2 dramatic turns and none has a cause in itself or the prior scene —
// the story's pivots are systematically unmotivated).
// Wave 419 additions: revelation relationship void (every revelation scene has no relationship
// shift — truths surface without changing any bond; average/aggregate mode × revelation ×
// relationship channel), payoff suspense void (every payoff scene has suspenseDelta ≤ 0 —
// resolutions never raise or redirect tension; average/aggregate mode × payoff × suspense),
// clock raise relationship void (every clock-raise scene has no relationship shift — deadlines
// established in a social vacuum; co-occurrence/decoupling mode × clock × relationship).
// Wave 433 additions: suspense peak uncaused (the story's single highest-suspense scene has no
// causal driver — escalation, clock, revelation, or turn — in the two scenes before it, so the
// tension apex arrives without a rising gradient; single-peak isolation × backward-cause mode,
// the first single-peak check in this pass), curiosity decline run (4+ consecutive scenes each
// with curiosityDelta < 0 — the audience's open questions drain continuously with nothing
// reopening the field; run-based × valence mode × curiosity channel), payoff peak inert (the
// single densest payoff scene — the largest convergence of resolved setups — lands neutral in
// emotion, suspense, curiosity, AND relationship simultaneously; single-peak isolation × payoff
// channel, distinct from the aggregate per-channel payoff voids).
// Wave 447 additions: suspense decline run (4+ consecutive scenes each with suspenseDelta < 0 —
// tension bleeds continuously without any reversal; run-based × suspense × negative valence,
// the sustained-descent complement of SUSPENSE_UNRELEASED_RUN and the suspense-channel parallel
// of CURIOSITY_DECLINE_RUN), dramatic turn relationship void (every dramatic-turn scene carries
// no relationship shift — story pivots happen in an interpersonal vacuum; co-occurrence ×
// dramatic-turn × relationship, completing the turn-scene correlation set alongside DRAMATIC_TURN_
// NO_SUSPENSE, DRAMATIC_TURN_CURIOSITY_VOID, and DRAMATIC_TURN_NO_EMOTION), curiosity peak no
// followthrough (the single highest-curiosityDelta scene is not followed within 2 scenes by any
// revelation — the story's maximum wonder moment leads to no disclosure; single-peak isolation ×
// curiosity × revelation aftermath, distinct from CURIOSITY_SPIKE_NO_FALLOUT which checks per-
// spike for any consequence and from SUSPENSE_PEAK_UNCAUSED which is backward-cause on suspense).
// Wave 461 additions: payoff relationship void (every payoff scene carries no relationship shift —
// thread resolutions never move a bond; co-occurrence/decoupling × payoff × relationship, the
// relationship-channel completion of the payoff correlation set alongside PAYOFF_NO_EMOTION,
// PAYOFF_SUSPENSE_VOID, and PAYOFF_CURIOSITY_DECOUPLED), seed scene emotion void (every clue-
// planting scene is emotionally neutral — foreshadowing is dropped into flat scenes the audience
// will not remember; co-occurrence/decoupling × seed × emotion, the emotion-channel completion of
// the seed correlation set alongside CLUE_SEED_SUSPENSE_VOID and SEED_SCENE_CURIOSITY_VOID),
// relationship stasis run (6+ consecutive scenes with no relationship shift despite ≥2 bond moves
// existing in the story — the relational engine falls silent for a sustained stretch; run-based ×
// relationship-absence mode, the relationship-channel parallel of EMOTIONAL_NEUTRAL_RUN and the
// first run-based check auditing the relationship channel rather than a valence delta).
// Wave 475 additions: emotional zone cluster (distribution/timing — >75% of emotionally charged
// scenes fall in a single third; the story's affective arc is a spike surrounded by flat territory;
// first distribution/timing check on the temporal spread of emotional charge across the arc; distinct
// from EMOTIONAL_NEUTRAL_RUN which is run-based and EMOTIONAL_POSITIVE_DESERT which is zone-absence),
// seed temporal cluster (distribution/timing — >75% of clue-planting scenes fall in a single third;
// foreshadowing is architecturally concentrated; distinct from CLUE_SEED_CLUSTER which measures
// within-scene density and from the seed correlation checks which measure accompanying signals),
// payoff zone cluster (distribution/timing — >75% of payoff scenes fall in a single third; thread
// resolutions burst in one zone while the other thirds remain open; distinct from PAYOFF_BACK_LOADED
// which uses a binary first/second-half partition and from the payoff correlation checks).
// Wave 489 additions: dramatic turn temporal cluster (distribution/timing × dramatic-turn × thirds —
// n≥9, ≥4 turn scenes, >75% in one third; the dramatic-turn channel complement of EMOTIONAL_ZONE_
// CLUSTER, SEED_TEMPORAL_CLUSTER, and PAYOFF_ZONE_CLUSTER; completes the distribution/timing thirds
// family for the four main narrative event types), clock peak uncaused (single-peak isolation ×
// backward-cause × clock channel — the scene with the highest clockDelta at pos≥2 has no causal
// driver in the 2 prior scenes; the clock-channel complement of SUSPENSE_PEAK_UNCAUSED which audits
// the suspense channel), seed aftermath curiosity void (sequence/aftermath × seed → curiosity — n≥8,
// ≥3 seed scenes not at last position, avg curiosityDelta of scene immediately following each seed ≤ 0;
// distinct from SEED_SCENE_CURIOSITY_VOID which checks the seed scene's OWN curiosityDelta and from
// CURIOSITY_SPIKE_NO_FALLOUT which checks what follows a curiosity spike rather than a seed scene).
// Wave 503 additions: revelation aftermath suspense void (sequence/aftermath × revelation → suspense
// aftermath — n≥8, ≥3 revelation scenes not at last position, avg suspenseDelta of scene immediately
// following each revelation ≤ 0; revelations that consistently fail to tighten stakes disconnect the
// mystery and tension engines; distinct from REVELATION_CURIOSITY_AFTERMATH_VOID in belief.ts which
// audits the curiosity channel, and from all within-revelation-scene checks), clock final third absent
// (zone presence/absence × clock × closing third — n≥9, ≥2 clock scenes, none in the final third;
// deadline machinery vanishes when stakes should peak; distinct from CLOCK_CLUSTERING which flags
// early overload and CLOCK_SINGLE_SCENE which flags minimum count), positive emotion unbroken run
// (run-based × valence × positive emotion — n≥8, ≥3 positive scenes, longest consecutive run of
// positive-emotion scenes ≥ 4; a sustained positive run means the protagonist's world is going well
// without adversity for too long; distinct from EMOTIONAL_NEUTRAL_RUN, SUSPENSE_DECLINE_RUN, and
// EMOTIONAL_POSITIVE_DESERT which use different modes on the emotional channel).
// Wave 545 additions: payoff aftermath curiosity void (average/aggregate × payoff → curiosity
// aftermath — n≥8, ≥3 qualifying payoff scenes [pos<n-1], avg curiosityDelta of immediately
// following scenes ≤ 0; resolutions complete promises without reopening questions; the curiosity-
// channel complement of PAYOFF_AFTERMATH_SUSPENSE_VOID; distinct from PAYOFF_CURIOSITY_DECOUPLED
// which checks the payoff scene's OWN curiosityDelta), emotional opening third absent (zone
// presence/absence × emotional charge × opening third — n≥9, ≥3 emotionally charged scenes
// globally, none in first third; story's affective register never engages in its opening zone;
// distinct from EMOTIONAL_CLOSING_THIRD_ABSENT [Wave 517: closing zone], EMOTIONAL_ZONE_CLUSTER
// [concentration check, not absence], EMOTIONAL_NEUTRAL_RUN [run-based]), seed stasis run
// (run-based × seed-absence × seed channel — n≥8, ≥3 seed scenes, max consecutive non-seed gap
// ≥7; the foreshadowing engine silent for its longest uninterrupted stretch; distinct from SEED_
// TEMPORAL_CLUSTER [distribution/timing], CLUE_SEED_CLUSTER [per-scene overconcentration], seed
// aftermath/co-occurrence checks; the seed-channel parallel of ASSERTION_DROUGHT in belief.ts).
// Wave 531 additions: suspense spike relationship void (co-occurrence/decoupling × high-suspense ×
// relationship — n≥8, ≥2 scenes with suspenseDelta > 1 AND ≥2 scenes with relationship shifts, yet
// no high-suspense scene carries a relationship shift; danger operates in a social vacuum; completes
// the suspense-spike co-occurrence set alongside SUSPENSE_SPIKE_NO_EMOTION, SUSPENSE_SPIKE_NO_
// CURIOSITY, and SUSPENSE_SPIKE_NO_FALLOUT), clock temporal cluster (distribution/timing × clock ×
// thirds — n≥9, ≥3 clockRaised scenes, >75% in one structural third; the clock-channel complement
// of EMOTIONAL_ZONE_CLUSTER, SEED_TEMPORAL_CLUSTER, PAYOFF_ZONE_CLUSTER, and DRAMATIC_TURN_
// TEMPORAL_CLUSTER, completing the distribution/timing thirds family for the major structural
// signals; distinct from CLOCK_CLUSTERING which uses a binary first-40% partition), seed aftermath
// suspense void (sequence/aftermath × seed → suspenseDelta aftermath — n≥8, ≥3 seed scenes not at
// last position, avg suspenseDelta of immediately-following scene ≤ 0; the suspense-channel
// complement of SEED_AFTERMATH_CURIOSITY_VOID, completing the seed-aftermath channel pair).
// Wave 517 additions: payoff aftermath suspense void (average/aggregate × payoff → suspense aftermath
// — n≥8, ≥3 payoff scenes not at last position, avg suspenseDelta of immediately following scenes ≤ 0;
// resolutions complete promises but never re-tighten stakes; distinct from PAYOFF_SUSPENSE_VOID which
// checks the payoff scene's OWN suspenseDelta and from REVELATION_AFTERMATH_SUSPENSE_VOID which uses
// revelation as trigger), negative emotion unbroken run (run-based × valence × negative emotion —
// n≥8, ≥3 negative-emotion scenes, maxNegRun ≥ 4; sustained adversity without relief, the negative-
// polarity complement of POSITIVE_EMOTION_UNBROKEN_RUN completing the positive/negative/neutral run
// family for the emotion channel), emotional closing third absent (zone presence/absence × closing
// third × emotional charge — n≥9, ≥3 emotionally charged scenes, none in the final third; the
// resolution arrives without felt emotional engagement; the emotional complement of CLOCK_FINAL_THIRD_
// ABSENT; distinct from EMOTIONAL_ZONE_CLUSTER which flags concentration and EMOTIONAL_NEUTRAL_RUN
// which is run-based).
// Wave 587 additions: dramatic-turn suspense aftermath void (sequence/aftermath × dramatic-turn →
// suspense aftermath — n≥8, ≥2 qualifying dramatic-turn scenes [pos<n-1], ≥2 suspense-rise scenes
// globally, no dramatic turn immediately followed by a suspense rise; distinct from DRAMATIC_TURN_
// AFTERMATH_VOID [conjunction of emotion AND suspense AND relationship over 2-scene window per
// scene], DRAMATIC_TURN_NO_SUSPENSE [co-occurrence × same scene], and CLOCK_RAISE_NO_SUSPENSE
// [clock trigger]), clock curiosity aftermath void (sequence/aftermath × clock-raised → curiosity
// aftermath — n≥8, ≥2 qualifying clock-raised scenes [pos<n-1], ≥2 curiosity-spike scenes
// globally, no clock raise immediately followed by a curiosity spike; distinct from CLOCK_RAISE_
// CURIOSITY_VOID [co-occurrence × same scene], CLOCK_RAISE_NO_SUSPENSE [suspense not curiosity,
// co-occurrence], and PAYOFF_AFTERMATH_CURIOSITY_VOID [different trigger]), payoff closing-third
// absent (zone presence/absence × payoff × closing third — n≥9, ≥3 payoff scenes globally, 0
// in the closing third [pos ≥ floor(2n/3)]; the story exhausts its thread resolutions before the
// climactic zone; distinct from PAYOFF_ZONE_CLUSTER [distribution/timing — >75% in ONE third],
// PAYOFF_BACK_LOADED [fires when all payoffs are in the second half, not closing-third absence],
// RELATIONSHIP_OPENING_THIRD_ABSENT [opposite structural position and different signal]).
// Wave 573 additions: relationship opening third absent (zone presence/absence × relationship ×
// opening third — n≥9, ≥3 relationship-shift scenes globally, 0 in the opening third
// [pos < floor(n/3)]; the story's first act is entirely devoid of relationship movement;
// mirror of RELATIONSHIP_CLOSING_THIRD_ABSENT at the opposite structural position; distinct
// from RELATIONSHIP_STASIS_RUN [run-based gaps anywhere], EMOTIONAL_CLOSING_THIRD_ABSENT
// [emotion not relationship], CLOCK_FINAL_THIRD_ABSENT [clock not relationship]), suspense
// temporal cluster (distribution/timing × suspense × thirds — n≥9, ≥3 suspense-positive
// scenes [suspenseDelta>0], >75% in one structural third; tension rises are lopsidedly
// concentrated in one zone; distinct from CLOCK_TEMPORAL_CLUSTER [clock channel], DRAMATIC_
// TURN_TEMPORAL_CLUSTER [turn], SEED_TEMPORAL_CLUSTER [seed], EMOTIONAL_ZONE_CLUSTER [emotion],
// SUSPENSE_SPIKE_WITHOUT_CAUSE [backward-cause mode]), curiosity temporal cluster (distribution/
// timing × curiosity × thirds — n≥9, ≥3 curiosity-positive scenes [curiosityDelta>0], >75%
// in one structural third; mystery spikes are lopsidedly concentrated in one zone; distinct from
// SUSPENSE_TEMPORAL_CLUSTER [suspense channel], all other temporal-cluster checks, and CURIOSITY_
// FRONT_LOADED [Wave 268: half-split threshold not thirds]).
// Wave 559 additions: relationship shift uncaused (backward-cause × relationship channel — n≥8,
// ≥3 relationship-shift scenes at pos≥2, ALL preceded in prior 2 scenes by no suspense/revelation/
// turn driver; bond changes drop from nowhere without any narrative pressure; first backward-cause
// check on the relationship channel, distinct from all other backward-cause checks [suspense spike,
// curiosity spike, positive emotion, dramatic turn, clock peak] which use different signal channels,
// and from DRAMATIC_TURN_RELATIONSHIP_VOID [co-occurrence × same scene] and RELATIONSHIP_STASIS_RUN
// [run-based × absence]), relationship closing third absent (zone presence/absence × relationship ×
// closing third — n≥9, ≥3 relationship-shift scenes globally, 0 in the final third; all bond
// dynamics resolve before the climax; distinct from EMOTIONAL_CLOSING_THIRD_ABSENT [emotion not
// relationship] and CLOCK_FINAL_THIRD_ABSENT [clock not relationship]; first zone-absence check on
// the relationship channel), payoff relationship aftermath void (average/aggregate × payoff →
// relationship aftermath — n≥8, ≥3 qualifying payoff scenes [pos<n-1], all scenes immediately
// following a payoff carry no relationship shifts; thread resolutions never ripple into bond changes;
// distinct from PAYOFF_RELATIONSHIP_VOID [co-occurrence × same scene — payoff scene itself has no
// relationship shift; this checks the scene AFTER], PAYOFF_AFTERMATH_SUSPENSE_VOID [suspense channel
// aftermath], PAYOFF_AFTERMATH_CURIOSITY_VOID [curiosity channel aftermath]).
// Wave 601 additions: stated belief revelation decoupled (co-occurrence/decoupling ×
// dialogueHighlights-presence × revelation-presence — n≥6, ≥2 belief-assertion scenes, ≥2
// revelation scenes, zero overlap; first use of the dialogueHighlights signal in this 105-rule
// file at all — every other channel here [clock, curiosity, dramaticTurn, relationship, seed,
// payoff, revelation] is exhaustively covered, but a character stating a tracked belief and the
// story disclosing a hidden truth have never been paired), stated belief dramatic-turn aftermath
// void (sequence/aftermath × dialogueHighlights-presence trigger → dramaticTurn aftermath, built
// on checkAftermathVoid from the shared checks library — audit M2.2 — n≥8, ≥3 qualifying
// belief-assertion scenes, none followed by a dramatic turn within 2 scenes while ≥2 turn scenes
// exist elsewhere; a stated conviction never precedes a structural pivot), stated belief zone
// imbalance (underweight/bloat × dialogueHighlights × four structural zones, built on
// checkZoneImbalance — one zone silent while another holds ≥50% of all belief assertions).
// Wave 615 additions (built on the shared checks library, audit M2.2): VISUAL_BEAT_CAUSALITY_
// ZONE_IMBALANCE (underweight/bloat × visualBeats × four structural zones — first use of
// visualBeats anywhere in this 108-rule pass, its last untouched record field), OPEN_THREAD_
// DRAMATIC_TURN_DECOUPLED (co-occurrence/decoupling × unresolvedClues × dramaticTurn —
// unresolvedClues had exactly one prior incidental OR-condition use, never as its own standalone
// signal), VISUAL_BEAT_PEAK_UNCAUSED (backward-cause × visualBeats-density peak × dramaticTurn/
// revelation cause — the file's central "backward-cause" analytical lens applied to physical
// staging for the first time).
// Wave 629 additions (built on the shared checks library, audit M2.2): CAUSAL_HIGHLIGHT_OPEN_
// THREAD_DECOUPLED (co-occurrence/decoupling × dialogueHighlights × unresolvedClues — first
// pairing of these two fields in this 111-rule pass, despite each being extensively paired with
// other channels), VISUAL_BEAT_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (sequence/aftermath ×
// visualBeats trigger → dialogueHighlights absence — first pairing of these two fields),
// CAUSALITY_OPEN_THREAD_ZONE_IMBALANCE (underweight/bloat × unresolvedClues × four structural
// zones — Waves 601/615 applied this template to dialogueHighlights and visualBeats;
// unresolvedClues itself has never been zone-audited here).
// Wave 643 additions (built on the shared checks library, audit M2.2): CAUSALITY_VISUAL_BEAT_
// DROUGHT_RUN (run-based × visualBeats absence — first checkDroughtRun use in this 114-rule
// pass; a 6+ scene stretch with zero physical staging while staged scenes exist elsewhere,
// distinct from VISUAL_BEAT_CAUSALITY_ZONE_IMBALANCE [underweight/bloat across four zones] and
// VISUAL_BEAT_PEAK_UNCAUSED [backward-cause on a single density peak] — this is a contiguous-
// run measure, not a zone or peak measure), CAUSAL_HIGHLIGHT_ZONE_CLUSTER (distribution/timing ×
// dialogueHighlights × structural thirds — first checkZoneCluster use in this pass; fires when
// >75% of memorable-dialogue scenes cluster in one third, distinct from Wave 601's stated-belief
// zone imbalance [four-zone bloat/empty check] which uses a different zone granularity and a
// different threshold shape), CAUSALITY_OPEN_THREAD_CURIOSITY_DECOUPLED (co-occurrence/
// decoupling × unresolvedClues × curiosityDelta>0 — zero overlap between scenes carrying open
// clue-debt and scenes where audience curiosity is actively rising; distinct from Wave 629's
// CAUSAL_HIGHLIGHT_OPEN_THREAD_DECOUPLED [unresolvedClues × dialogueHighlights] and from every
// other unresolvedClues pairing in this file, none of which cross it with the curiosity channel).
// Wave 657 additions (built on the shared checks library, audit M2.2): completes the sixth
// rotation cycle's opening file. CAUSALITY_HIGHLIGHT_PEAK_UNCAUSED (single-peak isolation/
// backward-cause × dialogueHighlights magnitude — every prior peak check here [suspense, clock,
// visualBeats] anchors on a different channel; this is the first application to the
// highlighted-dialogue channel), CAUSALITY_OPEN_THREAD_DROUGHT_RUN (run-based × unresolvedClues
// absence — Wave 643 applied the drought-run mode to visualBeats; unresolvedClues has been
// zone-imbalanced [Wave 629] and decoupled/aftermath-void [multiple waves] but never
// drought-audited via the shared helper), CAUSAL_STAGING_ZONE_CLUSTER (distribution/timing ×
// visualBeats × structural thirds — Wave 643 applied the zone-cluster mode to dialogueHighlights;
// visualBeats itself has only ever been zone-IMBALANCED [four-zone bloat/empty, Wave 615], never
// cluster-audited on the thirds granularity).
// Wave 671 additions (built on the shared checks library, audit M2.2): opens the seventh rotation
// cycle. CAUSALITY_HIGHLIGHT_DROUGHT_RUN (run-based × dialogueHighlights absence — Waves 643/657
// applied the peak-uncaused and zone-cluster modes to dialogueHighlights; the drought-run mode
// has never been applied to this channel), CAUSALITY_OPEN_THREAD_PEAK_UNCAUSED (single-peak
// isolation/backward-cause × unresolvedClues magnitude — unresolvedClues has been zone-imbalanced,
// drought-audited, and decoupled, but the scene carrying the most simultaneous open threads has
// never been backward-cause peak-audited), CAUSALITY_STAKES_ZONE_CLUSTER (distribution/timing ×
// purpose === 'raise_stakes' × structural thirds — `purpose` has only ever appeared inside
// incidental threshold conditions [e.g. purpose === 'climax'/'resolution' guards] in this
// 120-rule pass, never as the standalone subject of its own check).
// Wave 685 additions (closes the seventh rotation cycle, 671-685): CAUSALITY_CLOCK_DELTA_PEAK_
// UNCAUSED (single-peak isolation/backward-cause × clockDelta magnitude — clockDelta anchors
// several hand-rolled aggregate and threshold checks in this pass [e.g. the Wave 324/489b
// no-delta and clock-delta-array logic] but has never been backward-cause peak-audited via the
// shared library), CAUSALITY_PAYOFF_DROUGHT_RUN (run-based × payoffSetupIds absence —
// payoffSetupIds anchors extensive hand-rolled aggregate/peak logic [Waves 268, 335, 433c, 461a,
// 517a] but has never been drought-audited), CAUSALITY_SEED_ZONE_CLUSTER (distribution/timing ×
// seededClueIds × structural thirds — seededClueIds anchors extensive hand-rolled aggregate/
// front-loading logic [Waves 335, 461b, 489b] but has never been zone-cluster-audited via the
// shared library).
// Wave 699 additions (closes the eighth rotation cycle, 686-699): CAUSALITY_CLOCK_ZONE_CLUSTER
// (distribution/timing × clockRaised × structural thirds — clockRaised anchors extensive
// hand-rolled aggregate/threshold logic throughout this pass but has never been zone-cluster-
// audited via the shared library), CAUSALITY_RELATIONSHIP_DROUGHT_RUN (run-based ×
// relationshipShifts absence — relationshipShifts anchors extensive hand-rolled aggregate/
// threshold logic but has never been drought-audited via the shared library),
// CAUSALITY_SUSPENSE_PEAK_UNCAUSED (single-peak isolation/backward-cause × suspenseDelta
// magnitude — suspenseDelta anchors extensive hand-rolled aggregate/threshold logic but has never
// been backward-cause peak-audited via the shared library).
// Wave 713 additions (opens the tenth rotation cycle): CAUSALITY_OPEN_THREAD_ZONE_CLUSTER
// (distribution/timing × unresolvedClues × structural thirds — Waves 657/671 applied the
// drought-run and backward-cause peak modes to unresolvedClues; the zone-cluster mode has never
// been applied to it, completing the trio), CAUSALITY_STAKES_DROUGHT_RUN (run-based × purpose
// === 'raise_stakes' absence — Wave 671 applied the zone-cluster mode to this signal; the
// drought-run mode has never been applied to it), CAUSALITY_SEED_PEAK_UNCAUSED (single-peak
// isolation/backward-cause × seededClueIds magnitude — Wave 685 applied the zone-cluster mode to
// seededClueIds; the backward-cause peak mode has never been applied to it).
// Wave 727 additions (closes the tenth rotation cycle, 713-727): CAUSALITY_CLOCK_DELTA_DROUGHT_RUN
// (run-based × clockDelta≠0 absence — Wave 685 applied the backward-cause peak mode to clockDelta;
// the drought-run mode has never been applied to it), CAUSALITY_RELATIONSHIP_PEAK_UNCAUSED
// (single-peak isolation/backward-cause × relationshipShifts magnitude — Wave 713 applied the
// drought-run mode to relationshipShifts; the backward-cause peak mode has never been applied to
// it), CAUSALITY_SEED_DROUGHT_RUN (run-based × seededClueIds absence — Waves 685/713 applied the
// zone-cluster and backward-cause peak modes to seededClueIds; the drought-run mode has never been
// applied to it, completing the trio).
// Wave 741 additions (closes the eleventh rotation cycle, 728-741): CAUSALITY_CLOCK_DELTA_ZONE_
// CLUSTER (distribution/timing × clockDelta≠0 presence × structural thirds — Waves 685/727
// applied the backward-cause peak and run-based drought modes to clockDelta; the zone-cluster
// mode has never been applied to it, completing the trio), CAUSALITY_RELATIONSHIP_ZONE_CLUSTER
// (distribution/timing × relationshipShifts × structural thirds — Waves 699/727 applied the
// run-based drought and backward-cause peak modes to relationshipShifts; the zone-cluster mode has
// never been applied to it, completing the trio), CAUSALITY_PAYOFF_PEAK_UNCAUSED (single-peak
// isolation/backward-cause × payoffSetupIds magnitude — Wave 685 applied the run-based drought
// mode to payoffSetupIds; the backward-cause peak mode has never been applied to it).

import type { PassInput, PassResult, RevisionIssue } from './types.ts';
import { rewritePass } from '../rewrite.ts';
import { checkCoOccurrenceDecoupled, checkAftermathVoid, checkZoneImbalance, checkPeakUncaused, checkDroughtRun, checkZoneCluster, FOUR_ZONE_NAMES } from './lib/checks.ts';

export async function causalityPass(input: PassInput): Promise<PassResult> {
  const { fountain, records, annotations, approvedSpans } = input;
  const issues: RevisionIssue[] = [];

  for (let i = 1; i < records.length; i++) {
    const prev = records[i - 1];
    const curr = records[i];
    const ann = annotations[i];

    // ── Revelation without any prior planted clue ─────────────────────────
    // A revelation that delivers new information but has no seeded clues in ANY
    // prior scene is an unearned surprise. We check all records before this one,
    // not just the immediately preceding one, so an unrelated clue elsewhere
    // does not mask a missing setup for THIS revelation.
    if (ann && ann.revelation) {
      const anyCluesBefore = records
        .slice(0, i)
        .some(r => (r.seededClueIds?.length ?? 0) > 0 || r.unresolvedClues.length > 0);
      if (!anyCluesBefore) {
        issues.push({
          location: `Scene ${i} (${curr.slug})`,
          rule: 'REVELATION_WITHOUT_SETUP',
          description: `Scene ${i} delivers a revelation but no clues were planted in any prior scene`,
          severity: 'critical',
          suggestedFix: 'Add a clue-seeding moment in an earlier scene that anticipates this revelation',
        });
      }
    }

    // ── Suspense drop without a reversal scene ────────────────────────────
    // `dramaticTurn` is a freeform string (deriveDramaticTurn never returns 'none'),
    // so the old `=== 'none'` check was always false and this rule never fired.
    // A sharp suspense drop is *explained* when the scene's purpose releases tension
    // (a resolution, climax, turning point, or revelation). If the drop happens in a
    // non-resolving scene, the deflation has no on-page cause.
    const tensionReleasingPurposes = new Set<string>(['resolution', 'climax', 'turning_point', 'revelation']);
    if (curr.suspenseDelta < -3 && !tensionReleasingPurposes.has(curr.purpose)) {
      issues.push({
        location: `Scene ${i} (${curr.slug})`,
        rule: 'UNEXPLAINED_SUSPENSE_DROP',
        description: `Suspense drops sharply in Scene ${i} but the scene's purpose (${curr.purpose}) does not release tension — the cause of the deflation is unclear`,
        severity: 'minor',
        suggestedFix: 'Add a brief scene of consequence showing why tensions deflated, or recast this scene as a resolution/turning point',
      });
    }

    // ── Consecutive scenes with identical emotional shift ─────────────────
    if (i >= 2 && curr.emotionalShift === prev.emotionalShift && curr.emotionalShift !== 'neutral') {
      const prevPrev = records[i - 2];
      if (!prevPrev) continue;
      if (prevPrev.emotionalShift === curr.emotionalShift) {
        issues.push({
          location: `Scenes ${i - 2}–${i}`,
          rule: 'EMOTIONAL_MONOTONY',
          description: `Three consecutive scenes share the same emotional tone (${curr.emotionalShift}) — no causal variation`,
          severity: 'minor',
          suggestedFix: 'Introduce a brief scene with a contrasting emotional register to create texture',
        });
      }
    }
  }

  // ── Wave 141: Motivation coherence & action consequence ────────────────────

  // UNMOTIVATED_DECISION: Character makes a major decision (high suspense delta,
  // relationship shift, or revelation) with no clear prior setup scene (no clues,
  // clock raises, or emotional state building toward that decision).
  for (let i = 1; i < records.length; i++) {
    const curr = records[i];
    // Major decision indicators: high suspense, relationship shift, or revelation
    const isMajorDecision = curr.suspenseDelta > 2 || (curr.relationshipShifts?.length ?? 0) > 0 || curr.revelation !== null;

    if (isMajorDecision) {
      // Check if any of the 2 prior scenes set up this decision
      let hasSetup = false;
      for (let j = Math.max(0, i - 2); j < i; j++) {
        const prev = records[j];
        const isSetupScene =
          (prev.seededClueIds?.length ?? 0) > 0 || // planted clue relevant to decision
          prev.clockRaised || // external pressure building
          (prev.relationshipShifts?.length ?? 0) > 0 || // relationship tension building
          prev.revelation !== null; // prior revelation that informs decision
        if (isSetupScene) {
          hasSetup = true;
          break;
        }
      }

      if (!hasSetup && i >= 2) {
        issues.push({
          location: `Scene ${i} (${curr.slug})`,
          rule: 'UNMOTIVATED_DECISION',
          description: `Scene ${i} shows a major decision (high suspense, relationship shift, or revelation) with no setup in the 2 preceding scenes — the decision feels arbitrary`,
          severity: 'major',
          suggestedFix: 'Add a setup scene 1-2 scenes before where a character learns information, faces pressure, or confronts tension that motivates this decision',
        });
      }
    }
  }

  // ACTION_WITHOUT_CONSEQUENCE: Character takes action (high suspense delta or
  // clues planted) but it produces zero effect on other characters (no relationship
  // shifts in following scenes) or plot (no subsequent scenes with high suspense).
  for (let i = 0; i < records.length - 2; i++) {
    const curr = records[i];
    const isActionScene = (curr.seededClueIds?.length ?? 0) > 0 || curr.clockRaised || curr.suspenseDelta > 2;

    if (isActionScene) {
      // Check if the next 1-2 scenes show consequence
      let hasConsequence = false;
      for (let j = i + 1; j <= Math.min(i + 2, records.length - 1); j++) {
        const next = records[j];
        const showsConsequence =
          (next.relationshipShifts?.length ?? 0) > 0 || // other character reacts
          next.suspenseDelta > 1.5 || // escalation
          next.emotionalShift !== 'neutral'; // emotional response
        if (showsConsequence) {
          hasConsequence = true;
          break;
        }
      }

      if (!hasConsequence && (curr.seededClueIds?.length ?? 0) > 0) {
        // Only flag for planted clues, not every suspense scene
        issues.push({
          location: `Scene ${i} (${curr.slug})`,
          rule: 'ACTION_WITHOUT_CONSEQUENCE',
          description: `Scene ${i} plants clues or raises stakes but the next 2 scenes show no consequence — other characters are unaffected`,
          severity: 'major',
          suggestedFix: 'Add a reaction scene where a character responds to or is affected by the action in this scene',
        });
      }
    }
  }

  // ABANDONED_GOAL: Character goal or motivation mentioned in a clue or dialogue
  // appears in 2+ scenes but then never appears again without resolution. Goals
  // are abandoned when they vanish from the narrative without being achieved or
  // explicitly abandoned on-page.
  const goalMentions: Map<string, number[]> = new Map();
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    // Extract implied goals from clues and dialogue (very crude heuristic)
    for (const clue of r.seededClueIds ?? []) {
      if (!goalMentions.has(clue)) goalMentions.set(clue, []);
      goalMentions.get(clue)!.push(i);
    }
  }

  for (const [goalId, appearances] of goalMentions) {
    if (appearances.length >= 2) {
      // Check if goal ever resolves (payoff in following scenes)
      const lastAppearance = appearances[appearances.length - 1];
      let isResolved = false;

      // Goal is resolved if there's a payoff later
      for (let j = lastAppearance + 1; j < records.length; j++) {
        const r = records[j];
        if ((r.payoffSetupIds ?? []).includes(goalId) || r.revelation !== null) {
          isResolved = true;
          break;
        }
      }

      if (!isResolved && lastAppearance < records.length - 1) {
        // Goal is abandoned: appeared multiple times, then vanished
        issues.push({
          location: `Goal "${goalId}" last mentioned at Scene ${lastAppearance}`,
          rule: 'ABANDONED_GOAL',
          description: `Goal/motivation "${goalId}" appears in Scenes ${appearances.slice(0, 3).join(', ')}${appearances.length > 3 ? ',...' : ''} but is never resolved or abandoned on-page — it just disappears`,
          severity: 'major',
          suggestedFix: `Either resolve "${goalId}" via payoff in the final act, or add an explicit scene where the character abandons or reframes the goal`,
        });
      }
    }
  }

  // ── Wave 155: Deus ex machina, suspense spike, goal-conflict absence ─────────

  // DEUS_EX_MACHINA: A revelation in the final 20% of the story that resolves the
  // plot but was never seeded. The audience feels cheated when the solution
  // arrives from nowhere at the last moment.
  if (records.length >= 8) {
    const climaxZoneStart = Math.floor(records.length * 0.8);
    for (let i = climaxZoneStart; i < records.length; i++) {
      const r = records[i];
      const ann = annotations[i];
      const isResolvingRevelation = (r.revelation !== null || (ann && ann.revelation)) &&
        (r.purpose === 'climax' || r.purpose === 'resolution' || r.suspenseDelta < -2);

      if (isResolvingRevelation) {
        // Was there ANY clue seeded in the first 60% that could anticipate this?
        const setupZoneEnd = Math.floor(records.length * 0.6);
        const hadEarlySetup = records.slice(0, setupZoneEnd).some(prev =>
          (prev.seededClueIds?.length ?? 0) > 0,
        );
        if (!hadEarlySetup) {
          issues.push({
            location: `Scene ${i} (${r.slug})`,
            rule: 'DEUS_EX_MACHINA',
            description: `Scene ${i} resolves the plot via a late revelation, but no clue was planted in the first 60% of the story — the resolution arrives from nowhere`,
            severity: 'critical',
            suggestedFix: 'Plant the seed of this resolution in Act 1 or early Act 2. The solution must be available to the attentive audience before it arrives',
          });
          break; // one flag per pass
        }
      }
    }
  }

  // SUSPENSE_SPIKE_NO_CAUSE: A sudden high suspense delta (>3) with no escalation
  // in the preceding scenes (prior 2 scenes both had low suspense <1). Danger that
  // materializes without buildup feels arbitrary rather than earned.
  for (let i = 2; i < records.length; i++) {
    const curr = records[i];
    if (curr.suspenseDelta > 3) {
      const prev1 = records[i - 1];
      const prev2 = records[i - 2];
      const noBuildup = prev1.suspenseDelta < 1 && prev2.suspenseDelta < 1;
      // Only flag if no clock pressure or clue seeded recently to justify the spike
      const noSetup = !prev1.clockRaised && !prev2.clockRaised &&
        (prev1.seededClueIds?.length ?? 0) === 0 && (prev2.seededClueIds?.length ?? 0) === 0;
      if (noBuildup && noSetup) {
        issues.push({
          location: `Scene ${i} (${curr.slug})`,
          rule: 'SUSPENSE_SPIKE_NO_CAUSE',
          description: `Scene ${i} spikes to suspense ${curr.suspenseDelta.toFixed(1)} after two flat scenes (${prev2.suspenseDelta.toFixed(1)}, ${prev1.suspenseDelta.toFixed(1)}) with no clock pressure or clue — the danger appears without buildup`,
          severity: 'major',
          suggestedFix: 'Escalate tension across the preceding scenes. Plant the threat or raise a clock so the spike feels like a culmination, not a jump-scare',
        });
        break; // one flag per pass
      }
    }
  }

  // GOAL_WITHOUT_OPPOSITION: The story plants a goal (recurring clue) but no scene
  // ever shows a negative relationship shift or reversal opposing it. A goal with
  // no opposing force has no dramatic tension — drama is desire meeting resistance.
  if (records.length >= 6) {
    const hasGoal = records.some(r => (r.seededClueIds?.length ?? 0) > 0);
    if (hasGoal) {
      const hasOpposition = records.some(r => {
        const hasNegShift = (r.relationshipShifts ?? []).some(s => s.amount < -0.5);
        const hasReversal = r.suspenseDelta < -1;
        return hasNegShift || hasReversal;
      });
      if (!hasOpposition) {
        issues.push({
          location: 'Overall causal arc',
          rule: 'GOAL_WITHOUT_OPPOSITION',
          description: 'The story plants goals/clues but no scene shows opposition — no negative relationship shift, no reversal. A goal that meets no resistance generates no drama',
          severity: 'major',
          suggestedFix: 'Introduce an antagonistic force: a character who opposes the goal, a reversal that sets it back, or a relationship that sours as the protagonist pursues it',
        });
      }
    }
  }

  // ── Wave 166: Chekhov's gun, consequence delay, revelation front-loading ──────

  // CHEKHOV_GUN_UNFIRED: 2+ clues seeded in the first half of the story have no
  // corresponding payoff (no payoffSetupId matching the clue ID) anywhere in the
  // story. The gun was displayed but never fired.
  if (records.length >= 6) {
    const midpoint = Math.floor(records.length * 0.5);
    const earlyClues = new Set<string>();
    for (let i = 0; i < midpoint; i++) {
      for (const clue of records[i].seededClueIds ?? []) {
        earlyClues.add(clue);
      }
    }
    if (earlyClues.size > 0) {
      const allPayoffs = new Set<string>();
      for (const r of records) {
        for (const pid of r.payoffSetupIds ?? []) allPayoffs.add(pid);
      }
      const unfiredClues = [...earlyClues].filter(c => !allPayoffs.has(c));
      if (unfiredClues.length >= 2) {
        issues.push({
          location: `Scenes 0–${midpoint - 1} (setup zone)`,
          rule: 'CHEKHOV_GUN_UNFIRED',
          description: `${unfiredClues.length} clue(s) seeded in the first half (${unfiredClues.slice(0, 3).join(', ')}) have no matching payoff anywhere in the story — Chekhov's gun shown but never fired`,
          severity: 'major',
          suggestedFix: 'Either fire the gun: add a payoff scene that calls back each planted clue. Or remove the clue from Act 1 if you don\'t intend to resolve it.',
        });
      }
    }
  }

  // CONSEQUENCE_DELAY_EXCESSIVE: A high-action scene (clock raised or clue planted)
  // has its first narrative consequence 5+ scenes later. Cause and effect separated
  // by that many scenes lose their causal connection for the audience.
  if (records.length >= 10) {
    for (let i = 0; i < records.length - 5; i++) {
      const r = records[i];
      const isActionScene = r.clockRaised || (r.seededClueIds?.length ?? 0) > 0;
      if (!isActionScene) continue;

      let firstConsequenceAt = -1;
      for (let j = i + 1; j < records.length; j++) {
        const next = records[j];
        const hasConsequence =
          (next.relationshipShifts?.length ?? 0) > 0 ||
          next.suspenseDelta > 1.5 ||
          next.emotionalShift !== 'neutral';
        if (hasConsequence) { firstConsequenceAt = j; break; }
      }

      if (firstConsequenceAt >= i + 5) {
        issues.push({
          location: `Scenes ${i}–${firstConsequenceAt}`,
          rule: 'CONSEQUENCE_DELAY_EXCESSIVE',
          description: `Scene ${i} raises the stakes (clock/clue) but the first narrative consequence doesn't arrive until Scene ${firstConsequenceAt} — ${firstConsequenceAt - i} scenes of delay. Cause and effect are too far apart to feel connected.`,
          severity: 'minor',
          suggestedFix: 'Add a ripple effect in Scene ${i + 1} or ${i + 2}: an emotional reaction, a relationship shift, or an escalation that shows the action landing immediately',
        });
        break; // one flag per pass
      }
    }
  }

  // REVELATION_FRONT_LOADING: More than 60% of all revelations (scenes where the
  // narrative delivers a major story truth) land in the first half. The second half
  // is informationally starved — it can only react to what was already revealed.
  {
    const revelationScenes = records.filter(r => r.revelation !== null);
    if (revelationScenes.length >= 3 && records.length >= 6) {
      const midpoint = Math.floor(records.length * 0.5);
      const firstHalfRevCount = revelationScenes.filter(r => r.sceneIdx < midpoint).length;
      const ratio = firstHalfRevCount / revelationScenes.length;
      if (ratio > 0.6) {
        issues.push({
          location: `Scenes 0–${midpoint - 1} (first half)`,
          rule: 'REVELATION_FRONT_LOADING',
          description: `${firstHalfRevCount} of ${revelationScenes.length} revelations (${Math.round(ratio * 100)}%) land in the first half — the second act is informationally starved and can only react to what was already revealed`,
          severity: 'major',
          suggestedFix: 'Redistribute revelations: reserve at least one major revelation for the climax zone, one for the Act 2 midpoint, and one for late Act 2 to keep the audience receiving new information throughout',
        });
      }
    }
  }

  // ── Wave 180: Revelation without reaction, reaction without cause, clock without payoff ──

  // REVELATION_WITHOUT_REACTION: A revelation lands but the very next scene shows
  // no causal ripple — neutral emotion, no relationship shift, no change in
  // suspense. The truth is delivered and the story moves on as if nothing
  // happened. Distinct from belief's REVELATION_ISOLATED (dialogue presence);
  // this checks the downstream causal response.
  if (records.length >= 4) {
    for (let i = 0; i < records.length - 1; i++) {
      const curr = records[i];
      if (curr.revelation === null) continue;
      const next = records[i + 1];
      const noReaction =
        next.emotionalShift === 'neutral' &&
        (next.relationshipShifts?.length ?? 0) === 0 &&
        next.suspenseDelta <= 1;
      if (noReaction) {
        issues.push({
          location: `Scene ${i} → Scene ${i + 1}`,
          rule: 'REVELATION_WITHOUT_REACTION',
          description: `Scene ${i} delivers a revelation but the next scene shows no causal ripple — neutral emotion, no relationship shift, no change in suspense. The truth lands and the story carries on as if nothing was learned.`,
          severity: 'minor',
          suggestedFix: 'Let the revelation change something immediately: a character recalibrates, a relationship shifts, or the stakes rise. Information that alters nothing wasn\'t worth revealing.',
        });
        break;
      }
    }
  }

  // REACTION_WITHOUT_CAUSE: A scene carries a negative emotional shift but
  // neither it nor the two scenes before it contain any on-page trigger (no
  // negative relationship shift, no suspense rise, no revelation, no clock). The
  // character's collapse has no visible cause. Distinct from UNMOTIVATED_DECISION
  // (which keys on decisions, not raw emotion).
  for (let i = 2; i < records.length; i++) {
    const curr = records[i];
    if (curr.emotionalShift !== 'negative') continue;
    const selfCause =
      curr.revelation !== null ||
      curr.suspenseDelta > 1.5 ||
      curr.clockRaised ||
      (curr.relationshipShifts ?? []).some(s => s.amount < 0);
    if (selfCause) continue;
    let priorCause = false;
    for (let j = Math.max(0, i - 2); j < i; j++) {
      const p = records[j];
      if (
        p.emotionalShift === 'negative' ||
        p.suspenseDelta > 1.5 ||
        p.revelation !== null ||
        p.clockRaised ||
        (p.relationshipShifts ?? []).some(s => s.amount < 0)
      ) { priorCause = true; break; }
    }
    if (!priorCause) {
      issues.push({
        location: `Scene ${i} (${curr.slug})`,
        rule: 'REACTION_WITHOUT_CAUSE',
        description: `Scene ${i} turns emotionally negative but neither it nor the two preceding scenes contain any trigger — no setback, no bad news, no souring relationship, no rising threat. The downturn has no on-page cause.`,
        severity: 'minor',
        suggestedFix: 'Give the negative turn a visible cause in this scene or just before it: a piece of bad news, a betrayal, a failure, or a threat that justifies the shift in mood.',
      });
      break;
    }
  }

  // CLOCK_RAISED_WITHOUT_PAYOFF: A ticking clock is raised somewhere in the story
  // but no scene ever discharges it — there is no high-suspense beat, climax, or
  // resolution anywhere. The deadline is established and then quietly forgotten,
  // so the pressure it promised never pays off.
  if (records.length >= 6) {
    const anyClock = records.some(r => r.clockRaised);
    if (anyClock) {
      const hasPayoff = records.some(r =>
        r.suspenseDelta > 2 || r.purpose === 'climax' || r.purpose === 'resolution',
      );
      if (!hasPayoff) {
        issues.push({
          location: 'Clock / deadline arc',
          rule: 'CLOCK_RAISED_WITHOUT_PAYOFF',
          description: 'A ticking clock is raised but the story never discharges it — no scene reaches a suspense peak, climax, or resolution. The deadline is established and then forgotten, so its pressure never pays off.',
          severity: 'major',
          suggestedFix: 'Fire the clock: build to a scene where the deadline forces a confrontation or a decisive choice, then show the outcome. A clock that never runs out is a promise the story breaks.',
        });
      }
    }
  }

  // ── Wave 187: Consequence chain break, clock ghost, positive shift orphan ───

  // CONSEQUENCE_CHAIN_BREAK: A high-action peak (suspenseDelta ≥ 2) is followed
  // by two consecutive flat scenes — no emotion, no clock, no relational movement,
  // low suspense. The action surge dissipates without a causal ripple: the peak
  // happened, and then the story acts as if it didn't. Distinct from CONSEQUENCE_
  // DELAY_EXCESSIVE (clock/clue delay) and REVELATION_WITHOUT_REACTION (revelation
  // specific). This fires on any high-suspense scene followed by a void.
  if (records.length >= 6) {
    const isFlat = (r: typeof records[0]) =>
      r.emotionalShift === 'neutral' &&
      !r.clockRaised &&
      (r.relationshipShifts?.length ?? 0) === 0 &&
      r.suspenseDelta <= 1;
    for (let i = 0; i < records.length - 2; i++) {
      if (records[i].suspenseDelta < 2) continue;
      if (isFlat(records[i + 1]) && isFlat(records[i + 2])) {
        issues.push({
          location: `Scene ${records[i].sceneIdx} (action peak)`,
          rule: 'CONSEQUENCE_CHAIN_BREAK',
          description: `Scene ${records[i].sceneIdx} spikes to suspense ${records[i].suspenseDelta.toFixed(1)} but the next two scenes are completely flat — no emotional aftershock, no clock, no relationship movement. The action peak dissolves without causal consequence.`,
          severity: 'minor',
          suggestedFix: 'Let high-action peaks echo forward: show the emotional aftershock, the strained relationship, or the accelerated deadline in the scenes that immediately follow. Action without consequence is noise, not drama.',
        });
        break;
      }
    }
  }

  // CLOCK_GHOST: A clock is raised but the three scenes immediately following
  // show no urgency — no suspense rise, no secondary clock, no antagonistic
  // pressure. The deadline appears once and immediately fades into background
  // noise. Distinct from CLOCK_RAISED_WITHOUT_PAYOFF (no payoff anywhere):
  // this fires when the immediate aftermath of a clock-raise is suspense-dead.
  if (records.length >= 6) {
    for (let i = 0; i < records.length - 3; i++) {
      if (!records[i].clockRaised) continue;
      const following = records.slice(i + 1, i + 4);
      const urgencyAbsent = following.length === 3 && following.every(r =>
        r.suspenseDelta <= 1.5 &&
        !r.clockRaised &&
        (r.relationshipShifts ?? []).every(s => s.amount >= 0),
      );
      if (urgencyAbsent) {
        issues.push({
          location: `Scene ${records[i].sceneIdx} (clock raised)`,
          rule: 'CLOCK_GHOST',
          description: `A clock is raised at Scene ${records[i].sceneIdx} but the next three scenes show no urgency — no suspense build, no secondary clock, no antagonistic pressure. The deadline appears once and immediately fades.`,
          severity: 'major',
          suggestedFix: 'Build on the clock in each scene that follows its introduction: show the protagonist becoming more desperate, the antagonist pressing harder, or the deadline looming as a concrete presence — not a forgotten premise.',
        });
        break;
      }
    }
  }

  // POSITIVE_SHIFT_ORPHAN: Two or more positive relationship shifts (amount ≥ 0.4)
  // occur with no causal consequence in the three scenes that follow each one.
  // Alliances built and trust earned that produce nothing — no revelation, no
  // escalation, no new conflict, no subsequent shift — are narratively inert. The
  // relationship improves to no story purpose.
  if (records.length >= 6) {
    const posShiftIdxs: number[] = [];
    for (let i = 0; i < records.length; i++) {
      if ((records[i].relationshipShifts ?? []).some((s: { amount: number }) => s.amount >= 0.4)) {
        posShiftIdxs.push(i);
      }
    }
    if (posShiftIdxs.length >= 2) {
      let orphanCount = 0;
      for (const idx of posShiftIdxs) {
        const following = records.slice(idx + 1, idx + 4);
        const hasConsequence = following.some(r =>
          r.revelation !== null ||
          r.suspenseDelta > 1.5 ||
          r.clockRaised ||
          (r.relationshipShifts?.length ?? 0) > 0,
        );
        if (!hasConsequence) orphanCount++;
      }
      if (orphanCount >= 2) {
        issues.push({
          location: 'Positive relationship shifts',
          rule: 'POSITIVE_SHIFT_ORPHAN',
          description: `${orphanCount} positive relationship shifts (alliances, trust, reconciliation) have no causal consequence in the following scenes — the relationships improve but nothing in the story changes because of it.`,
          severity: 'minor',
          suggestedFix: 'Give positive shifts narrative weight: a new alliance enables a plan, reconciliation opens a door that was closed, trust creates a vulnerability that the antagonist can exploit. If the relationship improves but nothing changes, the scene earned nothing.',
        });
      }
    }
  }

  // ── Wave 197: Causal Act1 void, Act3 discharge absent, motivation reversal ──

  // CAUSAL_ACT1_VOID: The entire Act 1 (first 25%) contains no causal signal —
  // no seeded clue, no clock raised, no significant relationship shift (≥0.3).
  // The opening establishes no threads to develop. Act 2 begins with nothing
  // to complicate and Act 3 has nothing to resolve.
  if (records.length >= 8) {
    const causalAct1End = Math.floor(records.length * 0.25);
    const act1CausalRecs = records.slice(0, causalAct1End);
    if (act1CausalRecs.length >= 2) {
      const hasAct1Signal = act1CausalRecs.some(r =>
        (r.seededClueIds?.length ?? 0) > 0 ||
        r.clockRaised ||
        (r.relationshipShifts ?? []).some((s: any) => Math.abs(s.amount) >= 0.3),
      );
      if (!hasAct1Signal) {
        issues.push({
          location: `Act 1 (Scenes 0–${causalAct1End - 1})`,
          rule: 'CAUSAL_ACT1_VOID',
          description: `Act 1 (${act1CausalRecs.length} scenes) plants no clues, raises no clock, and creates no significant relationship shift — the story opens without establishing any causal threads for Acts 2 and 3 to develop`,
          severity: 'major',
          suggestedFix: 'Act 1 must launch at least one causal thread: plant a clue that foreshadows the climax, raise a clock that creates urgency, or create a relationship shift that the protagonist must resolve. Without a thread to pull, the rest of the story has no tension to escalate.',
        });
      }
    }
  }

  // ACT3_DISCHARGE_ABSENT: Clues are seeded somewhere in the story but Act 3
  // (last 25%) contains no payoffs and no revelations — the seeded material is
  // never discharged in the final act. The climax fires no guns.
  if (records.length >= 8) {
    const hasAnySeeds = records.some(r => (r.seededClueIds?.length ?? 0) > 0);
    if (hasAnySeeds) {
      const act3DischargeStart = Math.floor(records.length * 0.75);
      const act3Discharge = records.slice(act3DischargeStart);
      const hasAct3Discharge = act3Discharge.some(r =>
        r.revelation !== null || (r.payoffSetupIds?.length ?? 0) > 0,
      );
      if (!hasAct3Discharge) {
        issues.push({
          location: `Act 3 (Scenes ${act3DischargeStart}–${records.length - 1})`,
          rule: 'ACT3_DISCHARGE_ABSENT',
          description: `Clues are seeded in the story but Act 3 contains no payoffs and no revelations — the planted material is never discharged in the final act. The climax fires no guns.`,
          severity: 'major',
          suggestedFix: 'Move at least one payoff (payoffSetupId) or revelation into Act 3. The final act must fire the guns that Act 1 displayed — the seeded material exists to create a moment of recognition and resolution at the climax.',
        });
      }
    }
  }

  // MOTIVATION_REVERSAL_UNCAUSED: A positive relationship shift (≥0.4) for a pair
  // is followed within 2 scenes by a negative shift (≤-0.4) for the same pair with
  // no triggering event in between — no revelation, clock raise, or crisis explains
  // the sudden reversal. Trust evaporating without cause undermines relational logic.
  if (records.length >= 6) {
    let motivRevFired = false;
    for (let i = 0; i < records.length - 1 && !motivRevFired; i++) {
      const shiftsA = records[i].relationshipShifts ?? [];
      for (const shiftA of shiftsA) {
        if (motivRevFired || shiftA.amount < 0.4) continue;
        for (let j = i + 1; j <= Math.min(i + 2, records.length - 1) && !motivRevFired; j++) {
          const shiftsB = records[j].relationshipShifts ?? [];
          for (const shiftB of shiftsB) {
            if (shiftB.pairKey !== shiftA.pairKey || shiftB.amount > -0.4) continue;
            let hasCause = false;
            for (let k = i; k <= j; k++) {
              if (records[k].revelation !== null ||
                  records[k].clockRaised ||
                  records[k].suspenseDelta > 2) { hasCause = true; break; }
            }
            if (!hasCause) {
              issues.push({
                location: `Scenes ${i}–${j} (pair: ${shiftA.pairKey})`,
                rule: 'MOTIVATION_REVERSAL_UNCAUSED',
                description: `The relationship for pair "${shiftA.pairKey}" shifts from +${shiftA.amount.toFixed(2)} (positive) to ${shiftB.amount.toFixed(2)} (negative) across Scenes ${i}–${j} with no triggering event — no revelation, clock raise, or crisis explains the sudden reversal`,
                severity: 'minor',
                suggestedFix: 'Add a visible cause for the relational flip: a discovery, a betrayal detail, or a confrontation that makes the reversal inevitable rather than arbitrary. Sudden reversals need earned catalysts.',
              });
              motivRevFired = true;
              break;
            }
          }
        }
      }
    }
  }

  // ── Wave 212: Setup-payoff imbalance, act2 causal desert, causal midpoint void ──

  // SETUP_PAYOFF_IMBALANCE: The story seeds five or more distinct causal threads
  // but closes only one or none via payoffs. Every seeded clue is a promissory
  // note; when seeds outnumber payoffs 5-to-1 or worse, the audience carries a
  // compounding load of unfulfilled promises and the ending feels structurally
  // incomplete regardless of how satisfying the drama is.
  if (records.length >= 8) {
    const totalSeedCount212 = records.reduce((s: number, r: any) => s + (r.seededClueIds?.length ?? 0), 0);
    const totalPayoffCount212 = records.reduce((s: number, r: any) => s + (r.payoffSetupIds?.length ?? 0), 0);
    if (totalSeedCount212 >= 5 && totalPayoffCount212 <= 1) {
      issues.push({
        location: 'Setup/payoff distribution',
        rule: 'SETUP_PAYOFF_IMBALANCE',
        severity: 'minor',
        description: `${totalSeedCount212} causal threads are seeded across the story but only ${totalPayoffCount212} payoff(s) close them — the story plants ${totalSeedCount212} guns and fires almost none. The audience accumulates a growing load of unfulfilled promises.`,
        suggestedFix: 'Audit the seeded clues and add payoff scenes that close each major thread. Alternatively, cut threads you don\'t intend to resolve — every seeded clue is a promise, and every unfired gun is a broken one.',
      });
    }
  }

  if (records.length >= 10) {
    const isCausal212 = (r: any): boolean =>
      r.revelation !== null ||
      (r.payoffSetupIds?.length ?? 0) > 0 ||
      r.clockRaised ||
      (r.seededClueIds?.length ?? 0) > 0 ||
      (r.relationshipShifts ?? []).some((s: any) => Math.abs(s.amount) >= 0.3);

    // ACT2_CAUSAL_DESERT: The entire Act 2 (25%–75%) contains no causal event —
    // no revelation, payoff, seed, clock raise, or significant relationship shift
    // (≥0.3). A causally dead Act 2 means the protagonist simply waits for Act 3
    // to arrive — no discovery, no escalation, no reversal — and the audience
    // feels the story treading water through its longest section.
    const act2DesertStart212 = Math.floor(records.length * 0.25);
    const act2DesertEnd212 = Math.floor(records.length * 0.75);
    const act2DesertRecs212 = records.slice(act2DesertStart212, act2DesertEnd212);
    if (!act2DesertRecs212.some(isCausal212)) {
      issues.push({
        location: `Act 2 (Scenes ${act2DesertStart212}–${act2DesertEnd212 - 1})`,
        rule: 'ACT2_CAUSAL_DESERT',
        severity: 'major',
        description: `Act 2 (Scenes ${act2DesertStart212}–${act2DesertEnd212 - 1}, ${act2DesertRecs212.length} scenes) contains no revelation, payoff, planted clue, raised clock, or significant relationship shift — the story's longest structural section is causally inert. Nothing is planted, escalated, or discovered across the entire middle act.`,
        suggestedFix: 'Act 2 must be the engine of complication. Plant clues, raise clocks, shift relationships, or deliver a mid-story revelation in each act-2 sequence. The protagonist should be discovering, failing, and adapting across the middle — not waiting for Act 3.',
      });
    }

    // CAUSAL_MIDPOINT_VOID: The structural midpoint zone (40%–60%) has no causal
    // event while Act 2 as a whole does have causal content — the pivot point is
    // specifically dead. The midpoint is the gear-change of a well-crafted story:
    // the protagonist's goal transforms, the dominant threat shifts, or a major
    // alliance forms. Without a causal signal at the 40%–60% zone, Act 2 drifts
    // from one half to the other with no felt turning point. Only fires when act2
    // has content elsewhere (otherwise ACT2_CAUSAL_DESERT already covers it).
    const midVoidStart212 = Math.floor(records.length * 0.4);
    const midVoidEnd212 = Math.floor(records.length * 0.6);
    const midVoidRecs212 = records.slice(midVoidStart212, midVoidEnd212);
    if (midVoidRecs212.length >= 2 && act2DesertRecs212.some(isCausal212) && !midVoidRecs212.some(isCausal212)) {
      issues.push({
        location: `Midpoint zone (Scenes ${midVoidStart212}–${midVoidEnd212 - 1})`,
        rule: 'CAUSAL_MIDPOINT_VOID',
        severity: 'major',
        description: `The structural midpoint (Scenes ${midVoidStart212}–${midVoidEnd212 - 1}) contains no revelation, payoff, planted clue, raised clock, or significant relationship shift — the story's pivot has no felt gear-change. Act 2 has causal activity around the midpoint but not at it.`,
        suggestedFix: 'Plant a causal event at the 40%–60% zone: a revelation that reframes the goal, a clock that raises urgency, or a relationship shift that transforms the alliance map. The midpoint event makes the second half of Act 2 feel like a higher-stakes story than the first.',
      });
    }
  }

  // ── Wave 226: CAUSAL_DENSITY_INVERSION ────────────────────────────────────
  // The first half contains ≥3× more causal events than the second half —
  // the story front-loads its engine and loses momentum. All causal types are
  // counted: planted clues, clock raises, revelations, and significant
  // relationship shifts (≥|0.3|). Distinct from REVELATION_FRONT_LOADING
  // (revelations only) and ACT3_DISCHARGE_ABSENT (Act 3 only). Requires 10+ scenes
  // and ≥4 first-half events so the imbalance is meaningful.
  if (records.length >= 10) {
    const isCausalEvent226 = (r: typeof records[0]): boolean =>
      r.revelation !== null ||
      r.clockRaised ||
      (r.seededClueIds?.length ?? 0) > 0 ||
      (r.relationshipShifts ?? []).some((s: any) => Math.abs(s.amount) >= 0.3);
    const midpoint226 = Math.floor(records.length * 0.5);
    const firstHalfCount226 = records.slice(0, midpoint226).filter(isCausalEvent226).length;
    const secondHalfCount226 = records.slice(midpoint226).filter(isCausalEvent226).length;
    if (firstHalfCount226 >= 4 && secondHalfCount226 > 0 && firstHalfCount226 >= secondHalfCount226 * 3) {
      issues.push({
        location: 'Causal event distribution',
        rule: 'CAUSAL_DENSITY_INVERSION',
        severity: 'major',
        description: `The first half contains ${firstHalfCount226} causal events (seeds, clocks, revelations, relationship shifts) vs. ${secondHalfCount226} in the second half (${firstHalfCount226}:${secondHalfCount226} ratio). The story fires its causal engine early and loses momentum — the second half has no new threads to pull, no clocks left to expire, no revelation left to land.`,
        suggestedFix: `Move at least two causal events into the second half: a new clock that activates at the midpoint, a late-breaking revelation, or a relationship shift that reorders the alliance map near the climax.`,
      });
    }
  }

  // ── Wave 226: ESCALATION_PLATEAU ──────────────────────────────────────────
  // The story has 3+ suspense peaks (suspenseDelta ≥ 2) but their values don't
  // escalate over the arc — the final peak is no higher than the first. Effective
  // dramatic structure requires each successive high-pressure scene to be more
  // intense than the last. When peaks plateau, the audience stops expecting things
  // to get worse, and the climax can't deliver a felt sense of maximum stakes.
  // Requires 8+ records and 3+ peaks.
  if (records.length >= 8) {
    const peaks226 = records.filter((r: any) => r.suspenseDelta >= 2);
    if (peaks226.length >= 3) {
      const firstPeak226 = peaks226[0].suspenseDelta;
      const lastPeak226 = peaks226[peaks226.length - 1].suspenseDelta;
      if (lastPeak226 <= firstPeak226) {
        issues.push({
          location: 'Suspense escalation arc',
          rule: 'ESCALATION_PLATEAU',
          severity: 'major',
          description: `The story has ${peaks226.length} suspense peaks (≥2.0) but the final peak (${lastPeak226.toFixed(1)}) is no higher than the first (${firstPeak226.toFixed(1)}) — danger plateaus rather than escalating. The climax cannot feel like the most intense moment when earlier peaks were equally or more intense.`,
          suggestedFix: `Calibrate peak heights to escalate across the arc: reserve the story's highest suspense value for the climax. Each successive tension scene should spike slightly higher than its predecessor, so the audience experiences a felt crescendo.`,
        });
      }
    }
  }

  // ── Wave 226: ANTAGONIST_SECOND_HALF_SILENT ───────────────────────────────
  // An antagonistic force creates significant negative pressure in the first 40%
  // (negative relationship shift ≤-0.4) but then disappears — no such shift
  // appears in the remaining 60%. The opposition that defined Act 1 goes quiet
  // exactly when the protagonist needs to be pushed hardest. Distinct from
  // GOAL_WITHOUT_OPPOSITION (which fires when there is NO opposition anywhere
  // in the story); this catches a second-half retreat of an established threat.
  // Requires 10+ records.
  if (records.length >= 10) {
    const act1End226 = Math.floor(records.length * 0.4);
    const hasAct1Antagonism226 = records.slice(0, act1End226).some((r: any) =>
      (r.relationshipShifts ?? []).some((s: any) => s.amount <= -0.4),
    );
    if (hasAct1Antagonism226) {
      const hasLaterAntagonism226 = records.slice(act1End226).some((r: any) =>
        (r.relationshipShifts ?? []).some((s: any) => s.amount <= -0.4),
      );
      if (!hasLaterAntagonism226) {
        issues.push({
          location: 'Antagonist causal presence',
          rule: 'ANTAGONIST_SECOND_HALF_SILENT',
          severity: 'minor',
          description: `An antagonistic force creates significant negative relationship tension in the first 40% of the story but then disappears — no scene in the remaining 60% carries a strong negative shift (≤-0.4). The opposition goes quiet exactly when the protagonist needs to be pushed hardest.`,
          suggestedFix: `Re-engage the antagonist in Act 2-3: a confrontation that escalates, a new threat vector, or a relationship betrayal that makes the final act feel like a climax rather than an unchallenged march to resolution.`,
        });
      }
    }
  }

  // ── Wave 240: CURIOSITY_OPEN_LOOP ─────────────────────────────────────────
  // Two or more scenes raise curiosity sharply (curiosityDelta ≥ 2) but no
  // witnessed revelation ever follows the first such spike. The story poses
  // strong questions — hooks that promise an answer — and then never delivers a
  // witnessed truth that closes the loop. Curiosity is a forward-promise: a
  // spike with no downstream revelation is an open loop the audience carries to
  // the credits unresolved. Distinct from CLOCK_RAISED_WITHOUT_PAYOFF (deadline
  // pressure) and from belief's CURIOSITY checks. Requires 8+ records.
  if (records.length >= 8) {
    const curiositySpikes240 = records.filter((r: any) => (r.curiosityDelta ?? 0) >= 2);
    if (curiositySpikes240.length >= 2) {
      const firstSpikeIdx240 = curiositySpikes240[0].sceneIdx;
      const anyRevAfterSpike240 = records.some(
        (r: any) => r.sceneIdx > firstSpikeIdx240 && r.revelation !== null,
      );
      if (!anyRevAfterSpike240) {
        issues.push({
          location: `Curiosity loop (first spike at Scene ${firstSpikeIdx240})`,
          rule: 'CURIOSITY_OPEN_LOOP',
          severity: 'major',
          description: `${curiositySpikes240.length} scenes raise curiosity sharply (the story poses strong questions) but no witnessed revelation ever follows the first spike at Scene ${firstSpikeIdx240}. Every question the story plants is left open — the audience is hooked and then abandoned.`,
          suggestedFix: 'Pay off at least one curiosity spike with a witnessed revelation later in the story. A question raised is a contract: the audience leans in expecting the answer, and a story that never delivers one feels like a tease, not a mystery.',
        });
      }
    }
  }

  // ── Wave 240: REVELATION_WITHOUT_CURIOSITY ────────────────────────────────
  // The story delivers 2+ witnessed revelations and its reader-state layer is
  // demonstrably active (at least one scene moves suspense), yet no scene ever
  // raises curiosity (every curiosityDelta ≤ 0). The audience is handed answers
  // to questions it was never invited to ask. A revelation only lands when the
  // audience has been made to want it; revelations with no prior curiosity
  // build feel like information delivery, not discovery. The suspense-active
  // guard ensures the absence of curiosity is a real authorial gap, not just an
  // empty ledger. Requires 8+ records and 2+ revelations.
  if (records.length >= 8) {
    const revCount240 = records.filter((r: any) => r.revelation !== null).length;
    const suspenseActive240 = records.some((r: any) => (r.suspenseDelta ?? 0) !== 0);
    const anyCuriosityRaised240 = records.some((r: any) => (r.curiosityDelta ?? 0) > 0);
    if (revCount240 >= 2 && suspenseActive240 && !anyCuriosityRaised240) {
      issues.push({
        location: 'Curiosity / revelation coupling',
        rule: 'REVELATION_WITHOUT_CURIOSITY',
        severity: 'minor',
        description: `The story delivers ${revCount240} witnessed revelations and actively moves suspense, but no scene ever raises curiosity — the audience is handed answers to questions it was never invited to ask. Revelations land as information delivery rather than earned discovery.`,
        suggestedFix: 'Before each major revelation, plant a curiosity hook: a question, an anomaly, a withheld detail that makes the audience want to know. A revelation is only satisfying if the audience was made to crave the answer first.',
      });
    }
  }

  // ── Wave 240: EMOTIONAL_WHIPLASH ──────────────────────────────────────────
  // Three consecutive scenes oscillate in emotional polarity (positive →
  // negative → positive, or the reverse) where neither flip is motivated by an
  // on-page causal event — no revelation, no planted clue, no clock raise, no
  // significant relationship shift in the two pivot scenes. The mood swings back
  // and forth with no cause, which reads as tonal randomness rather than a
  // dramatic arc. Distinct from EMOTIONAL_MONOTONY (three identical tones): this
  // catches uncaused oscillation, the opposite failure. Requires 5+ records.
  if (records.length >= 5) {
    const isCausalPivot240 = (r: any): boolean =>
      r.revelation !== null ||
      r.clockRaised === true ||
      (r.seededClueIds?.length ?? 0) > 0 ||
      (r.relationshipShifts ?? []).some((s: any) => Math.abs(s.amount) >= 0.3);
    for (let i = 2; i < records.length; i++) {
      const a240 = records[i - 2];
      const b240 = records[i - 1];
      const c240 = records[i];
      const oscillates240 =
        a240.emotionalShift !== 'neutral' &&
        b240.emotionalShift !== 'neutral' &&
        c240.emotionalShift !== 'neutral' &&
        a240.emotionalShift === c240.emotionalShift &&
        a240.emotionalShift !== b240.emotionalShift;
      if (oscillates240 && !isCausalPivot240(b240) && !isCausalPivot240(c240)) {
        issues.push({
          location: `Scenes ${i - 2}–${i}`,
          rule: 'EMOTIONAL_WHIPLASH',
          severity: 'minor',
          description: `Scenes ${i - 2}–${i} swing emotional polarity (${a240.emotionalShift}→${b240.emotionalShift}→${c240.emotionalShift}) but neither reversal is motivated by an on-page causal event — no revelation, clue, clock, or relationship shift drives the mood flips. The tone whiplashes without cause.`,
          suggestedFix: 'Anchor each emotional reversal to a concrete cause: a discovery that darkens the mood, a relationship repair that lifts it. Uncaused tonal swings read as inconsistency; motivated ones read as drama.',
        });
        break;
      }
    }
  }

  // ── Wave 254: CLUE_SEED_CLUSTER ───────────────────────────────────────────
  // A single scene plants three or more distinct clues at once. Each seeded clue
  // is a thread the audience is asked to hold; launching three or more in one
  // scene overloads working memory and dilutes every individual setup — none of
  // them registers as the one that matters. Distinct from SETUP_PAYOFF_IMBALANCE
  // (global seed/payoff ratio) and CHEKHOV_GUN_UNFIRED (unpaid seeds); this is a
  // local density spike — too many guns mounted on the wall in a single beat.
  // Requires 4+ records.
  if (records.length >= 4) {
    for (const r of records) {
      if ((r.seededClueIds?.length ?? 0) >= 3) {
        issues.push({
          location: `Scene ${r.sceneIdx} (${r.slug})`,
          rule: 'CLUE_SEED_CLUSTER',
          severity: 'minor',
          description: `Scene ${r.sceneIdx} plants ${r.seededClueIds!.length} distinct clues at once (${r.seededClueIds!.slice(0, 3).join(', ')}${r.seededClueIds!.length > 3 ? ', …' : ''}) — too many threads launched in a single beat. The audience can't tell which setup matters, and each one registers more faintly for being crowded.`,
          suggestedFix: 'Distribute the setups across several scenes so each clue lands with its own moment of attention. A clue planted alone is remembered; three planted together blur into background detail.',
        });
        break;
      }
    }
  }

  // ── Wave 254: PAYOFF_WITHOUT_SETUP ────────────────────────────────────────
  // A scene fires a payoff (payoffSetupId) whose referenced setup id was never
  // seeded in any earlier scene. The callback lands on nothing — the audience is
  // asked to recognise a thread that was never planted, so the "payoff" produces
  // no flash of recognition. Distinct from REVELATION_WITHOUT_SETUP (revelation-
  // keyed); this checks the explicit payoff→seed id linkage. Requires 4+ records.
  if (records.length >= 4) {
    let payoffOrphanFired254 = false;
    for (let i = 0; i < records.length && !payoffOrphanFired254; i++) {
      for (const pid of records[i].payoffSetupIds ?? []) {
        const seededBefore254 = records
          .slice(0, i)
          .some(prev => (prev.seededClueIds ?? []).includes(pid));
        if (!seededBefore254) {
          issues.push({
            location: `Scene ${i} (${records[i].slug})`,
            rule: 'PAYOFF_WITHOUT_SETUP',
            severity: 'major',
            description: `Scene ${i} fires a payoff for "${pid}" but that thread was never seeded in any earlier scene — the callback lands on nothing. A payoff only delivers its flash of recognition when the audience was first shown the seed.`,
            suggestedFix: `Plant "${pid}" earlier: add a setup scene in Act 1 or Act 2 that seeds the clue this payoff calls back to. A payoff without a prior setup is a punchline with no joke.`,
          });
          payoffOrphanFired254 = true;
          break;
        }
      }
    }
  }

  // ── Wave 254: SUSPENSE_PLATEAU_FLATLINE ───────────────────────────────────
  // Four or more consecutive scenes hold suspense essentially flat (|suspenseDelta|
  // ≤ 0.5). Tension neither rises nor falls for an extended stretch — the story
  // flatlines. Distinct from ACT2_CAUSAL_DESERT (no causal events of any kind) and
  // CONSEQUENCE_CHAIN_BREAK (two flat scenes after a peak); this fires on a
  // sustained run of tensionless scenes regardless of other causal activity.
  // Requires 8+ records.
  if (records.length >= 8) {
    let runStart254 = 0;
    let runLen254 = 0;
    for (let i = 0; i < records.length; i++) {
      if (Math.abs(records[i].suspenseDelta ?? 0) <= 0.5) {
        if (runLen254 === 0) runStart254 = i;
        runLen254++;
      } else {
        runLen254 = 0;
      }
      if (runLen254 >= 4) {
        issues.push({
          location: `Scenes ${runStart254}–${i}`,
          rule: 'SUSPENSE_PLATEAU_FLATLINE',
          severity: 'minor',
          description: `Scenes ${runStart254}–${i} hold suspense essentially flat (|delta| ≤ 0.5 for ${runLen254} consecutive scenes) — tension neither rises nor falls across the stretch. The story flatlines; the audience's sense of forward pressure goes slack.`,
          suggestedFix: 'Break the plateau with a deliberate move on the suspense curve: raise a clock, deliver a setback, or release built tension at a turning point. A flat tension line over four-plus scenes reads as the story idling.',
        });
        break;
      }
    }
  }

  // ── Wave 268: CURIOSITY_FRONT_LOADED ──────────────────────────────────────
  // Three or more strong curiosity spikes (curiosityDelta > 1) all appear in
  // the first half of the story; the second half raises no new questions.
  // The story exhausts its mystery-raising impulse early and coasts on answers
  // — but answers only satisfy if there are still open questions creating forward
  // pull. A second half with no curiosity spikes feels like a lecture on a topic
  // the audience already asked about.
  // Requires 8+ records and 3+ curiosity spikes.
  if (records.length >= 8) {
    const midpoint268 = Math.floor(records.length / 2);
    const curiousSpikes268 = records.filter((r: any) => (r.curiosityDelta ?? 0) > 1);
    if (curiousSpikes268.length >= 3) {
      const secondHalfSpikes268 = curiousSpikes268.filter((r: any) => r.sceneIdx >= midpoint268);
      if (secondHalfSpikes268.length === 0) {
        issues.push({
          location: `First half only (scenes 0–${midpoint268 - 1})`,
          rule: 'CURIOSITY_FRONT_LOADED',
          severity: 'minor',
          description: `All ${curiousSpikes268.length} curiosity spikes occur in the first half (scenes 0–${midpoint268 - 1}); the second half raises no new questions. The story front-loads its mystery and then pivots to pure resolution — but sustained reader curiosity requires open questions throughout, not just in the opening act.`,
          suggestedFix: 'Plant at least one new question or revelation-hook in the second half — a complication that raises a mystery just as earlier ones resolve. Curiosity sustains forward pull; exhausting it at the midpoint leaves the climax carrying only momentum, not genuine suspense.',
        });
      }
    }
  }

  // ── Wave 268: PAYOFF_BACK_LOADED ──────────────────────────────────────────
  // All scenes that fire a callback (payoffSetupIds not empty) appear in the
  // second half of the story; the first half plants setups but delivers no
  // earlier payoffs. Effective structure staggers payoffs — some minor callbacks
  // appear mid-story to reward patience and signal that setups matter. A story
  // that defers every payoff to the final act trains the audience to disengage
  // during setup because nothing they see pays off until the very end.
  // Requires 8+ records and 2+ payoff scenes.
  if (records.length >= 8) {
    const midpoint268b = Math.floor(records.length / 2);
    const payoffScenes268 = records.filter((r: any) => (r.payoffSetupIds?.length ?? 0) > 0);
    if (payoffScenes268.length >= 2) {
      const firstHalfPayoffs268 = payoffScenes268.filter((r: any) => r.sceneIdx < midpoint268b);
      if (firstHalfPayoffs268.length === 0) {
        const payoffIdxList268 = payoffScenes268.map((r: any) => r.sceneIdx).join(', ');
        issues.push({
          location: `Second half only (payoffs at scenes ${payoffIdxList268})`,
          rule: 'PAYOFF_BACK_LOADED',
          severity: 'minor',
          description: `All ${payoffScenes268.length} payoff scenes are in the second half (scenes ${payoffIdxList268}); the first half delivers no callbacks despite its setups. The audience is asked to hold every thread until the end — a story that never pays off anything before the final act trains readers to disengage during setup.`,
          suggestedFix: 'Allow at least one early payoff — a minor callback that confirms the setups are live. Staggered payoffs signal that no planted detail will be forgotten, keeping the audience alert through the middle acts.',
        });
      }
    }
  }

  // ── Wave 268: CLOCK_SINGLE_SCENE ──────────────────────────────────────────
  // In a story long enough to support layered pressure (8+ scenes), only one
  // scene raises a clock. A single deadline is a blunt instrument — it creates
  // one source of urgency that characters can simply wait out. Effective
  // thrillers and dramas layer multiple clocks so that every act generates its
  // own forward pressure. A story this long with a single clock either feels
  // underpressured or leans its entire urgency on one over-weighted moment.
  // Requires 8+ records.
  if (records.length >= 8) {
    const clockScenes268 = records.filter((r: any) => r.clockRaised === true);
    if (clockScenes268.length === 1) {
      issues.push({
        location: `Scene ${clockScenes268[0].sceneIdx} (${clockScenes268[0].slug}) — sole clock`,
        rule: 'CLOCK_SINGLE_SCENE',
        severity: 'minor',
        description: `Only one scene (Scene ${clockScenes268[0].sceneIdx}) raises a clock across a ${records.length}-scene story. A single deadline creates a single source of urgency that characters can wait out; once that scene passes, all clock pressure evaporates. A story this long benefits from layered deadlines — separate ticking clocks in different acts.`,
        suggestedFix: 'Add at least one more clock: a secondary deadline that begins where the first ends, or a nested ticking clock within a single act. Layered urgency keeps the story in forward motion even after the most immediate threat is resolved or defused.',
      });
    }
  }

  // ── Wave 282: Clock clustering, revelation cascade, emotional positive desert ──

  // CLOCK_CLUSTERING (minor, n≥8, ≥3 clocks): All raised clocks appear in the
  // first 40% of the story. The story front-loads all its urgency architecture;
  // the final 60% operates under no deadline pressure. Front-loaded clocks create
  // urgency that dissipates long before the climax — the audience forgets the
  // deadline by the time the resolution arrives. Distinct from CLOCK_SINGLE_SCENE
  // (only one clock total) and CLOCK_RAISED_WITHOUT_PAYOFF (no payoff at all).
  if (records.length >= 8) {
    const clockScenes282 = records.filter((r: any) => r.clockRaised === true);
    if (clockScenes282.length >= 3) {
      const cutoff282 = Math.floor(records.length * 0.4);
      const allEarly282 = clockScenes282.every((r: any) => r.sceneIdx < cutoff282);
      if (allEarly282) {
        issues.push({
          location: `Clock raises (all in first 40%, scenes 0–${cutoff282 - 1})`,
          rule: 'CLOCK_CLUSTERING',
          severity: 'minor',
          description: `All ${clockScenes282.length} clocks are raised in the first 40% of the story (scenes 0–${cutoff282 - 1}) — the deadline architecture is entirely front-loaded. The final 60% of the story carries no clock pressure; whatever urgency the deadlines created has dissipated long before the climax arrives.`,
          suggestedFix: 'Distribute clock raises across the full story: let one deadline resolve mid-story and a new, higher-stakes clock replace it. The climax should arrive under a ticking clock that was raised in Act 2, not one that was set and mostly forgotten in Act 1.',
        });
      }
    }
  }

  // REVELATION_CASCADE (minor, n≥8, ≥4 revelations, >35% of scenes): More than
  // a third of all scenes contain a witnessed revelation. When the story reveals
  // a new truth in more than every third scene, revelations lose their individual
  // impact — the audience becomes habituated to "another reveal" and stops feeling
  // the surprise each one was designed to deliver. Revelations need surrounding
  // space of non-revelation scenes for their shock to settle and consequences to
  // unfold. Distinct from REVELATION_CLUSTERING (three reveals in a 3-scene window):
  // this fires on global density regardless of distribution.
  if (records.length >= 8) {
    const revScenes282 = records.filter((r: any) => r.revelation !== null);
    if (revScenes282.length >= 4 && revScenes282.length / records.length > 0.35) {
      issues.push({
        location: 'Revelation density (global)',
        rule: 'REVELATION_CASCADE',
        severity: 'minor',
        description: `${revScenes282.length} of ${records.length} scenes (${Math.round(revScenes282.length / records.length * 100)}%) contain a witnessed revelation — the story delivers a new truth more than every third scene. Revelation saturation is as damaging as revelation starvation: when surprise is the default mode, the audience stops registering it as surprise.`,
        suggestedFix: 'Space revelations so each one has room to breathe: allow 3–4 non-revelation scenes between each major discovery. The intervening scenes should show characters absorbing and acting on what they learned, before the next truth arrives and resets the board.',
      });
    }
  }

  // EMOTIONAL_POSITIVE_DESERT (minor, n≥10, ≥4 Act 2 scenes): Act 2 (25%–75%)
  // contains no positive emotional shift while at least one positive shift exists
  // elsewhere in the story AND at least one negative shift exists in Act 2.
  // Drama requires contrast: an unbroken expanse of negative and neutral scenes
  // through the middle act denies the audience the light against which darkness
  // registers. A moment of hope, relief, or partial victory in Act 2 makes the
  // subsequent darkness more devastating — not less. Distinct from the voice pass's
  // TONAL_REGISTER_COLLAPSE_ACT2 (all Act 2 scenes share one tone): this fires
  // when Act 2 has tonal variety (negative + neutral) but positivity is absent.
  if (records.length >= 10) {
    const posDesertAct2Start282 = Math.floor(records.length * 0.25);
    const posDesertAct2End282 = Math.floor(records.length * 0.75);
    const act2PosRecs282 = records.slice(posDesertAct2Start282, posDesertAct2End282);
    if (act2PosRecs282.length >= 4) {
      const act2HasPositive282 = act2PosRecs282.some((r: any) => r.emotionalShift === 'positive');
      const act2HasNegative282 = act2PosRecs282.some((r: any) => r.emotionalShift === 'negative');
      const storyHasPositive282 = records.some((r: any) => r.emotionalShift === 'positive');
      if (!act2HasPositive282 && act2HasNegative282 && storyHasPositive282) {
        issues.push({
          location: `Act 2 (Scenes ${posDesertAct2Start282}–${posDesertAct2End282 - 1})`,
          rule: 'EMOTIONAL_POSITIVE_DESERT',
          severity: 'minor',
          description: `Act 2 (${act2PosRecs282.length} scenes) carries negative and neutral emotional shifts but no positive ones, while at least one scene elsewhere in the story offers a positive shift — the entire middle act has no moment of hope, relief, or partial triumph. An unbroken negative arc through Act 2 makes darkness the default state rather than a dramatic choice.`,
          suggestedFix: 'Plant a brief positive beat in Act 2: a false hope, a moment of connection, a small victory the story then subverts. Contrast is the mechanism by which darkness registers; even one positive scene among many negative ones transforms what follows from grimness into genuine tragedy.',
        });
      }
    }
  }

  // ── Wave 296: CLOCK_DELTA_WITHOUT_RAISE ──────────────────────────────────
  // A scene registers significant time pressure (clockDelta > 1) before any
  // clock has been raised anywhere in the story. The audience feels deadline
  // consequences for a deadline that was never established — a causal
  // inversion in the urgency layer. Distinct from CLOCK_GHOST (raise followed
  // by silence) and PAYOFF_WITHOUT_SETUP (clue-level inversion): this fires
  // on pressure effects preceding their cause. Requires 6+ records.
  if (records.length >= 6) {
    for (const r of records as any[]) {
      if (r.clockRaised) break; // a clock is established — later deltas are caused
      if ((r.clockDelta ?? 0) > 1) {
        issues.push({
          location: `Scene ${r.sceneIdx} (${r.slug})`,
          rule: 'CLOCK_DELTA_WITHOUT_RAISE',
          severity: 'minor',
          description: `Scene ${r.sceneIdx} registers significant time pressure (clockDelta ${r.clockDelta}) but no clock has been raised anywhere before it. The audience is asked to feel a deadline tightening before any deadline exists — urgency consequences arrive before their cause, and the pressure reads as unmotivated haste rather than a closing window.`,
          suggestedFix: 'Establish the clock before its pressure mounts: a scene where the deadline is set, the threat is announced, or the window is defined. Once the audience knows what time is running out on, every subsequent tightening lands as escalation rather than noise.',
        });
        break;
      }
    }
  }

  // ── Wave 296: SUSPENSE_SAWTOOTH ──────────────────────────────────────────
  // SuspenseDelta strictly alternates sign (positive/negative) for 6+
  // consecutive scenes. Tension rises and immediately discharges every
  // single scene — it oscillates without ever accumulating, so the story
  // never builds toward anything. Distinct from EMOTIONAL_WHIPLASH (which
  // tracks emotionalShift alternation) and UNEXPLAINED_SUSPENSE_DROP (a
  // single uncaused discharge): this fires on a sustained oscillation
  // pattern in the suspense curve itself. Requires 8+ records.
  if (records.length >= 8) {
    let sawRun296 = 1;
    let sawStart296 = 0;
    for (let i296 = 1; i296 < records.length; i296++) {
      const prev296 = (records as any[])[i296 - 1].suspenseDelta ?? 0;
      const cur296 = (records as any[])[i296].suspenseDelta ?? 0;
      if ((prev296 > 0 && cur296 < 0) || (prev296 < 0 && cur296 > 0)) {
        if (sawRun296 === 1) sawStart296 = i296 - 1;
        sawRun296++;
        if (sawRun296 >= 6) {
          issues.push({
            location: `Scenes ${(records as any[])[sawStart296].sceneIdx}–${(records as any[])[i296].sceneIdx} — suspense sawtooth`,
            rule: 'SUSPENSE_SAWTOOTH',
            severity: 'minor',
            description: `Suspense strictly alternates between rising and falling for ${sawRun296} consecutive scenes (${(records as any[])[sawStart296].sceneIdx}–${(records as any[])[i296].sceneIdx}). Tension discharges the moment it builds — every rise is immediately cancelled, so the story oscillates without accumulating toward anything. The audience learns that no tension will ever be sustained, and stops investing in the rises.`,
            suggestedFix: 'Let tension compound: after a suspense rise, hold or escalate it for at least one more scene before any release. Tension is a debt the story owes the audience — releasing it every scene means the debt never grows large enough for the payoff to matter.',
          });
          break;
        }
      } else {
        sawRun296 = 1;
      }
    }
  }

  // ── Wave 296: DRAMATIC_TURN_AFTERMATH_VOID ───────────────────────────────
  // A scene with a dramatic turn (dramaticTurn !== 'nothing') is followed by
  // two scenes with neutral emotional shift, no suspense rise, and no
  // relationship movement — the turn produces zero causal ripple. Distinct
  // from REVELATION_WITHOUT_REACTION (revelation-specific dialogue reaction)
  // and ACTION_WITHOUT_CONSEQUENCE (plot-level consequence): this audits the
  // immediate two-scene wake of any declared dramatic turn across emotional,
  // suspense, AND relational channels simultaneously. Requires 6+ records.
  if (records.length >= 6) {
    for (let i296b = 0; i296b < records.length - 2; i296b++) {
      const r296 = (records as any[])[i296b];
      if ((r296.dramaticTurn ?? 'nothing') === 'nothing') continue;
      const wake296 = (records as any[]).slice(i296b + 1, i296b + 3);
      const wakeInert296 = wake296.length === 2 && wake296.every((w: any) =>
        w.emotionalShift === 'neutral' &&
        (w.suspenseDelta ?? 0) <= 0 &&
        ((w.relationshipShifts ?? []) as any[]).length === 0,
      );
      if (wakeInert296) {
        issues.push({
          location: `Scene ${r296.sceneIdx} (dramatic turn: ${r296.dramaticTurn})`,
          rule: 'DRAMATIC_TURN_AFTERMATH_VOID',
          severity: 'minor',
          description: `Scene ${r296.sceneIdx} delivers a dramatic turn ("${r296.dramaticTurn}") but the next two scenes are causally inert — neutral emotion, no suspense rise, no relationship movement. A turn that changes nothing downstream is a turn in name only; the story declares a pivot and then proceeds as if it never happened.`,
          suggestedFix: 'Let the turn ripple: the scenes immediately after a reversal or revelation should show characters adjusting — an emotional shift, a relationship strained or realigned, suspense climbing as the new situation sinks in. The size of a turn is measured by its wake, not its announcement.',
        });
        break;
      }
    }
  }

  // ── Wave 310: EMOTION_WITHOUT_DRIVER_RUN ─────────────────────────────────
  // Three or more consecutive scenes carry a non-neutral emotional shift, yet
  // none of them contains any mechanical driver — no suspense rise, no
  // relationship movement, no revelation, no clock raised. The emotional curve
  // swings with nothing on the page to cause it. Distinct from REACTION_WITHOUT_
  // CAUSE (per-scene, audits the prior scene for a cause) and EMOTIONAL_WHIPLASH
  // (sign alternation): this flags a sustained run of driverless feeling.
  // Requires 8+ records.
  if (records.length >= 8) {
    const hasDriver310 = (r: any) =>
      (r.suspenseDelta ?? 0) > 0 ||
      ((r.relationshipShifts ?? []) as any[]).length > 0 ||
      r.revelation !== null ||
      r.clockRaised === true;
    let run310 = 0;
    let start310 = 0;
    for (let i310 = 0; i310 < records.length; i310++) {
      const r310: any = records[i310];
      if (r310.emotionalShift !== 'neutral' && !hasDriver310(r310)) {
        if (run310 === 0) start310 = i310;
        run310++;
        if (run310 >= 3) {
          issues.push({
            location: `Scenes ${(records as any[])[start310].sceneIdx}–${r310.sceneIdx} — driverless emotion`,
            rule: 'EMOTION_WITHOUT_DRIVER_RUN',
            severity: 'minor',
            description: `${run310} consecutive scenes (${(records as any[])[start310].sceneIdx}–${r310.sceneIdx}) carry a non-neutral emotional shift but none contains any driver — no suspense rise, no relationship movement, no revelation, no clock raised. The emotional curve swings with nothing on the page to cause it; the feelings are asserted rather than earned.`,
            suggestedFix: 'Give each emotional beat a visible cause: a piece of news, a confrontation, a deadline tightening, a relationship turning. Emotion is the audience\'s reading of consequence — when the consequence is missing, the feeling reads as the script telling them how to feel.',
          });
          break;
        }
      } else {
        run310 = 0;
      }
    }
  }

  // ── Wave 310: CLOCK_RELIEF_UNEXPLAINED ───────────────────────────────────
  // A scene's clock pressure drops (clockDelta < 0) with no revelation and no
  // payoff in that scene or the next — a deadline relaxes for no visible reason.
  // The ticking clock is the audience's tension contract; releasing it without
  // a cause (the bomb defused, the truth found, the deadline met) breaks that
  // contract silently. Distinct from CLOCK_GHOST (a raise that fades) and
  // CLOCK_DELTA_WITHOUT_RAISE (pressure before a clock exists): this flags an
  // uncaused release of established pressure. Requires 6+ records.
  if (records.length >= 6) {
    for (let i310b = 0; i310b < records.length; i310b++) {
      const r310b: any = records[i310b];
      if ((r310b.clockDelta ?? 0) < 0) {
        const window310 = [r310b, (records as any[])[i310b + 1]].filter(Boolean);
        const caused310 = window310.some(w =>
          w.revelation !== null || ((w.payoffSetupIds ?? []) as any[]).length > 0,
        );
        if (!caused310) {
          issues.push({
            location: `Scene ${r310b.sceneIdx} (clock relief)`,
            rule: 'CLOCK_RELIEF_UNEXPLAINED',
            severity: 'minor',
            description: `Scene ${r310b.sceneIdx} releases clock pressure (clockDelta ${r310b.clockDelta}) with no revelation or payoff in that scene or the next — the deadline relaxes for no visible reason. A ticking clock is a tension contract with the audience; relieving it without a cause (the bomb defused, the deadline met, the truth found) breaks the contract silently and lets the air out of the scene.`,
            suggestedFix: 'Tie every drop in time pressure to a concrete cause: the protagonist resolves the threat, buys time through a choice, or discovers the deadline was false. If the clock should stay live, do not relax it — sustained pressure is the point of raising it in the first place.',
          });
          break;
        }
      }
    }
  }

  // ── Wave 310: DRAMATIC_TURN_CLUSTER ──────────────────────────────────────
  // Three or more dramatic turns fall within a three-scene window. Reversals
  // and revelations piled this tightly give the audience no time to register
  // one pivot before the next overwrites it — the turns cannibalize each
  // other's impact. The dramatic-turn analogue of REVELATION_CASCADE (which
  // counts revelation density) and distinct from DRAMATIC_TURN_AFTERMATH_VOID
  // (a single turn with an inert wake). Requires 6+ records.
  if (records.length >= 6) {
    for (let i310c = 0; i310c + 2 < records.length; i310c++) {
      const window310c = (records as any[]).slice(i310c, i310c + 3);
      const turnCount310 = window310c.filter(r => (r.dramaticTurn ?? 'nothing') !== 'nothing').length;
      if (turnCount310 >= 3) {
        issues.push({
          location: `Scenes ${window310c[0].sceneIdx}–${window310c[2].sceneIdx} — turn cluster`,
          rule: 'DRAMATIC_TURN_CLUSTER',
          severity: 'minor',
          description: `Scenes ${window310c[0].sceneIdx}–${window310c[2].sceneIdx} contain ${turnCount310} dramatic turns in a row — reversals and revelations piled into a three-scene window. The audience gets no time to register one pivot before the next overwrites it, and the turns cannibalize each other's impact instead of compounding it.`,
          suggestedFix: 'Space the turns out. Let each reversal land and ripple — give the characters (and the audience) a scene to absorb and react before the next pivot. Bank some of the clustered turns for later acts where the story needs a fresh jolt.',
        });
        break;
      }
    }
  }

  // ── Wave 324: SUSPENSE_UNRELEASED_RUN, CLOCK_RAISED_NO_DELTA, EMOTIONAL_NEUTRAL_RUN ──

  // SUSPENSE_UNRELEASED_RUN (minor, n≥8): Six or more consecutive scenes each
  // carry a positive suspenseDelta — tension only ever builds and is never
  // discharged across a long stretch. A story needs release valleys: sustained
  // un-relieved rising tension exhausts the audience and leaves no room to
  // escalate further when the climax arrives. Distinct from ESCALATION_PLATEAU
  // (peak-height comparison), SUSPENSE_SAWTOOTH (strict sign alternation), and
  // SUSPENSE_PLATEAU_FLATLINE (a flat, near-zero run).
  if (records.length >= 8) {
    let srun324 = 0;
    let sstart324 = 0;
    for (let i324 = 0; i324 < records.length; i324++) {
      if (((records as any[])[i324].suspenseDelta ?? 0) > 0) {
        if (srun324 === 0) sstart324 = i324;
        srun324++;
        if (srun324 >= 6) {
          issues.push({
            location: `Scenes ${(records as any[])[sstart324].sceneIdx}–${(records as any[])[i324].sceneIdx} — unreleased tension`,
            rule: 'SUSPENSE_UNRELEASED_RUN',
            severity: 'minor',
            description: `${srun324} consecutive scenes (${(records as any[])[sstart324].sceneIdx}–${(records as any[])[i324].sceneIdx}) each raise suspense with no release in between — tension only ever builds across the whole stretch. Sustained un-relieved rising tension exhausts the audience: without valleys, there is no contrast to make the peaks feel high, and the climax has no headroom left to escalate into.`,
            suggestedFix: 'Carve a release valley into the run: a scene where the immediate threat eases, a small win, a quiet beat that lets the audience exhale. Tension reads as high only against relief; a relief beat now lets the climax spike higher later.',
          });
          break;
        }
      } else {
        srun324 = 0;
      }
    }
  }

  // CLOCK_RAISED_NO_DELTA (minor, n≥6, ≥2 scenes): Two or more scenes set
  // clockRaised === true but carry clockDelta === 0 — a deadline is announced
  // without any measurable change in time pressure. The clock is raised
  // cosmetically: the story says "time is running out" but the pressure gauge
  // never moves. Distinct from CLOCK_DELTA_WITHOUT_RAISE (the inverse — pressure
  // effects with no clock established) and CLOCK_GHOST (a raise that later fades).
  if (records.length >= 6) {
    const noDeltaClocks324 = (records as any[]).filter(r => r.clockRaised === true && (r.clockDelta ?? 0) === 0);
    if (noDeltaClocks324.length >= 2) {
      issues.push({
        location: `${noDeltaClocks324.length} clock-raise scene(s) with no delta`,
        rule: 'CLOCK_RAISED_NO_DELTA',
        severity: 'minor',
        description: `${noDeltaClocks324.length} scenes raise a clock (clockRaised) but carry clockDelta 0 — a deadline is announced with no measurable change in time pressure. The clock is raised cosmetically: the script says "time is running out" while the pressure gauge never moves, so the announced urgency has no mechanical force behind it.`,
        suggestedFix: 'Give every clock raise a real delta: when a deadline is introduced or tightened, the time pressure should measurably increase. If a scene only references an existing clock without changing it, do not flag it as a raise — reserve clockRaised for moments that genuinely move the deadline.',
      });
    }
  }

  // EMOTIONAL_NEUTRAL_RUN (minor, n≥10): Six or more consecutive scenes are all
  // emotionally neutral — the emotional curve flatlines for a long stretch. The
  // audience reads emotion as their stake in the story; a long neutral run is
  // dead air where they have nothing to feel. Distinct from EMOTIONAL_MONOTONY
  // (three consecutive IDENTICAL non-neutral shifts) and EMOTION_WITHOUT_DRIVER_
  // RUN (non-neutral shifts lacking a cause): this flags sustained absence of
  // any emotional movement at all.
  if (records.length >= 10) {
    let erun324 = 0;
    let estart324 = 0;
    for (let i324e = 0; i324e < records.length; i324e++) {
      if ((records as any[])[i324e].emotionalShift === 'neutral') {
        if (erun324 === 0) estart324 = i324e;
        erun324++;
        if (erun324 >= 6) {
          issues.push({
            location: `Scenes ${(records as any[])[estart324].sceneIdx}–${(records as any[])[i324e].sceneIdx} — emotional flatline`,
            rule: 'EMOTIONAL_NEUTRAL_RUN',
            severity: 'minor',
            description: `${erun324} consecutive scenes (${(records as any[])[estart324].sceneIdx}–${(records as any[])[i324e].sceneIdx}) are all emotionally neutral — the emotional curve flatlines for a long stretch. The audience reads emotional movement as their stake in the story; a sustained neutral run is dead air where they are given nothing to feel, and disengagement sets in regardless of how active the plot is.`,
            suggestedFix: 'Inject emotional movement into the flat stretch: a small loss, an unexpected kindness, a flare of fear or hope. Plot events should leave emotional residue on the characters; if a run of scenes moves the plot but stirs no feeling, the audience is watching machinery, not people.',
          });
          break;
        }
      } else {
        erun324 = 0;
      }
    }
  }

  // ── Wave 335: PAYOFF_CURIOSITY_DECOUPLED, DRAMATIC_TURN_CURIOSITY_VOID, CLUE_SEED_SUSPENSE_VOID ──

  // PAYOFF_CURIOSITY_DECOUPLED (minor, n≥8, ≥3 payoff scenes): Scenes that pay off a
  // planted thread (payoffSetupIds non-empty) have an average curiosityDelta of zero or
  // less — resolutions close one question without opening another. Good payoffs are
  // bittersweet: they resolve the setup but spawn new uncertainties that keep the
  // audience hooked. If every payoff lands flat or even suppresses curiosity, the story
  // feels like a ledger being cleared rather than a living system. Distinct from
  // PAYOFF_BACK_LOADED (timing of payoffs), PAYOFF_WITHOUT_SETUP (missing prior seed),
  // CURIOSITY_OPEN_LOOP (unresolved mystery loops), and CURIOSITY_FRONT_LOADED (timing).
  if (records.length >= 8) {
    const payoffScenes335 = (records as any[]).filter(r => Array.isArray(r.payoffSetupIds) && r.payoffSetupIds.length > 0);
    if (payoffScenes335.length >= 3) {
      const avgCuriosity335p = payoffScenes335.reduce((s: number, r: any) => s + (r.curiosityDelta ?? 0), 0) / payoffScenes335.length;
      if (avgCuriosity335p <= 0) {
        issues.push({
          location: `${payoffScenes335.length} payoff scene(s) — avg curiosityDelta ${avgCuriosity335p.toFixed(2)}`,
          rule: 'PAYOFF_CURIOSITY_DECOUPLED',
          severity: 'minor',
          description: `${payoffScenes335.length} payoff scenes (scenes that resolve planted threads) have an average curiosityDelta of ${avgCuriosity335p.toFixed(2)} — resolutions consistently close questions without opening new ones. Effective payoffs are generative: answering the setup question should reveal a new layer of uncertainty that propels the audience forward. When every resolution leaves curiosity flat or negative, the story's momentum stalls each time a thread closes.`,
          suggestedFix: "Design payoffs to be revelatory rather than merely conclusive: the answer to one question should expose a deeper question, a new complication, or an unexpected implication. Each resolved thread can become the root of a new one — let the payoff scene's curiosityDelta reflect that the audience's hunger has been redirected, not satisfied.",
        });
      }
    }
  }

  // DRAMATIC_TURN_CURIOSITY_VOID (minor, n≥10, ≥3 dramatic turn scenes): Scenes with a
  // genuine dramaticTurn (reversal, recognition, or twist — not 'nothing') have an
  // average curiosityDelta of zero or less — pivots and reversals that don't ignite
  // audience wonder. A twist should make the audience ask "what does this mean now?" and
  // "what happens next?"; if the story changes direction but the audience's curiosity
  // doesn't rise, the turn has mechanical form but no narrative electricity. Distinct from
  // DRAMATIC_TURN_AFTERMATH_VOID (checks emptiness of the 2 scenes after a reversal),
  // DRAMATIC_TURN_CLUSTER (too many turns in a tight window), and CAUSAL_MIDPOINT_VOID
  // (causal absence at the midpoint specifically).
  if (records.length >= 10) {
    const turnScenes335 = (records as any[]).filter(r => r.dramaticTurn && r.dramaticTurn !== 'nothing');
    if (turnScenes335.length >= 3) {
      const avgCuriosity335t = turnScenes335.reduce((s: number, r: any) => s + (r.curiosityDelta ?? 0), 0) / turnScenes335.length;
      if (avgCuriosity335t <= 0) {
        issues.push({
          location: `${turnScenes335.length} dramatic turn scene(s) — avg curiosityDelta ${avgCuriosity335t.toFixed(2)}`,
          rule: 'DRAMATIC_TURN_CURIOSITY_VOID',
          severity: 'minor',
          description: `${turnScenes335.length} scenes contain a genuine dramatic turn (reversal, recognition, or twist) but have an average curiosityDelta of ${avgCuriosity335t.toFixed(2)} — the story's pivots fail to ignite audience curiosity. A twist should leave the audience hungry: "what does this mean now?", "what will they do?", "where does this go?" If reversals consistently fail to raise curiosity, the turns are mechanical shape-changes with no narrative electricity — the audience can see the gears, but they feel nothing.`,
          suggestedFix: 'Make each dramatic turn productive: the reversal should open questions it cannot immediately answer. A recognition scene exposes a new unknown; a twist reframes everything in a way that generates fresh uncertainty. Let the curiosityDelta on turn scenes reflect that the audience has been sent leaning forward, not just informed that the situation has changed.',
        });
      }
    }
  }

  // CLUE_SEED_SUSPENSE_VOID (minor, n≥8, ≥3 clue-seeding scenes): Scenes that plant
  // story clues (seededClueIds non-empty) have an average suspenseDelta of zero or less —
  // foreshadowing that carries no foreboding. When a clue is seeded, the audience should
  // sense that something is being set in motion — a quiet dread, a ticking implication.
  // If clue-planting scenes are suspense-neutral or negative, the planted clues feel
  // cosmetic: the writer is leaving breadcrumbs, but the audience has no reason to feel
  // the weight of them. Distinct from CLUE_SEED_CLUSTER (all seeds concentrated in one
  // scene), CHEKHOV_GUN_UNFIRED (seeds that are never paid off), and
  // REVELATION_WITHOUT_SETUP (revelations that lack prior seeds).
  if (records.length >= 8) {
    const seedScenes335 = (records as any[]).filter(r => Array.isArray(r.seededClueIds) && r.seededClueIds.length > 0);
    if (seedScenes335.length >= 3) {
      const avgSuspense335s = seedScenes335.reduce((s: number, r: any) => s + (r.suspenseDelta ?? 0), 0) / seedScenes335.length;
      if (avgSuspense335s <= 0) {
        issues.push({
          location: `${seedScenes335.length} clue-seeding scene(s) — avg suspenseDelta ${avgSuspense335s.toFixed(2)}`,
          rule: 'CLUE_SEED_SUSPENSE_VOID',
          severity: 'minor',
          description: `${seedScenes335.length} scenes plant story clues but have an average suspenseDelta of ${avgSuspense335s.toFixed(2)} — foreshadowing without foreboding. A seeded clue should carry weight: the audience should sense that something is being set in motion, even if they cannot name it yet. When clue-planting scenes are suspense-flat or suspense-negative, the foreshadowing is cosmetic — breadcrumbs with no dread attached, so the eventual payoff lands without the accumulated pressure that should make it resonate.`,
          suggestedFix: 'Let each clue carry its own shadow: the scene that plants the seed should also tighten something — a glance held too long, an object that feels wrong, a line that could mean two things. Suspense need not be overt; a mild positive suspenseDelta on each seed scene signals that the audience has felt the implications, even subliminally, before the payoff arrives.',
        });
      }
    }
  }

  // ── Wave 349: CLOCK_RAISED_NO_EMOTION, DRAMATIC_TURN_NO_SUSPENSE, SUSPENSE_SPIKE_NO_FALLOUT ──

  // CLOCK_RAISED_NO_EMOTION (minor, n≥6, ≥2 clock-raise scenes): Every scene that
  // raises a clock (clockRaised === true) is emotionally neutral — deadlines are
  // announced but generate no felt pressure. A ticking clock is an emotional device:
  // it should produce dread, urgency, or desperate resolve. When every clock-raise lands
  // in an affectless scene, the deadline is a plot mechanic the characters note rather
  // than feel, and the audience registers the countdown without anxiety. Distinct from
  // CLOCK_RAISED_NO_DELTA (no measurable change in time pressure), CLOCK_RAISED_WITHOUT_
  // PAYOFF (no downstream payoff), and CLOCK_RELIEF_UNEXPLAINED (uncaused release).
  if (records.length >= 6) {
    const clockScenes349 = (records as any[]).filter(r => r.clockRaised === true);
    if (clockScenes349.length >= 2 && clockScenes349.every(r => r.emotionalShift === 'neutral')) {
      issues.push({
        location: `${clockScenes349.length} clock-raise scene(s) — emotional register`,
        rule: 'CLOCK_RAISED_NO_EMOTION',
        severity: 'minor',
        description: `All ${clockScenes349.length} scenes that raise a clock are emotionally neutral — deadlines are announced but generate no felt pressure. A ticking clock is an emotional device: it should produce dread, urgency, or desperate resolve in the people racing it. When every clock-raise lands in an affectless scene, the countdown is a plot mechanic the characters note rather than feel, and the audience watches the timer without anxiety.`,
        suggestedFix: 'Let each deadline land emotionally: the moment the clock tightens, show what it costs the characters to feel it — the spike of fear, the grim acceptance, the panic that forces a bad choice. A clock the characters dread is a clock the audience dreads; a clock nobody feels is just a number.',
      });
    }
  }

  // DRAMATIC_TURN_NO_SUSPENSE (minor, n≥10, ≥3 turn scenes): Scenes carrying a genuine
  // dramatic turn (dramaticTurn !== 'nothing') have an average suspenseDelta of zero or
  // less — the story's pivots generate no tension. A reversal or recognition should
  // tighten the screw: the moment the situation flips is the moment the audience should
  // feel the most uncertain about what happens next. When turns are consistently
  // tension-flat, they read as administrative plot changes rather than dangerous pivots.
  // The suspense analogue of DRAMATIC_TURN_CURIOSITY_VOID (Wave 335, curiosity channel);
  // distinct from DRAMATIC_TURN_AFTERMATH_VOID (downstream ripple) and DRAMATIC_TURN_
  // CLUSTER (timing).
  if (records.length >= 10) {
    const turnScenes349 = (records as any[]).filter(r => (r.dramaticTurn ?? 'nothing') !== 'nothing');
    if (turnScenes349.length >= 3) {
      const avgSusp349 = turnScenes349.reduce((s: number, r: any) => s + (r.suspenseDelta ?? 0), 0) / turnScenes349.length;
      if (avgSusp349 <= 0) {
        issues.push({
          location: `${turnScenes349.length} dramatic-turn scene(s) — avg suspenseDelta ${avgSusp349.toFixed(2)}`,
          rule: 'DRAMATIC_TURN_NO_SUSPENSE',
          severity: 'minor',
          description: `The ${turnScenes349.length} dramatic-turn scenes (reversals, recognitions, twists) have an average suspenseDelta of ${avgSusp349.toFixed(2)} — the story's pivots generate no tension. A turn is where the situation flips, and that flip should be the most uncertain moment in its stretch: the audience should not know what happens next. When turns land tension-flat, they read as administrative plot changes rather than dangerous pivots that threaten the protagonist.`,
          suggestedFix: 'Make each turn dangerous: the reversal should raise the stakes and the uncertainty at once — a new threat exposed, an advantage lost, a deadline tightened by the twist. A pivot that does not raise suspense is a change the audience is informed of rather than gripped by.',
        });
      }
    }
  }

  // SUSPENSE_SPIKE_NO_FALLOUT (minor, n≥8, ≥2 spikes): Two or more scenes spike suspense
  // (suspenseDelta > 1.5) and not one of them is followed, within the next two scenes, by
  // any consequence — no emotional shift, no relationship shift, no revelation, no dramatic
  // turn. Tension is raised and then absorbed without effect: the spike is a dead end
  // rather than the cause of something. Suspense is a promise of consequence; a spike that
  // changes nothing downstream teaches the audience that the story's alarms are false.
  // Distinct from SUSPENSE_SPIKE_NO_CAUSE (the upstream gap — a spike with no escalation
  // before it), DRAMATIC_TURN_AFTERMATH_VOID (triggered by a reversal, not a suspense
  // spike), and REVELATION_WITHOUT_REACTION (triggered by a revelation).
  if (records.length >= 8) {
    const n349 = records.length;
    const hasFallout349 = (idx: number): boolean => {
      for (let k349 = idx + 1; k349 <= Math.min(idx + 2, n349 - 1); k349++) {
        const r = (records as any[])[k349];
        if ((r.emotionalShift ?? 'neutral') !== 'neutral') return true;
        if (((r.relationshipShifts ?? []) as any[]).length > 0) return true;
        if (r.revelation !== null && r.revelation !== undefined) return true;
        if ((r.dramaticTurn ?? 'nothing') !== 'nothing') return true;
      }
      return false;
    };
    const spikes349 = (records as any[]).filter(r => (r.suspenseDelta ?? 0) > 1.5);
    if (spikes349.length >= 2 && !spikes349.some(s => hasFallout349((records as any[]).indexOf(s)))) {
      issues.push({
        location: `${spikes349.length} suspense spike(s) — no downstream fallout`,
        rule: 'SUSPENSE_SPIKE_NO_FALLOUT',
        severity: 'minor',
        description: `${spikes349.length} scenes spike suspense (suspenseDelta > 1.5) but none is followed within two scenes by any consequence — no emotional shift, no relationship move, no revelation, no dramatic turn. Tension is raised and then absorbed without effect, so each spike is a dead end rather than the cause of something. Suspense is a promise of consequence; spikes that change nothing downstream teach the audience that the story's alarms are false.`,
        suggestedFix: 'Let each suspense spike detonate: the scenes right after a tension peak should carry its fallout — a relationship fractured by the crisis, a truth forced into the open, an emotional wound, a reversal. If a spike leads to nothing, either pay it off downstream or cut it; tension that never delivers trains the audience to stop feeling it.',
      });
    }
  }

  // ── Wave 363: PAYOFF_NO_EMOTION, SEED_SCENE_CURIOSITY_VOID, CLOCK_RAISE_CURIOSITY_VOID ──

  // PAYOFF_NO_EMOTION (minor, n≥8, ≥2 payoff scenes): Every scene carrying a
  // payoff (payoffSetupIds non-empty) is emotionally neutral — planted threads
  // resolve without anyone feeling the resolution. A payoff is the completion of a
  // story promise; when every completion lands in an affectless scene, the resolution
  // is informational rather than dramatic: the audience learns the thread is closed
  // without feeling what the closure cost or gave. Distinct from PAYOFF_CURIOSITY_
  // DECOUPLED (curiosityDelta channel) and PAYOFF_BACK_LOADED (timing, not emotional
  // content).
  if (records.length >= 8) {
    const payoffScenes363 = (records as any[]).filter(r =>
      ((r.payoffSetupIds ?? []) as any[]).length > 0,
    );
    if (payoffScenes363.length >= 2 && payoffScenes363.every(r => r.emotionalShift === 'neutral')) {
      issues.push({
        location: `${payoffScenes363.length} payoff scene(s) — emotional register`,
        rule: 'PAYOFF_NO_EMOTION',
        severity: 'minor',
        description: `All ${payoffScenes363.length} scenes where a planted thread resolves are emotionally neutral — the closures are informational rather than dramatic. A payoff completes a promise to the audience; when every completion lands in an affectless scene, the audience learns the thread is closed without feeling what that closure cost or gave them. Resolution without emotion is accounting, not catharsis.`,
        suggestedFix: 'Let each payoff land emotionally: when a thread resolves, the character should feel the weight of its closing — relief, grief, triumph, regret. A payoff scene that generates no emotional charge suggests either the setup was too distant to still matter or the resolution was handled too quickly to feel. Make the completion cost or reward someone.',
      });
    }
  }

  // SEED_SCENE_CURIOSITY_VOID (minor, n≥8, ≥3 seed scenes): Scenes that plant
  // clues (seededClueIds non-empty) average a curiosityDelta of zero or less. The
  // story's foreshadowing engine is firing but never opening questions in the
  // audience. When clues are planted in curiosity-flat scenes, the seeds are
  // invisible to the audience — they receive information they might need later
  // without wondering what it means. Distinct from CLUE_SEED_SUSPENSE_VOID (the
  // suspense channel) and PAYOFF_CURIOSITY_DECOUPLED (payoff scenes, not seed scenes).
  if (records.length >= 8) {
    const seedScenes363 = (records as any[]).filter(r =>
      ((r.seededClueIds ?? []) as any[]).length > 0,
    );
    if (seedScenes363.length >= 3) {
      const avgSeedCuriosity363 = seedScenes363.reduce((s: number, r: any) => s + (r.curiosityDelta ?? 0), 0) / seedScenes363.length;
      if (avgSeedCuriosity363 <= 0) {
        issues.push({
          location: `${seedScenes363.length} seed scene(s) — curiosity register`,
          rule: 'SEED_SCENE_CURIOSITY_VOID',
          severity: 'minor',
          description: `${seedScenes363.length} scenes that plant clues (seededClueIds) average a curiosityDelta of ${avgSeedCuriosity363.toFixed(2)} — the foreshadowing engine is running but never opening questions. When clues are planted in curiosity-flat scenes, the seeds are invisible: the audience receives information without wondering what it means, so the clue sits inert until the payoff rather than building anticipation across the intervening scenes.`,
          suggestedFix: 'Make each clue plant raise a question: the detail seeded should feel strange, incomplete, or significant enough that the audience wants to know what it means. A clue that sparks curiosity when planted makes its payoff satisfying; a clue planted in a curiosity-flat scene arrives as data and pays off as more data.',
        });
      }
    }
  }

  // CLOCK_RAISE_CURIOSITY_VOID (minor, n≥8, ≥2 clock scenes): Scenes that raise
  // the clock (clockRaised === true) average a curiosityDelta of zero or less.
  // Deadlines generate dread but not the wondering urgency of "how can they possibly
  // escape?" — the clock creates pressure but closes off questions rather than opening
  // them. The most effective urgency combines fear and wonder: the audience should
  // feel time running out AND be urgently curious whether the protagonist can solve
  // the problem in time. Distinct from CLOCK_RAISED_NO_EMOTION (emotionalShift
  // channel) and CLOCK_RAISED_NO_DELTA (cosmetic deadlines with no pressure increase).
  if (records.length >= 8) {
    const clockScenes363 = (records as any[]).filter(r => r.clockRaised === true);
    if (clockScenes363.length >= 2) {
      const avgClockCuriosity363 = clockScenes363.reduce((s: number, r: any) => s + (r.curiosityDelta ?? 0), 0) / clockScenes363.length;
      if (avgClockCuriosity363 <= 0) {
        issues.push({
          location: `${clockScenes363.length} clock-raise scene(s) — curiosity register`,
          rule: 'CLOCK_RAISE_CURIOSITY_VOID',
          severity: 'minor',
          description: `${clockScenes363.length} clock-raise scenes average a curiosityDelta of ${avgClockCuriosity363.toFixed(2)} — deadlines create pressure but never make the audience wonder how the protagonist escapes. Effective urgency combines dread and curiosity: a clock should make the audience feel time running out AND urgently want to know whether there is a way out. When deadlines average negative curiosity, the clock closes off possibility rather than opening the question of survival.`,
          suggestedFix: 'Let each deadline raise a question alongside the pressure: a clock tightened should make the audience wonder "how?" not just fear "what if they fail?" Pair each deadline with an obstacle that is interesting rather than just crushing — the countdown is unbearable when the audience is urgently curious whether the protagonist can thread the needle.',
        });
      }
    }
  }

  // ── Wave 377: DRAMATIC_TURN_NO_EMOTION, CLOCK_RAISE_NO_SUSPENSE, SUSPENSE_SPIKE_NO_CURIOSITY ──

  // DRAMATIC_TURN_NO_EMOTION (minor, n≥8, ≥3 turn scenes): Every scene carrying a
  // dramatic turn (dramaticTurn !== 'nothing') is emotionally neutral — the story's pivots
  // move no one. A reversal or recognition should land as a felt event: shock, grief, hope,
  // dread. When every turn is affectless, the plot changes direction while the protagonist
  // registers nothing, so the audience processes the pivot as information rather than
  // experiencing it. Completes the dramatic-turn channel set with DRAMATIC_TURN_NO_SUSPENSE
  // and DRAMATIC_TURN_CURIOSITY_VOID; distinct from DRAMATIC_TURN_AFTERMATH_VOID (downstream
  // ripple) and EMOTIONAL_NEUTRAL_RUN (consecutive neutral scenes).
  if (records.length >= 8) {
    const turnScenes377 = (records as any[]).filter(r => (r.dramaticTurn ?? 'nothing') !== 'nothing');
    if (turnScenes377.length >= 3 && turnScenes377.every(r => r.emotionalShift === 'neutral')) {
      issues.push({
        location: `${turnScenes377.length} dramatic-turn scene(s) — emotional register`,
        rule: 'DRAMATIC_TURN_NO_EMOTION',
        severity: 'minor',
        description: `All ${turnScenes377.length} dramatic-turn scenes (reversals, recognitions, twists) are emotionally neutral — the story's pivots move no one. A turn is where the situation flips, and the flip should land as a felt event: shock, grief, hope, dread. When every pivot is affectless, the plot changes direction while the protagonist registers nothing, so the audience processes each turn as information rather than experiencing it as drama.`,
        suggestedFix: 'Let each dramatic turn land emotionally: the reversal that wounds, the recognition that devastates or elates. A pivot the protagonist feels is a pivot the audience feels; one that leaves them neutral is a plot mechanic the story reports rather than a turn it dramatizes.',
      });
    }
  }

  // CLOCK_RAISE_NO_SUSPENSE (minor, n≥8, ≥2 clock scenes): Scenes that raise a clock
  // (clockRaised === true) average a suspenseDelta of zero or less — deadlines generate no
  // tension. A ticking clock exists to tighten the screw; when raising it produces no
  // measurable suspense, the deadline is a label rather than a pressure. Completes the
  // clock-raise channel set with CLOCK_RAISED_NO_EMOTION and CLOCK_RAISE_CURIOSITY_VOID;
  // distinct from CLOCK_RAISED_NO_DELTA (no change in time pressure) and SUSPENSE checks
  // not keyed to the clockRaised field.
  if (records.length >= 8) {
    const clockScenes377 = (records as any[]).filter(r => r.clockRaised === true);
    if (clockScenes377.length >= 2) {
      const avgSusp377 = clockScenes377.reduce((s: number, r: any) => s + (r.suspenseDelta ?? 0), 0) / clockScenes377.length;
      if (avgSusp377 <= 0) {
        issues.push({
          location: `${clockScenes377.length} clock-raise scene(s) — suspense register`,
          rule: 'CLOCK_RAISE_NO_SUSPENSE',
          severity: 'minor',
          description: `The ${clockScenes377.length} clock-raise scenes average a suspenseDelta of ${avgSusp377.toFixed(2)} — deadlines generate no tension. A ticking clock exists to tighten the screw; when raising it produces no measurable suspense, the deadline is a label the story announces rather than a pressure the audience feels. The countdown is stated but never bites.`,
          suggestedFix: 'Make each deadline raise the tension: the moment the clock tightens should narrow the protagonist\'s options and sharpen the danger of failing. A clock that does not raise suspense is a number on a wall; one that does is the engine driving the audience to the edge of their seat.',
        });
      }
    }
  }

  // SUSPENSE_SPIKE_NO_CURIOSITY (minor, n≥8, ≥2 spikes): Scenes that spike suspense
  // (suspenseDelta > 1.5) average a curiosityDelta of zero or less — the story's most
  // dangerous moments raise no questions about what happens next. Suspense and curiosity
  // are distinct engines: tension makes the audience fear an outcome, curiosity makes them
  // need to know it. A spike that closes off questions is a dead-end thrill — gripping in
  // the moment but generating no forward pull. Distinct from SUSPENSE_SPIKE_NO_CAUSE
  // (upstream escalation gap), SUSPENSE_SPIKE_NO_FALLOUT (downstream consequence), and
  // DRAMATIC_TURN_CURIOSITY_VOID (turn scenes, not suspense spikes).
  if (records.length >= 8) {
    const spikes377 = (records as any[]).filter(r => (r.suspenseDelta ?? 0) > 1.5);
    if (spikes377.length >= 2) {
      const avgCur377 = spikes377.reduce((s: number, r: any) => s + (r.curiosityDelta ?? 0), 0) / spikes377.length;
      if (avgCur377 <= 0) {
        issues.push({
          location: `${spikes377.length} suspense-spike scene(s) — curiosity register`,
          rule: 'SUSPENSE_SPIKE_NO_CURIOSITY',
          severity: 'minor',
          description: `The ${spikes377.length} suspense-spike scenes (suspenseDelta > 1.5) average a curiosityDelta of ${avgCur377.toFixed(2)} — the story's most dangerous moments raise no questions about what happens next. Tension and curiosity are distinct engines: suspense makes the audience fear an outcome, curiosity makes them need to know it. A spike that closes off questions is a dead-end thrill — gripping in the moment but generating no forward pull into the next scene.`,
          suggestedFix: 'Let high-tension scenes also open questions: a danger that exposes a new unknown, a crisis that raises the stakes of a mystery. When a suspense spike both frightens and intrigues, it pulls the audience forward; when it only frightens, the tension dissipates the moment the scene ends.',
        });
      }
    }
  }

  // ── Wave 391: SUSPENSE_SPIKE_NO_EMOTION, CLOCK_RAISE_NO_FALLOUT, CURIOSITY_SPIKE_NO_FALLOUT ──

  // SUSPENSE_SPIKE_NO_EMOTION (minor, n≥8, ≥2 spikes): Every scene that spikes suspense
  // (suspenseDelta > 1.5) is emotionally neutral — the story's most tense moments never move
  // the protagonist. Tension the character does not feel is spectacle: the audience watches
  // danger without watching anyone be changed by it. Completes the suspense-spike correlation
  // set with SUSPENSE_SPIKE_NO_CAUSE (upstream), SUSPENSE_SPIKE_NO_FALLOUT (downstream), and
  // SUSPENSE_SPIKE_NO_CURIOSITY (curiosity channel); distinct from DRAMATIC_TURN_NO_EMOTION
  // (turn scenes) and EMOTIONAL_NEUTRAL_RUN (consecutive neutral scenes).
  if (records.length >= 8) {
    const spikes391 = (records as any[]).filter(r => (r.suspenseDelta ?? 0) > 1.5);
    if (spikes391.length >= 2 && spikes391.every(r => (r.emotionalShift ?? 'neutral') === 'neutral')) {
      issues.push({
        location: `${spikes391.length} suspense-spike scene(s) — emotional register`,
        rule: 'SUSPENSE_SPIKE_NO_EMOTION',
        severity: 'minor',
        description: `All ${spikes391.length} suspense-spike scenes (suspenseDelta > 1.5) are emotionally neutral — the story's most tense moments never move the protagonist. Tension the character does not feel is spectacle: the audience watches danger without watching anyone be changed by it, so the spikes grip the eye but never the heart.`,
        suggestedFix: 'Let high-tension scenes mark the protagonist emotionally: fear that curdles into a negative shift, survival that releases into relief. The most suspenseful scene in the story should also be one of its most felt — if the danger changes nothing about how anyone feels, the audience experiences it as a stunt.',
      });
    }
  }

  // CLOCK_RAISE_NO_FALLOUT (minor, n≥8, ≥2 clock raises): Two or more scenes raise a clock
  // and not one is followed, within the next two scenes, by any consequence — no emotional
  // shift, no relationship shift, no revelation, no dramatic turn. The deadline is announced
  // and then absorbed without effect, so the clock is a number that changes nothing
  // downstream. Distinct from CLOCK_RAISED_WITHOUT_PAYOFF (no PAYOFF anywhere in the story —
  // this checks the immediate two-scene window for any consequence) and CLOCK_RAISED_NO_DELTA
  // (no measurable time-pressure change). The clock sibling of SUSPENSE_SPIKE_NO_FALLOUT.
  if (records.length >= 8) {
    const n391c = records.length;
    const hasFallout391c = (idx: number): boolean => {
      for (let k = idx + 1; k <= Math.min(idx + 2, n391c - 1); k++) {
        const r = (records as any[])[k];
        if ((r.emotionalShift ?? 'neutral') !== 'neutral') return true;
        if (((r.relationshipShifts ?? []) as any[]).length > 0) return true;
        if (r.revelation !== null && r.revelation !== undefined) return true;
        if ((r.dramaticTurn ?? 'nothing') !== 'nothing') return true;
      }
      return false;
    };
    const clockScenes391 = (records as any[]).filter(r => r.clockRaised === true);
    if (clockScenes391.length >= 2 && !clockScenes391.some(s => hasFallout391c((records as any[]).indexOf(s)))) {
      issues.push({
        location: `${clockScenes391.length} clock-raise scene(s) — no downstream fallout`,
        rule: 'CLOCK_RAISE_NO_FALLOUT',
        severity: 'minor',
        description: `${clockScenes391.length} scenes raise a clock but none is followed within two scenes by any consequence — no emotional shift, no relationship move, no revelation, no dramatic turn. The deadline is announced and then absorbed without effect, so each clock is a number that changes nothing downstream and the audience learns the countdowns are empty threats.`,
        suggestedFix: 'Let each deadline detonate: the scenes right after a clock raise should carry its pressure — a panicked choice, a fractured alliance, a forced disclosure. If raising the clock leads to nothing in the next beats, either pay off the urgency or cut the clock; a deadline that changes nothing trains the audience to ignore the next one.',
      });
    }
  }

  // CURIOSITY_SPIKE_NO_FALLOUT (minor, n≥8, ≥2 spikes): Two or more scenes spike curiosity
  // (curiosityDelta > 1.5) and not one is followed, within the next two scenes, by any
  // consequence — no emotional shift, no relationship shift, no revelation, no dramatic turn.
  // A question is opened and then nothing develops from it, so the intrigue dissipates
  // unaddressed. Distinct from CURIOSITY_OPEN_LOOP (a question never resolved anywhere in the
  // story — this checks the immediate two-scene aftermath for any development) and from the
  // suspense/clock fallout checks (different trigger channel).
  if (records.length >= 8) {
    const n391q = records.length;
    const hasFallout391q = (idx: number): boolean => {
      for (let k = idx + 1; k <= Math.min(idx + 2, n391q - 1); k++) {
        const r = (records as any[])[k];
        if ((r.emotionalShift ?? 'neutral') !== 'neutral') return true;
        if (((r.relationshipShifts ?? []) as any[]).length > 0) return true;
        if (r.revelation !== null && r.revelation !== undefined) return true;
        if ((r.dramaticTurn ?? 'nothing') !== 'nothing') return true;
      }
      return false;
    };
    const curSpikes391 = (records as any[]).filter(r => (r.curiosityDelta ?? 0) > 1.5);
    if (curSpikes391.length >= 2 && !curSpikes391.some(s => hasFallout391q((records as any[]).indexOf(s)))) {
      issues.push({
        location: `${curSpikes391.length} curiosity-spike scene(s) — no downstream fallout`,
        rule: 'CURIOSITY_SPIKE_NO_FALLOUT',
        severity: 'minor',
        description: `${curSpikes391.length} scenes spike curiosity (curiosityDelta > 1.5) but none is followed within two scenes by any consequence — no emotional shift, no relationship move, no revelation, no dramatic turn. A question is opened and then nothing develops from it, so the intrigue dissipates unaddressed and the audience's leaning-forward goes unrewarded.`,
        suggestedFix: 'Let each curiosity spike lead somewhere soon: the scenes after a question opens should begin to complicate, partially answer, or raise the stakes of it. A mystery that spikes and then stalls teaches the audience that the story\'s questions don\'t pay off — develop the intrigue while it is hot.',
      });
    }
  }

  // ── Wave 405: POSITIVE_REACTION_WITHOUT_CAUSE, CURIOSITY_SPIKE_WITHOUT_CAUSE, DRAMATIC_TURN_WITHOUT_CAUSE ──

  // POSITIVE_REACTION_WITHOUT_CAUSE (minor): A scene carries a positive emotional shift but
  // neither it nor the two scenes before it contain any on-page cause for relief or joy — no
  // positive relationship shift, no revelation, no payoff, no suspense release (suspenseDelta
  // < -1), no clock relief (clockDelta < 0). The character brightens with no visible reason,
  // so the upswing reads as unearned. This is the positive sibling of REACTION_WITHOUT_CAUSE,
  // which keys exclusively on negative emotion (`emotionalShift !== 'negative'` → continue);
  // an uncaused positive turn is just as much a causal gap as an uncaused negative one, and is
  // arguably more damaging because audiences resist unearned relief most of all. Distinct from
  // EMOTION_WITHOUT_DRIVER_RUN (a 3+ consecutive non-neutral run, sign-agnostic) — this fires
  // on a single positive scene whose joy has no traceable origin.
  for (let i = 2; i < records.length; i++) {
    const curr = records[i] as any;
    if (curr.emotionalShift !== 'positive') continue;
    const selfCause405 =
      curr.revelation !== null ||
      (curr.suspenseDelta ?? 0) < -1 ||
      (curr.clockDelta ?? 0) < 0 ||
      ((curr.payoffSetupIds ?? []) as any[]).length > 0 ||
      ((curr.relationshipShifts ?? []) as any[]).some((s: any) => s.amount > 0);
    if (selfCause405) continue;
    let priorCause405 = false;
    for (let j = Math.max(0, i - 2); j < i; j++) {
      const p = records[j] as any;
      if (
        p.emotionalShift === 'positive' ||
        p.revelation !== null ||
        (p.suspenseDelta ?? 0) < -1 ||
        (p.clockDelta ?? 0) < 0 ||
        ((p.payoffSetupIds ?? []) as any[]).length > 0 ||
        ((p.relationshipShifts ?? []) as any[]).some((s: any) => s.amount > 0)
      ) { priorCause405 = true; break; }
    }
    if (!priorCause405) {
      issues.push({
        location: `Scene ${i} (${curr.slug})`,
        rule: 'POSITIVE_REACTION_WITHOUT_CAUSE',
        severity: 'minor',
        description: `Scene ${i} turns emotionally positive but neither it nor the two preceding scenes contain any cause for relief or joy — no good news, no reconciliation, no thread paying off, no danger receding. The upswing has no on-page cause, so the relief reads as unearned. Audiences forgive a character feeling bad for no reason far more readily than feeling good for no reason; uncaused joy reads as the story handing out a reward it never set up.`,
        suggestedFix: 'Give the positive turn a visible cause in this scene or just before it: a victory, a reunion, a problem solved, a threat lifted, or a kindness received. Relief lands only when the audience has felt the weight it relieves — earn the upswing by showing what changed for the better.',
      });
      break;
    }
  }

  // CURIOSITY_SPIKE_WITHOUT_CAUSE (minor, n≥4): A scene spikes curiosity (curiosityDelta > 1.5)
  // but neither it nor the two preceding scenes contain any driver that would open a question —
  // no revelation, no newly seeded clue, no dramatic turn, no clock raise. Intrigue materializes
  // from nowhere: the audience is told to lean forward without anything on the page giving them
  // a reason to wonder. This is the curiosity-channel sibling of SUSPENSE_SPIKE_NO_CAUSE (which
  // audits the suspense channel for an upstream escalation gap). Distinct from CURIOSITY_SPIKE_
  // NO_FALLOUT (the downstream-consequence gap) and REVELATION_WITHOUT_CURIOSITY (revelation
  // scenes that fail to raise curiosity) — this is the upstream cause gap for a curiosity spike.
  for (let i = 2; i < records.length; i++) {
    const curr = records[i] as any;
    if ((curr.curiosityDelta ?? 0) <= 1.5) continue;
    const hasDriver405 = (r: any): boolean =>
      r.revelation !== null ||
      ((r.seededClueIds ?? []) as any[]).length > 0 ||
      (r.dramaticTurn ?? 'nothing') !== 'nothing' ||
      r.clockRaised === true;
    if (hasDriver405(curr)) continue;
    let priorDriver405 = false;
    for (let j = Math.max(0, i - 2); j < i; j++) {
      if (hasDriver405(records[j] as any)) { priorDriver405 = true; break; }
    }
    if (!priorDriver405) {
      issues.push({
        location: `Scene ${i} (${curr.slug})`,
        rule: 'CURIOSITY_SPIKE_WITHOUT_CAUSE',
        severity: 'minor',
        description: `Scene ${i} spikes curiosity (curiosityDelta ${(curr.curiosityDelta ?? 0).toFixed(1)}) but neither it nor the two preceding scenes plant anything to wonder about — no revelation, no new clue, no dramatic turn, no clock raised. The intrigue materializes from nowhere: the story signals a question without anything on the page giving the audience a reason to ask it.`,
        suggestedFix: 'Anchor the curiosity spike to a concrete trigger in this scene or just before it: plant a clue, surface a partial truth, or let a turn raise a new unknown. Wonder is a response to a gap in the audience\'s knowledge — open the gap on the page before asking them to lean into it.',
      });
      break;
    }
  }

  // DRAMATIC_TURN_WITHOUT_CAUSE (minor, n≥8, ≥2 turns): The story contains two or more dramatic
  // turns, and not one of them has a cause in its own scene or the immediately preceding scene —
  // no revelation, no suspense rise (suspenseDelta > 1), no clock raise, no relationship shift,
  // no newly seeded clue. The plot's pivots are systematically unmotivated: each reversal arrives
  // as an authorial decree rather than the consequence of pressure the audience has watched build.
  // This is the dramatic-turn channel of the backward-cause family. Distinct from DEUS_EX_MACHINA
  // (a late plot-CLOSING revelation that arrives with no setup), SUSPENSE_SPIKE_NO_CAUSE (the
  // suspense channel), and DRAMATIC_TURN_AFTERMATH_VOID (the downstream-fallout gap for turns).
  if (records.length >= 8) {
    const turns405 = (records as any[]).filter(r => (r.dramaticTurn ?? 'nothing') !== 'nothing');
    if (turns405.length >= 2) {
      const turnHasCause405 = (rec: any): boolean => {
        const idx = (records as any[]).indexOf(rec);
        const causeIn = (r: any): boolean =>
          r.revelation !== null ||
          (r.suspenseDelta ?? 0) > 1 ||
          r.clockRaised === true ||
          ((r.relationshipShifts ?? []) as any[]).length > 0 ||
          ((r.seededClueIds ?? []) as any[]).length > 0;
        if (causeIn(rec)) return true;
        if (idx > 0 && causeIn((records as any[])[idx - 1])) return true;
        return false;
      };
      if (!turns405.some(t => turnHasCause405(t))) {
        issues.push({
          location: `${turns405.length} dramatic-turn scene(s) — no upstream cause`,
          rule: 'DRAMATIC_TURN_WITHOUT_CAUSE',
          severity: 'minor',
          description: `All ${turns405.length} of the story's dramatic turns arrive with no cause in their own scene or the scene just before — no revelation, no rising tension, no deadline, no shifting bond, no planted clue precedes any pivot. The plot's reversals are systematically unmotivated: each turn reads as an authorial decree rather than the consequence of pressure the audience watched accumulate, so the story lurches rather than builds.`,
          suggestedFix: 'Cause each turn: a reversal should be the inevitable-in-hindsight result of forces already in motion — a truth that surfaces, a deadline that bites, an alliance that fractures. Plant the pressure in the turn\'s scene or the one before it, so that when the story pivots, the audience feels it was pushed, not yanked.',
        });
      }
    }
  }

  // ── Wave 419: REVELATION_RELATIONSHIP_VOID, PAYOFF_SUSPENSE_VOID, CLOCK_RAISE_RELATIONSHIP_VOID ──

  // REVELATION_RELATIONSHIP_VOID (minor, n≥8, ≥2 revelation scenes): Every scene in which a
  // truth is revealed (r.revelation !== null) carries no relationship shift — discoveries
  // surface without any bond fracturing, deepening, or changing between characters. Revelations
  // that move nobody relationally are causally incomplete: the most powerful moments in a story
  // are precisely those that reconfigure the interpersonal geometry. Information that lands
  // without interpersonal consequence teaches the audience that what characters know doesn't
  // affect how they stand with each other — the belief and relationship layers are permanently
  // decoupled. Average/aggregate mode × revelation × relationship channel. Distinct from
  // REVELATION_WITHOUT_CURIOSITY (curiosity channel of revelations, covered separately),
  // DECEPTION_WITHOUT_CONSEQUENCE (specifically about discovered lies; this fires across all
  // revelation types when the relational channel is always absent), and DRAMATIC_TURN_NO_EMOTION
  // (emotion at turn scenes — this audits the relational dimension of revelation scenes).
  if (records.length >= 8) {
    const revelationRecs419a = (records as any[]).filter(r => r.revelation !== null);
    if (revelationRecs419a.length >= 2 &&
        revelationRecs419a.every(r => ((r.relationshipShifts ?? []) as any[]).length === 0)) {
      issues.push({
        location: `${revelationRecs419a.length} revelation scene(s) — no relationship shift in any`,
        rule: 'REVELATION_RELATIONSHIP_VOID',
        severity: 'minor',
        description: `All ${revelationRecs419a.length} revelation scenes produce no relationship shift — every truth that surfaces leaves every bond unchanged. Revelations that move nobody relationally are causally incomplete: if knowing something doesn't change how characters stand with each other, the discovery is effectively inert. The audience expects uncovered truth to fracture, deepen, or force a reckoning between characters — when it never does, the belief layer and the relationship layer appear permanently disconnected.`,
        suggestedFix: 'Let at least one revelation shift a relationship: the moment a character learns a truth, something should change between them and whoever else is connected to that truth — an alliance cracks, a bond deepens, a distance opens. Revelation that lands without interpersonal consequence feels like exposition rather than drama.',
      });
    }
  }

  // PAYOFF_SUSPENSE_VOID (minor, n≥8, ≥2 payoff scenes): Every scene that resolves a planted
  // setup (payoffSetupIds.length > 0) carries suspenseDelta ≤ 0 — payoffs are pure exhales with
  // no lingering or redirected tension. In well-constructed stories, resolutions often generate
  // new stakes even as they close old ones: a thread resolved reveals a larger problem, a mystery
  // answered opens a deeper question, a danger survived creates a new adversary. When no payoff
  // scene ever produces any suspense rise, each resolution is a full stop rather than a comma —
  // the story's engine loses momentum with each callback rather than redirecting it.
  // Average/aggregate mode × payoff × suspense channel. Distinct from PAYOFF_NO_EMOTION (emotion
  // channel, Wave 363), PAYOFF_CURIOSITY_DECOUPLED (curiosity channel, Wave 335), and PAYOFF_BACK_
  // LOADED (timing/distribution, Wave 268). The suspense channel of payoffs is the only member of
  // this correlation family not yet audited.
  if (records.length >= 8) {
    const payoffRecs419b = (records as any[]).filter(r => ((r.payoffSetupIds ?? []) as any[]).length > 0);
    if (payoffRecs419b.length >= 2 &&
        payoffRecs419b.every(r => (r.suspenseDelta ?? 0) <= 0)) {
      issues.push({
        location: `${payoffRecs419b.length} payoff scene(s) — no suspense rise in any`,
        rule: 'PAYOFF_SUSPENSE_VOID',
        severity: 'minor',
        description: `All ${payoffRecs419b.length} payoff scenes carry suspenseDelta ≤ 0 — every resolved setup is a pure exhale that generates no new tension. Resolutions that close loops without opening any new pressure remove momentum rather than redirecting it: each payoff is a full stop, and the story's engine loses speed with every callback. Payoffs that also raise stakes — resolving one thread while revealing a new problem, danger, or question — sustain and redirect narrative energy rather than spending it down.`,
        suggestedFix: 'Let at least one payoff scene generate positive suspense: the resolution of a planted thread often reveals a harder problem, a new adversary, or a raised cost for what just succeeded. A payoff that also raises tension proves the story\'s momentum is self-sustaining — closing one loop can open another.',
      });
    }
  }

  // CLOCK_RAISE_RELATIONSHIP_VOID (minor, n≥8, ≥2 clock-raise scenes): Every scene in which a
  // new deadline is established (clockRaised === true) carries no relationship shift — ticking-
  // clock pressure never creates any interpersonal consequence. Deadlines under pressure should
  // force characters to act against each other, depend on each other, or betray each other:
  // the clock's social effect is a primary driver of relationship movement. When every deadline
  // is raised in a social vacuum, the story's time pressure exists only mechanically — it creates
  // urgency without generating the interpersonal friction that makes urgency personal.
  // Co-occurrence/decoupling mode × clock channel × relationship. Distinct from CLOCK_RAISED_NO_
  // EMOTION (emotion channel, Wave 349), CLOCK_RAISE_NO_SUSPENSE (suspense channel, Wave 377),
  // and CLOCK_RAISE_CURIOSITY_VOID (curiosity channel, Wave 363). The relationship dimension of
  // clock-raise scenes has not been separately audited, completing the clock-raise correlation set.
  if (records.length >= 8) {
    const clockRaiseRecs419c = (records as any[]).filter(r => r.clockRaised === true);
    if (clockRaiseRecs419c.length >= 2 &&
        clockRaiseRecs419c.every(r => ((r.relationshipShifts ?? []) as any[]).length === 0)) {
      issues.push({
        location: `${clockRaiseRecs419c.length} clock-raise scene(s) — no relationship shift in any`,
        rule: 'CLOCK_RAISE_RELATIONSHIP_VOID',
        severity: 'minor',
        description: `All ${clockRaiseRecs419c.length} scenes that establish deadlines carry no relationship shift — every ticking clock is raised in a social vacuum. Deadlines under pressure are among the most powerful drivers of interpersonal consequence: when time runs out, characters are forced to ask for help, betray allies, abandon obligations, or sacrifice relationships. A story where every deadline appears without any bond moving reads as mechanical urgency — the stakes feel temporal but not personal.`,
        suggestedFix: 'Let at least one clock-raise scene move a relationship: the moment a deadline is established, it should force a choice that strains or strengthens a bond — someone is depended on, betrayed, or asked to sacrifice. Time pressure that has no interpersonal cost is urgency without stakes.',
      });
    }
  }

  // ── Wave 433: SUSPENSE_PEAK_UNCAUSED, CURIOSITY_DECLINE_RUN, PAYOFF_PEAK_INERT ──

  // SUSPENSE_PEAK_UNCAUSED (minor, n≥8, peak suspenseDelta ≥ 2): The single
  // highest-suspense scene in the story — the global tension apex — has no causal
  // driver in either of the two scenes immediately before it. Looking backward
  // from the peak, neither prior scene shows any of: a positive suspense rise
  // (a building gradient), a raised clock, a revelation, or a dramatic turn. The
  // story's most tense moment therefore arrives without a run-up — the audience
  // hits maximum tension on a flat approach, so the apex reads as an arbitrary jump
  // rather than the culmination of mounting pressure. Single-peak isolation ×
  // backward-cause mode — the FIRST single-peak check in this pass. Distinct from
  // SUSPENSE_SPIKE_NO_CAUSE (a per-scene scanner that fires on ANY local spike > 3
  // lacking clock/clue setup and ignores revelation/turn as causes): this isolates
  // the SINGLE global maximum, fires at a lower peak floor (≥ 2), and counts
  // revelation and dramatic turn as valid preparation — auditing whether the
  // story's one tension apex was built toward, not whether local spikes are sudden.
  if (records.length >= 8) {
    let peakPos433a = -1;
    let peakVal433a = -Infinity;
    for (let i = 0; i < records.length; i++) {
      const sd = records[i].suspenseDelta ?? 0;
      if (sd > peakVal433a) { peakVal433a = sd; peakPos433a = i; }
    }
    if (peakPos433a >= 2 && peakVal433a >= 2) {
      const isDriver433a = (r: any) =>
        (r.suspenseDelta ?? 0) > 0 ||
        r.clockRaised === true ||
        r.revelation !== null ||
        ((r.dramaticTurn ?? 'nothing') !== 'nothing');
      const prior1_433a = records[peakPos433a - 1];
      const prior2_433a = records[peakPos433a - 2];
      if (!isDriver433a(prior1_433a) && !isDriver433a(prior2_433a)) {
        issues.push({
          location: `Scene ${records[peakPos433a].sceneIdx} (${records[peakPos433a].slug}) — peak suspense ${peakVal433a.toFixed(1)}`,
          rule: 'SUSPENSE_PEAK_UNCAUSED',
          severity: 'minor',
          description: `The story's highest-suspense scene (Scene ${records[peakPos433a].sceneIdx}, suspenseDelta ${peakVal433a.toFixed(1)}) has no causal driver in the two scenes before it — neither prior scene raises suspense, starts a clock, delivers a revelation, or turns the story. The tension apex arrives on a flat approach, so the peak reads as an arbitrary jump rather than the culmination of mounting pressure. An audience reaches maximum tension without having been wound up to it.`,
          suggestedFix: 'Build a gradient into the tension peak: in the two scenes before the story\'s most suspenseful moment, escalate — raise a clock, plant a threat, deliver a partial revelation, or stack a complication so the suspense rises step by step. The apex should feel earned by its run-up, the top of a climb rather than a cliff that appears from nowhere.',
        });
      }
    }
  }

  // CURIOSITY_DECLINE_RUN (minor, n≥10, run ≥4): Four or more consecutive scenes
  // each carry a negative curiosityDelta — the audience's open questions are being
  // continuously closed or drained across a sustained stretch with nothing
  // reopening the field. Curiosity is the forward-pull of a story: the accumulation
  // of "what happens next / why / who." A run where every scene only resolves or
  // dissipates curiosity (and none reopens it) bleeds the mystery engine dry over a
  // span — the audience's reasons to keep watching erode scene by scene with no new
  // hook arriving. Run-based × valence mode × curiosity channel — the FIRST
  // consecutive-negative-curiosity run check. Distinct from CURIOSITY_FRONT_LOADED
  // (timing/distribution of positive spikes), CURIOSITY_OPEN_LOOP (questions never
  // answered), CURIOSITY_SPIKE_NO_FALLOUT (a spike with no consequence), and
  // EMOTIONAL_NEUTRAL_RUN / SUSPENSE_UNRELEASED_RUN (same run mode, different
  // channels): this is specifically a run of declining curiosity valence.
  if (records.length >= 10) {
    let maxRun433b = 0;
    let curRun433b = 0;
    let maxStart433b = -1;
    let curStart433b = -1;
    for (let i = 0; i < records.length; i++) {
      if ((records[i].curiosityDelta ?? 0) < 0) {
        if (curRun433b === 0) curStart433b = i;
        if (++curRun433b > maxRun433b) { maxRun433b = curRun433b; maxStart433b = curStart433b; }
      } else {
        curRun433b = 0;
      }
    }
    if (maxRun433b >= 4) {
      const runEnd433b = maxStart433b + maxRun433b - 1;
      issues.push({
        location: `Scenes ${records[maxStart433b].sceneIdx}–${records[runEnd433b].sceneIdx} (${maxRun433b} consecutive)`,
        rule: 'CURIOSITY_DECLINE_RUN',
        severity: 'minor',
        description: `A run of ${maxRun433b} consecutive scenes (Scenes ${records[maxStart433b].sceneIdx}–${records[runEnd433b].sceneIdx}) each lower audience curiosity (curiosityDelta < 0) with no scene reopening the field. Curiosity is a story's forward pull — the accumulation of unanswered questions that make an audience lean in. When every scene across a stretch only closes or drains curiosity and none plants a new hook, the mystery engine bleeds out: the audience's reasons to keep watching erode scene by scene.`,
        suggestedFix: 'Interrupt the decline with a fresh question: somewhere in this run, plant a new mystery, complicate an answer the audience thought was settled, or reveal a detail that reframes what they know. Curiosity should be replenished as it is spent — a story that only ever closes loops without opening new ones runs out of forward momentum.',
      });
    }
  }

  // PAYOFF_PEAK_INERT (minor, n≥8, densest payoff resolves ≥2 setups): The single
  // scene that resolves the most planted setups — the story's largest convergence
  // of threads — lands completely inert: neutral emotional shift, no suspense rise
  // (≤0), no curiosity rise (≤0), AND no relationship shift, all at once. The
  // biggest structural payoff the story has, the moment where the most loops close
  // together, produces no felt consequence on any channel. A convergence that
  // discharges nothing wastes the story's strongest cathartic opportunity — the
  // audience receives the largest return on its narrative investment as a flat fact.
  // Single-peak isolation × payoff channel. Distinct from the aggregate per-channel
  // payoff voids (PAYOFF_NO_EMOTION, PAYOFF_SUSPENSE_VOID, PAYOFF_CURIOSITY_
  // DECOUPLED — each fires when ONE channel is absent across ALL payoff scenes):
  // this isolates the SINGLE densest payoff and fires only when it is inert across
  // EVERY channel simultaneously, catching a hollow centerpiece even when other
  // payoff scenes are lively and no single aggregate channel is uniformly void.
  if (records.length >= 8) {
    const payoffRecs433c = (records as any[]).filter(r => ((r.payoffSetupIds ?? []) as any[]).length > 0);
    if (payoffRecs433c.length >= 1) {
      const peakCount433c = Math.max(...payoffRecs433c.map(r => ((r.payoffSetupIds ?? []) as any[]).length));
      if (peakCount433c >= 2) {
        const peakPayoff433c = payoffRecs433c.find(r => ((r.payoffSetupIds ?? []) as any[]).length === peakCount433c);
        const inert433c = peakPayoff433c &&
          peakPayoff433c.emotionalShift === 'neutral' &&
          (peakPayoff433c.suspenseDelta ?? 0) <= 0 &&
          (peakPayoff433c.curiosityDelta ?? 0) <= 0 &&
          ((peakPayoff433c.relationshipShifts ?? []) as any[]).length === 0;
        if (inert433c) {
          issues.push({
            location: `Scene ${peakPayoff433c.sceneIdx} (${peakPayoff433c.slug}) — peak payoff, ${peakCount433c} setups resolved`,
            rule: 'PAYOFF_PEAK_INERT',
            severity: 'minor',
            description: `The story's densest payoff scene (Scene ${peakPayoff433c.sceneIdx}, resolving ${peakCount433c} planted setups) lands completely inert — neutral emotion, no suspense rise, no curiosity rise, and no relationship shift, all at once. The single moment where the most threads converge produces no felt consequence on any channel. The audience receives the largest return on its narrative investment as a flat fact, and the story's strongest cathartic opportunity discharges nothing.`,
            suggestedFix: 'Charge the peak payoff on at least one channel: the scene where the most setups resolve should make someone feel something, raise a new question even as it answers old ones, redirect tension toward a fresh problem, or move a relationship. The biggest convergence of threads is the story\'s catharsis engine — let it fire rather than merely report that the loops have closed.',
          });
        }
      }
    }
  }

  // ── Wave 447: SUSPENSE_DECLINE_RUN, DRAMATIC_TURN_RELATIONSHIP_VOID, CURIOSITY_PEAK_NO_FOLLOWTHROUGH ──

  // SUSPENSE_DECLINE_RUN (run-based × suspense × negative valence, n≥10, maxRun≥4):
  // Four or more consecutive scenes each carry a negative suspenseDelta — tension bleeds
  // continuously across a sustained stretch with nothing reversing the drop. A run of
  // uninterrupted suspense decline drains the dramatic pressure engine: the audience's
  // feeling that something is at stake erodes scene by scene without any beat of escalation,
  // redirection, or new complication arresting the descent.
  // Distinctness: SUSPENSE_UNRELEASED_RUN (Wave 324) fires on 6+ consecutive POSITIVE suspense
  // scenes — the complement (sustained ascent with no release). SUSPENSE_PLATEAU_FLATLINE
  // (Wave 254) fires on 4+ scenes where suspense is flat (near zero). CURIOSITY_DECLINE_RUN
  // (Wave 433) is structurally identical but on the curiosity channel. This is the first
  // run-based check on sustained suspense DESCENT — not ascent, not plateau, but a run
  // of consecutive negative motion on the suspense axis.
  if (records.length >= 10) {
    let maxRun447a = 0;
    let curRun447a = 0;
    let maxStart447a = -1;
    let curStart447a = -1;
    for (let i = 0; i < records.length; i++) {
      if ((records[i].suspenseDelta ?? 0) < 0) {
        if (curRun447a === 0) curStart447a = i;
        if (++curRun447a > maxRun447a) { maxRun447a = curRun447a; maxStart447a = curStart447a; }
      } else {
        curRun447a = 0;
      }
    }
    if (maxRun447a >= 4) {
      const runEnd447a = maxStart447a + maxRun447a - 1;
      issues.push({
        location: `Scenes ${records[maxStart447a].sceneIdx}–${records[runEnd447a].sceneIdx} (${maxRun447a} consecutive)`,
        rule: 'SUSPENSE_DECLINE_RUN',
        severity: 'minor',
        description: `A run of ${maxRun447a} consecutive scenes (Scenes ${records[maxStart447a].sceneIdx}–${records[runEnd447a].sceneIdx}) each lower suspense (suspenseDelta < 0) with nothing reversing the drop. Sustained tension drainage deflates the dramatic engine: the audience's sense that something is at stake falls scene by scene without any escalation, redirection, or complication arresting the descent. Continuous decline — without even a momentary reversal — signals to the audience that the stakes have been permanently lowered.`,
        suggestedFix: `Interrupt the suspense decline with at least one beat of escalation or redirection within the ${maxRun447a}-scene run: raise a clock, introduce a complication, or deliver a partial revelation that resets the threat level. A single non-negative suspense beat breaks the deflation signal and tells the audience the stakes can still rise — that something is still worth fearing.`,
      });
    }
  }

  // DRAMATIC_TURN_RELATIONSHIP_VOID (co-occurrence/decoupling × dramatic turn × relationship,
  // n≥8, ≥2 turns): Every scene that contains a story pivot (dramaticTurn !== 'nothing') carries
  // no relationship shift. Story pivots are among the most powerful drivers of interpersonal
  // consequence: a reversal forces characters to revalue each other, and a recognition changes
  // how two people stand. When every pivot arrives without any bond moving, the dramatic engine
  // and the relationship engine operate in isolation — the story changes direction but no one
  // is relationally touched by the change.
  // Distinctness: DRAMATIC_TURN_NO_SUSPENSE (Wave 349), DRAMATIC_TURN_CURIOSITY_VOID (Wave 335),
  // DRAMATIC_TURN_NO_EMOTION (Wave 377) audit the suspense, curiosity, and emotional channels
  // of turn scenes — this audits the RELATIONSHIP channel, the missing piece of the turn-scene
  // correlation set. CLOCK_RAISE_RELATIONSHIP_VOID (Wave 419) is the clock-channel parallel;
  // REVELATION_RELATIONSHIP_VOID (Wave 419) is the revelation-channel parallel. Distinct from
  // DRAMATIC_TURN_AFTERMATH_VOID (checks the 2 scenes AFTER a turn for any fallout, not the
  // turn scene itself, and covers all channels not just relationship).
  if (records.length >= 8) {
    const turnRecs447b = (records as any[]).filter(r => (r.dramaticTurn ?? 'nothing') !== 'nothing');
    if (turnRecs447b.length >= 2 &&
        turnRecs447b.every(r => ((r.relationshipShifts ?? []) as any[]).length === 0)) {
      issues.push({
        location: `${turnRecs447b.length} dramatic-turn scene(s) — no relationship shift in any`,
        rule: 'DRAMATIC_TURN_RELATIONSHIP_VOID',
        severity: 'minor',
        description: `All ${turnRecs447b.length} dramatic-turn scenes (reversals, recognitions, and pivots) carry no relationship shift — every story pivot happens in an interpersonal vacuum. Story turns are among the most powerful drivers of relational consequence: a reversal forces characters to revalue or depend on each other, and a recognition can permanently alter the power dynamic between two people. When every pivot arrives without any bond moving, the dramatic engine and the relationship engine operate in isolation — the story changes direction but no character stands differently in relation to another because of it.`,
        suggestedFix: `Let at least one dramatic turn move a relationship: a reversal that forces a character to depend on or betray another, or a recognition that changes who holds power between two people. The structural pivot of the story should also be a human pivot — when the plot changes direction, so should at least one bond between the people driving it.`,
      });
    }
  }

  // CURIOSITY_PEAK_NO_FOLLOWTHROUGH (single-peak isolation × curiosity × revelation aftermath,
  // n≥8, peakCuriosity≥1.5, peakPos≤n-3): The scene that generates the audience's single
  // greatest spike of wonder — the global maximum of curiosityDelta — is not followed within
  // two scenes by any revelation. The peak intrigue spike leads to silence rather than
  // disclosure: the moment of maximum audience wonder produces no truth in the immediate wake.
  // Distinctness: CURIOSITY_SPIKE_NO_FALLOUT (Wave 391) checks whether any curiosity spike
  // ≥1.5 is followed by ANY consequence (emotion, relationship, revelation, or turn) — a per-
  // spike check for any consequence. This isolates the SINGLE GLOBAL MAXIMUM and checks only
  // REVELATION as the expected downstream: even if CURIOSITY_SPIKE_NO_FALLOUT doesn't fire
  // (because spikes have emotional or relational fallout), this can still fire if the peak
  // wonder moment is not answered by a disclosure. SUSPENSE_PEAK_UNCAUSED (Wave 433) is the
  // backward-cause check on the suspense peak — this is the forward-consequence check on the
  // curiosity peak (different axis, different channel).
  if (records.length >= 8) {
    let peakPos447c = -1;
    let peakCur447c = -Infinity;
    for (let i = 0; i < records.length; i++) {
      const cd = (records[i].curiosityDelta ?? 0) as number;
      if (cd > peakCur447c) { peakCur447c = cd; peakPos447c = i; }
    }
    if (peakPos447c >= 0 && peakCur447c >= 1.5 && peakPos447c <= records.length - 3) {
      const hasRevFollowthrough447c = [peakPos447c + 1, peakPos447c + 2].some(idx => {
        if (idx >= records.length) return false;
        const r = (records as any[])[idx];
        return r.revelation !== null && r.revelation !== undefined;
      });
      if (!hasRevFollowthrough447c) {
        issues.push({
          location: `Scene ${records[peakPos447c].sceneIdx} (${records[peakPos447c].slug}) — peak curiosity ${peakCur447c.toFixed(1)}`,
          rule: 'CURIOSITY_PEAK_NO_FOLLOWTHROUGH',
          severity: 'minor',
          description: `The story's highest-curiosity scene (Scene ${records[peakPos447c].sceneIdx}, curiosityDelta ${peakCur447c.toFixed(1)}) is not followed within two scenes by any revelation — the audience's single greatest moment of wonder leads to no disclosure. At the moment of maximum "what is really true?", a story should give the audience something true: a revelation that addresses the wonder and redirects it into a new question. When the peak curiosity moment leads nowhere, the story teaches the audience that their most intense engagement will go unrewarded.`,
          suggestedFix: `Schedule a revelation within two scenes of the story's curiosity peak: at the moment the audience is most hungry for truth, give them a disclosure — not necessarily the central answer, but any truth that addresses the question raised by the peak wonder. The peak of curiosity is a primed moment; let a revelation land while the audience is leaning in.`,
        });
      }
    }
  }

  // ── Wave 461: PAYOFF_RELATIONSHIP_VOID, SEED_SCENE_EMOTION_VOID, RELATIONSHIP_STASIS_RUN ──

  // PAYOFF_RELATIONSHIP_VOID (co-occurrence/decoupling × payoff × relationship, n≥8, ≥2 payoff
  // scenes): Every scene that pays off a planted setup (payoffSetupIds non-empty) carries no
  // relationship shift. A payoff is the moment a promise comes due — and the most resonant
  // resolutions land on the people involved, redrawing a bond as a thread closes: a debt repaid
  // restores trust, a betrayal revealed ruptures it, a sacrifice fulfilled deepens it. When every
  // payoff resolves structurally but leaves all relationships untouched, the plumbing of setup-and-
  // payoff runs disconnected from the human stakes it should be serving.
  // Distinctness: PAYOFF_NO_EMOTION (Wave 377) audits the emotional channel of payoff scenes,
  // PAYOFF_SUSPENSE_VOID (Wave 419) the suspense channel, PAYOFF_CURIOSITY_DECOUPLED (Wave 335)
  // the curiosity channel — this completes the payoff correlation set on the RELATIONSHIP channel,
  // the one remaining empty cell. REVELATION_RELATIONSHIP_VOID, CLOCK_RAISE_RELATIONSHIP_VOID, and
  // DRAMATIC_TURN_RELATIONSHIP_VOID (Waves 419/447) are the same relationship-channel check on
  // different scene populations (revelation, clock, turn) — this is the payoff population.
  // Distinct from PAYOFF_PEAK_INERT (Wave 433) which isolates the single densest payoff and fires
  // only when it is inert across ALL channels at once; this fires when the relationship channel is
  // absent across EVERY payoff scene regardless of their other channels.
  if (records.length >= 8) {
    const payoffRecs461a = (records as any[]).filter(r => ((r.payoffSetupIds ?? []) as any[]).length > 0);
    if (payoffRecs461a.length >= 2 &&
        payoffRecs461a.every(r => ((r.relationshipShifts ?? []) as any[]).length === 0)) {
      issues.push({
        location: `${payoffRecs461a.length} payoff scene(s) — no relationship shift in any`,
        rule: 'PAYOFF_RELATIONSHIP_VOID',
        severity: 'minor',
        description: `All ${payoffRecs461a.length} payoff scenes (where a planted setup resolves) carry no relationship shift — every thread closes without moving a single bond. A payoff is a promise coming due, and the most resonant resolutions land on the people involved: a debt repaid restores trust, a betrayal revealed ruptures it, a sacrifice fulfilled deepens it. When payoffs resolve the plot but leave all relationships untouched, the setup-and-payoff machinery runs disconnected from the human stakes it should serve, and the audience gets structural closure without relational consequence.`,
        suggestedFix: 'Let at least one payoff move a relationship: arrange for a thread to resolve in a way that redraws a bond — the resolution that repays a debt should restore (or fail to restore) trust, the payoff that exposes a lie should rupture an alliance. When the closing of a structural loop also shifts how two characters stand, the payoff pays off on both the plot and the human level.',
      });
    }
  }

  // SEED_SCENE_EMOTION_VOID (co-occurrence/decoupling × seed × emotion, n≥8, ≥3 seed scenes):
  // Every scene that plants a clue (seededClueIds non-empty) is emotionally neutral. Foreshadowing
  // works by encoding a detail in the audience's memory so its later payoff resonates — and emotion
  // is the primary memory-encoder: a clue dropped during a charged moment lodges, while one dropped
  // into a flat scene slides past unremembered. When every clue is planted in an emotionally neutral
  // scene, the seeds are sown in forgettable ground, and the eventual payoffs land without the
  // "of course — it was there all along" recognition that depends on the audience having retained
  // the plant.
  // Distinctness: CLUE_SEED_SUSPENSE_VOID (Wave 350) audits the suspense channel of seed scenes,
  // SEED_SCENE_CURIOSITY_VOID (Wave 363) the curiosity channel — this completes the seed
  // correlation set on the EMOTION channel, the remaining empty cell. Distinct from SUSPENSE_SPIKE_
  // NO_EMOTION / CLOCK_RAISED_NO_EMOTION / DRAMATIC_TURN_NO_EMOTION / PAYOFF_NO_EMOTION (Waves
  // 391/367/377/377) which are the same emotion-channel check on different scene populations; this
  // is the seed-scene population. Distinct from CLUE_SEED_CLUSTER (Wave 271, density/timing of
  // seeds) — this audits the emotional texture of seed scenes, not their distribution.
  if (records.length >= 8) {
    const seedScenes461b = (records as any[]).filter(r => ((r.seededClueIds ?? []) as any[]).length > 0);
    if (seedScenes461b.length >= 3 &&
        seedScenes461b.every(r => r.emotionalShift === 'neutral')) {
      issues.push({
        location: `${seedScenes461b.length} seed scene(s) — all emotionally neutral`,
        rule: 'SEED_SCENE_EMOTION_VOID',
        severity: 'minor',
        description: `All ${seedScenes461b.length} scenes that plant clues (seededClueIds) are emotionally neutral — the foreshadowing engine is sowing its seeds in forgettable ground. Emotion is the primary memory-encoder: a detail dropped during a charged moment lodges in the audience's memory, while one dropped into a flat scene slides past unretained. When every clue is planted without emotional charge, the eventual payoffs cannot trigger the "it was there all along" recognition, because the audience never encoded the plant in the first place.`,
        suggestedFix: 'Plant at least one clue inside an emotionally charged scene: attach the seeded detail to a moment of conflict, tenderness, fear, or triumph so the audience encodes it alongside the feeling. A clue remembered because it arrived during an emotional peak makes its payoff land as recognition; a clue planted in a neutral scene pays off as new information the audience does not recall being set up.',
      });
    }
  }

  // RELATIONSHIP_STASIS_RUN (run-based × relationship-absence, n≥10, maxRun≥6, ≥2 relationship-
  // shift scenes overall): Six or more consecutive scenes carry no relationship shift, even though
  // the story moves bonds at least twice elsewhere. The relational engine — the evolving web of
  // trust, power, and affection between characters — falls silent across a sustained stretch while
  // the plot continues. Relationships are a primary axis of audience investment; a long run where
  // no bond shifts signals that the interpersonal stakes have been parked, and the story coasts on
  // plot mechanics alone for that span.
  // Distinctness: EMOTIONAL_NEUTRAL_RUN (Wave 324) is the run-based check on the EMOTION channel
  // (consecutive neutral emotionalShift); this is the run-based check on the RELATIONSHIP channel
  // (consecutive scenes with no relationshipShifts) — a different channel and the first run-based
  // audit of relationship absence. Distinct from CURIOSITY_DECLINE_RUN (Wave 433) and SUSPENSE_
  // DECLINE_RUN (Wave 447), which track runs of negative VALENCE on a numeric delta; relationship
  // shifts have no valence axis here, so this tracks presence/absence over a run, not direction.
  // Distinct from the relationship co-occurrence voids (REVELATION/CLOCK/DRAMATIC_TURN/PAYOFF_
  // RELATIONSHIP_VOID) which scope to specific event scenes; this audits the whole timeline for a
  // contiguous relational silence.
  if (records.length >= 10) {
    const totalRelScenes461c = (records as any[]).filter(r => ((r.relationshipShifts ?? []) as any[]).length > 0).length;
    if (totalRelScenes461c >= 2) {
      let maxRun461c = 0;
      let curRun461c = 0;
      let maxStart461c = -1;
      let curStart461c = -1;
      for (let i = 0; i < records.length; i++) {
        if (((records[i] as any).relationshipShifts ?? []).length === 0) {
          if (curRun461c === 0) curStart461c = i;
          if (++curRun461c > maxRun461c) { maxRun461c = curRun461c; maxStart461c = curStart461c; }
        } else {
          curRun461c = 0;
        }
      }
      if (maxRun461c >= 6) {
        const runEnd461c = maxStart461c + maxRun461c - 1;
        issues.push({
          location: `Scenes ${records[maxStart461c].sceneIdx}–${records[runEnd461c].sceneIdx} (${maxRun461c} consecutive)`,
          rule: 'RELATIONSHIP_STASIS_RUN',
          severity: 'minor',
          description: `A run of ${maxRun461c} consecutive scenes (Scenes ${records[maxStart461c].sceneIdx}–${records[runEnd461c].sceneIdx}) carries no relationship shift, though the story moves a bond ${totalRelScenes461c} times elsewhere. The relational engine — the evolving web of trust, power, and affection between characters — falls silent across this stretch while the plot keeps moving. Relationships are a primary axis of audience investment; a sustained run where no bond shifts tells the audience the interpersonal stakes have been parked, and the story coasts on plot mechanics alone until they resume.`,
          suggestedFix: `Move at least one relationship within the ${maxRun461c}-scene stasis run: let the events of this stretch cost or strengthen a bond, shift the balance of power between two characters, or test an alliance. The plot advancing without any relational consequence reads as machinery; threading even one bond shift through the run keeps the human stakes alive alongside the events.`,
        });
      }
    }
  }

  // ── Wave 475: EMOTIONAL_ZONE_CLUSTER, SEED_TEMPORAL_CLUSTER, PAYOFF_ZONE_CLUSTER ──
  const n475 = records.length;

  // EMOTIONAL_ZONE_CLUSTER — Distribution/timing × emotional channel (n≥8, ≥4 non-neutral
  // scenes, >75% in a single third). When emotionally charged scenes cluster in one structural
  // zone, the story's affective arc becomes a spike surrounded by flat territory: the opening
  // fails to build investment, the middle fails to escalate, or the closing arrives without the
  // audience having anything left to feel.
  // Distinct from: EMOTIONAL_NEUTRAL_RUN (Wave 324: run-based × consecutive neutral; a single
  // gap, not zone distribution), EMOTIONAL_POSITIVE_DESERT (Wave 282: zone-absence × positive ×
  // Act 2; absence of a specific valence in a specific zone, not overall temporal cluster),
  // EMOTION_WITHOUT_DRIVER_RUN (Wave 310: run-based × non-neutral without causal driver; a
  // consecutive-gap check, not a zone-distribution check).
  if (n475 >= 8) {
    const chargedPositions475a = (records as any[])
      .map((r, pos) => ({ pos, shift: r.emotionalShift ?? 'neutral' }))
      .filter(x => x.shift !== 'neutral')
      .map(x => x.pos);
    if (chargedPositions475a.length >= 4) {
      const third475a = Math.floor(n475 / 3);
      const firstZ475a = chargedPositions475a.filter(p => p < third475a).length;
      const midZ475a = chargedPositions475a.filter(p => p >= third475a && p < 2 * third475a).length;
      const lastZ475a = chargedPositions475a.filter(p => p >= 2 * third475a).length;
      const maxZ475a = Math.max(firstZ475a, midZ475a, lastZ475a);
      if (maxZ475a / chargedPositions475a.length > 0.75) {
        const zone475a = firstZ475a === maxZ475a ? 'opening' : midZ475a === maxZ475a ? 'middle' : 'closing';
        issues.push({
          location: `${maxZ475a}/${chargedPositions475a.length} emotionally charged scene(s) in the ${zone475a} third`,
          rule: 'EMOTIONAL_ZONE_CLUSTER',
          severity: 'minor',
          description: `${maxZ475a} of ${chargedPositions475a.length} emotionally charged scenes (${(maxZ475a / chargedPositions475a.length * 100).toFixed(0)}%) fall within the ${zone475a} third — the story's affective arc clusters into one structural zone, leaving the remaining two-thirds emotionally flat. When all the feeling detonates in a single zone, the audience experiences a spike surrounded by inert territory: if the cluster is early, they have not yet bonded enough with the stakes for it to land; if it is late, they arrive at the climax having felt nothing building toward it; if it is in the middle, both the opening and closing are affectively silent. Emotional charge works best when distributed by dramatic need: enough opening feeling to establish investment, escalating emotion through the middle to raise stakes, and charged closing beats to pay off the built tension.`,
          suggestedFix: `Redistribute emotional charge across all three thirds: move at least one or two non-neutral scenes out of the ${zone475a} cluster into the zones currently flat. This doesn't require entirely new scenes — heightening an existing character reaction, sharpening a confrontation, or making a quiet scene land harder can extend the emotional engine beyond its current concentrated zone. Aim for at least one charged scene per structural third.`,
        });
      }
    }
  }

  // SEED_TEMPORAL_CLUSTER — Distribution/timing × seed/clue channel (n≥8, ≥4 seed scenes,
  // >75% in a single third). When the story concentrates all its clue-planting in one structural
  // zone, the foreshadowing engine misfires architecturally: an opening cluster telegraphs before
  // the audience has invested; a closing cluster plants too late to retroactively foreshadow; a
  // mid-script cluster leaves the opening and closing without latent mystery.
  // Distinct from: CLUE_SEED_CLUSTER (Wave 254: 3+ seeds in one scene — within-scene density,
  // not arc-wide zone distribution), CURIOSITY_FRONT_LOADED (Wave 268: all curiosityDelta spikes
  // in first half — curiosity-signal channel, not the clue-plant channel), SEED_SCENE_CURIOSITY_
  // VOID / CLUE_SEED_SUSPENSE_VOID / SEED_SCENE_EMOTION_VOID (Waves 363/350/461: correlation
  // checks on what signals accompany seed scenes; this checks WHEN they appear in the arc).
  if (n475 >= 8) {
    const seedPositions475b = (records as any[])
      .map((r, pos) => ({ pos, count: ((r.seededClueIds ?? []) as any[]).length }))
      .filter(x => x.count > 0)
      .map(x => x.pos);
    if (seedPositions475b.length >= 4) {
      const third475b = Math.floor(n475 / 3);
      const firstZ475b = seedPositions475b.filter(p => p < third475b).length;
      const midZ475b = seedPositions475b.filter(p => p >= third475b && p < 2 * third475b).length;
      const lastZ475b = seedPositions475b.filter(p => p >= 2 * third475b).length;
      const maxZ475b = Math.max(firstZ475b, midZ475b, lastZ475b);
      if (maxZ475b / seedPositions475b.length > 0.75) {
        const zone475b = firstZ475b === maxZ475b ? 'opening' : midZ475b === maxZ475b ? 'middle' : 'closing';
        issues.push({
          location: `${maxZ475b}/${seedPositions475b.length} clue-planting scene(s) in the ${zone475b} third`,
          rule: 'SEED_TEMPORAL_CLUSTER',
          severity: 'minor',
          description: `${maxZ475b} of ${seedPositions475b.length} clue-planting scenes (${(maxZ475b / seedPositions475b.length * 100).toFixed(0)}%) fall within the ${zone475b} third — the foreshadowing engine concentrates its planting in one structural zone. Effective mystery architecture distributes seeds across the arc: early seeds build the sense that the world is full of information waiting to be understood; mid-script seeds reinforce patterns without telegraphing too clearly; late seeds plant evidence that feels retroactively obvious once the payoff lands. Clustering all planting in the ${zone475b} zone makes the seeding feel systematic and leaves the other zones without the latent information that makes payoffs feel earned rather than announced.`,
          suggestedFix: `Redistribute clue-planting across all three thirds: move at least one or two seed scenes into the zones currently without foreshadowing. A late-act payoff feels most satisfying when the audience can trace the evidence back through the whole arc, not just through one structural pocket. Even a small planted detail — a character's offhand remark, a staging element that seems decorative — extends the foreshadowing web into the currently bare zones.`,
        });
      }
    }
  }

  // PAYOFF_ZONE_CLUSTER — Distribution/timing × payoff channel (n≥8, ≥4 payoff scenes,
  // >75% in a single third). When all thread resolutions concentrate in one structural zone,
  // dramatic satisfaction is architecturally imbalanced: a dense cluster of payoffs creates a
  // resolution burst while the other two-thirds remain structurally open. Payoffs work best
  // when distributed — early payoffs reward investment in planted threads; mid-script payoffs
  // fuel momentum by closing loops as new ones open; late payoffs deliver climactic satisfaction.
  // Distinct from: PAYOFF_BACK_LOADED (Wave 268: all payoffs deferred to second half — a
  // binary partition at 50%; this uses thirds at 33%/67% with a 75% threshold and fires when
  // any third dominates, including the opening or middle), PAYOFF_PEAK_INERT (Wave 433: single-
  // peak isolation — the densest payoff scene is emotionally/suspense/curiosity flat; a
  // within-scene void check, not a zone-distribution check), PAYOFF_CURIOSITY_DECOUPLED /
  // PAYOFF_SUSPENSE_VOID / PAYOFF_RELATIONSHIP_VOID / PAYOFF_NO_EMOTION (Waves 335/419/461/363:
  // correlation checks on what signals accompany payoff scenes; this checks WHEN they appear).
  if (n475 >= 8) {
    const payoffPositions475c = (records as any[])
      .map((r, pos) => ({ pos, count: ((r.payoffSetupIds ?? []) as any[]).length }))
      .filter(x => x.count > 0)
      .map(x => x.pos);
    if (payoffPositions475c.length >= 4) {
      const third475c = Math.floor(n475 / 3);
      const firstZ475c = payoffPositions475c.filter(p => p < third475c).length;
      const midZ475c = payoffPositions475c.filter(p => p >= third475c && p < 2 * third475c).length;
      const lastZ475c = payoffPositions475c.filter(p => p >= 2 * third475c).length;
      const maxZ475c = Math.max(firstZ475c, midZ475c, lastZ475c);
      if (maxZ475c / payoffPositions475c.length > 0.75) {
        const zone475c = firstZ475c === maxZ475c ? 'opening' : midZ475c === maxZ475c ? 'middle' : 'closing';
        issues.push({
          location: `${maxZ475c}/${payoffPositions475c.length} payoff scene(s) in the ${zone475c} third`,
          rule: 'PAYOFF_ZONE_CLUSTER',
          severity: 'minor',
          description: `${maxZ475c} of ${payoffPositions475c.length} thread-resolution scenes (${(maxZ475c / payoffPositions475c.length * 100).toFixed(0)}%) fall within the ${zone475c} third — the story concentrates its dramatic satisfactions in one structural zone while the other two-thirds remain narratively open. A cluster of resolutions in the ${zone475c} zone creates a satisfaction burst surrounded by unresolved territory: if it is early, the audience has nothing to track for the rest of the script; if it is in the middle, both opening investment and closing reward are absent; if it is late, the entire script has been building without any delivered promises until the end. The most satisfying narrative architecture delivers resolutions throughout, proving at each stage that the story keeps what it plants.`,
          suggestedFix: `Redistribute at least one or two payoff scenes into the zones currently empty of resolution: advance a thread's payoff earlier if it creates breathing room before new threads open, or hold one later if it strengthens the climax. The goal is an architecture where the audience feels the story consistently delivering — not banking all its payoffs into one zone and leaving the others structurally inert.`,
        });
      }
    }
  }

  // ── Wave 489: DRAMATIC_TURN_TEMPORAL_CLUSTER, CLOCK_PEAK_UNCAUSED, SEED_AFTERMATH_CURIOSITY_VOID ──

  // DRAMATIC_TURN_TEMPORAL_CLUSTER — Distribution/timing × dramatic-turn × thirds.
  // n≥9, ≥4 scenes with a non-trivial dramatic turn (dramaticTurn not 'nothing'/empty/undefined).
  // >75% in a single structural third → fire. When the story's pivots, reversals, and twists all
  // land in one zone, the arc outside that zone lacks structural joints — it runs in a straight
  // line without the causal ruptures that generate new dramatic questions.
  // Distinct from: EMOTIONAL_ZONE_CLUSTER (Wave 475: emotionally charged scenes — different signal),
  // SEED_TEMPORAL_CLUSTER (Wave 475: clue-planting — different signal), PAYOFF_ZONE_CLUSTER
  // (Wave 475: thread resolutions — different signal; this completes the distribution/timing thirds
  // family for the four main narrative event types), DRAMATIC_TURN_CLUSTER (Wave 310: 3+ turns in a
  // 3-scene window — run-based local density, not arc-wide zone distribution).
  {
    const n489a = records.length;
    if (n489a >= 9) {
      const turnPositions489a = (records as any[])
        .map((r, pos) => ({
          pos,
          hasTurn: r.dramaticTurn !== undefined && r.dramaticTurn !== null &&
            r.dramaticTurn !== 'nothing' && r.dramaticTurn !== '',
        }))
        .filter(x => x.hasTurn)
        .map(x => x.pos);
      if (turnPositions489a.length >= 4) {
        const third489a = Math.floor(n489a / 3);
        const zone1489a = turnPositions489a.filter(p => p < third489a).length;
        const zone2489a = turnPositions489a.filter(p => p >= third489a && p < 2 * third489a).length;
        const zone3489a = turnPositions489a.filter(p => p >= 2 * third489a).length;
        const maxZ489a = Math.max(zone1489a, zone2489a, zone3489a);
        if (maxZ489a / turnPositions489a.length > 0.75) {
          const zoneName489a = zone1489a === maxZ489a ? 'opening' : zone2489a === maxZ489a ? 'middle' : 'closing';
          issues.push({
            location: `${maxZ489a}/${turnPositions489a.length} dramatic turn(s) in the ${zoneName489a} third`,
            rule: 'DRAMATIC_TURN_TEMPORAL_CLUSTER',
            severity: 'minor',
            description: `${maxZ489a} of ${turnPositions489a.length} dramatic-turn scenes (${(maxZ489a / turnPositions489a.length * 100).toFixed(0)}%) fall in the ${zoneName489a} structural third. The story concentrates its reversals, pivots, and structural joints in one zone while the other two-thirds run without causal rupture. Dramatic turns are the story's gear-shifts: they generate new questions, force new goals, and change the audience's expectations about what happens next. When turns cluster in one zone, the rest of the arc loses its structural musculature — audiences experience one burst of dramatic dislocation surrounded by long, joint-free stretches.`,
            suggestedFix: `Redistribute at least one or two dramatic turns out of the ${zoneName489a} cluster and into the zones currently without reversals. Not every new turn requires a major plot development: a reversal of expectation, a shifted goal, or a character choice that forecloses one path and opens another can serve as a structural joint. The goal is to give the audience new orientation points across all three thirds, not just in the ${zoneName489a} zone.`,
          });
        }
      }
    }
  }

  // CLOCK_PEAK_UNCAUSED — Single-peak isolation × backward-cause × clock channel.
  // n≥8. Find the scene with the highest clockDelta (time-pressure escalation). If it is at array
  // pos≥2 and neither of the 2 preceding scenes contains a structural driver (revelation, dramatic
  // turn, suspense rise, seeded clues, or non-neutral emotion) → fire. The story's maximum urgency
  // spike appears without a causal build — pressure materializes from narrative vacuum.
  // Distinct from: SUSPENSE_PEAK_UNCAUSED (Wave 433: same mode on the suspense channel — this is
  // the clock-channel complement), CLOCK_RAISE_NO_FALLOUT (Wave 391: aftermath check — what
  // follows a clock-raise; this checks backward-cause BEFORE the clock peak), CLOCK_RAISE_NO_
  // SUSPENSE / CLOCK_RAISE_CURIOSITY_VOID / CLOCK_RAISE_RELATIONSHIP_VOID / CLOCK_RAISED_NO_EMOTION
  // (average/aggregate or co-occurrence checks on the clock scene itself and its simultaneous signals
  // — different analytical mode and position).
  {
    const n489b = records.length;
    if (n489b >= 8) {
      const clockDeltas489b = (records as any[]).map(r => r.clockDelta ?? 0);
      const maxClockDelta489b = Math.max(...clockDeltas489b);
      if (maxClockDelta489b > 0) {
        const peakClockPos489b = clockDeltas489b.indexOf(maxClockDelta489b);
        if (peakClockPos489b >= 2) {
          const prior1_489b = records[peakClockPos489b - 1] as any;
          const prior2_489b = records[peakClockPos489b - 2] as any;
          const hasCause489b = [prior1_489b, prior2_489b].some(r =>
            r !== undefined && (
              (r.revelation !== null && r.revelation !== '' && r.revelation !== undefined) ||
              (r.dramaticTurn !== undefined && r.dramaticTurn !== 'nothing' && r.dramaticTurn !== '') ||
              (r.suspenseDelta ?? 0) > 0 ||
              ((r.seededClueIds ?? []).length > 0) ||
              (r.emotionalShift !== 'neutral')
            ),
          );
          if (!hasCause489b) {
            const peakScene = records[peakClockPos489b] as any;
            issues.push({
              location: `Scene ${peakScene.sceneIdx} (${peakScene.slug}) — peak clockDelta (${maxClockDelta489b}) appears without a prior causal driver`,
              rule: 'CLOCK_PEAK_UNCAUSED',
              severity: 'minor',
              description: `The scene with the highest time-pressure escalation (clockDelta ${maxClockDelta489b} at scene ${peakScene.sceneIdx}) has no structural driver in the two preceding scenes — no revelation, dramatic turn, suspense rise, planted clue, or emotional shift in scenes ${peakScene.sceneIdx - 2} and ${peakScene.sceneIdx - 1}. The story's maximum urgency spike arrives without a causal gradient: a clock that reaches its peak with no preparation reads as an arbitrary escalation rather than a built-up consequence of narrative events.`,
              suggestedFix: `Give scene ${peakScene.sceneIdx - 1} or ${peakScene.sceneIdx - 2} a structural driver that motivates the urgency peak: a revelation that creates the constraint, a dramatic turn that opens a new deadline, or a suspense escalation that makes the clock pressure legible as a story consequence rather than an authorial decree.`,
            });
          }
        }
      }
    }
  }

  // SEED_AFTERMATH_CURIOSITY_VOID — Sequence/aftermath × seed → curiosity aftermath.
  // n≥8, ≥3 seed scenes (seededClueIds.length > 0) not at last position. Average curiosityDelta of
  // the scene immediately following each seed scene ≤ 0. When seeds are planted, the next scene
  // never increases the audience's wondering — foreshadowing closes the field of questions rather
  // than opening it. The moment after a clue is planted is when the audience should be most primed
  // to wonder: what does this clue mean? what is being set up? If that aftermath is curiosity-zero
  // or curiosity-negative, the clue landed without igniting the wondering it was designed to fuel.
  // Distinct from: SEED_SCENE_CURIOSITY_VOID (Wave 363: checks the seed scene's OWN curiosityDelta
  // — whether curiosity rises IN the seed scene itself; this checks the NEXT scene's curiosityDelta),
  // CLUE_SEED_SUSPENSE_VOID (Wave 335: checks suspenseDelta of the seed scene itself — different
  // signal and different time slot), CURIOSITY_SPIKE_NO_FALLOUT (Wave 391: checks what follows a
  // CURIOSITY SPIKE, not what follows a SEED; different trigger signal), CURIOSITY_FRONT_LOADED
  // (Wave 268: global distribution of curiosity spikes — not seed-triggered aftermath).
  {
    const n489c = records.length;
    if (n489c >= 8) {
      const seedAndNext489c = (records as any[])
        .map((r, pos) => ({ pos, count: ((r.seededClueIds ?? []) as any[]).length }))
        .filter(x => x.count > 0 && x.pos < n489c - 1);
      if (seedAndNext489c.length >= 3) {
        const totalCurAftermath489c = seedAndNext489c.reduce((sum, x) => {
          return sum + ((records as any[])[x.pos + 1].curiosityDelta ?? 0);
        }, 0);
        const avgCurAftermath489c = totalCurAftermath489c / seedAndNext489c.length;
        if (avgCurAftermath489c <= 0) {
          issues.push({
            location: `${seedAndNext489c.length} seed scene(s) — avg next-scene curiosityDelta ${avgCurAftermath489c.toFixed(2)}`,
            rule: 'SEED_AFTERMATH_CURIOSITY_VOID',
            severity: 'minor',
            description: `The scene immediately following each of the ${seedAndNext489c.length} qualifying clue-planting scene(s) averages a curiosityDelta of ${avgCurAftermath489c.toFixed(2)}. Foreshadowing consistently fails to open wondering in what follows — seeds are planted and the next beat closes the epistemic field rather than igniting it. The scene after a planted clue is the moment of peak audience curiosity: they have just received a mystery, and the next scene should deepen or redirect that wondering. When the seed-aftermath is curiosity-neutral or curiosity-negative, the planted clue functions as an inert deposit rather than a wonder-generator.`,
            suggestedFix: `Engineer at least one seed scene whose immediately following scene increases curiosity: introduce a character who reacts to the planted clue with suspicion, add a new complication that makes the clue more urgent, or open a new question that the clue makes the audience want answered. The most effective foreshadowing creates a wondering cascade — the clue lands, and what follows makes the audience want to know more, not less.`,
          });
        }
      }
    }
  }

  // ── Wave 503 checks ──────────────────────────────────────────────────────────

  // REVELATION_AFTERMATH_SUSPENSE_VOID — Sequence/aftermath × revelation → suspense aftermath.
  // n≥8, ≥3 revelation scenes (revelation not null/empty/undefined) not at last position.
  // Average suspenseDelta of the scene immediately following each revelation ≤ 0.
  // A revelation is a high-stakes disclosure: the truth surfacing should tighten the story's grip,
  // raise the pressure, and make the audience feel that consequences are now in motion. When the
  // scene following a revelation consistently carries zero or negative suspenseDelta, the mystery
  // engine is causally disconnected from the tension engine: truths land without generating the
  // urgency that propels audience investment forward.
  // Distinct from: REVELATION_CURIOSITY_AFTERMATH_VOID (belief.ts Wave 502 — different pass and
  // different aftermath channel: curiosity, not suspense), SUSPENSE_SPIKE_NO_FALLOUT (Wave 349:
  // checks what follows a SUSPENSE SPIKE, not a revelation — different trigger), DRAMATIC_TURN_
  // AFTERMATH_VOID (Wave 296: aftermath of a dramatic turn — different trigger), SEED_AFTERMATH_
  // CURIOSITY_VOID (Wave 489: different trigger (seed) and different channel (curiosity)), all
  // revelation co-occurrence and single-scene correlation checks (own-scene analysis of the
  // revelation scene, not the scene that follows it).
  {
    const n503a = records.length;
    if (n503a >= 8) {
      const revAndNext503a = (records as any[])
        .map((r, pos) => ({
          pos,
          hasRev: r.revelation !== null && r.revelation !== '' && r.revelation !== undefined,
        }))
        .filter(x => x.hasRev && x.pos < n503a - 1);
      if (revAndNext503a.length >= 3) {
        const totalSusp503a = revAndNext503a.reduce(
          (sum, x) => sum + (((records as any[])[x.pos + 1] as any).suspenseDelta ?? 0),
          0,
        );
        const avgSusp503a = totalSusp503a / revAndNext503a.length;
        if (avgSusp503a <= 0) {
          issues.push({
            location: `${revAndNext503a.length} revelation scenes examined — avg post-revelation suspenseDelta ${avgSusp503a.toFixed(2)}`,
            rule: 'REVELATION_AFTERMATH_SUSPENSE_VOID',
            severity: 'minor',
            description: `Across ${revAndNext503a.length} revelations, the scene immediately following each averages a suspenseDelta of ${avgSusp503a.toFixed(2)} (≤ 0). Revelations should tighten the story's grip: when truth surfaces, the stakes clarify and the audience should feel mounting urgency about what comes next. When post-revelation scenes consistently carry zero or negative tension, the mystery engine and the suspense engine are causally disconnected — disclosures arrive but the pressure they should generate never follows.`,
            suggestedFix: `After each revelation, ensure the next scene raises at least a small amount of tension: a character who realises what the revealed truth means for them, a consequence that makes the situation more dangerous or urgent, or a new complication that the disclosure has set in motion. Revelations gain their power from the ripple they send through the scenes that follow.`,
          });
        }
      }
    }
  }

  // CLOCK_FINAL_THIRD_ABSENT — Zone presence/absence × clock × closing third.
  // n≥9, ≥2 clock scenes (clockRaised = true). None in the final structural third → fire.
  // The closing act is where deadline pressure should be highest — the story's ticking clocks
  // should be felt most acutely as the protagonist runs out of room. When no clock scene appears
  // in the final third, the urgency machinery goes silent exactly when stakes should peak. The
  // audience crosses into the resolution without any active deadline, which removes the structural
  // compulsion that drives engagement toward the climax.
  // Distinct from: CLOCK_CLUSTERING (Wave 282: >40% of clocks in first 40% — early overload, not
  // late absence), CLOCK_SINGLE_SCENE (Wave 268: only 1 clock raised in a long story — minimum
  // count, not zone presence), CLOCK_DELTA_WITHOUT_RAISE (Wave 296: time-pressure effects before a
  // clock is established — ordering/logic), CLOCK_PEAK_UNCAUSED (Wave 489: backward-cause on the
  // scene with highest clockDelta), all per-clock-scene signal checks (average/aggregate or co-
  // occurrence of other channels within clock scenes, not temporal placement). This is the first
  // zone presence/absence check applied specifically to the CLOSING third of the clock channel.
  {
    const n503b = records.length;
    if (n503b >= 9) {
      const clockPositions503b = (records as any[])
        .map((r, pos) => ({ pos, raised: !!(r.clockRaised) }))
        .filter(x => x.raised)
        .map(x => x.pos);
      if (clockPositions503b.length >= 2) {
        const third503b = Math.floor(n503b / 3);
        const inFinal503b = clockPositions503b.some(p => p >= 2 * third503b);
        if (!inFinal503b) {
          issues.push({
            location: `${clockPositions503b.length} clock scene(s) — none in the final structural third (scenes ${2 * third503b}–${n503b - 1})`,
            rule: 'CLOCK_FINAL_THIRD_ABSENT',
            severity: 'minor',
            description: `The script has ${clockPositions503b.length} scene(s) in which a deadline or urgency clock is raised, but none falls in the final structural third (scenes ${2 * third503b}–${n503b - 1}). Deadline machinery should be felt most acutely in the closing act: the protagonist's time running out, the ticking pressure cresting, the audience feeling the walls close in. When no clock appears in the final third, the story's urgency engine falls silent exactly when stakes should be highest — the resolution arrives without any active deadline compelling the protagonist forward.`,
            suggestedFix: `Ensure at least one clock or deadline scene lands in the final structural third. This does not require a new plot device: an existing clock from earlier can be re-invoked, a character can remind the protagonist of the remaining time, or a new constraint can be introduced that compresses the closing act. The function of a late-act clock is to give the audience a felt countdown toward the climax.`,
          });
        }
      }
    }
  }

  // POSITIVE_EMOTION_UNBROKEN_RUN — Run-based × valence × positive emotion.
  // n≥8, ≥3 positive-emotion scenes total. Longest consecutive run of scenes where emotionalShift
  // is 'positive' ≥ 4 → fire. A story's emotional arc needs adversity, reversal, and setback
  // distributed through its positive passages. When four or more consecutive scenes all register a
  // positive emotional shift, the protagonist's world is going well without complication for too
  // long — the dramatic engine idles, stakes evaporate, and audience investment weakens because
  // there is no felt cost or obstacle to track across the run.
  // Distinct from: EMOTIONAL_NEUTRAL_RUN (Wave 324: run of neutral — emotionally flat, not positive;
  // a run of positive emotion is a different failure: the story is emotionally present but uniformly
  // favourable rather than flat), SUSPENSE_UNRELEASED_RUN (Wave 324: run-based on suspense, not
  // emotion), CURIOSITY_DECLINE_RUN / SUSPENSE_DECLINE_RUN (Wave 433/447: negative-valence decline
  // runs in non-emotional channels), EMOTIONAL_POSITIVE_DESERT (Wave 282: zone ABSENCE of positive
  // scenes — the opposite problem), EMOTIONAL_ZONE_CLUSTER (Wave 475: distribution/timing on charged
  // scenes across thirds — different mode from consecutive-run analysis).
  {
    const n503c = records.length;
    if (n503c >= 8) {
      const posScenes503c = (records as any[]).filter((r: any) => r.emotionalShift === 'positive');
      if (posScenes503c.length >= 3) {
        let maxPosRun503c = 0;
        let curPosRun503c = 0;
        for (const r of records as any[]) {
          if (r.emotionalShift === 'positive') {
            if (++curPosRun503c > maxPosRun503c) maxPosRun503c = curPosRun503c;
          } else {
            curPosRun503c = 0;
          }
        }
        if (maxPosRun503c >= 4) {
          issues.push({
            location: `longest consecutive positive-emotion run: ${maxPosRun503c} scenes`,
            rule: 'POSITIVE_EMOTION_UNBROKEN_RUN',
            severity: 'minor',
            description: `The script contains a run of ${maxPosRun503c} consecutive scenes in which the emotional register is positive. A sustained positive run means the protagonist's world is going well without adversity, reversal, setback, or complication for ${maxPosRun503c} scenes — the dramatic engine idles. Audiences invest in stories through the felt cost of goals: when there is no obstacle, no failure, and no price to pay for four or more scenes in a row, the emotional arc loses its tension and the audience's investment weakens.`,
            suggestedFix: `Interrupt the positive run with at least one scene of adversity, cost, or complication — a setback, a revelation that complicates the good news, a relationship friction, or a consequence that makes the protagonist's positive progress feel precarious. Even a brief negative or neutral inflection breaks the complacency of a long positive run and restores the push-pull that makes the positive moments feel earned.`,
          });
        }
      }
    }
  }

  // ── Wave 517: PAYOFF_AFTERMATH_SUSPENSE_VOID, NEGATIVE_EMOTION_UNBROKEN_RUN,
  //              EMOTIONAL_CLOSING_THIRD_ABSENT ──────────────────────────────────────────────────

  // PAYOFF_AFTERMATH_SUSPENSE_VOID — Average/aggregate × payoff → suspense aftermath.
  // n≥8, ≥3 payoff scenes (payoffSetupIds non-empty) not at last position. If the average
  // suspenseDelta of the scene immediately following each qualifying payoff is ≤ 0 → fire.
  // A payoff is a structural completion: something the audience has been promised has arrived.
  // That arrival should redirect or tighten the dramatic stakes — the closed loop should
  // generate new pressure. When post-payoff scenes consistently carry zero or falling tension,
  // resolutions become endpoints rather than pivot points, and the audience's engagement
  // diminishes with each closed loop that generates nothing new. Distinct from: PAYOFF_SUSPENSE_
  // VOID (Wave 419: average/aggregate × the payoff scene's OWN suspenseDelta — within the scene;
  // this checks the FOLLOWING scene's suspenseDelta — aftermath direction). REVELATION_AFTERMATH_
  // SUSPENSE_VOID (Wave 503: same mode and aftermath channel, revelation trigger — different
  // trigger event). SEED_AFTERMATH_CURIOSITY_VOID (Wave 489: seed trigger, curiosity channel).
  {
    const n517a = records.length;
    if (n517a >= 8) {
      const qualPayoffs517a = (records as any[])
        .map((r, pos) => ({ r, pos }))
        .filter(({ r, pos }) => ((r.payoffSetupIds ?? []) as any[]).length > 0 && pos < n517a - 1);
      if (qualPayoffs517a.length >= 3) {
        const total517a = qualPayoffs517a.reduce(
          (sum, { pos }) => sum + (((records as any[])[pos + 1] as any).suspenseDelta ?? 0),
          0,
        );
        const avg517a = total517a / qualPayoffs517a.length;
        if (avg517a <= 0) {
          issues.push({
            location: `${qualPayoffs517a.length} payoff scenes examined — avg post-payoff suspenseDelta ${avg517a.toFixed(2)}`,
            rule: 'PAYOFF_AFTERMATH_SUSPENSE_VOID',
            severity: 'minor',
            description: `Across ${qualPayoffs517a.length} payoff scenes, the scene immediately following each averages a suspenseDelta of ${avg517a.toFixed(2)} (≤ 0). Payoffs should function as pivot points: a thread resolution closes one question but should redirect or tighten dramatic stakes so the next scene carries fresh pressure. When post-payoff scenes consistently carry zero or falling tension, resolutions become endpoints rather than pivots — the promise is delivered but the energy it releases goes nowhere, and the audience's engagement diminishes with each closed loop that generates nothing new.`,
            suggestedFix: `After each payoff scene, ensure the next scene raises at least a small amount of tension — a complication set in motion by the resolution, a new threat surfacing because a prior protection has been removed, or a consequence of the closed loop that re-pressurises the story. Payoffs are most dramatically productive when they generate new problems rather than simply marking the end of old ones.`,
          });
        }
      }
    }
  }

  // NEGATIVE_EMOTION_UNBROKEN_RUN — Run-based × valence × negative emotion.
  // n≥8, ≥3 negative-emotion scenes total. Longest consecutive run of scenes where emotionalShift
  // is 'negative' ≥ 4 → fire. A story's emotional arc needs both adversity and relief: the
  // protagonist must fall, but must also find moments of provisional success or temporary respite
  // that prevent the arc from collapsing into monotone suffering. Four or more consecutive
  // negative-emotion scenes produce sustained freefall without modulation — stakes cannot escalate
  // when the floor is already continuous loss, and the audience desensitises to the same polarity
  // repeated without contrast. Distinct from: POSITIVE_EMOTION_UNBROKEN_RUN (Wave 503: run of
  // positive — the opposite polarity; this checks the negative-polarity sibling, completing the
  // positive/negative pair for the emotion run family). EMOTIONAL_NEUTRAL_RUN (Wave 324: run of
  // neutral — flat rather than continuously negative; a fundamentally different register). SUSPENSE_
  // DECLINE_RUN (Wave 447: run of falling suspense — tension channel, not emotional shift). No
  // existing check detects 4+ consecutive scenes with emotionalShift='negative' as a run.
  {
    const n517b = records.length;
    if (n517b >= 8) {
      const negScenes517b = (records as any[]).filter((r: any) => r.emotionalShift === 'negative');
      if (negScenes517b.length >= 3) {
        let maxNegRun517b = 0;
        let curNegRun517b = 0;
        for (const r of records as any[]) {
          if (r.emotionalShift === 'negative') {
            if (++curNegRun517b > maxNegRun517b) maxNegRun517b = curNegRun517b;
          } else {
            curNegRun517b = 0;
          }
        }
        if (maxNegRun517b >= 4) {
          issues.push({
            location: `longest consecutive negative-emotion run: ${maxNegRun517b} scenes`,
            rule: 'NEGATIVE_EMOTION_UNBROKEN_RUN',
            severity: 'minor',
            description: `The script contains a run of ${maxNegRun517b} consecutive scenes in which the emotional register is negative. Sustained adversity without modulation desensitises the audience: when the fourth consecutive scene of loss, failure, or suffering arrives, it registers as more of the same rather than as an escalation. A story's emotional arc needs provisional successes, unexpected help, or moments of relief distributed through its negative passages — not to eliminate pressure, but to provide the contrast that makes the next negative beat land harder.`,
            suggestedFix: `Interrupt the negative run with at least one scene of provisional success, unexpected help, or a moment when the protagonist's situation briefly improves — even if later reversed. A single scene where something goes right in the middle of a sustained fall restores the audience's sense that the protagonist can still affect their situation, and makes the return to adversity feel like a genuine reversal rather than a continuation of the same slide.`,
          });
        }
      }
    }
  }

  // EMOTIONAL_CLOSING_THIRD_ABSENT — Zone presence/absence × closing third × emotional charge.
  // n≥9, ≥3 emotionally charged scenes (emotionalShift 'positive' or 'negative') globally.
  // If none fall in the final structural third → fire. The resolution of a screenplay should
  // be its most emotionally engaged zone: the protagonist reaches their climax and denouement
  // with the full accumulated weight of everything that has happened, and the audience expects
  // to feel the conclusion. When the closing third contains no emotionally charged scenes, the
  // resolution plays without any felt response — the audience is told what happened but not
  // moved by it. Distinct from: CLOCK_FINAL_THIRD_ABSENT (Wave 503: zone presence/absence ×
  // closing third × clock channel — urgency complement; this is the emotional-engagement
  // parallel). EMOTIONAL_ZONE_CLUSTER (Wave 475: distribution/timing × charged scenes across
  // thirds — fires when emotional scenes are CONCENTRATED in one zone, not absent from a
  // specific zone; this fires when the closing zone has ZERO charged scenes). EMOTIONAL_NEUTRAL_
  // RUN (Wave 324: run-based × consecutive neutral — temporal adjacency, not zone absence).
  // EMOTIONAL_POSITIVE_DESERT (Wave 282: Act 2 × positive emotion only — different zone and
  // different valence scope). First zone-presence/absence check on emotional charge in the
  // closing third.
  {
    const n517c = records.length;
    if (n517c >= 9) {
      const chargedPositions517c = (records as any[])
        .map((r, pos) => ({ r, pos }))
        .filter(({ r }) => r.emotionalShift === 'positive' || r.emotionalShift === 'negative');
      if (chargedPositions517c.length >= 3) {
        const third517c = Math.floor(n517c / 3);
        const inFinal517c = chargedPositions517c.some(({ pos }) => pos >= 2 * third517c);
        if (!inFinal517c) {
          issues.push({
            location: `${chargedPositions517c.length} emotionally charged scene(s) — none in the final third (scenes ${2 * third517c}–${n517c - 1})`,
            rule: 'EMOTIONAL_CLOSING_THIRD_ABSENT',
            severity: 'minor',
            description: `The script has ${chargedPositions517c.length} emotionally charged scenes (positive or negative emotional shift), but none fall in the final structural third (scenes ${2 * third517c}–${n517c - 1}). The closing act should be the most emotionally engaged zone of the screenplay: the protagonist reaches their climax and denouement with the full accumulated weight of everything that has happened, and the audience needs to feel the conclusion rather than merely observe it. When the closing third is emotionally inert, the resolution becomes a purely intellectual event — the audience is told what happened but not moved by it.`,
            suggestedFix: `Ensure at least one scene in the closing third carries an emotional shift — positive or negative. A climax is not just a plot event but an emotional event: the protagonist's decisive action, the revelation that reframes everything, or the loss or triumph that the whole story has been building toward should be felt. Even a single scene of emotional charge in the final act anchors the resolution in the audience's nervous system rather than their intellect.`,
          });
        }
      }
    }
  }

  // ── Wave 531: SUSPENSE_SPIKE_RELATIONSHIP_VOID, CLOCK_TEMPORAL_CLUSTER, SEED_AFTERMATH_SUSPENSE_VOID ──

  // SUSPENSE_SPIKE_RELATIONSHIP_VOID — Co-occurrence/decoupling × high suspense × relationship.
  // n≥8, ≥2 scenes with suspenseDelta > 1 (genuine high-suspense spikes), ≥2 scenes with non-empty
  // relationshipShifts. None of the high-suspense scenes carries a relationship shift → fire.
  // Crisis and danger are among the most powerful catalysts for relationship movement: what people
  // do under pressure reveals who they are, and stress is how bonds are made and broken. When every
  // high-suspense scene is also relationship-free, the story's most tense moments operate in a social
  // vacuum — danger has no interpersonal dimension and the audience cannot feel the human stakes.
  // Distinct from: SUSPENSE_SPIKE_NO_EMOTION (Wave 391: co-occurrence × high suspense × emotion —
  // different channel), SUSPENSE_SPIKE_NO_CURIOSITY (Wave 377: co-occurrence × high suspense ×
  // curiosity — different channel), DRAMATIC_TURN_RELATIONSHIP_VOID (Wave 447: co-occurrence ×
  // dramatic-turn × relationship — different trigger), CLOCK_RAISE_RELATIONSHIP_VOID (Wave 419:
  // co-occurrence × clock × relationship — different trigger). This completes the suspense-spike
  // co-occurrence set across the emotion, curiosity, fallout, and relationship channels.
  {
    const n531a = records.length;
    if (n531a >= 8) {
      const highSuspScenes531a = (records as any[]).filter(r => (r.suspenseDelta ?? 0) > 1);
      if (highSuspScenes531a.length >= 2) {
        const relShiftScenes531a = (records as any[]).filter(r => ((r.relationshipShifts ?? []) as any[]).length > 0);
        if (relShiftScenes531a.length >= 2) {
          const anyOverlap531a = highSuspScenes531a.some(r => ((r.relationshipShifts ?? []) as any[]).length > 0);
          if (!anyOverlap531a) {
            issues.push({
              location: `${highSuspScenes531a.length} high-suspense scene(s) — none carries a relationship shift (${relShiftScenes531a.length} relationship-shift scene(s) exist elsewhere)`,
              rule: 'SUSPENSE_SPIKE_RELATIONSHIP_VOID',
              severity: 'minor',
              description: `The script has ${highSuspScenes531a.length} high-suspense scene(s) (suspenseDelta > 1) and ${relShiftScenes531a.length} scene(s) with relationship shifts, but these two channels never co-occur. Every moment of peak danger, threat, or urgency is interpersonally inert — no bond is tested, strained, or changed when stakes are highest. Crisis and danger are among the most powerful catalysts for relationship movement: fear reveals character, shared threat builds solidarity, and betrayal under pressure destroys trust. A story where all tension spikes occur in a relational vacuum misses the opportunity to make danger personally felt and to use the story's most intense moments as engines of interpersonal change.`,
              suggestedFix: `Introduce a relationship dimension to at least one of the high-suspense scenes: let the danger force a choice between characters, expose a hidden conflict, produce an act of loyalty or betrayal, or tighten an alliance under fire. Even a small relationship shift — a trust strained, a bond deepened by shared fear — roots the suspense spike in the interpersonal fabric that makes the audience care about the outcome beyond the immediate physical stakes.`,
            });
          }
        }
      }
    }
  }

  // CLOCK_TEMPORAL_CLUSTER — Distribution/timing × clock × thirds.
  // n≥9, ≥3 scenes with clockRaised=true. >75% of clock-raised scenes fall in a single structural
  // third → fire. When deadline-establishing scenes cluster in one zone, the urgency architecture is
  // confined — the other two-thirds carry no raised clock pressure, and the story asks the audience
  // to sustain deadline anxiety from a signal that is architecturally absent in most of the arc.
  // Distinct from: CLOCK_CLUSTERING (Wave 282: >50% of clocks in the first 40% — binary first-half
  // partition, fixed zone, and different threshold; this checks arc-wide concentration across any
  // zone with a stricter >75% threshold), CLOCK_FINAL_THIRD_ABSENT (Wave 503: zone presence/absence
  // — fires when closing third has ZERO clock scenes; this fires when one third has >75% of all clock
  // scenes regardless of which third), DRAMATIC_TURN_TEMPORAL_CLUSTER (Wave 489: same analytical
  // mode × dramatic-turn channel — different signal; this completes the distribution/timing thirds
  // family adding the clock channel).
  {
    const n531b = records.length;
    if (n531b >= 9) {
      const clockPositions531b = (records as any[])
        .map((r, pos) => ({ pos, raised: (r.clockRaised) === true }))
        .filter(x => x.raised)
        .map(x => x.pos);
      if (clockPositions531b.length >= 3) {
        const third531b = Math.floor(n531b / 3);
        const zone1531b = clockPositions531b.filter(p => p < third531b).length;
        const zone2531b = clockPositions531b.filter(p => p >= third531b && p < 2 * third531b).length;
        const zone3531b = clockPositions531b.filter(p => p >= 2 * third531b).length;
        const maxZ531b = Math.max(zone1531b, zone2531b, zone3531b);
        if (maxZ531b / clockPositions531b.length > 0.75) {
          const zoneName531b = zone1531b === maxZ531b ? 'opening' : zone2531b === maxZ531b ? 'middle' : 'closing';
          issues.push({
            location: `${maxZ531b}/${clockPositions531b.length} clock-raised scene(s) in the ${zoneName531b} third`,
            rule: 'CLOCK_TEMPORAL_CLUSTER',
            severity: 'minor',
            description: `${maxZ531b} of ${clockPositions531b.length} deadline-establishing scenes (${(maxZ531b / clockPositions531b.length * 100).toFixed(0)}%) fall in the ${zoneName531b} structural third. The story concentrates its urgency architecture in one zone while the other two-thirds carry no raised deadline pressure. Clock scenes are the story's urgency anchors: when they cluster in a single zone, the portions outside that zone lose the ticking-clock pressure that sustains forward momentum and gives the audience a felt sense that time is running out. A story where all deadlines are established in the ${zoneName531b} zone creates a lopsided urgency profile — intense in one section, structurally inert in the others.`,
            suggestedFix: `Redistribute at least one clock-raise scene into the zone(s) currently without deadline pressure. Not every new clock needs to be a major deadline: a secondary ticking constraint, a reminder of an existing deadline in a new context, or a sub-urgency that tightens the audience's time-awareness can serve as a distributional anchor. The goal is a script where deadline pressure is structurally distributed across all three zones, giving the audience a consistent sense that time is a governing force rather than a localized one.`,
          });
        }
      }
    }
  }

  // SEED_AFTERMATH_SUSPENSE_VOID — Sequence/aftermath × seed → suspenseDelta aftermath.
  // n≥8, ≥3 seed scenes (seededClueIds.length > 0) not at last position. Average suspenseDelta of
  // the scene immediately following each seed scene ≤ 0 → fire. The scene after a planted clue
  // carries a structural promise: something is coming. That promise should add forward pressure even
  // before the payoff arrives. When seeds are planted and the immediately following scene has zero or
  // negative suspenseDelta, the clue functions as ambient decoration rather than as the first push of
  // accumulating dread — the audience receives the foreshadowing but feels no increase in stakes.
  // Distinct from: SEED_AFTERMATH_CURIOSITY_VOID (Wave 489: same aftermath structure × curiosity
  // channel — checks whether the next scene's curiosityDelta ≤ 0; this checks suspenseDelta), CLUE_
  // SEED_SUSPENSE_VOID (Wave 335: checks suspenseDelta of the SEED SCENE ITSELF — own-scene
  // co-occurrence, not aftermath; different analytical mode and time slot), SUSPENSE_SPIKE_NO_FALLOUT
  // (Wave 349: checks what follows a suspense SPIKE, not a seed scene — different trigger), SEED_
  // SCENE_CURIOSITY_VOID (Wave 363: own-scene curiosity analysis — different channel and different mode).
  {
    const n531c = records.length;
    if (n531c >= 8) {
      const seedAndNext531c = (records as any[])
        .map((r, pos) => ({ pos, count: ((r.seededClueIds ?? []) as any[]).length }))
        .filter(x => x.count > 0 && x.pos < n531c - 1);
      if (seedAndNext531c.length >= 3) {
        const totalSuspAftermath531c = seedAndNext531c.reduce((sum, x) => {
          return sum + (((records as any[])[x.pos + 1] as any).suspenseDelta ?? 0);
        }, 0);
        const avgSuspAftermath531c = totalSuspAftermath531c / seedAndNext531c.length;
        if (avgSuspAftermath531c <= 0) {
          issues.push({
            location: `${seedAndNext531c.length} seed scene(s) — avg next-scene suspenseDelta ${avgSuspAftermath531c.toFixed(2)}`,
            rule: 'SEED_AFTERMATH_SUSPENSE_VOID',
            severity: 'minor',
            description: `The scene immediately following each of the ${seedAndNext531c.length} qualifying clue-planting scene(s) averages a suspenseDelta of ${avgSuspAftermath531c.toFixed(2)}. Foreshadowing consistently fails to tighten the story's grip in what follows — seeds are planted, but the next beat releases or holds tension rather than pressing it forward. The scene after a planted clue should carry a felt increase in pressure: the audience has received a mystery or a warning, and the narrative should lean into that promise by adding urgency to what follows. When the seed-aftermath is suspense-neutral or suspense-negative, foreshadowing functions as inert information deposit rather than as the opening push of an accumulating dread engine.`,
            suggestedFix: `Ensure at least one seed scene is followed by a scene with a positive suspenseDelta: introduce a complication that makes the seeded element feel more threatening, raise a secondary deadline connected to the planted clue, or have a character react to the implications of what was planted in a way that increases felt stakes. The most effective foreshadowing is not just informational — it makes the audience feel the weight of what is coming rather than merely registering that something has been set up.`,
          });
        }
      }
    }
  }

  // ── Wave 545: PAYOFF_AFTERMATH_CURIOSITY_VOID, EMOTIONAL_OPENING_THIRD_ABSENT,
  //              SEED_STASIS_RUN ──────────────────────────────────────────────────────────────────

  // PAYOFF_AFTERMATH_CURIOSITY_VOID (average/aggregate × payoff → curiosity aftermath, n≥8,
  // ≥3 qualifying payoff scenes [pos < n-1], avg curiosityDelta of scenes immediately following
  // each qualifying payoff ≤ 0): Every thread-resolution scene is followed by a beat where the
  // audience's field of open questions shrinks or holds flat rather than opening new wondering.
  // A payoff's job is two-directional: it closes a narrative promise AND it should ideally prime
  // the audience toward what comes next. When the average curiosityDelta of post-payoff scenes is
  // ≤ 0, resolutions operate as closures only — the audience finishes each answered promise without
  // a new question forming to replace it. The story's mystery engine and its resolution engine run
  // as separate systems. Average/aggregate mode × payoff trigger × curiosity aftermath channel.
  // Distinct from PAYOFF_CURIOSITY_DECOUPLED (Wave 335: checks the payoff scene's OWN
  // curiosityDelta ≤ 0 — the payoff scene doesn't generate curiosity in the same beat; this
  // checks the FOLLOWING scene — aftermath direction, one temporal step later), PAYOFF_AFTERMATH_
  // SUSPENSE_VOID (Wave 517: same structure × suspense channel — the suspense-aftermath complement),
  // SEED_AFTERMATH_CURIOSITY_VOID (Wave 489: seed as trigger, not payoff).
  {
    const n545a = records.length;
    if (n545a >= 8) {
      const payoffAndNext545a = (records as any[])
        .map((r, pos) => ({ pos, count: ((r.payoffSetupIds ?? []) as any[]).length }))
        .filter(x => x.count > 0 && x.pos < n545a - 1);
      if (payoffAndNext545a.length >= 3) {
        const totalCurAftermath545a = payoffAndNext545a.reduce((sum, x) => {
          return sum + (((records as any[])[x.pos + 1] as any).curiosityDelta ?? 0);
        }, 0);
        const avgCurAftermath545a = totalCurAftermath545a / payoffAndNext545a.length;
        if (avgCurAftermath545a <= 0) {
          issues.push({
            location: `${payoffAndNext545a.length} payoff scene(s) — avg next-scene curiosityDelta ${avgCurAftermath545a.toFixed(2)}`,
            rule: 'PAYOFF_AFTERMATH_CURIOSITY_VOID',
            severity: 'minor',
            description: `The scene immediately following each of the ${payoffAndNext545a.length} qualifying payoff scene(s) averages a curiosityDelta of ${avgCurAftermath545a.toFixed(2)} — resolutions consistently fail to reopen the audience's field of questions. A payoff completes a narrative promise, but its most durable dramatic function is also to make the audience wonder what comes next: a closed thread should raise a new question, complicate an existing one, or create the conditions for a new mystery. When the post-payoff scene averages zero or negative curiosityDelta, thread resolutions operate as pure closures — the audience receives an answer without being primed toward the next unknown. Each satisfied promise drains the story's forward tension without replenishing it.`,
            suggestedFix: `After at least one payoff scene, let the following beat introduce a new question, complication, or uncertainty — a detail that the resolution has now made possible to notice, a consequence of the closed thread that creates new wondering, or a character whose reaction to the resolution opens a fresh dramatic question. The payoff is the moment when the audience is most receptive to a new mystery: their curiosity has just been satisfied and is ready to engage with the next unknown.`,
          });
        }
      }
    }
  }

  // EMOTIONAL_OPENING_THIRD_ABSENT (zone presence/absence × emotional charge × opening third,
  // n≥9, ≥3 emotionally charged scenes [emotionalShift ≠ 'neutral'], none in the opening third
  // [pos < floor(n/3)]): The story's first structural zone — the establishment section — is
  // completely emotionally flat while the rest of the narrative carries felt emotional charge.
  // The opening third's job is to anchor the audience to characters through felt stakes: the
  // protagonist's desire must be felt, not just described, for the conflict's eventual escalation
  // to carry weight. When the opening third is entirely emotionally neutral, the audience spends
  // the establishment section watching events that register intellectually but don't land as
  // emotionally consequential — the first impression is one of narrative flatness. Zone presence/
  // absence mode × emotional charge × opening zone. Distinct from EMOTIONAL_CLOSING_THIRD_ABSENT
  // (Wave 517: closing zone — the story's resolution is emotionally flat; different zone),
  // EMOTIONAL_ZONE_CLUSTER (Wave 475: distribution/timing × thirds — fires when >75% of charged
  // scenes concentrate in one third; this fires when the OPENING THIRD SPECIFICALLY has zero;
  // opposite problem in the same family), EMOTIONAL_NEUTRAL_RUN (Wave 324: run-based — fires on
  // 6+ consecutive neutral scenes regardless of structural position).
  {
    const n545b = records.length;
    if (n545b >= 9) {
      const thirdEnd545b = Math.floor(n545b / 3);
      const chargedScenes545b = (records as any[]).filter(r => r.emotionalShift !== 'neutral');
      if (chargedScenes545b.length >= 3) {
        const openingCharged545b = (records as any[]).filter(
          (r, i) => i < thirdEnd545b && r.emotionalShift !== 'neutral',
        );
        if (openingCharged545b.length === 0) {
          issues.push({
            location: `Opening third (scenes 0–${thirdEnd545b - 1}) — no emotionally charged scene`,
            rule: 'EMOTIONAL_OPENING_THIRD_ABSENT',
            severity: 'minor',
            description: `The opening third of the story (scenes 0–${thirdEnd545b - 1}) contains no emotionally charged scene — every scene in the establishment zone has a neutral emotional shift — while ${chargedScenes545b.length} charged scenes exist in the subsequent two-thirds. The opening third's job is to anchor the audience to characters through felt stakes: the protagonist's desire, fear, or attachment must be emotionally registered in the opening zone for the story's eventual conflict to carry weight. When the first structural zone is entirely emotionally neutral, the audience spends the establishment section watching events that register intellectually but don't land as emotionally consequential — the story's initial contract is one of observation rather than investment.`,
            suggestedFix: `Place at least one emotionally charged scene in the opening third (scenes 0–${thirdEnd545b - 1}) — a moment where the protagonist experiences something that generates felt positive or negative emotion rather than neutral observation. The charged scene doesn't need to be a crisis: a small but genuine moment of joy, fear, hope, or loss in the opening zone tells the audience that they are watching a story that intends to make them feel something, and gives them an emotional stake that the subsequent conflict can then threaten or reward.`,
          });
        }
      }
    }
  }

  // SEED_STASIS_RUN (run-based × seed-absence × seed channel, n≥8, ≥3 seed scenes
  // [seededClueIds.length > 0], max consecutive non-seed scenes ≥ 7): An unbroken stretch of ≥7
  // scenes passes without any clue being planted, even though ≥3 seed scenes exist elsewhere.
  // The foreshadowing engine goes completely silent during its longest uninterrupted stretch —
  // no new mystery thread is opened, no detail is placed that will pay off later. Seeds are the
  // structural mechanism of forward momentum: each planted clue is a promise that the audience
  // will subconsciously track toward resolution. A drought of 7+ consecutive unseeded scenes means
  // the audience passes an extended zone where no new promises are being made — the story is
  // consuming its existing setup without replenishing it. Run-based × seed-absence. Distinct from
  // SEED_TEMPORAL_CLUSTER (Wave 475: distribution/timing × thirds — fires when >75% of seeds
  // concentrate in one third, not when a specific sustained run is seed-free), CLUE_SEED_CLUSTER
  // (Wave 254: per-scene overconcentration — 3+ seeds in one scene, the opposite problem),
  // SEED_AFTERMATH_CURIOSITY_VOID and SEED_AFTERMATH_SUSPENSE_VOID (aftermath mode, not run-based
  // absence), the seed co-occurrence checks (same scene, different mode).
  if (records.length >= 8) {
    const seedSceneIdxSet545c = new Set(
      (records as any[])
        .filter(r => ((r.seededClueIds ?? []) as any[]).length > 0)
        .map(r => r.sceneIdx),
    );
    if (seedSceneIdxSet545c.size >= 3) {
      let maxGap545c = 0, curGap545c = 0;
      for (const r of records as any[]) {
        if (seedSceneIdxSet545c.has(r.sceneIdx)) {
          if (curGap545c > maxGap545c) maxGap545c = curGap545c;
          curGap545c = 0;
        } else {
          curGap545c++;
        }
      }
      if (curGap545c > maxGap545c) maxGap545c = curGap545c;
      if (maxGap545c >= 7) {
        issues.push({
          location: `Seed stasis — ${maxGap545c} consecutive scenes carry no planted clue`,
          rule: 'SEED_STASIS_RUN',
          severity: 'minor',
          description: `An unbroken run of ${maxGap545c} consecutive scenes passes without any planted clue — no seededClueIds, no new foreshadowing signal — even though ${seedSceneIdxSet545c.size} seed scenes exist elsewhere. The foreshadowing engine goes completely silent during its longest uninterrupted stretch: no new mystery thread is opened, no detail is placed that will pay off later. Seeds are the structural mechanism of forward momentum: each planted clue is a promise the audience will subconsciously track toward eventual resolution. A ${maxGap545c}-scene seed drought means the audience passes an extended zone where no new promises are being made — the story consumes its existing setup without replenishing it. The cumulative effect is a growing sense that the story has stopped investing in its future, which weakens the audience's anticipatory engagement.`,
          suggestedFix: `Plant at least one new clue within the ${maxGap545c}-scene drought — a detail, object, behavior, or piece of information that will pay off in a later scene. The seed doesn't need to be obviously significant: the best seeds often feel incidental in their placing and only become meaningful in retrospect. Breaking the drought with a single planted detail restores the audience's sense that the story is consistently preparing for something, not just playing out existing momentum.`,
        });
      }
    }
  }

  // ── Wave 559: RELATIONSHIP_SHIFT_UNCAUSED, RELATIONSHIP_CLOSING_THIRD_ABSENT,
  //              PAYOFF_RELATIONSHIP_AFTERMATH_VOID ───────────────────────────────────────────────
  {
    // RELATIONSHIP_SHIFT_UNCAUSED (backward-cause × relationship channel, n≥8, ≥3 relationship-
    // shift scenes at pos≥2, ALL preceded in the 2 prior scenes by no suspense rise/revelation/
    // dramatic turn): Every bond movement in the script arrives without any visible causal
    // driver — relationships change with no upstream force generating the change. The natural
    // mechanism of relational change is narrative pressure: a revelation that exposes the truth
    // of a relationship, a dramatic turn that recontextualizes how characters relate to each
    // other, or a suspense spike that forces characters into proximity or conflict that moves
    // their bond. When all relationship shifts emerge from calm, driver-free sequences, the
    // relational changes feel arbitrary rather than earned — the audience sees the bond move
    // without seeing what moved it. Backward-cause mode × relationship channel. Distinct from
    // all other backward-cause checks in this pass (SUSPENSE_SPIKE_WITHOUT_CAUSE, CURIOSITY_SPIKE_
    // WITHOUT_CAUSE, POSITIVE_REACTION_WITHOUT_CAUSE, DRAMATIC_TURN_WITHOUT_CAUSE, SUSPENSE_PEAK_
    // UNCAUSED, CLOCK_PEAK_UNCAUSED — all check different SIGNAL channels as the effect), from
    // DRAMATIC_TURN_RELATIONSHIP_VOID (Wave 447: co-occurrence × same scene — whether turns and
    // relationship shifts ever COINCIDE; this checks backward causation, different direction and
    // window), from RELATIONSHIP_STASIS_RUN (Wave 461: run-based × relationship-absence — fires
    // on gaps between shifts, not on the causal history of the shifts).
    if (records.length >= 8) {
      const qualRelShifts559a = (records as any[])
        .map((r, pos) => ({ r, pos }))
        .filter(({ r, pos }) => ((r.relationshipShifts ?? []) as any[]).length > 0 && pos >= 2);
      if (qualRelShifts559a.length >= 3) {
        const allUncaused559a = qualRelShifts559a.every(({ pos }) => {
          for (let off = 1; off <= 2; off++) {
            const prior = (records as any[])[pos - off];
            if ((prior.suspenseDelta ?? 0) > 0) return false;
            if (prior.revelation !== null && prior.revelation !== undefined && prior.revelation !== '') return false;
            if ((prior.dramaticTurn ?? 'nothing') !== 'nothing' && prior.dramaticTurn !== '') return false;
          }
          return true;
        });
        if (allUncaused559a) {
          issues.push({
            location: `${qualRelShifts559a.length} relationship-shift scene(s) — none preceded by suspense, revelation, or turn in prior 2 scenes`,
            rule: 'RELATIONSHIP_SHIFT_UNCAUSED',
            severity: 'minor',
            description: `Every relationship-shift scene (${qualRelShifts559a.length} instances at position ≥2) is preceded in the two prior scenes by no suspense rise, revelation, or dramatic turn — bond changes arrive without any visible narrative driver. The natural mechanism of relational change is pressure: a revelation that exposes the truth of a relationship, a dramatic turn that recontextualizes how characters relate, or a suspense spike that forces characters into conflict or proximity that moves the bond. When all relationship shifts emerge from calm, driver-free sequences, the relational changes feel arbitrary rather than earned — the audience sees the bond move without the story showing what moved it. The relational engine operates in a causal vacuum, decoupled from every other structural event.`,
            suggestedFix: `Before at least one relationship-shift scene, ensure the two preceding scenes carry a driver: a revelation that reframes the relationship, a dramatic turn that puts pressure on the bond, or a suspense spike that forces characters into a situation where the relationship must change. The cleaner the causal chain (driver → relationship shift), the more the audience feels they understand the story's relational logic.`,
          });
        }
      }
    }

    // RELATIONSHIP_CLOSING_THIRD_ABSENT (zone presence/absence × relationship channel × closing
    // third, n≥9, ≥3 relationship-shift scenes globally, 0 in the final third [pos ≥ 2n/3]):
    // All bond dynamics in the story resolve before the climax — the final third contains no
    // relationship movement while ≥3 relationship shifts exist in the first two-thirds. The
    // closing third of a screenplay is typically where interpersonal consequences peak: the
    // protagonist's arc of relational change should culminate in the climax and denouement, not
    // complete itself in the midpoint and leave the finale interpersonally static. When no
    // relationship shift occurs in the final third, the story's climax is entirely relational-
    // vacuum — characters reach the resolution with their bonds already settled, and the finale
    // can only work with what the audience already knows about how characters relate. Zone
    // presence/absence mode × relationship channel. Distinct from EMOTIONAL_CLOSING_THIRD_ABSENT
    // (Wave 517: emotion not relationship — fires when the emotional channel is absent from the
    // closing third), CLOCK_FINAL_THIRD_ABSENT (Wave 503: clock not relationship), RELATIONSHIP_
    // STASIS_RUN (Wave 461: run-based × consecutive scenes with no shift — fires on the length
    // of a gap anywhere in the story, not specifically on the closing structural zone).
    if (records.length >= 9) {
      const relShiftPositions559b = (records as any[])
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => ((r.relationshipShifts ?? []) as any[]).length > 0)
        .map(({ i }) => i);
      if (relShiftPositions559b.length >= 3) {
        const closingStart559b = Math.ceil(records.length * 2 / 3);
        const inFinal559b = relShiftPositions559b.some(i => i >= closingStart559b);
        if (!inFinal559b) {
          issues.push({
            location: `${relShiftPositions559b.length} relationship-shift scene(s) — none in the final third (scenes ${closingStart559b}–${records.length - 1})`,
            rule: 'RELATIONSHIP_CLOSING_THIRD_ABSENT',
            severity: 'minor',
            description: `The script has ${relShiftPositions559b.length} relationship-shift scenes, all occurring before the final third (scene ${closingStart559b} onward). The closing third — from approximately the 67% mark through the end — contains no bond movement. The climax and denouement arrive with the story's interpersonal dynamics already settled: characters reach the resolution with their relationships in a fixed state, and the finale can only work with what the audience already knows about how they relate. A story's interpersonal peak typically belongs in the closing section: the alliance that decides the climax, the betrayal that makes the resolution possible or impossible, or the reconciliation that gives the denouement its emotional payoff. When the relational channel goes silent before the finale, the story's conclusion is structurally weaker.`,
            suggestedFix: `Introduce at least one relationship shift in the final third — a bond move that matters to how the climax and resolution play out. The closing-third relationship shift need not be a dramatic reversal: even a small movement in a key relationship (an acknowledgment, a severance, a reconciliation) gives the finale an interpersonal dimension that makes the resolution feel humanly earned rather than purely plot-mechanical.`,
          });
        }
      }
    }

    // PAYOFF_RELATIONSHIP_AFTERMATH_VOID (average/aggregate × payoff → relationship aftermath,
    // n≥8, ≥3 qualifying payoff scenes [pos<n-1], all scenes immediately following a payoff
    // carry no relationship shifts): Thread resolutions never ripple into bond changes — the
    // scene immediately after each payoff passes without any relationship shift, even though
    // payoffs elsewhere in the story coincide with relationship movement. A payoff at its most
    // structurally productive does more than close a thread: it changes how characters relate
    // to each other because of what was resolved. When the scene after every payoff contains
    // no relationship shift, resolutions complete their promises in a relational vacuum — the
    // resolved thread doesn't alter any bond, and the story's resolution layer is decoupled
    // from its relational layer. Average/aggregate mode × payoff trigger × relationship
    // aftermath. Distinct from PAYOFF_RELATIONSHIP_VOID (Wave 461: co-occurrence × same scene —
    // the payoff SCENE ITSELF carries no relationship shift; this checks the FOLLOWING scene —
    // aftermath direction, one temporal step later), PAYOFF_AFTERMATH_SUSPENSE_VOID (Wave 517:
    // same aftermath structure × suspense channel — not relationship), PAYOFF_AFTERMATH_CURIOSITY_
    // VOID (Wave 545: same structure × curiosity channel — not relationship).
    if (records.length >= 8) {
      const qualPayoffPos559c = (records as any[])
        .map((r, pos) => ({ r, pos }))
        .filter(({ r, pos }) => ((r.payoffSetupIds ?? []) as string[]).length > 0 && pos < records.length - 1)
        .map(({ pos }) => pos);
      if (qualPayoffPos559c.length >= 3) {
        const allRelVoid559c = qualPayoffPos559c.every(pos => {
          const next = (records as any[])[pos + 1];
          return ((next.relationshipShifts ?? []) as any[]).length === 0;
        });
        if (allRelVoid559c) {
          issues.push({
            location: `${qualPayoffPos559c.length} qualifying payoff scene(s) — none followed by a relationship shift`,
            rule: 'PAYOFF_RELATIONSHIP_AFTERMATH_VOID',
            severity: 'minor',
            description: `Every payoff scene (${qualPayoffPos559c.length} instances not at the last position) is immediately followed by a scene with no relationship shift — thread resolutions never ripple into bond changes. A payoff is most structurally productive when it does more than close a thread: the resolved promise changes how characters relate to each other because of what was settled. When the scene after every payoff passes with no relationship shift, resolutions operate in a relational vacuum — the story resolves its planted threads without any of those resolutions altering the interpersonal landscape. The payoff layer and the relationship layer are decoupled in the moment immediately after resolution, the scene most receptive to interpersonal consequence.`,
            suggestedFix: `After at least one payoff, let the immediately following scene carry a relationship shift generated by what was just resolved: a bond that changes because the threat was eliminated, an alliance that forms or breaks because the promise was kept or broken, or a dynamic that shifts because both characters now know what the payoff revealed. Even a small relationship move in the wake of a payoff gives the resolution an interpersonal dimension — the story resolves not just its plots but its people.`,
          });
        }
      }
    }
  }

  // ── Wave 573: RELATIONSHIP_OPENING_THIRD_ABSENT, SUSPENSE_TEMPORAL_CLUSTER,
  //              CURIOSITY_TEMPORAL_CLUSTER ────────────────────────────────────────────────────────
  {
    // RELATIONSHIP_OPENING_THIRD_ABSENT (zone presence/absence × relationship × opening third,
    // n≥9, ≥3 relationship-shift scenes globally, 0 in the opening third [pos < floor(n/3)]):
    // The story's opening act is entirely devoid of relationship movement while ≥3 bond
    // shifts exist later — no interpersonal dynamics are established or tested early, leaving
    // the audience without relational stakes to carry into the story's middle. The opening
    // third is where audiences form expectations about the characters' relationships; when no
    // bond moves during this window, the story delays all relational engagement to the middle
    // and closing sections, starting from a position of interpersonal stasis rather than
    // established relational tension. Zone presence/absence mode × relationship channel ×
    // opening-third position. Distinct from RELATIONSHIP_CLOSING_THIRD_ABSENT (Wave 559b:
    // checks the CLOSING third — this checks the OPENING third, opposite structural position),
    // EMOTIONAL_CLOSING_THIRD_ABSENT (Wave 517: emotion not relationship), CLOCK_FINAL_THIRD_
    // ABSENT (clock not relationship), RELATIONSHIP_STASIS_RUN (Wave 461: run-based × gaps —
    // fires when any consecutive-scene drought is too long, regardless of structural zone).
    if (records.length >= 9) {
      const relShiftPositions573a = (records as any[])
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => ((r.relationshipShifts ?? []) as any[]).length > 0)
        .map(({ i }) => i);
      if (relShiftPositions573a.length >= 3) {
        const openingEnd573a = Math.floor(records.length / 3);
        const inOpening573a = relShiftPositions573a.some(i => i < openingEnd573a);
        if (!inOpening573a) {
          issues.push({
            location: `${relShiftPositions573a.length} relationship-shift scene(s) — none in the opening third (scenes 0–${openingEnd573a - 1})`,
            rule: 'RELATIONSHIP_OPENING_THIRD_ABSENT',
            severity: 'minor',
            description: `The script has ${relShiftPositions573a.length} relationship-shift scenes, none occurring in the opening third (scenes 0–${openingEnd573a - 1}). The first act is entirely devoid of relationship movement — no bonds are established, tested, or strained during the window where audiences form their relational expectations. The opening third is the story's relational foundation: the audience needs to see at least one bond in motion early to understand what relationships are at stake and to generate interpersonal investment before the midpoint and climax. When all bond dynamics begin in the middle or closing section, the story's early act is interpersonally static, asking the audience to care about relationships that haven't yet been shown to move.`,
            suggestedFix: `Introduce at least one relationship shift in the opening third (scenes 0–${openingEnd573a - 1}) — a bond move that establishes what is at stake interpersonally before the midpoint. Even a small relational gesture early (a shift in alliance, a trust that erodes, a connection that deepens) gives the audience a relational investment to carry into the story's escalation.`,
          });
        }
      }
    }

    // SUSPENSE_TEMPORAL_CLUSTER (distribution/timing × suspense × thirds, n≥9, ≥3 suspense-
    // positive scenes [suspenseDelta>0], >75% in one structural third): The story's suspense
    // rises are heavily concentrated in one structural zone while the other two thirds are
    // largely tension-free — pacing is uneven, with one zone carrying almost all the tension
    // accumulation while adjacent zones are suspense-quiet. Effective screenplays distribute
    // suspense rises across all three acts: each third should contribute new tension. When
    // >75% cluster in one zone, the story front-loads, mid-loads, or back-loads its danger
    // almost entirely, creating an unbalanced rhythm where one section overwhelms and others
    // feel calm to the point of disengagement. Distribution/timing mode × suspense channel.
    // Distinct from CLOCK_TEMPORAL_CLUSTER (Wave 531b: clock not suspense — different signal),
    // DRAMATIC_TURN_TEMPORAL_CLUSTER (Wave 489: turn not suspense), SEED_TEMPORAL_CLUSTER
    // (Wave 545: seed not suspense), EMOTIONAL_ZONE_CLUSTER (Wave 489: emotion not suspense),
    // SUSPENSE_SPIKE_WITHOUT_CAUSE (backward-cause × suspense — different analytical mode).
    if (records.length >= 9) {
      const suspPositions573b = (records as any[])
        .map((r, pos) => ({ pos, hasSusp: (r.suspenseDelta ?? 0) > 0 }))
        .filter(x => x.hasSusp)
        .map(x => x.pos);
      if (suspPositions573b.length >= 3) {
        const third573b = Math.floor(records.length / 3);
        const zone1Susp = suspPositions573b.filter(p => p < third573b).length;
        const zone2Susp = suspPositions573b.filter(p => p >= third573b && p < 2 * third573b).length;
        const zone3Susp = suspPositions573b.filter(p => p >= 2 * third573b).length;
        const maxZSusp = Math.max(zone1Susp, zone2Susp, zone3Susp);
        if (maxZSusp / suspPositions573b.length > 0.75) {
          const zoneNameSusp = zone1Susp === maxZSusp ? 'opening' : zone2Susp === maxZSusp ? 'middle' : 'closing';
          issues.push({
            location: `${suspPositions573b.length} suspense-rise scene(s) — ${maxZSusp} clustered in the ${zoneNameSusp} third`,
            rule: 'SUSPENSE_TEMPORAL_CLUSTER',
            severity: 'minor',
            description: `${suspPositions573b.length} suspense-rise scenes (suspenseDelta > 0) are heavily concentrated in the ${zoneNameSusp} third of the script (${maxZSusp} of ${suspPositions573b.length}, ${Math.round(maxZSusp / suspPositions573b.length * 100)}%). The other two structural thirds are nearly suspense-free. Effective pacing distributes tension accumulation across all three acts: the opening third establishes danger, the middle third escalates it, and the closing third drives it to the climax. When one zone carries more than three-quarters of all suspense rises, the story creates a lopsided rhythm — one section overwhelms with tension while adjacent zones feel calm to the point of audience disengagement.`,
            suggestedFix: `Redistribute suspense rises so that each structural third contains at least one scene with a positive suspenseDelta. Move some of the ${zoneNameSusp}-third suspense scenes earlier or later in the story, or add new tension beats to the underweight thirds. Balanced suspense distribution ensures that the audience experiences rising stakes in all three acts rather than having tension concentrated in one zone.`,
          });
        }
      }
    }

    // CURIOSITY_TEMPORAL_CLUSTER (distribution/timing × curiosity × thirds, n≥9, ≥3 curiosity-
    // positive scenes [curiosityDelta>0], >75% in one structural third): The story's curiosity
    // spikes — mystery beats, unanswered questions, and information reveals that generate
    // new questions — are overwhelmingly concentrated in one structural zone. The curiosity
    // channel works best when mystery is opened and sustained throughout all three acts:
    // early questions hook the audience, middle questions deepen the mystery, and late
    // questions hold tension through the resolution. When >75% of curiosity spikes cluster
    // in one third, the story front-loads, mid-loads, or back-loads its mystery almost
    // entirely — the audience's question-engagement is uneven across the story's arc.
    // Distribution/timing mode × curiosity channel. Distinct from SUSPENSE_TEMPORAL_CLUSTER
    // (above: suspense not curiosity — different signal channel), CLOCK_TEMPORAL_CLUSTER
    // (clock), DRAMATIC_TURN_TEMPORAL_CLUSTER (turn), SEED_TEMPORAL_CLUSTER (seed), EMOTIONAL_
    // ZONE_CLUSTER (emotion), CURIOSITY_FRONT_LOADED (Wave 268: checks if all spikes are in
    // the first HALF not first-third — different window), CURIOSITY_SPIKE_WITHOUT_CAUSE
    // (backward-cause × curiosity — different analytical mode).
    if (records.length >= 9) {
      const curiPositions573c = (records as any[])
        .map((r, pos) => ({ pos, hasCuri: (r.curiosityDelta ?? 0) > 0 }))
        .filter(x => x.hasCuri)
        .map(x => x.pos);
      if (curiPositions573c.length >= 3) {
        const third573c = Math.floor(records.length / 3);
        const zone1Curi = curiPositions573c.filter(p => p < third573c).length;
        const zone2Curi = curiPositions573c.filter(p => p >= third573c && p < 2 * third573c).length;
        const zone3Curi = curiPositions573c.filter(p => p >= 2 * third573c).length;
        const maxZCuri = Math.max(zone1Curi, zone2Curi, zone3Curi);
        if (maxZCuri / curiPositions573c.length > 0.75) {
          const zoneNameCuri = zone1Curi === maxZCuri ? 'opening' : zone2Curi === maxZCuri ? 'middle' : 'closing';
          issues.push({
            location: `${curiPositions573c.length} curiosity-spike scene(s) — ${maxZCuri} clustered in the ${zoneNameCuri} third`,
            rule: 'CURIOSITY_TEMPORAL_CLUSTER',
            severity: 'minor',
            description: `${curiPositions573c.length} curiosity-spike scenes (curiosityDelta > 0) are heavily concentrated in the ${zoneNameCuri} third of the script (${maxZCuri} of ${curiPositions573c.length}, ${Math.round(maxZCuri / curiPositions573c.length * 100)}%). The other two structural thirds are nearly mystery-free. The curiosity channel works best when questions are opened and sustained throughout all three acts: early mystery hooks the audience, middle questions deepen engagement, and late questions maintain tension through the resolution. When one zone carries more than three-quarters of all curiosity spikes, the story concentrates its mystery engagement in one section while the others are question-quiet — the audience's investigative interest peaks and then falls flat rather than evolving steadily through the story's arc.`,
            suggestedFix: `Redistribute curiosity spikes so that each structural third contains at least one scene where a new question is opened or an existing question deepens (positive curiosityDelta). Move some of the ${zoneNameCuri}-third mystery beats to the underweight thirds, or add new question-generating moments in the zones that currently carry little to no mystery engagement. Sustained curiosity across all three acts keeps the audience engaged throughout.`,
          });
        }
      }
    }
  }

  // ── Wave 587: DRAMATIC_TURN_SUSPENSE_AFTERMATH_VOID, CLOCK_CURIOSITY_AFTERMATH_VOID,
  //              PAYOFF_CLOSING_THIRD_ABSENT ────────────────────────────────────────────────────────
  {
    // DRAMATIC_TURN_SUSPENSE_AFTERMATH_VOID (sequence/aftermath × dramatic-turn → suspense aftermath,
    // n≥8, ≥2 qualifying dramatic-turn scenes [pos<n-1], ≥2 suspense-rise scenes globally, no
    // dramatic turn immediately followed by a suspense rise): Every narrative pivot passes without
    // tension building in the immediately following scene. A dramatic turn signals a change in the
    // story's direction — a reversal, recognition, or twist — and the scene right after is the most
    // natural home for suspense to rise as the new situation's danger becomes apparent. When no turn
    // is ever followed by a suspense rise in its immediate wake, pivots never translate into pressure:
    // the story changes course but the audience never feels the danger of the new direction. Sequence/
    // aftermath mode × dramatic-turn trigger × suspense channel. Distinct from DRAMATIC_TURN_AFTERMATH_
    // VOID (Wave 310: per-scene conjunction of emotion AND suspense AND relationship over a 2-scene
    // window — fires on any turn whose entire 2-scene wake is inert across all three channels; this
    // checks an aggregate property across all turns over 1 scene, suspense only, fires even when other
    // channels are active in the aftermath), DRAMATIC_TURN_NO_SUSPENSE (Wave 377: co-occurrence ×
    // same scene — checks suspenseDelta of the turn scene itself, not the following scene), and CLOCK_
    // RAISE_NO_SUSPENSE (Wave 377: clock trigger instead of dramatic turn).
    if (records.length >= 8) {
      const qualTurn587a = (records as any[])
        .map((r, pos) => ({ r, pos }))
        .filter(({ r, pos }) =>
          (r.dramaticTurn ?? 'nothing') !== 'nothing' && r.dramaticTurn !== '' && pos < records.length - 1
        );
      const suspRiseScenes587a = (records as any[]).filter(r => (r.suspenseDelta ?? 0) > 0);
      if (qualTurn587a.length >= 2 && suspRiseScenes587a.length >= 2) {
        const anySuspAftermath587a = qualTurn587a.some(
          ({ pos }) => ((records as any[])[pos + 1].suspenseDelta ?? 0) > 0
        );
        if (!anySuspAftermath587a) {
          issues.push({
            location: `${qualTurn587a.length} dramatic-turn scene(s) — none immediately followed by a suspense rise`,
            rule: 'DRAMATIC_TURN_SUSPENSE_AFTERMATH_VOID',
            severity: 'minor',
            description: `The script has ${qualTurn587a.length} qualifying dramatic-turn scenes and ${suspRiseScenes587a.length} scenes with a suspense rise, but no dramatic turn is immediately followed by a scene with rising tension. A narrative pivot signals that the story's direction has changed — and the scene right after is the most natural place for suspense to build as the new situation's danger becomes apparent. When no turn is ever followed by a suspense rise in its immediate wake, the pivots never translate into felt pressure: the story changes course, but the audience never experiences the danger of the new direction settling in.`,
            suggestedFix: `After at least one dramatic turn, let the immediately following scene carry a positive suspenseDelta — rising tension as the consequences of the pivot become clear. The suspense rise need not be caused by the turn itself; its proximity is enough to let the reversal feel like it raised the stakes and tightened the screw.`,
          });
        }
      }
    }

    // CLOCK_CURIOSITY_AFTERMATH_VOID (sequence/aftermath × clock-raised → curiosity aftermath, n≥8,
    // ≥2 qualifying clock-raised scenes [pos<n-1], ≥2 curiosity-spike scenes globally, no clock
    // raise immediately followed by a curiosity spike): Every deadline the story introduces passes
    // without the scene immediately after generating new questions. A raised clock establishes urgency
    // — but urgency and curiosity are distinct engines: the deadline tells the audience WHEN, while
    // curiosity tells them WHAT and WHY. When no clock raise is ever followed by a curiosity spike
    // in the next scene, the deadline layer and the mystery layer are temporally decoupled: the story
    // introduces time pressure but never lets that pressure open new questions for the audience to
    // pursue. Sequence/aftermath mode × clock trigger × curiosity channel. Distinct from CLOCK_RAISE_
    // CURIOSITY_VOID (co-occurrence × same scene — checks curiosityDelta of the clock-raise scene
    // itself, not the following scene), CLOCK_RAISE_NO_SUSPENSE (Wave 377: suspense not curiosity,
    // co-occurrence same scene), and PAYOFF_AFTERMATH_CURIOSITY_VOID (Wave 545: payoff trigger, not
    // clock).
    if (records.length >= 8) {
      const qualClock587b = (records as any[])
        .map((r, pos) => ({ r, pos }))
        .filter(({ r, pos }) => r.clockRaised === true && pos < records.length - 1);
      const curiSpikeScenes587b = (records as any[]).filter(r => (r.curiosityDelta ?? 0) > 0);
      if (qualClock587b.length >= 2 && curiSpikeScenes587b.length >= 2) {
        const anyCuriAftermath587b = qualClock587b.some(
          ({ pos }) => ((records as any[])[pos + 1].curiosityDelta ?? 0) > 0
        );
        if (!anyCuriAftermath587b) {
          issues.push({
            location: `${qualClock587b.length} clock-raise scene(s) — none immediately followed by a curiosity spike`,
            rule: 'CLOCK_CURIOSITY_AFTERMATH_VOID',
            severity: 'minor',
            description: `The script has ${qualClock587b.length} qualifying clock-raise scenes and ${curiSpikeScenes587b.length} curiosity-spike scenes, but no raised deadline is immediately followed by a scene in which new questions emerge. A clock establishes urgency: it tells the audience when the protagonist must succeed. But urgency and curiosity are distinct narrative engines — the deadline says WHEN, while curiosity drives WHAT and WHY. When no clock raise is ever followed by a curiosity spike in the next scene, the deadline layer and the mystery layer are temporally decoupled: the story introduces time pressure but never lets that pressure open new questions, so deadlines feel mechanical rather than generative.`,
            suggestedFix: `After at least one clock raise, let the immediately following scene generate new questions — a discovery prompted by the deadline, a consequence that opens new unknowns, or a revelation that the ticking clock makes more urgent. The curiosity spike need not be caused by the deadline; its proximity lets the clock feel like it revealed something as well as pressured something.`,
          });
        }
      }
    }

    // PAYOFF_CLOSING_THIRD_ABSENT (zone presence/absence × payoff × closing third, n≥9, ≥3 payoff
    // scenes globally, 0 in the closing third [pos ≥ floor(2n/3)]): The story has sufficient planted
    // promises but exhausts them all before the climactic zone — the closing third, where the audience
    // expects the accumulated setups to resolve, is entirely void of payoffs. Planted threads that
    // close before the final third leave the climax without the satisfaction of resolution landing at
    // the moment of highest consequence; the audience arrives at the story's most important act with
    // nothing left to cash out. Zone presence/absence mode × payoff channel × closing-third position.
    // Distinct from PAYOFF_ZONE_CLUSTER (distribution/timing — fires when >75% of payoffs cluster in
    // ONE third; 0% in closing does not trigger it if payoffs spread between the other two thirds),
    // PAYOFF_BACK_LOADED (Wave 268: fires when ALL payoffs are in the second half — the OPPOSITE
    // direction, and uses a half-boundary not a third), and RELATIONSHIP_OPENING_THIRD_ABSENT (Wave
    // 573: relationship not payoff, opening-third position not closing).
    if (records.length >= 9) {
      const payoffPositions587c = (records as any[])
        .map((r, pos) => ({ r, pos }))
        .filter(({ r }) => ((r.payoffSetupIds ?? []) as string[]).length > 0)
        .map(({ pos }) => pos);
      if (payoffPositions587c.length >= 3) {
        const closingStart587c = Math.floor((2 * records.length) / 3);
        const inClosing587c = payoffPositions587c.some(pos => pos >= closingStart587c);
        if (!inClosing587c) {
          issues.push({
            location: `${payoffPositions587c.length} payoff scene(s) — none in the closing third (scenes ${closingStart587c}–${records.length - 1})`,
            rule: 'PAYOFF_CLOSING_THIRD_ABSENT',
            severity: 'minor',
            description: `The script has ${payoffPositions587c.length} payoff scenes, none of them occurring in the closing third (scenes ${closingStart587c}–${records.length - 1}). All planted promises are resolved before the climactic zone — the final third, where the audience expects the accumulated threads to land, is entirely void of payoffs. The closing third is where setups are meant to pay off at the moment of highest consequence: a planted promise resolving during the climax carries the weight of everything that came before it. When all payoffs arrive in the opening and middle sections, the closing act is left without the satisfaction of resolution — the story's final movement has nothing left to deliver.`,
            suggestedFix: `Reserve at least one payoff for the closing third (scenes ${closingStart587c}–${records.length - 1}) — a planted promise that resolves at or near the climax. Moving an earlier payoff later, or holding a setup's resolution until the final act, ensures that the story's highest-consequence moment is also its most satisfying in terms of planted-thread delivery.`,
          });
        }
      }
    }
  }

  // ── Wave 601: STATED_BELIEF_REVELATION_DECOUPLED, STATED_BELIEF_DRAMATIC_TURN_AFTERMATH_VOID,
  //              STATED_BELIEF_ZONE_IMBALANCE ────────────────────────────────────────────────
  // First checks in this 105-rule file to use the dialogueHighlights signal — every other
  // channel here (clock, curiosity, dramaticTurn, relationship, seed, payoff, revelation) is
  // exhaustively covered by dozens of checks, but a character stating a tracked belief has never
  // been audited on its own.

  // STATED_BELIEF_REVELATION_DECOUPLED — Co-occurrence/decoupling × dialogueHighlights ×
  // revelation. Built on checkCoOccurrenceDecoupled from the shared checks library. n≥6, ≥2
  // belief-assertion scenes, ≥2 revelation scenes. Zero overlap → fire. A character voicing a
  // conviction and the story disclosing a hidden truth never share a scene — the moment a truth
  // surfaces is a natural occasion for a character's stated belief to be confirmed, denied, or
  // upended, yet the two channels never coincide.
  {
    const r601a = checkCoOccurrenceDecoupled({
      records, minRecords: 6, minACount: 2, minBCount: 2,
      isA: r => (r.dialogueHighlights ?? []).length > 0,
      isB: r => r.revelation !== null && r.revelation !== '' && r.revelation !== undefined,
    });
    if (r601a.fires) {
      issues.push({
        location: `${r601a.aCount} belief-assertion scene(s) and ${r601a.bCount} revelation scene(s) — zero overlap`,
        rule: 'STATED_BELIEF_REVELATION_DECOUPLED',
        severity: 'minor',
        description: `The script has ${r601a.aCount} scene(s) where a character states a tracked belief and ${r601a.bCount} revelation scene(s), but the two never coincide. A hidden truth coming to light is a natural moment for a character's own conviction to be tested — confirmed, denied, or reframed. When disclosure and voiced belief never share a scene, revelations land as plot information without a character's stated response to anchor them.`,
        suggestedFix: `Let at least one revelation scene also carry a character stating what they now believe — a line of confirmation, denial, or reinterpretation spoken in direct reaction to the disclosed truth.`,
      });
    }
  }

  // STATED_BELIEF_DRAMATIC_TURN_AFTERMATH_VOID — Sequence/aftermath × dialogueHighlights-present
  // trigger → dramaticTurn aftermath. Built on checkAftermathVoid. n≥8, ≥3 qualifying
  // belief-assertion scenes (pos < n-2), ≥2 dramatic-turn scenes existing elsewhere. None of the
  // qualifying belief scenes are followed by a dramatic turn within 2 scenes → fire. A stated
  // conviction never precedes a structural pivot — characters voice what they believe, but that
  // belief never becomes the hinge the story turns on.
  {
    const r601b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 3, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.dialogueHighlights ?? []).length > 0,
      isAftermath: r => (r.dramaticTurn ?? 'nothing') !== 'nothing' && r.dramaticTurn !== '',
    });
    if (r601b.fires) {
      issues.push({
        location: `${r601b.triggerCount} belief-assertion scene(s) — no dramatic turn within 2 scenes of any`,
        rule: 'STATED_BELIEF_DRAMATIC_TURN_AFTERMATH_VOID',
        severity: 'minor',
        description: `None of the story's ${r601b.triggerCount} scenes where a character states a tracked belief are followed by a dramatic turn within the next two, even though ${r601b.aftermathCount} dramatic-turn scene(s) exist elsewhere. A stated conviction is a natural setup for a structural pivot — the belief being tested, confirmed catastrophically wrong, or acted upon — but that connection never lands.`,
        suggestedFix: `After at least one scene where a character voices a belief, let the following scene or the one after turn on that belief — a reversal that proves it wrong, a choice made because of it, or a confrontation it provokes.`,
      });
    }
  }

  // STATED_BELIEF_ZONE_IMBALANCE — Underweight/bloat × dialogueHighlights × four structural
  // zones. Built on checkZoneImbalance. n≥10, ≥4 belief-assertion scenes total, divided across
  // four equal structural zones. Fires only when one zone has zero such scenes while another
  // holds ≥50% of the total.
  {
    const r601c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r601c.fires) {
      const emptyNames601c = r601c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName601c = FOUR_ZONE_NAMES[r601c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames601c} empty; ${bloatName601c} has ${r601c.counts[r601c.bloatZoneIdx]}/${r601c.totalCount} belief-assertion scenes`,
        rule: 'STATED_BELIEF_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r601c.totalCount} belief-assertion scenes are unevenly distributed across its four structural zones: ${bloatName601c} contains ${r601c.counts[r601c.bloatZoneIdx]} of them (${Math.round((r601c.counts[r601c.bloatZoneIdx] / r601c.totalCount) * 100)}%) while ${emptyNames601c} contains none. Characters' stated convictions bloat in one structural quarter and vanish from another.`,
        suggestedFix: `Redistribute belief assertions: let at least one character state a conviction in the empty zone(s) — ${emptyNames601c} — so every structural quarter carries some evidence of what characters believe.`,
      });
    }
  }

  // ── Wave 615: VISUAL_BEAT_CAUSALITY_ZONE_IMBALANCE, OPEN_THREAD_DRAMATIC_TURN_DECOUPLED,
  //              VISUAL_BEAT_PEAK_UNCAUSED ────────────────────────────────────────────────────

  // VISUAL_BEAT_CAUSALITY_ZONE_IMBALANCE — Underweight/bloat × visualBeats × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 scenes with
  // substantial physical staging (visualBeats.length≥2), divided into four equal structural
  // zones. Fires only when one zone has zero visually dense scenes while another holds ≥50% of
  // the total. First use of the visualBeats field anywhere in this 108-rule pass — its last
  // untouched record field, despite exhaustive coverage of clock, curiosity, dramaticTurn,
  // relationship, seed, payoff, revelation, and (since Wave 601) dialogueHighlights.
  {
    const r615a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r615a.fires) {
      const emptyNames615a = r615a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName615a = FOUR_ZONE_NAMES[r615a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames615a} empty; ${bloatName615a} has ${r615a.counts[r615a.bloatZoneIdx]}/${r615a.totalCount} visually dense scenes`,
        rule: 'VISUAL_BEAT_CAUSALITY_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r615a.totalCount} physically staged scenes are unevenly distributed across its four structural zones: ${bloatName615a} contains ${r615a.counts[r615a.bloatZoneIdx]} of them (${Math.round((r615a.counts[r615a.bloatZoneIdx] / r615a.totalCount) * 100)}%) while ${emptyNames615a} contains none. Physical staging bloats in one structural quarter and vanishes from another, giving the story's causal chain an uneven physical texture across its four quarters.`,
        suggestedFix: `Redistribute physical staging: bring at least one heavily staged scene into ${emptyNames615a}, or thin out ${bloatName615a}'s concentration by letting one of its visually dense scenes lean more on dialogue instead. A more even spread keeps physical cause-and-effect visible throughout the story's structure.`,
      });
    }
  }

  // OPEN_THREAD_DRAMATIC_TURN_DECOUPLED — Co-occurrence/decoupling × unresolvedClues ×
  // dramaticTurn. Built on checkCoOccurrenceDecoupled from the shared checks library. n≥8, ≥2
  // scenes carrying outstanding clue-debt, ≥2 dramatic-turn scenes. Zero overlap → fire. Open
  // narrative debt and a structural pivot never happen in the same scene — every dramatic turn
  // lands while every mystery is quiet, and every open thread persists through scenes with no
  // pivot. First standalone use of unresolvedClues as its own signal in this file — its only
  // prior appearance was a single incidental OR-condition inside an unrelated tension-deflation
  // check, never treated as an independent causal channel. Distinct from every other decoupling
  // check in this pass, none of which pair unresolvedClues with dramaticTurn.
  {
    const r615b = checkCoOccurrenceDecoupled({
      records, minRecords: 8, minACount: 2, minBCount: 2,
      isA: r => (r.unresolvedClues ?? []).length > 0,
      isB: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
    });
    if (r615b.fires) {
      issues.push({
        location: `${r615b.aCount} open-thread scene(s), ${r615b.bCount} dramatic-turn scene(s) — zero overlap`,
        rule: 'OPEN_THREAD_DRAMATIC_TURN_DECOUPLED',
        severity: 'minor',
        description: `The ${r615b.aCount} scenes carrying outstanding, unpaid clue-debt never coincide with the ${r615b.bCount} scenes carrying a dramatic turn — unresolved narrative tension and structural pivots run on entirely separate tracks. A reversal or turning point often lands hardest when it also reframes an open question; when the two never combine, the story's pivots happen independent of its live mysteries, and its open threads never get resolved or complicated by an actual turn.`,
        suggestedFix: `Let at least one dramatic turn happen in a scene that also carries open clue-debt — a reversal that reframes what an unresolved thread means, or a turning point that is itself caused by the pressure of not knowing. Tying structural pivots to live mysteries gives both greater causal weight.`,
      });
    }
  }

  // VISUAL_BEAT_PEAK_UNCAUSED — Backward-cause × visualBeats-density peak × dramaticTurn/
  // revelation cause. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 scenes
  // with visualBeats present, a 2-scene lookback. Finds the single scene with the most physical
  // staging beats and fires when neither that scene nor either of the 2 scenes before it contains
  // a dramatic turn or a revelation. This pass's central analytical lens — backward-cause, already
  // applied to relationship shifts (Wave 559) — turned on physical staging for the first time: the
  // story's single most visually dense scene should be caused by something (a pivot the story is
  // dramatizing, a truth just disclosed), not simply appear as unmotivated staging.
  {
    const r615c = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.visualBeats ?? []).length,
      hasCause: r => (r.dramaticTurn ?? 'nothing') !== 'nothing' || r.revelation != null,
    });
    if (r615c.fires) {
      issues.push({
        location: `Scene at position ${r615c.peakIdx + 1} — peak physical staging (${r615c.peakMagnitude} beats) with no dramatic turn or revelation nearby`,
        rule: 'VISUAL_BEAT_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The scene with the story's single densest physical staging (${r615c.peakMagnitude} visual beats, out of ${r615c.qualifyingCount} scenes with any staging at all) has no dramatic turn and no revelation in itself or in either of the 2 scenes before it. The moment the story invests most heavily in physical description and action arrives with no pivot or disclosure explaining why — the staging is dense but causally unmotivated.`,
        suggestedFix: `Add a dramatic turn or a revelation in the scene with the densest physical staging, or in one of the two scenes before it. The audience should understand why this particular moment earns its heavy physical attention, not just observe that it happens to be busy.`,
      });
    }
  }

  // ── Wave 629: CAUSAL_HIGHLIGHT_OPEN_THREAD_DECOUPLED, VISUAL_BEAT_DIALOGUE_HIGHLIGHT_
  //              AFTERMATH_VOID, CAUSALITY_OPEN_THREAD_ZONE_IMBALANCE ───────────────────────

  // CAUSAL_HIGHLIGHT_OPEN_THREAD_DECOUPLED — Co-occurrence/decoupling × dialogueHighlights ×
  // unresolvedClues. Built on checkCoOccurrenceDecoupled from the shared checks library. n≥6, ≥2
  // scenes carrying a dialogue highlight, ≥2 scenes carrying outstanding clue-debt. Zero overlap
  // → fire. First pairing of these two fields in this 111-rule pass, despite each already being
  // extensively paired with revelation, dramaticTurn, and other channels. A scene the story
  // itself flags as verbally memorable never coincides with a scene where a mystery sits open —
  // the audience's most quotable moments never land while a question is actively unresolved.
  {
    const r629a = checkCoOccurrenceDecoupled({
      records, minRecords: 6, minACount: 2, minBCount: 2,
      isA: r => (r.dialogueHighlights ?? []).length > 0,
      isB: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r629a.fires) {
      issues.push({
        location: `${r629a.aCount} dialogue-highlight scene(s), ${r629a.bCount} open-thread scene(s) — zero overlap`,
        rule: 'CAUSAL_HIGHLIGHT_OPEN_THREAD_DECOUPLED',
        severity: 'minor',
        description: `The ${r629a.aCount} scenes flagged as containing a standout line of dialogue never coincide with the ${r629a.bCount} scenes carrying outstanding clue-debt — the story's most memorable dialogue and its open mysteries run on separate tracks. A line worth remembering often lands hardest when a character is actively wrestling with an unresolved question, but that pairing never occurs here.`,
        suggestedFix: `Let at least one standout line of dialogue land in a scene that is also carrying open clue-debt — a character voicing suspicion or pressing on what hasn't been explained, giving the story's most memorable dialogue a causal tie to its live mysteries.`,
      });
    }
  }

  // VISUAL_BEAT_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID — Sequence/aftermath × visualBeats trigger →
  // dialogueHighlights absence. Built on checkAftermathVoid from the shared checks library. n≥8,
  // ≥2 qualifying visually-staged scenes (visualBeats.length≥2, pos<n-2), ≥3 scenes anywhere with
  // a dialogue highlight, a 2-scene lookahead window. Fires when every heavily staged scene's
  // two-scene aftermath contains no highlighted dialogue, while such scenes do occur elsewhere.
  // First pairing of visualBeats with dialogueHighlights in this pass — a scene dense with
  // physical action should give way to a voiced reaction nearby, not pass in verbal silence.
  {
    const r629b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 3, window: 2,
      isTrigger: r => (r.visualBeats ?? []).length >= 2,
      isAftermath: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r629b.fires) {
      issues.push({
        location: `${r629b.triggerCount} visually-staged scene(s) — no highlighted dialogue within 2 scenes of any`,
        rule: 'VISUAL_BEAT_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r629b.triggerCount} heavily staged scenes is followed by two scenes with no highlighted dialogue, even though ${r629b.aftermathCount} such scenes exist elsewhere in the script. Dense physical action often needs a voiced reaction nearby — a character naming what just happened or how it changed things — but that verbal follow-through consistently doesn't come.`,
        suggestedFix: `After at least one heavily staged scene, let one of the following two scenes carry a line worth remembering — a character's verbal reaction to what was just physically shown, giving the staging a causal aftermath in speech.`,
      });
    }
  }

  // CAUSALITY_OPEN_THREAD_ZONE_IMBALANCE — Underweight/bloat × unresolvedClues × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 debt-carrying
  // scenes total, divided across four equal structural zones. Fires only when one zone has zero
  // such scenes while another holds ≥50% of the total. Waves 601 and 615 applied this template to
  // dialogueHighlights and visualBeats respectively; unresolvedClues itself has never been
  // zone-audited in this file, despite being used extensively in co-occurrence and aftermath modes.
  {
    const r629c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r629c.fires) {
      const emptyNames629c = r629c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName629c = FOUR_ZONE_NAMES[r629c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames629c} empty; ${bloatName629c} has ${r629c.counts[r629c.bloatZoneIdx]}/${r629c.totalCount} debt-carrying scenes`,
        rule: 'CAUSALITY_OPEN_THREAD_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r629c.totalCount} scenes carrying outstanding clue-debt are unevenly distributed across its four structural zones: ${bloatName629c} contains ${r629c.counts[r629c.bloatZoneIdx]} of them (${Math.round((r629c.counts[r629c.bloatZoneIdx] / r629c.totalCount) * 100)}%) while ${emptyNames629c} contains none. Outstanding narrative debt bloats in one structural quarter and vanishes from another, giving the story's causal chain of open questions an uneven structural rhythm.`,
        suggestedFix: `Redistribute open threads: let at least one clue remain unresolved into the empty zone(s) — ${emptyNames629c} — so every structural quarter carries some causal pressure from an unanswered question.`,
      });
    }
  }

  // ── Wave 643: CAUSALITY_VISUAL_BEAT_DROUGHT_RUN, CAUSAL_HIGHLIGHT_ZONE_CLUSTER,
  //              CAUSALITY_OPEN_THREAD_CURIOSITY_DECOUPLED ─────────────────────────────────

  // CAUSALITY_VISUAL_BEAT_DROUGHT_RUN — Run-based × visualBeats absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 physically-staged scenes overall,
  // fires when the longest consecutive run of scenes with zero visual beats reaches 6. First
  // checkDroughtRun use in this pass. Distinct from VISUAL_BEAT_CAUSALITY_ZONE_IMBALANCE
  // (Wave 615 — underweight/bloat across four structural zones, a distributional measure) and
  // VISUAL_BEAT_PEAK_UNCAUSED (Wave 615 — backward-cause on a single density peak): this check
  // measures a contiguous run of absence, catching a long unbroken stretch of pure dialogue/
  // exposition with no physical staging even when the zone-level distribution looks balanced.
  {
    const r643a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.visualBeats ?? []).length > 0,
    });
    if (r643a.fires) {
      issues.push({
        location: `longest stretch with zero visual staging: ${r643a.longestRun} consecutive scenes`,
        rule: 'CAUSALITY_VISUAL_BEAT_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r643a.longestRun} consecutive scenes with no visual staging beats at all, even though ${r643a.presentCount} scenes elsewhere do carry physical staging. A long unbroken stretch of pure dialogue or exposition with nothing physically shown leaves the causal chain of events without any staged action to anchor it.`,
        suggestedFix: `Add a physical staging beat somewhere within the ${r643a.longestRun}-scene stretch — a gesture, an object, a piece of blocking — so the causal thread stays visually grounded throughout.`,
      });
    }
  }

  // CAUSAL_HIGHLIGHT_ZONE_CLUSTER — Distribution/timing × dialogueHighlights × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 scenes carrying a
  // highlighted line of dialogue, fires when >75% of them fall in a single structural third.
  // First checkZoneCluster use in this pass. Distinct from Wave 601's stated-belief zone
  // imbalance (a four-zone bloat/empty check on a different signal, dialogueHighlights-presence
  // as a belief-assertion proxy) and from every other dialogueHighlights rule in this file: this
  // is a three-zone concentration measure on the raw highlighted-dialogue signal itself, firing
  // on skew even when no zone is fully empty.
  {
    const r643b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r643b.fires) {
      const zoneName643b = r643b.zoneNames[r643b.maxZoneIdx];
      issues.push({
        location: `${zoneName643b} third — ${r643b.maxZoneCount}/${r643b.count} highlighted-dialogue scenes`,
        rule: 'CAUSAL_HIGHLIGHT_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r643b.maxZoneCount} of the story's ${r643b.count} scenes carrying a standout line of dialogue (${Math.round((r643b.maxZoneCount / r643b.count) * 100)}%) cluster in the ${zoneName643b} third. Memorable dialogue concentrates almost exclusively in that stretch of the story rather than landing throughout, leaving other structural thirds with nothing verbally memorable to carry their causal weight.`,
        suggestedFix: `Give at least one scene outside the ${zoneName643b} third a standout line of dialogue — spreading memorable dialogue across the story lets each structural third carry its own causal weight in speech, not just one.`,
      });
    }
  }

  // CAUSALITY_OPEN_THREAD_CURIOSITY_DECOUPLED — Co-occurrence/decoupling × unresolvedClues ×
  // curiosityDelta>0. Built on checkCoOccurrenceDecoupled from the shared checks library. n≥6,
  // ≥2 scenes carrying outstanding clue-debt, ≥2 scenes where curiosity is actively rising, zero
  // overlap → fire. Distinct from Wave 629's CAUSAL_HIGHLIGHT_OPEN_THREAD_DECOUPLED (unresolved
  // Clues × dialogueHighlights) and from CAUSALITY_OPEN_THREAD_ZONE_IMBALANCE (a distributional,
  // not co-occurrence, measure on the same field): this is the first check pairing the open-
  // thread signal with the curiosity channel specifically — a scene where a mystery sits open
  // never coincides with a scene where the audience's wonder is measurably climbing, so the
  // story's live questions and its rising intrigue run on separate tracks.
  {
    const r643c = checkCoOccurrenceDecoupled({
      records, minRecords: 6, minACount: 2, minBCount: 2,
      isA: r => (r.unresolvedClues ?? []).length > 0,
      isB: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r643c.fires) {
      issues.push({
        location: `${r643c.aCount} open-thread scene(s), ${r643c.bCount} rising-curiosity scene(s) — zero overlap`,
        rule: 'CAUSALITY_OPEN_THREAD_CURIOSITY_DECOUPLED',
        severity: 'minor',
        description: `The ${r643c.aCount} scenes carrying outstanding clue-debt never coincide with the ${r643c.bCount} scenes where curiosity is actively rising — the story's open mysteries and its moments of climbing intrigue run on separate tracks. A scene that already holds an unresolved question is a natural place for wonder to spike further, but that pairing never occurs here.`,
        suggestedFix: `Let at least one scene carrying outstanding clue-debt also raise curiosity — a new question surfacing while an old one is still open, giving the story's open threads a causal tie to its rising intrigue.`,
      });
    }
  }

  // ── Wave 657: CAUSALITY_HIGHLIGHT_PEAK_UNCAUSED, CAUSALITY_OPEN_THREAD_DROUGHT_RUN,
  //              CAUSAL_STAGING_ZONE_CLUSTER ─────────────────────────────────────────────────

  // CAUSALITY_HIGHLIGHT_PEAK_UNCAUSED — Single-peak isolation/backward-cause × dialogueHighlights
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 scenes carrying
  // a dialogue highlight, a 2-scene lookback. Finds the single scene with the most highlighted
  // lines; fires when neither that scene nor either of the two before it contains a dramatic turn
  // or revelation. Every prior peak check in this pass anchors on suspense, clock, or visualBeats;
  // this is the first application to the highlighted-dialogue channel.
  {
    const r657a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.dialogueHighlights ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r657a.fires) {
      issues.push({
        location: `scene ${r657a.peakIdx + 1} — peak highlighted-dialogue density (${r657a.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'CAUSALITY_HIGHLIGHT_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for highlighted dialogue (scene ${r657a.peakIdx + 1}, with ${r657a.peakMagnitude} standout lines) has no dramatic turn or revelation in itself or the two scenes before it. The moment where the script's most memorable dialogue concentrates arrives without any structural pivot or disclosure driving it — the peak of verbal craft and the peak of narrative causality never coincide.`,
        suggestedFix: `Give scene ${r657a.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most quotable moment is earned by a shift in the plot rather than arriving in a causal vacuum.`,
      });
    }
  }

  // CAUSALITY_OPEN_THREAD_DROUGHT_RUN — Run-based × unresolvedClues absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 open-thread scenes overall, fires
  // when the longest consecutive run of scenes with zero outstanding clue-debt reaches 6. Wave 643
  // applied the drought-run mode to visualBeats; unresolvedClues has been zone-imbalanced
  // (Wave 629) and used in decoupling/aftermath-void contexts (multiple waves) but never
  // drought-audited via the shared helper.
  {
    const r657b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r657b.fires) {
      issues.push({
        location: `longest stretch with no outstanding clue-debt: ${r657b.longestRun} consecutive scenes`,
        rule: 'CAUSALITY_OPEN_THREAD_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r657b.longestRun} consecutive scenes with no outstanding clue-debt at all, even though ${r657b.presentCount} scenes elsewhere do carry open mysteries. A long stretch where nothing is left unresolved means the causal chain of open questions goes dark for an extended run.`,
        suggestedFix: `Seed a new thread somewhere within the ${r657b.longestRun}-scene stretch so the story maintains some outstanding mystery throughout, keeping the causal chain of open questions alive.`,
      });
    }
  }

  // CAUSAL_STAGING_ZONE_CLUSTER — Distribution/timing × visualBeats × structural thirds. Built on
  // checkZoneCluster from the shared checks library. n≥9, ≥3 visually-staged scenes, fires when
  // >75% of them fall in a single structural third. Wave 643 applied the zone-cluster mode to
  // dialogueHighlights; visualBeats itself has only ever been zone-IMBALANCED (four-zone
  // bloat/empty, Wave 615), never cluster-audited on the thirds granularity.
  {
    const r657c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r657c.fires) {
      const zoneName657c = r657c.zoneNames[r657c.maxZoneIdx];
      issues.push({
        location: `${zoneName657c} third — ${r657c.maxZoneCount}/${r657c.count} visually dense scenes`,
        rule: 'CAUSAL_STAGING_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r657c.maxZoneCount} of the story's ${r657c.count} visually dense scenes (${Math.round((r657c.maxZoneCount / r657c.count) * 100)}%) cluster in the ${zoneName657c} third. Physical staging concentrates almost exclusively in that stretch of the story rather than surfacing throughout, leaving other structural thirds with no physically staged causal anchor.`,
        suggestedFix: `Give at least one scene outside the ${zoneName657c} third substantial physical staging — spreading staged causal anchors across the story lets each structural third carry its own physical grounding.`,
      });
    }
  }

  // ── Wave 671: CAUSALITY_HIGHLIGHT_DROUGHT_RUN, CAUSALITY_OPEN_THREAD_PEAK_UNCAUSED,
  //              CAUSALITY_STAKES_ZONE_CLUSTER ──────────────────────────────────────────────

  // CAUSALITY_HIGHLIGHT_DROUGHT_RUN — Run-based × dialogueHighlights absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 highlighted-dialogue scenes overall,
  // fires when the longest consecutive run of scenes with no highlighted dialogue reaches 6.
  // Waves 643/657 applied the peak-uncaused and zone-cluster modes to dialogueHighlights; the
  // drought-run mode has never been applied to this channel.
  {
    const r671a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r671a.fires) {
      issues.push({
        location: `longest stretch with no highlighted dialogue: ${r671a.longestRun} consecutive scenes`,
        rule: 'CAUSALITY_HIGHLIGHT_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r671a.longestRun} consecutive scenes with no highlighted dialogue at all, even though ${r671a.presentCount} scenes elsewhere carry a standout line. A long unbroken stretch with nothing verbally memorable leaves the causal chain of events without a quotable anchor for an extended run.`,
        suggestedFix: `Give at least one scene within the ${r671a.longestRun}-scene stretch a standout line of dialogue — a character naming the stakes or the consequence of what just happened, keeping the causal chain verbally anchored throughout.`,
      });
    }
  }

  // CAUSALITY_OPEN_THREAD_PEAK_UNCAUSED — Single-peak isolation/backward-cause × unresolvedClues
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 scenes carrying
  // outstanding clue-debt, a 2-scene lookback. Finds the single scene with the most simultaneous
  // open threads; fires when neither that scene nor either of the two before it contains a
  // dramatic turn or revelation. unresolvedClues has been zone-imbalanced, drought-audited, and
  // decoupled elsewhere in this pass, but never backward-cause peak-audited.
  {
    const r671b = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.unresolvedClues ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r671b.fires) {
      issues.push({
        location: `scene ${r671b.peakIdx + 1} — peak open-thread density (${r671b.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'CAUSALITY_OPEN_THREAD_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for outstanding clue-debt (scene ${r671b.peakIdx + 1}, with ${r671b.peakMagnitude} open threads) has no dramatic turn or revelation in itself or the two scenes before it. The moment where unresolved mystery concentrates most heavily arrives without any structural pivot or disclosure driving it — the peak of accumulated question carries no causal weight behind it.`,
        suggestedFix: `Give scene ${r671b.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most mystery-dense moment is earned by a shift in the plot rather than arriving in a causal vacuum.`,
      });
    }
  }

  // CAUSALITY_STAKES_ZONE_CLUSTER — Distribution/timing × purpose === 'raise_stakes' × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 stakes-raising
  // scenes, fires when >75% of them fall in a single structural third. `purpose` has only ever
  // appeared inside incidental threshold conditions (e.g. purpose === 'climax'/'resolution'
  // guards) in this pass, never as the standalone subject of its own check.
  {
    const r671c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'raise_stakes',
    });
    if (r671c.fires) {
      const zoneName671c = r671c.zoneNames[r671c.maxZoneIdx];
      issues.push({
        location: `${zoneName671c} third — ${r671c.maxZoneCount}/${r671c.count} stakes-raising scenes`,
        rule: 'CAUSALITY_STAKES_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r671c.maxZoneCount} of the story's ${r671c.count} scenes purposed to raise stakes (${Math.round((r671c.maxZoneCount / r671c.count) * 100)}%) cluster in the ${zoneName671c} third. Escalation concentrates almost exclusively in that stretch of the story rather than compounding throughout, leaving other structural thirds with no causal pressure pushing the stakes higher.`,
        suggestedFix: `Purpose at least one scene outside the ${zoneName671c} third to raise stakes — spreading escalation across the story lets every structural third carry its own share of mounting causal pressure.`,
      });
    }
  }

  // ── Wave 685: CAUSALITY_CLOCK_DELTA_PEAK_UNCAUSED, CAUSALITY_PAYOFF_DROUGHT_RUN,
  //              CAUSALITY_SEED_ZONE_CLUSTER ───────────────────────────────────────────────────

  // CAUSALITY_CLOCK_DELTA_PEAK_UNCAUSED — Single-peak isolation/backward-cause × clockDelta
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 scenes with a
  // nonzero clock delta, a 2-scene lookback. Finds the single scene where the clock advances the
  // most; fires when neither that scene nor either of the two before it contains a dramatic turn
  // or revelation. clockDelta anchors several hand-rolled aggregate/threshold checks in this pass
  // but has never been backward-cause peak-audited via the shared library.
  {
    const r685a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => Math.abs(r.clockDelta ?? 0),
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r685a.fires) {
      issues.push({
        location: `scene ${r685a.peakIdx + 1} — peak clock delta (${r685a.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'CAUSALITY_CLOCK_DELTA_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single largest clock swing (scene ${r685a.peakIdx + 1}, delta magnitude ${r685a.peakMagnitude}) has no dramatic turn or revelation in itself or the two scenes before it. The moment where time pressure shifts most sharply arrives without any structural pivot or disclosure driving it — an uncaused spike that undercuts the causal chain's sense of escalation.`,
        suggestedFix: `Give scene ${r685a.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's sharpest clock swing is earned by a shift in circumstance rather than arriving in a causal vacuum.`,
      });
    }
  }

  // CAUSALITY_PAYOFF_DROUGHT_RUN — Run-based × payoffSetupIds absence. Built on checkDroughtRun
  // from the shared checks library. n≥10, ≥3 payoff scenes overall, fires when the longest
  // consecutive run of scenes with zero thread resolution reaches 6. payoffSetupIds anchors
  // extensive hand-rolled aggregate/peak logic in this pass but has never been drought-audited.
  {
    const r685b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.payoffSetupIds ?? []).length > 0,
    });
    if (r685b.fires) {
      issues.push({
        location: `longest stretch with no payoff: ${r685b.longestRun} consecutive scenes`,
        rule: 'CAUSALITY_PAYOFF_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r685b.longestRun} consecutive scenes with no thread resolving at all, even though ${r685b.presentCount} scenes elsewhere do pay off a setup. A long stretch where nothing resolves leaves the causal chain of cause-and-effect dormant for an extended run.`,
        suggestedFix: `Resolve at least one thread somewhere within the ${r685b.longestRun}-scene stretch so the causal chain's sense of accumulating consequence keeps building throughout that stretch.`,
      });
    }
  }

  // CAUSALITY_SEED_ZONE_CLUSTER — Distribution/timing × seededClueIds × structural thirds. Built
  // on checkZoneCluster from the shared checks library. n≥9, ≥3 seed scenes, fires when >75% of
  // them fall in a single structural third. seededClueIds anchors extensive hand-rolled aggregate/
  // front-loading logic in this pass but has never been zone-cluster-audited via the shared
  // library.
  {
    const r685c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.seededClueIds ?? []).length > 0,
    });
    if (r685c.fires) {
      const zoneName685c = r685c.zoneNames[r685c.maxZoneIdx];
      issues.push({
        location: `${zoneName685c} third — ${r685c.maxZoneCount}/${r685c.count} seed scenes`,
        rule: 'CAUSALITY_SEED_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r685c.maxZoneCount} of the story's ${r685c.count} clue-planting scenes (${Math.round((r685c.maxZoneCount / r685c.count) * 100)}%) cluster in the ${zoneName685c} third. Foreshadowing concentrates almost exclusively in that stretch of the story rather than surfacing throughout, giving the causal chain of setups an uneven structural rhythm.`,
        suggestedFix: `Plant at least one clue outside the ${zoneName685c} third — spreading foreshadowing across the story lets the causal chain of setups build gradually instead of arriving all at once.`,
      });
    }
  }

  // ── Wave 699: CAUSALITY_CLOCK_ZONE_CLUSTER, CAUSALITY_RELATIONSHIP_DROUGHT_RUN,
  //              CAUSALITY_SUSPENSE_PEAK_UNCAUSED ─────────────────────────────────────────────

  // CAUSALITY_CLOCK_ZONE_CLUSTER — Distribution/timing × clockRaised × structural thirds. Built
  // on checkZoneCluster from the shared checks library. n≥9, ≥3 clock-raised scenes, fires when
  // >75% of them fall in a single structural third. clockRaised anchors extensive hand-rolled
  // aggregate/threshold logic throughout this pass but has never been zone-cluster-audited via
  // the shared library.
  {
    const r699a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.clockRaised === true,
    });
    if (r699a.fires) {
      const zoneName699a = r699a.zoneNames[r699a.maxZoneIdx];
      issues.push({
        location: `${zoneName699a} third — ${r699a.maxZoneCount}/${r699a.count} clock-raised scenes`,
        rule: 'CAUSALITY_CLOCK_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r699a.maxZoneCount} of the story's ${r699a.count} clock-raised scenes (${Math.round((r699a.maxZoneCount / r699a.count) * 100)}%) cluster in the ${zoneName699a} third. Time pressure concentrates almost exclusively in that stretch of the story rather than surfacing throughout, giving the causal chain of urgency an uneven structural rhythm.`,
        suggestedFix: `Raise a clock in at least one scene outside the ${zoneName699a} third — spreading time pressure across the story lets every structural third carry some causal urgency.`,
      });
    }
  }

  // CAUSALITY_RELATIONSHIP_DROUGHT_RUN — Run-based × relationshipShifts absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 relationship-shift scenes overall,
  // fires when the longest consecutive run of scenes with zero bond changes reaches 6.
  // relationshipShifts anchors extensive hand-rolled aggregate/threshold logic but has never been
  // drought-audited via the shared library.
  {
    const r699b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r699b.fires) {
      issues.push({
        location: `longest stretch with no relationship shift: ${r699b.longestRun} consecutive scenes`,
        rule: 'CAUSALITY_RELATIONSHIP_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r699b.longestRun} consecutive scenes with no relationship shift at all, even though ${r699b.presentCount} scenes elsewhere do move a bond. A long unbroken stretch where no relationship moves leaves the causal chain of interpersonal consequence dormant for an extended run.`,
        suggestedFix: `Let a bond shift somewhere within the ${r699b.longestRun}-scene stretch — even a small movement keeps the causal chain tied to changing interpersonal stakes throughout.`,
      });
    }
  }

  // CAUSALITY_SUSPENSE_PEAK_UNCAUSED — Single-peak isolation/backward-cause × suspenseDelta
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 scenes with a
  // positive suspense delta, a 2-scene lookback. Finds the single scene where suspense spikes
  // hardest; fires when neither that scene nor either of the two before it contains a dramatic
  // turn or revelation. suspenseDelta anchors extensive hand-rolled aggregate/threshold logic but
  // has never been backward-cause peak-audited via the shared library.
  {
    const r699c = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => Math.max(0, r.suspenseDelta ?? 0),
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r699c.fires) {
      issues.push({
        location: `scene ${r699c.peakIdx + 1} — peak suspense spike (${r699c.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'CAUSALITY_SUSPENSE_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single sharpest suspense spike (scene ${r699c.peakIdx + 1}, delta ${r699c.peakMagnitude}) has no dramatic turn or revelation in itself or the two scenes before it. The moment where tension rises most sharply arrives without any structural pivot or disclosure driving it — an uncaused spike that undercuts the causal chain's sense of escalation.`,
        suggestedFix: `Give scene ${r699c.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's sharpest rise in tension is earned by a shift in circumstance rather than arriving in a causal vacuum.`,
      });
    }
  }

  // ── Wave 713: CAUSALITY_OPEN_THREAD_ZONE_CLUSTER, CAUSALITY_STAKES_DROUGHT_RUN,
  //              CAUSALITY_SEED_PEAK_UNCAUSED ──────────────────────────────────────────────────

  // CAUSALITY_OPEN_THREAD_ZONE_CLUSTER — Distribution/timing × unresolvedClues × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 open-thread scenes,
  // fires when >75% of them fall in a single structural third. Waves 657/671 applied the
  // drought-run and backward-cause peak modes to unresolvedClues; the zone-cluster mode has never
  // been applied to it, completing the trio.
  {
    const r713a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r713a.fires) {
      const zoneName713a = r713a.zoneNames[r713a.maxZoneIdx];
      issues.push({
        location: `${zoneName713a} third — ${r713a.maxZoneCount}/${r713a.count} open-thread scenes`,
        rule: 'CAUSALITY_OPEN_THREAD_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r713a.maxZoneCount} of the story's ${r713a.count} scenes carrying outstanding clue-debt (${Math.round((r713a.maxZoneCount / r713a.count) * 100)}%) cluster in the ${zoneName713a} third. Open questions concentrate almost exclusively in that stretch of the story rather than persisting throughout, leaving other structural thirds with no live mystery pressing on the causal chain.`,
        suggestedFix: `Let a clue remain unresolved into a scene outside the ${zoneName713a} third — spreading open threads across the story gives every structural third some causal pressure from an unanswered question.`,
      });
    }
  }

  // CAUSALITY_STAKES_DROUGHT_RUN — Run-based × purpose === 'raise_stakes' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 stakes-raising scenes overall, fires
  // when the longest consecutive run of scenes with no stakes-raising purpose reaches 6. Wave 671
  // applied the zone-cluster mode to this signal; the drought-run mode has never been applied to
  // it.
  {
    const r713b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'raise_stakes',
    });
    if (r713b.fires) {
      issues.push({
        location: `longest stretch with no stakes-raising scene: ${r713b.longestRun} consecutive scenes`,
        rule: 'CAUSALITY_STAKES_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r713b.longestRun} consecutive scenes with no scene purposed to raise stakes, even though ${r713b.presentCount} scenes elsewhere do escalate the stakes. A long unbroken stretch with nothing pushing the stakes higher leaves the causal chain without mounting pressure for an extended run.`,
        suggestedFix: `Purpose at least one scene within the ${r713b.longestRun}-scene stretch to raise stakes — even a small escalation keeps the causal chain under mounting pressure throughout that stretch.`,
      });
    }
  }

  // CAUSALITY_SEED_PEAK_UNCAUSED — Single-peak isolation/backward-cause × seededClueIds
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 seed scenes, a
  // 2-scene lookback. Finds the single scene with the most simultaneous clues planted; fires when
  // neither that scene nor either of the two before it contains a dramatic turn or revelation.
  // Wave 685 applied the zone-cluster mode to seededClueIds; the backward-cause peak mode has
  // never been applied to it.
  {
    const r713c = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.seededClueIds ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r713c.fires) {
      issues.push({
        location: `scene ${r713c.peakIdx + 1} — peak seed density (${r713c.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'CAUSALITY_SEED_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for planting new clues (scene ${r713c.peakIdx + 1}, with ${r713c.peakMagnitude} clues seeded at once) has no dramatic turn or revelation in itself or the two scenes before it. The moment where foreshadowing concentrates most heavily arrives without any structural pivot or disclosure driving it — an uncaused spike that undercuts the causal chain's sense of escalation.`,
        suggestedFix: `Give scene ${r713c.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most seed-dense moment is earned by a shift in circumstance rather than arriving in a causal vacuum.`,
      });
    }
  }

  // ── Wave 727: CAUSALITY_CLOCK_DELTA_DROUGHT_RUN, CAUSALITY_RELATIONSHIP_PEAK_UNCAUSED,
  //              CAUSALITY_SEED_DROUGHT_RUN ─────────────────────────────────────────────

  // CAUSALITY_CLOCK_DELTA_DROUGHT_RUN — Run-based × clockDelta≠0 absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 clock-shifting scenes overall, fires
  // when the longest consecutive run of scenes with zero clock movement reaches 6. Wave 685
  // applied the backward-cause peak mode to clockDelta; the drought-run mode has never been
  // applied to it.
  {
    const r727a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.clockDelta ?? 0) !== 0,
    });
    if (r727a.fires) {
      issues.push({
        location: `longest stretch with no clock movement: ${r727a.longestRun} consecutive scenes`,
        rule: 'CAUSALITY_CLOCK_DELTA_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r727a.longestRun} consecutive scenes with zero movement on the ticking clock at all, even though ${r727a.presentCount} scenes elsewhere do shift it. A long unbroken stretch where nothing tightens or loosens the deadline leaves the causal chain without any mechanical pressure driving events forward for an extended run.`,
        suggestedFix: `Move the clock — tighten or ease the deadline — somewhere within the ${r727a.longestRun}-scene stretch so the causal chain keeps a mechanical pressure acting on events throughout that stretch.`,
      });
    }
  }

  // CAUSALITY_RELATIONSHIP_PEAK_UNCAUSED — Single-peak isolation/backward-cause ×
  // relationshipShifts magnitude. Built on checkPeakUncaused from the shared checks library. n≥8,
  // ≥2 scenes carrying a relationship shift, a 2-scene lookback. Finds the single scene with the
  // most simultaneous bond changes; fires when neither that scene nor either of the two before it
  // contains a dramatic turn or revelation. Wave 713 applied the drought-run mode to
  // relationshipShifts; the backward-cause peak mode has never been applied to it.
  {
    const r727b = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.relationshipShifts ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r727b.fires) {
      issues.push({
        location: `scene ${r727b.peakIdx + 1} — peak relationship-shift density (${r727b.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'CAUSALITY_RELATIONSHIP_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for relationship shifts (scene ${r727b.peakIdx + 1}, with ${r727b.peakMagnitude} simultaneous bond changes) has no dramatic turn or revelation in itself or the two scenes before it. The moment where relational upheaval concentrates most heavily arrives without any structural pivot or disclosure driving it — an uncaused spike that undercuts the causal chain's sense of escalation.`,
        suggestedFix: `Give scene ${r727b.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most relationally dense moment is earned by a shift in circumstance rather than arriving in a causal vacuum.`,
      });
    }
  }

  // CAUSALITY_SEED_DROUGHT_RUN — Run-based × seededClueIds absence. Built on checkDroughtRun from
  // the shared checks library. n≥10, ≥3 seed scenes overall, fires when the longest consecutive
  // run of scenes with no new clues planted reaches 6. Waves 685/713 applied the zone-cluster and
  // backward-cause peak modes to seededClueIds; the drought-run mode has never been applied to it,
  // completing the trio.
  {
    const r727c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.seededClueIds ?? []).length > 0,
    });
    if (r727c.fires) {
      issues.push({
        location: `longest stretch with no new clues planted: ${r727c.longestRun} consecutive scenes`,
        rule: 'CAUSALITY_SEED_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r727c.longestRun} consecutive scenes with no new clues planted at all, even though ${r727c.presentCount} scenes elsewhere do seed foreshadowing. A long unbroken stretch with nothing new laid down leaves the causal chain running on old setups for an extended run.`,
        suggestedFix: `Plant at least one new clue within the ${r727c.longestRun}-scene stretch so the causal chain keeps feeding fresh foreshadowing throughout that stretch.`,
      });
    }
  }

  // ── Wave 741: CAUSALITY_CLOCK_DELTA_ZONE_CLUSTER, CAUSALITY_RELATIONSHIP_ZONE_CLUSTER,
  //              CAUSALITY_PAYOFF_PEAK_UNCAUSED ────────────────────────────────────────────

  // CAUSALITY_CLOCK_DELTA_ZONE_CLUSTER — Distribution/timing × clockDelta≠0 presence ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // clock-shifting scenes, fires when more than 75% of those scenes cluster in a single third.
  // Waves 685/727 applied the backward-cause peak and run-based drought modes to clockDelta; the
  // zone-cluster mode has never been applied to it, completing the trio.
  {
    const r741a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.clockDelta ?? 0) !== 0,
    });
    if (r741a.fires) {
      issues.push({
        location: `${r741a.zoneNames[r741a.maxZoneIdx]} third — ${r741a.maxZoneCount} of ${r741a.count} clock-shifting scenes`,
        rule: 'CAUSALITY_CLOCK_DELTA_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r741a.maxZoneCount / r741a.count) * 100)}% of the scenes that move the ticking clock cluster in the ${r741a.zoneNames[r741a.maxZoneIdx]} third. When every clock movement lands in the same structural window, the causal chain loses any sense of mounting pressure recurring across the whole story.`,
        suggestedFix: `Move at least one clock-shifting beat outside the ${r741a.zoneNames[r741a.maxZoneIdx]} third so the pressure on the causal chain tightens or eases more evenly across the story.`,
      });
    }
  }

  // CAUSALITY_RELATIONSHIP_ZONE_CLUSTER — Distribution/timing × relationshipShifts × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 relationship-shift
  // scenes, fires when more than 75% of those scenes cluster in a single third. Waves 699/727
  // applied the run-based drought and backward-cause peak modes to relationshipShifts; the
  // zone-cluster mode has never been applied to it, completing the trio.
  {
    const r741b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r741b.fires) {
      issues.push({
        location: `${r741b.zoneNames[r741b.maxZoneIdx]} third — ${r741b.maxZoneCount} of ${r741b.count} relationship-shift scenes`,
        rule: 'CAUSALITY_RELATIONSHIP_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r741b.maxZoneCount / r741b.count) * 100)}% of the story's relationship-shift scenes cluster in the ${r741b.zoneNames[r741b.maxZoneIdx]} third. When every bond change lands in the same structural window, the causal chain has no relational movement to draw on anywhere else in the story.`,
        suggestedFix: `Move at least one relationship shift outside the ${r741b.zoneNames[r741b.maxZoneIdx]} third so the causal chain keeps relational movement available more evenly across the story.`,
      });
    }
  }

  // CAUSALITY_PAYOFF_PEAK_UNCAUSED — Single-peak isolation/backward-cause × payoffSetupIds
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 payoff scenes,
  // a 2-scene lookback. Finds the single scene with the most simultaneous thread resolutions;
  // fires when neither that scene nor either of the two before it contains a dramatic turn or
  // revelation. Wave 685 applied the run-based drought mode to payoffSetupIds; the
  // backward-cause peak mode has never been applied to it.
  {
    const r741c = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.payoffSetupIds ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r741c.fires) {
      issues.push({
        location: `scene ${r741c.peakIdx + 1} — peak payoff density (${r741c.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'CAUSALITY_PAYOFF_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for thread resolution (scene ${r741c.peakIdx + 1}, with ${r741c.peakMagnitude} payoffs resolving at once) has no dramatic turn or revelation in itself or the two scenes before it. The moment where the most convergent resolution lands arrives without any structural pivot or disclosure driving it — an uncaused spike that undercuts the causal chain's sense of escalation.`,
        suggestedFix: `Give scene ${r741c.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most convergent resolution is earned by a shift in the plot rather than arriving in a causal vacuum.`,
      });
    }
  }

  const { revised, usedLLM } = await rewritePass({ fountain, issues, passName: 'causality', approvedSpans, storyContext: input.storyContext, priorPassResults: input.priorPassResults });
  const changed = revised !== fountain;

  return {
    pass: 'causality',
    issues,
    revisedFountain: revised,
    changed,
    summary: issues.length === 0
      ? 'Causality pass: causal logic is sound'
      : `Causality pass: ${issues.length} issue(s) — ${usedLLM ? 'rewritten' : 'flagged (stub mode)'}`,
  };
}
