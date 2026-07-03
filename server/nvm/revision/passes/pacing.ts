// Wave 39 — Pass 9: Pacing
// Checks scene length balance: scenes that are too long for their dramatic
// purpose, scenes that are too short to land, act-level pacing imbalance.
// Wave 143 additions: energy monotone (scenes all the same energy level),
// rhythm variety (scenes lack alternating fast/slow pacing), and energy timing
// (high-energy scenes placed where they won't impact story).
// Wave 157 additions: climax scene underweight (peak Act 3 scene given fewer
// lines than average), midpoint collapse (midpoint scene is too brief and flat
// to function as structural pivot), resolution too brief (final scene ends
// before the audience can experience the emotional release).
// Wave 260 additions: opening scene bloat (overlong first scene), Act 1 overextended
// (setup hogs >40% of pages), short-scene flood (>60% of scenes undersized).
// Wave 274 additions: Act 3 page overrun (climax act >35% of total pages),
// long-scene flood (>50% of scenes above 1.5× average), Act 2 page weight
// (middle act <40% of total pages — underweight complication zone).
// Wave 288 additions: suspense early peak (Act 1 avg suspense > Act 3 avg and Act 3 ≤ 0),
// curiosity final drop (avg curiosityDelta in final quarter ≤ 0 while overall is positive),
// curiosity opening flatline (opening avg curiosityDelta ≤ 0 — hook absent).
// Wave 302 additions: ending on peak (final scene is the suspense maximum — no
// decompression), post-release dead air (3 flat scenes after the biggest tension
// release), net tension deficit (cumulative suspenseDelta sum is negative).
// Wave 316 additions: revelation scene underweight (revelation-tagged scenes avg
// below 60% of overall avg length), curiosity midzone gap (midzone avg ≤ 0 while
// opening was positive), clock scene pacing mismatch (clock-raising scenes avg
// above 1.5× overall length — urgency undercut by slow page pace).
// Wave 327 additions: dramatic-turn scene underweight (turn scenes avg below 60% of
// overall length), payoff scene underweight (payoff scenes avg below 60%), emotional
// peak scene underweight (non-neutral scenes avg below 60% — feeling given least room).
// Wave 341 additions: conflict scene underweight (negative-relationship-shift scenes avg
// below 60% of overall length — ruptures rushed), curiosity peak scene underweight (high-
// curiosityDelta scenes avg below 60% — intrigue given least room), quiet scene bloat
// (scenes carrying no dramatic marker average above 1.5× overall — script lingers on its
// most inert beats).
// Wave 355 additions: suspense peak scene underweight (the single highest-suspense scene
// runs below 60% of overall length), seed scene bloat (clue-seeding scenes average above
// 1.5× overall — foreshadowing telegraphed by page space), stakes scene underweight
// (raise_stakes scenes average below 60% — escalations rushed).
// Wave 369 additions: clock scene underweight (clock-raise scenes average below 60% of
// overall — deadlines rushed; the complement of clock scene pacing mismatch), revelation
// scene bloat (revelation scenes average above 1.5× overall — disclosures over-explained;
// complement of revelation scene underweight), payoff scene bloat (payoff scenes average
// above 1.5× overall — callbacks belabored; complement of payoff scene underweight).
// Wave 383 additions: conflict scene bloat (rupture scenes average above 1.5× overall —
// ruptures wallowed in; complement of conflict scene underweight), dramatic-turn scene bloat
// (turn scenes average above 1.5× — pivots that sprawl and lose their snap; complement of
// dramatic-turn scene underweight), emotional-peak scene bloat (non-neutral scenes average
// above 1.5× — feeling over-indulged; complement of emotional-peak scene underweight).
// Wave 397 additions: seed scene underweight (clue-seeding scenes average below 60% of overall
// — seeds dropped too quickly to register; complement of seed scene bloat), stakes scene bloat
// (raise_stakes scenes average above 1.5× — escalation sprawls and loses urgency; complement
// of stakes scene underweight), curiosity peak scene bloat (high-curiosityDelta scenes average
// above 1.5× — the most intriguing moments over-explained; complement of curiosity peak
// scene underweight).
// Wave 411 additions: suspense peak scene bloat (the single highest-suspense scene runs above
// 1.5× overall — the tensest beat sprawls and loses its grip; complement of SUSPENSE_PEAK_
// SCENE_UNDERWEIGHT), resolution bloat (the final resolution scene runs above 2× overall — the
// "long goodbye" that overstays the climax; complement of RESOLUTION_TOO_BRIEF), opening scene
// underweight (the first scene runs below 50% overall — too brief to establish world, tone, or
// character before the story moves; complement of OPENING_SCENE_BLOAT).
// Wave 425 additions: scene expansion run (5+ consecutive scenes each strictly longer than the
// prior — a sustained lengthening that mirrors SCENE_COMPRESSION_SPIRAL's shrinking run; the
// story balloons across the stretch when it should be compressing toward the climax),
// suspense midpoint trough (the structural midpoint scene's suspenseDelta falls below BOTH the
// first-half and second-half average while both averages are positive — the story's gear-change
// moment is a valley between two zones of energy rather than a pivot), curiosity frontload
// (>65% of all positive-curiosityDelta scenes sit in the first half — the mystery engine runs
// hot in setup but stalls through complication and climax, starving the back half of the
// forward-pull it needs most).
// Wave 439 additions: suspense curiosity decoupled (high-suspense scenes — suspenseDelta>1 —
// and high-curiosity scenes — curiosityDelta>0 — never coincide even though both exist in the
// story; the two forward-pull engines always fire in separate scenes; co-occurrence/decoupling ×
// dual-channel, distinct from all existing zone/distribution/run checks), curiosity flatline run
// (5+ consecutive scenes all have curiosityDelta ≤ 0 while positive-curiosity scenes exist
// elsewhere — the question-engine goes dark for a sustained local stretch; run-based × curiosity
// channel, distinct from CURIOSITY_FRONTLOAD which checks the first-half proportion), curiosity
// aftermath flat (no high-suspense scene — suspenseDelta>1 — is followed within 2 scenes by a
// curiosity rise — curiosityDelta>0 — tension peaks never open new questions downstream;
// sequence/aftermath × curiosity triggered by suspense peak, distinct from SUSPENSE_CURIOSITY_
// DECOUPLED by testing the sequential aftermath relationship rather than same-scene coincidence).
// Wave 453 additions: emotional flatline run (5+ consecutive scenes with neutral emotionalShift
// while ≥3 emotional scenes exist elsewhere — the feeling register goes dark locally; run-based ×
// emotional channel, completing the flatline-run family alongside CURIOSITY_FLATLINE_RUN),
// suspense emotional aftermath flat (no high-suspense scene followed by emotional shift in next 2
// scenes — danger has no human aftershock; sequence/aftermath × emotional × suspense-peak trigger,
// completing the suspense-aftermath family alongside CURIOSITY_AFTERMATH_FLAT), suspense emotion
// decoupled (≥3 high-suspense and ≥3 emotional scenes never coinciding — danger and feeling
// always in separate scenes; co-occurrence × suspense × emotional channel, completing the
// co-occurrence family alongside SUSPENSE_CURIOSITY_DECOUPLED).
// Wave 467 additions: revelation suspense aftermath flat (no revelation scene followed by suspense
// rise in next 2 scenes — disclosures don't escalate danger; sequence/aftermath × suspense ×
// revelation trigger, first aftermath check with revelation as trigger), clock pressure run (≥4
// consecutive scenes all under clock pressure — urgency collapses into ambient noise without
// contrast; run-based × clock channel, first run check for the clock channel), emotional curiosity
// decoupled (≥3 emotional and ≥3 curiosity-positive scenes never coinciding — feeling and
// wondering always separate; co-occurrence/decoupling × emotional × curiosity, completing the
// three-way co-occurrence family).
// Wave 481 additions: clock aftermath suspense flat (≥3 clock-raising scenes none followed by
// suspense rise in next 2 scenes — deadlines never escalate felt tension downstream; sequence/
// aftermath × suspense × clock trigger, fifth aftermath check completing the trigger family),
// suspense peak uncaused (the story's single highest-suspense scene has no clock event,
// dramatic turn, or revelation in itself or either prior scene — the climax of tension emerges
// from a dramatic vacuum; backward-cause × suspense peak, first backward-cause check in
// pacing.ts), emotional peak uncaused (the single scene with highest suspenseDelta among
// emotionally non-neutral scenes lacks any upstream cause in prior 2 scenes — the emotional
// climax is unmotivated; backward-cause × emotional peak, second backward-cause check in
// pacing.ts).
// Wave 509 additions: suspense flatline run (5+ consecutive scenes with suspenseDelta ≤ 0 while
// ≥3 positive-suspense scenes exist elsewhere — the tension engine goes dark for a sustained
// local stretch; run-based × suspense channel, completing the flatline-run family alongside
// CURIOSITY_FLATLINE_RUN and EMOTIONAL_FLATLINE_RUN), payoff suspense decoupled (≥3 payoff and
// ≥3 high-suspense scenes never coinciding — callbacks never land inside tension and tension
// never has semantic resonance; co-occurrence/decoupling × payoff × suspense, first payoff-
// channel entry in the decoupling family distinct from the curiosity/emotion/suspense entries),
// payoff aftermath curiosity flat (≥3 payoff scenes none followed by curiosity rise in next 2
// scenes — resolved setups never open new questions downstream; sequence/aftermath × curiosity
// × payoff trigger, first payoff-trigger entry in the curiosity-aftermath family, distinct from
// CURIOSITY_AFTERMATH_FLAT which uses the high-suspense trigger and CLOCK_AFTERMATH_CURIOSITY_FLAT
// which uses the clock trigger).
// Wave 495 additions: clock aftermath curiosity flat (≥3 clock-raising scenes none followed
// by curiosity rise in next 2 scenes — deadlines never open new questions downstream;
// sequence/aftermath × curiosity × clock trigger, extending the aftermath family to the clock ×
// curiosity cross-channel, distinct from CLOCK_AFTERMATH_SUSPENSE_FLAT which uses the suspense
// channel and CURIOSITY_AFTERMATH_FLAT which uses the high-suspense trigger), revelation
// emotional aftermath flat (≥3 revelation scenes none followed by emotional shift in next 2
// scenes — disclosures never register in characters' feelings; sequence/aftermath × emotional
// × revelation trigger, completing the aftermath grid for the revelation trigger, distinct from
// REVELATION_SUSPENSE_AFTERMATH_FLAT which uses the suspense channel and SUSPENSE_EMOTIONAL_
// AFTERMATH_FLAT which uses the suspense trigger), curiosity peak uncaused (the single highest-
// curiosity scene has no revelation, dramatic turn, or clock event in itself or either prior
// scene — the story's greatest question-raise arrives without informational cause; backward-cause
// × curiosity peak, third backward-cause check completing the peak-cause family alongside
// SUSPENSE_PEAK_UNCAUSED and EMOTIONAL_PEAK_UNCAUSED).
// Wave 551 additions: turn aftermath suspense flat (sequence/aftermath × suspense × dramatic-turn
// trigger — n≥8, ≥3 dramatic-turn scenes not in last 2 positions, avg next-scene suspenseDelta ≤ 0;
// story pivots never accelerate tension in what immediately follows; completes the dramatic-turn-
// aftermath family alongside curiosity and emotion; distinct from all clock/revelation/payoff aftermath
// checks which use different triggers), turn aftermath curiosity flat (sequence/aftermath × curiosity
// × dramatic-turn trigger — n≥8, ≥3 dramatic-turn scenes not in last 2 positions, every turn followed
// by 2 scenes with curiosityDelta ≤ 0; pivots never ignite wondering in what follows; distinct from
// REVELATION_CURIOSITY_AFTERMATH_FLAT [revelation trigger] and CLOCK_AFTERMATH_CURIOSITY_FLAT [clock
// trigger]; first aftermath × curiosity check on dramatic-turn trigger), turn aftermath emotion flat
// (sequence/aftermath × emotion × dramatic-turn trigger — n≥8, ≥3 dramatic-turn scenes not in last
// 2 positions, every turn followed by 2 emotionally neutral scenes; pivots never register in the
// protagonist's felt state; distinct from CLOCK_AFTERMATH_EMOTION_FLAT and REVELATION_EMOTIONAL_
// AFTERMATH_FLAT which use different triggers; completes the turn-aftermath family and the three
// remaining emotion-aftermath cells across the full trigger set).
// Wave 537 additions: revelation curiosity aftermath flat (sequence/aftermath × curiosity ×
// revelation trigger — n≥8, ≥3 revelation scenes not in last 2 positions, every revelation
// followed by 2 scenes with curiosityDelta ≤ 0; disclosures never ignite wondering in what
// follows; completes the revelation-aftermath family alongside revelation→suspense and revelation→
// emotion, and mirrors clock→curiosity and payoff→curiosity with revelation as the trigger),
// payoff opening zone absent (zone presence/absence × payoff × opening third — n≥9, ≥3 payoff
// scenes, none in opening structural third; all resolutions deferred past the opening; first zone-
// absence check on the payoff channel in this pass, distinct from PAYOFF_TEMPORAL_CLUSTER in
// payoff.ts which is concentration not absence, and from PAYOFF_BACK_LOADED in intention.ts which
// uses a binary first/second-half distribution ratio), revelation middle zone absent (zone presence/
// absence × revelation × middle third — n≥9, ≥3 revelation scenes, none in the middle structural
// third; the disclosure engine skips the complication zone entirely; distinct from REVELATION_
// TEMPORAL_CLUSTER in belief.ts which is concentration not absence, and from REVELATION_SUSPENSE_
// AFTERMATH_FLAT which is aftermath mode; first zone check on revelation in this pass).
// Wave 579 additions: payoff peak uncaused (backward-cause × payoff channel × single-peak — n≥8,
// ≥2 payoff scenes, the peak payoff scene [most payoffSetupIds] has no revelation/turn/clock in
// itself or prior 2 scenes; completes the backward-cause family alongside suspense/emotional/
// curiosity peak uncaused), suspense closing zone absent (zone presence/absence × suspense ×
// closing structural third — n≥9, ≥3 suspense scenes, none in final third; tension engine silent
// when it should be highest; distinct from SUSPENSE_EARLY_PEAK [relative comparison] and
// SUSPENSE_FLATLINE_RUN [run-based]; first zone-absence check on the suspense channel), clock zone
// cluster (distribution/timing × clock × structural zone concentration — n≥9, ≥3 clock scenes,
// >75% concentrated in one third; urgency isolated in one act not escalating; distinct from
// CLOCK_PRESSURE_RUN [run-based adjacency] and CURIOSITY_FRONTLOAD [different channel]).
// Wave 565 additions: seed aftermath suspense flat (sequence/aftermath × suspense × seed trigger —
// n≥8, ≥3 seed scenes [seededClueIds non-empty] not in last 2 positions, avg suspenseDelta of the
// immediately following scene ≤ 0; foreshadowing never tightens tension in its wake; the seed row of
// the suspense-aftermath family alongside revelation/clock/payoff/turn triggers), seed aftermath
// curiosity flat (sequence/aftermath × curiosity × seed trigger — n≥8, ≥3 seed scenes not in last 2
// positions, every seed followed by 2 scenes with curiosityDelta ≤ 0; foreshadowing never ignites
// wondering; the seed row of the curiosity-aftermath family), seed aftermath emotion flat (sequence/
// aftermath × emotion × seed trigger — n≥8, ≥3 seed scenes not in last 2 positions, every seed
// followed by 2 emotionally neutral scenes; foreshadowing never registers in felt state; completes the
// seed-aftermath family and the emotion-aftermath family across all five triggers — revelation, clock,
// payoff, turn, and seed). This wave fills the one missing trigger row (seed) in the aftermath matrix.
// Wave 523 additions: clock aftermath emotion flat (sequence/aftermath × emotion × clock trigger
// — n≥8, ≥3 clockRaised scenes not in last 2 positions, every clockRaised scene followed by 2
// emotionally neutral scenes; deadlines never register in the protagonist's felt state; completes
// the clock-aftermath family alongside clock→suspense and clock→curiosity; distinct from
// REVELATION_EMOTIONAL_AFTERMATH_FLAT which uses a revelation trigger and SUSPENSE_EMOTIONAL_
// AFTERMATH_FLAT which uses a suspense trigger), payoff aftermath emotion flat (sequence/aftermath
// × emotion × payoff trigger — n≥8, ≥3 payoff scenes not in last 2 positions, every payoff scene
// followed by 2 emotionally neutral scenes; thread resolutions never register in felt state;
// extends the payoff-aftermath family from payoff→curiosity to payoff→emotion; distinct from all
// existing aftermath×emotion checks which use revelation or suspense as the trigger), payoff
// aftermath suspense flat (sequence/aftermath × suspense × payoff trigger — n≥8, ≥3 payoff scenes
// not in last 2 positions, avg suspenseDelta of immediately following scene ≤ 0; callbacks never
// generate forward tension; adds the suspense channel to the payoff-aftermath family alongside
// payoff→curiosity; distinct from PAYOFF_SUSPENSE_DECOUPLED which is co-occurrence in the same
// scene and from CLOCK_AFTERMATH_SUSPENSE_FLAT / REVELATION_SUSPENSE_AFTERMATH_FLAT which use
// different triggers).
// Wave 593 additions: stakes aftermath suspense flat, stakes aftermath curiosity flat, stakes
// aftermath emotion flat (sequence/aftermath × suspense/curiosity/emotion × stakes-raise trigger —
// n≥8, ≥3 raise_stakes scenes [pos<n-2]; every stakes-raise is followed by 2 scenes with no rise in
// the respective channel; the escalation-aftermath family already covers revelation, clock, payoff,
// dramatic-turn, and seed triggers [Waves 467/481/495/509/523/537/551/565] but never the stakes-raise
// trigger itself — the moment a story explicitly raises what's at risk is exactly where the audience
// expects tension/wonder/feeling to follow, and this was the one missing row in a 6-trigger x
// 3-channel matrix. First checks in this pass built on the shared checkAftermathVoid template
// (server/nvm/revision/passes/lib/checks.ts, audit M2.2) rather than a hand-rolled loop; the
// template additionally requires the aftermath signal to occur >=2 times elsewhere in the story
// [minAftermathCount], a slightly stronger guard than the existing seed/clock/payoff/turn/revelation
// aftermath checks use — it protects against firing when the channel is trivially absent everywhere,
// not just decoupled from the stakes-raise trigger specifically).
// Wave 607 additions: OPEN_THREAD_AFTERMATH_SUSPENSE_FLAT, OPEN_THREAD_AFTERMATH_CURIOSITY_FLAT,
// OPEN_THREAD_AFTERMATH_EMOTION_FLAT (sequence/aftermath × suspense/curiosity/emotion × heavy
// unresolved-clue-debt trigger — a 7th trigger row added to the aftermath matrix Wave 593 called
// complete at 6 triggers; first use of the unresolvedClues field anywhere in this 103-rule pass).
// Wave 621 additions: PACING_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE (underweight/bloat ×
// dialogueHighlights × four structural zones — first use of dialogueHighlights anywhere in this
// 106-rule pass), PACING_PAYOFF_STAGING_DECOUPLED (co-occurrence/decoupling × payoffSetupIds ×
// visualBeats — first use of visualBeats anywhere in this pass), REVELATION_AFTERMATH_STAGING_
// FLAT (sequence/aftermath × visualBeats × revelation trigger — a 4th channel added to the
// revelation row of the trigger×channel aftermath matrix, alongside suspense/curiosity/emotion).
// Wave 635 additions: PACING_OPEN_THREAD_STAGING_DECOUPLED (co-occurrence/decoupling ×
// unresolvedClues × visualBeats — first pairing of these two fields in this 109-rule pass),
// PACING_SEED_STAGING_AFTERMATH_VOID (sequence/aftermath × seededClueIds trigger → visualBeats
// absence — first pairing of these two fields), PACING_OPEN_THREAD_ZONE_IMBALANCE
// (underweight/bloat × unresolvedClues × four structural zones — unresolvedClues had only ever
// been used as an aftermath trigger [Wave 607's 7th-row extension], never zone-audited).
// Wave 649 additions (built on the shared checks library, audit M2.2): this 112-rule pass already
// hand-rolls the peak/drought/cluster analytical concepts extensively (four PEAK_UNCAUSED checks
// on suspense/emotion/curiosity/payoff, four flatline/run checks on curiosity/emotion/clock/
// suspense, one zone-cluster on clock) — but never via the shared checkPeakUncaused/
// checkDroughtRun/checkZoneCluster helpers, and never on the visualBeats/unresolvedClues/
// dialogueHighlights channels. PACING_STAGING_PEAK_UNCAUSED (single-peak isolation/backward-
// cause × visualBeats magnitude — the scene with the densest physical staging has no dramatic
// turn or revelation in itself or the two scenes before it; distinct from the existing
// SUSPENSE/EMOTIONAL/CURIOSITY/PAYOFF_PEAK_UNCAUSED family, none of which audit the staging
// channel), PACING_OPEN_THREAD_DROUGHT_RUN (run-based × unresolvedClues absence — a 6+
// consecutive-scene stretch with zero outstanding clue-debt while such scenes occur ≥3 times
// elsewhere; the drought/flatline-run template applied to a fifth channel after curiosity/
// emotion/clock/suspense), PACING_HIGHLIGHT_ZONE_CLUSTER (distribution/timing × dialogueHighlights
// × structural thirds — >75% of highlighted-dialogue scenes concentrate in one third; the
// zone-cluster template applied to a second channel after clock).
// Wave 663 additions (built on the shared checks library, audit M2.2): PACING_RELATIONSHIP_PEAK_
// UNCAUSED (single-peak isolation/backward-cause × relationshipShifts magnitude — the scene with
// the most simultaneous bond changes has no dramatic turn or revelation in itself or the two
// scenes before it; distinct from the existing SUSPENSE/EMOTIONAL/CURIOSITY/PAYOFF/STAGING_PEAK_
// UNCAUSED family, none of which audit the relational channel), PACING_SEED_DROUGHT_RUN
// (run-based × seededClueIds absence — seededClueIds has only ever been an aftermath-flat
// trigger in this pass; the drought-run template applied to a sixth channel), PACING_PAYOFF_ZONE_
// CLUSTER (distribution/timing × payoffSetupIds × structural thirds — payoffSetupIds anchors
// three aftermath-flat checks and a peak-uncaused check already, but has never been
// cluster-audited; the zone-cluster template applied to a third channel after clock/highlight).
// Wave 677 additions (built on the shared checks library, audit M2.2): PACING_CLOCK_DELTA_PEAK_
// UNCAUSED (single-peak isolation/backward-cause × clockDelta magnitude — clockDelta has only
// ever appeared as an OR-condition alongside clockRaised inside aftermath triggers; the
// backward-cause peak mode applied to it standalone for the first time), PACING_TURN_DROUGHT_RUN
// (run-based × dramaticTurn presence absence — dramaticTurn has only ever served as an
// aftermath-void trigger or hasCause condition; the drought-run mode applied to this channel for
// the first time), PACING_STAKES_ZONE_CLUSTER (distribution/timing × purpose === 'raise_stakes'
// × structural thirds — `purpose` has only ever anchored a single aftermath-flat trigger
// [STAKES_AFTERMATH_EMOTION_FLAT]; the zone-cluster mode applied to it for the first time).
// Wave 691 additions (built on the shared checks library): PACING_SEED_PEAK_UNCAUSED (single-peak
// isolation/backward-cause × seededClueIds magnitude — Wave 663 applied the drought-run mode to
// seededClueIds; the backward-cause peak mode has never been applied to this channel),
// PACING_CLOCK_DROUGHT_RUN (run-based × clockRaised absence — this pass's Wave 579 hand-rolled
// CLOCK_ZONE_CLUSTER already audits clockRaised distributionally; the shared-library drought-run
// mode has never been applied to it), PACING_TURN_ZONE_CLUSTER (distribution/timing ×
// dramaticTurn presence × structural thirds — Wave 677 applied the drought-run mode to
// dramaticTurn; the zone-cluster mode has never been applied to this channel).
// Wave 705 additions (built on the shared checks library): PACING_SEED_ZONE_CLUSTER
// (distribution/timing × seededClueIds × structural thirds — Waves 663/691 applied the
// drought-run and backward-cause peak modes to seededClueIds; the zone-cluster mode has never
// been applied to it, completing the trio), PACING_OPEN_THREAD_PEAK_UNCAUSED (single-peak
// isolation/backward-cause × unresolvedClues magnitude — Wave 649 applied the drought-run mode to
// unresolvedClues; the backward-cause peak mode has never been applied to it), PACING_PAYOFF_
// PEAK_UNCAUSED (single-peak isolation/backward-cause × payoffSetupIds magnitude — Wave 663
// applied the zone-cluster mode to payoffSetupIds; the backward-cause peak mode has never been
// applied to it).
// Wave 719 additions (built on the shared checks library): PACING_OPEN_THREAD_ZONE_CLUSTER
// (distribution/timing × unresolvedClues × structural thirds — Waves 649/705 applied the
// drought-run and backward-cause peak modes to unresolvedClues; the zone-cluster mode has never
// been applied to it, completing the trio), PACING_PAYOFF_DROUGHT_RUN (run-based ×
// payoffSetupIds absence — Waves 663/705 applied the zone-cluster and backward-cause peak modes
// to payoffSetupIds; the drought-run mode has never been applied to it, completing the trio),
// PACING_HIGHLIGHT_PEAK_UNCAUSED (single-peak isolation/backward-cause × dialogueHighlights
// magnitude — Wave 649 applied the zone-cluster mode to dialogueHighlights; the backward-cause
// peak mode has never been applied to it).

import type { PassInput, PassResult, RevisionIssue } from './types.ts';
import type { ScreenplaySceneRecord } from '../../screenplay/memory.ts';
import { rewritePass } from '../rewrite.ts';
import { checkAftermathVoid, checkZoneImbalance, checkCoOccurrenceDecoupled, checkPeakUncaused, checkDroughtRun, checkZoneCluster, FOUR_ZONE_NAMES } from './lib/checks.ts';

/**
 * Compute weighted line counts per scene.
 * Dialogue lines read ~2x faster than action lines, so they're weighted at 0.5
 * to give an approximation of reading time rather than raw line count.
 */
function sceneLineCount(fountain: string): Map<number, number> {
  const lines = fountain.split('\n');
  const counts = new Map<number, number>();
  let currentScene = -1;
  let weightedCount = 0;
  // A character cue is an ALL-CAPS line (optional indent) followed by dialogue.
  let nextLineIsDialogue = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(trimmed)) {
      if (currentScene >= 0) counts.set(currentScene, Math.round(weightedCount));
      currentScene++;
      weightedCount = 0;
      nextLineIsDialogue = false;
    } else if (currentScene >= 0 && trimmed) {
      // Character cue: all-caps, optionally with parenthetical suffix
      if (/^[A-Z][A-Z0-9 \-'\.]{1,}(\s*\(.*\))?$/.test(trimmed) && trimmed.length < 40) {
        nextLineIsDialogue = true;
        // Character cue itself doesn't count toward pacing weight
      } else if (nextLineIsDialogue && !/^\(/.test(trimmed)) {
        // Dialogue line — reads faster
        weightedCount += 0.5;
      } else if (/^\(/.test(trimmed)) {
        // Parenthetical — very short, negligible
        weightedCount += 0.25;
        nextLineIsDialogue = true;
      } else {
        // Action line
        weightedCount += 1;
        nextLineIsDialogue = false;
      }
    } else if (currentScene >= 0 && !trimmed) {
      nextLineIsDialogue = false;
    }
  }
  if (currentScene >= 0) counts.set(currentScene, Math.round(weightedCount));
  return counts;
}

export async function pacingPass(input: PassInput): Promise<PassResult> {
  const { fountain, records, annotations, structure, approvedSpans } = input;
  const issues: RevisionIssue[] = [];

  const sceneLengths = sceneLineCount(fountain);
  if (sceneLengths.size === 0) {
    return {
      pass: 'pacing',
      issues: [],
      revisedFountain: fountain,
      changed: false,
      summary: 'Pacing pass: no scenes found',
    };
  }

  const lengths = Array.from(sceneLengths.values());
  const avgLength = lengths.reduce((s, v) => s + v, 0) / lengths.length;

  // ── Scenes that are disproportionately long ───────────────────────────────
  // Guard: all-whitespace scripts produce avgLength=0; skip per-scene checks in that case.
  if (!isFinite(avgLength) || avgLength === 0) {
    return { pass: 'pacing', issues: [], revisedFountain: fountain, changed: false, summary: 'Pacing pass: all scenes are empty' };
  }

  for (const [sceneIdx, lineCount] of sceneLengths) {
    const record = records[sceneIdx];
    const ann = annotations[sceneIdx];
    if (!record || !ann) continue;

    // Scene is >2.5x average and has low suspense delta = over-written
    if (lineCount > avgLength * 2.5 && record.suspenseDelta < 2) {
      issues.push({
        location: `Scene ${sceneIdx} (${record.slug})`,
        rule: 'OVERLONG_LOW_TENSION',
        description: `Scene ${sceneIdx} is ${lineCount} lines (${Math.round(lineCount / avgLength * 100)}% above average) but generates low tension — over-written`,
        severity: 'major',
        suggestedFix: 'Trim exposition and redundant beats; reduce to the scene\'s essential dramatic moment',
      });
    }

    // Scene is <30% of average and is a turning point — too compressed
    if (lineCount < avgLength * 0.3 && (ann.revelation || record.clockRaised)) {
      issues.push({
        location: `Scene ${sceneIdx} (${record.slug})`,
        rule: 'COMPRESSED_TURNING_POINT',
        description: `Scene ${sceneIdx} is a turning point but only ${lineCount} lines (very short) — the moment may not land`,
        severity: 'major',
        suggestedFix: 'Expand this key scene with more character reaction and consequence before moving on',
      });
    }
  }

  // ── Act-level pacing: Act 1 too long, Act 3 too short ────────────────────
  const n = records.length;
  if (n >= 6) {
    const act1End = Math.floor(n * 0.25);
    const act3Start = Math.floor(n * 0.75);

    const act1Lines = Array.from({ length: act1End }, (_, i) => sceneLengths.get(i) ?? 0).reduce((s, v) => s + v, 0);
    const act3Lines = Array.from({ length: n - act3Start }, (_, i) => sceneLengths.get(act3Start + i) ?? 0).reduce((s, v) => s + v, 0);
    const totalLines = lengths.reduce((s, v) => s + v, 0);
    if (totalLines === 0) return {
      pass: 'pacing', issues: [], revisedFountain: fountain, changed: false,
      summary: 'Pacing pass: all scenes are empty',
    };

    const act1Pct = act1Lines / totalLines;
    const act3Pct = act3Lines / totalLines;

    if (act1Pct > 0.4) {
      issues.push({
        location: 'Act 1 pacing',
        rule: 'ACT1_TOO_LONG',
        description: `Act 1 uses ${Math.round(act1Pct * 100)}% of total page count — setup dominates at the expense of conflict`,
        severity: 'major',
        suggestedFix: 'Trim Act 1 by cutting or compressing scenes that don\'t introduce conflict',
      });
    }

    if (act3Pct < 0.1 && structure.actPosition === 'act3') {
      issues.push({
        location: 'Act 3 pacing',
        rule: 'ACT3_TOO_SHORT',
        description: `Act 3 uses only ${Math.round(act3Pct * 100)}% of total page count — the resolution feels rushed`,
        severity: 'major',
        suggestedFix: 'Expand Act 3 with a proper denouement that honors the climax',
      });
    }
  }

  // ── Wave 143: Energy monotone & rhythm variety ────────────────────────────

  // ENERGY_MONOTONE: All scenes have similar line counts (±50% of average) →
  // screenplay has no pacing rhythm (no short punchy scenes, no long contemplative ones).
  // This creates a dull, uniform energy that bores the audience.
  const lineCountVariance = lengths.reduce((sum, l) => sum + Math.pow(l - avgLength, 2), 0) / lengths.length;
  const stdDev = Math.sqrt(lineCountVariance);
  const coefficientOfVariation = stdDev / avgLength;

  if (coefficientOfVariation < 0.35 && records.length >= 8) {
    // Low variation (<35%) means scenes are all similar length
    issues.push({
      location: 'Overall pacing',
      rule: 'ENERGY_MONOTONE',
      description: `Scene lengths are monotone: all scenes are ${Math.round(avgLength)} ±${Math.round(stdDev)} lines. There's no rhythm — no short punchy scenes, no long contemplative ones.`,
      severity: 'major',
      suggestedFix: 'Vary scene length dramatically: follow a 2-page scene with a 30-second beat, then a 5-page confrontation. Create pacing texture.',
    });
  }

  // RHYTHM_INVERSION: Plot peaks (highest suspense) occur at the beginning
  // or middle of the story, with low energy at the climax. The rhythm is inverted.
  if (records.length >= 5) {
    const firstThird = records.slice(0, Math.floor(records.length / 3));
    const lastThird = records.slice(Math.floor(records.length * 2 / 3));

    const firstThirdMaxSuspense = Math.max(...firstThird.map(r => r.suspenseDelta), 0);
    const lastThirdAvgSuspense = lastThird.length > 0
      ? lastThird.reduce((s, r) => s + r.suspenseDelta, 0) / lastThird.length
      : 0;

    if (firstThirdMaxSuspense > 3 && lastThirdAvgSuspense < 1.5) {
      issues.push({
        location: 'Story rhythm',
        rule: 'RHYTHM_INVERSION',
        description: `Story's highest energy (suspense > 3) occurs in the opening third, but the final act has low average suspense (${lastThirdAvgSuspense.toFixed(1)}) — the climax is anticlimactic`,
        severity: 'critical',
        suggestedFix: 'Restructure so energy builds toward climax. Either reduce early peaks or amplify the final act to surpass the opening energy.',
      });
    }
  }

  // ENERGY_PLACEMENT_MISMATCH: High-energy scenes (suspense > 2.5) are scattered
  // without building toward climax. Energy should cluster near the end.
  if (records.length >= 8) {
    const highEnergyScenes = records
      .map((r, i) => ({ idx: i, suspense: r.suspenseDelta }))
      .filter(s => s.suspense > 2.5);

    if (highEnergyScenes.length >= 2) {
      const lastHalf = records.length / 2;
      const inLastHalf = highEnergyScenes.filter(s => s.idx >= lastHalf).length;
      const ratio = inLastHalf / highEnergyScenes.length;

      // If fewer than 60% of high-energy scenes are in the second half, placement is bad
      if (ratio < 0.6) {
        const clustered = Math.round(ratio * 100);
        issues.push({
          location: 'Energy distribution',
          rule: 'ENERGY_PLACEMENT_MISMATCH',
          description: `Only ${clustered}% of high-energy scenes (${inLastHalf}/${highEnergyScenes.length}) occur in the second half — energy peaks are scattered early, not building toward climax`,
          severity: 'major',
          suggestedFix: 'Move or amplify high-energy scenes to occur after the midpoint. The story should accelerate toward, not away from, the climax.',
        });
      }
    }
  }

  // ── Wave 157: Climax underweight, midpoint collapse, resolution brevity ──────

  // CLIMAX_SCENE_UNDERWEIGHT: The Act 3 peak-suspense scene is shorter than 70%
  // of average — the most important scene in the story is given less physical
  // space than a setup scene. Emotional weight requires proportional page space.
  if (records.length >= 6) {
    const climaxZoneStart = Math.floor(records.length * 0.7);
    let climaxSceneIdx = -1;
    let maxClimaxSuspense = -Infinity;
    for (let i = climaxZoneStart; i < records.length; i++) {
      if (records[i].suspenseDelta > maxClimaxSuspense) {
        maxClimaxSuspense = records[i].suspenseDelta;
        climaxSceneIdx = i;
      }
    }
    if (climaxSceneIdx >= 0 && maxClimaxSuspense > 1.5) {
      const climaxLines = sceneLengths.get(climaxSceneIdx) ?? 0;
      if (climaxLines > 0 && climaxLines < avgLength * 0.7) {
        issues.push({
          location: `Scene ${climaxSceneIdx} (climax, peak suspense ${maxClimaxSuspense.toFixed(1)})`,
          rule: 'CLIMAX_SCENE_UNDERWEIGHT',
          description: `The climax scene (Scene ${climaxSceneIdx}) is only ${climaxLines} lines — ${Math.round(climaxLines / avgLength * 100)}% of the story average. The most emotionally significant scene in the story is given less space than a setup scene.`,
          severity: 'major',
          suggestedFix: 'Expand the climax with physical staging, character reaction, and immediate consequence. The audience needs time to experience the weight of the moment before the story moves on.',
        });
      }
    }
  }

  // MIDPOINT_COLLAPSE: The midpoint scene is shorter than 50% of average AND
  // has low suspense — there is no structural pivot. The midpoint should feel
  // like a gear-shift; when it's collapsed, Act 2a and Act 2b blur together.
  if (records.length >= 8) {
    const midIdx = Math.floor(records.length / 2);
    const midLines = sceneLengths.get(midIdx) ?? 0;
    if (midLines > 0 && midLines < avgLength * 0.5 && records[midIdx].suspenseDelta < 2) {
      issues.push({
        location: `Scene ${midIdx} (midpoint)`,
        rule: 'MIDPOINT_COLLAPSE',
        description: `The midpoint scene (Scene ${midIdx}) is only ${midLines} lines — ${Math.round(midLines / avgLength * 100)}% of average — with low suspense (${records[midIdx].suspenseDelta.toFixed(1)}). The structural pivot of the story is physically underdeveloped.`,
        severity: 'major',
        suggestedFix: 'Expand the midpoint with a substantial reversal or revelation. The midpoint should feel like a turning: the second half of Act 2 must be qualitatively different from the first.',
      });
    }
  }

  // RESOLUTION_TOO_BRIEF: The final scene (resolution/epilogue) is shorter than
  // 50% of average, leaving no room for emotional release or denouement. A story
  // that ends before it has time to breathe denies the audience the release they
  // were building toward.
  if (records.length >= 6) {
    const lastSceneIdx = records.length - 1;
    const lastLines = sceneLengths.get(lastSceneIdx) ?? 0;
    const lastRecord = records[lastSceneIdx];
    const isResolutionScene = lastRecord &&
      (lastRecord.purpose === 'resolution' || lastRecord.suspenseDelta < 0);
    if (isResolutionScene && lastLines > 0 && lastLines < avgLength * 0.5) {
      issues.push({
        location: `Scene ${lastSceneIdx} (final/resolution)`,
        rule: 'RESOLUTION_TOO_BRIEF',
        description: `The final scene (Scene ${lastSceneIdx}) is only ${lastLines} lines — ${Math.round(lastLines / avgLength * 100)}% of average. The story ends before there is space for emotional release or denouement.`,
        severity: 'major',
        suggestedFix: 'Expand the final scene with character reactions, a moment of reflection, and a visual or physical image that earns the emotional release the story has been building toward.',
      });
    }
  }

  // ── Wave 172: Plateau, opening bloat, suspense/length decoupling ─────────────

  // PACING_PLATEAU: A run of 4+ consecutive scenes whose lengths sit within ±20%
  // of one another. Even when the global scene-length variance is healthy (so
  // ENERGY_MONOTONE stays quiet), a flat local stretch reads as a sag — four
  // scenes in a row at the same cadence with no acceleration or contraction.
  if (records.length >= 8) {
    const orderedLengths = Array.from({ length: records.length }, (_, i) => sceneLengths.get(i) ?? 0);
    for (let i = 0; i + 4 <= orderedLengths.length; i++) {
      const window = orderedLengths.slice(i, i + 4);
      const minLen = Math.min(...window);
      const maxLen = Math.max(...window);
      if (minLen > 0 && maxLen <= minLen * 1.2) {
        issues.push({
          location: `Scenes ${i}–${i + 3}`,
          rule: 'PACING_PLATEAU',
          description: `Scenes ${i}–${i + 3} all run within ±20% of the same length (${minLen}–${maxLen} lines) — a flat stretch with no acceleration or contraction. The cadence plateaus for four scenes in a row.`,
          severity: 'minor',
          suggestedFix: 'Break the plateau: hard-cut one of these scenes to a single beat, or expand another into a full set-piece. A run of same-length scenes reads as a monotone even when the rest of the script breathes.',
        });
        break; // one plateau report is enough
      }
    }
  }

  // OPENING_SCENE_BLOAT: The very first scene is more than 2x the story average.
  // A bloated opening makes the audience wait through setup before the engine
  // turns over — the hook arrives late. Distinct from OVERLONG_LOW_TENSION
  // (>2.5x), this catches a merely-overweight opener specifically.
  if (records.length >= 6) {
    const openingLen = sceneLengths.get(0) ?? 0;
    if (openingLen > 0 && openingLen > avgLength * 2 && openingLen <= avgLength * 2.5) {
      issues.push({
        location: `Scene 0 (${records[0]?.slug ?? 'opening'})`,
        rule: 'OPENING_SCENE_BLOAT',
        description: `The opening scene is ${openingLen} lines — ${Math.round(openingLen / avgLength * 100)}% of the story average. The story takes too long to get going before the central engine turns over.`,
        severity: 'minor',
        suggestedFix: 'Trim the opening to its sharpest entry point. Start as late into the scene as possible, cut throat-clearing setup, and let exposition arrive through later conflict rather than up front.',
      });
    }
  }

  // SUSPENSE_LENGTH_DECOUPLING: Page space is allocated inversely to dramatic
  // weight — multiple high-tension scenes are crammed below average length while
  // multiple low-tension scenes sprawl above it. Distinct from
  // CLIMAX_SCENE_UNDERWEIGHT (single climax scene), this catches a systemic
  // misallocation across the whole script.
  if (records.length >= 8) {
    const underweightHighTension = records.filter(
      (r, i) => r.suspenseDelta > 2.5 && (sceneLengths.get(i) ?? 0) > 0 && (sceneLengths.get(i) ?? 0) < avgLength,
    ).length;
    const overweightLowTension = records.filter(
      (r, i) => r.suspenseDelta < 1 && (sceneLengths.get(i) ?? 0) > avgLength,
    ).length;
    if (underweightHighTension >= 2 && overweightLowTension >= 2) {
      issues.push({
        location: 'Page-space allocation',
        rule: 'SUSPENSE_LENGTH_DECOUPLING',
        description: `Page space is decoupled from drama: ${underweightHighTension} high-tension scenes run below average length while ${overweightLowTension} low-tension scenes run above it. The script spends its pages on its quietest moments and rushes its loudest.`,
        severity: 'major',
        suggestedFix: 'Reallocate page space toward dramatic weight: expand the high-tension scenes with staging, reaction, and consequence; compress the low-tension scenes to their essential function.',
      });
    }
  }

  // ── Wave 189: Velocity drop, climax runway, resolution bloat ─────────────

  // SCENE_VELOCITY_DROP: The average scene length in the second half exceeds the
  // first-half average by more than 30%. A story that gets slower as stakes rise
  // deprives the climax of kinetic energy — the screenplay should tighten, not expand.
  if (records.length >= 8) {
    const halfIdx = Math.floor(records.length / 2);
    let firstHalfSum = 0;
    for (let i = 0; i < halfIdx; i++) firstHalfSum += sceneLengths.get(i) ?? 0;
    let secondHalfSum = 0;
    for (let i = halfIdx; i < records.length; i++) secondHalfSum += sceneLengths.get(i) ?? 0;
    const avgFirstHalf = firstHalfSum / halfIdx;
    const avgSecondHalf = secondHalfSum / (records.length - halfIdx);
    if (avgFirstHalf > 0 && avgSecondHalf > avgFirstHalf * 1.3) {
      issues.push({
        location: 'Scene velocity',
        rule: 'SCENE_VELOCITY_DROP',
        severity: 'minor',
        description: `The second half averages ${Math.round(avgSecondHalf)} lines per scene vs ${Math.round(avgFirstHalf)} in the first half — the story decelerates toward the climax instead of accelerating.`,
        suggestedFix: 'Trim scenes in the second half to tighten the approach to climax. The story should accelerate as stakes rise, not expand and dilate.',
      });
    }
  }

  // CLIMAX_RUNWAY_OVERLONG: The three scenes immediately before the Act 3 climax peak
  // are all above average length — the screenplay lingers in the approach rather than
  // snapping into the climax. A long runway dilutes urgency.
  if (records.length >= 8) {
    const climaxPeakZoneStart = Math.floor(records.length * 0.75);
    let climaxPeakIdx = -1;
    let maxClimaxPeak = -Infinity;
    for (let i = climaxPeakZoneStart; i < records.length; i++) {
      if (records[i].suspenseDelta > maxClimaxPeak) {
        maxClimaxPeak = records[i].suspenseDelta;
        climaxPeakIdx = i;
      }
    }
    if (climaxPeakIdx >= 3) {
      const runwayLens = [
        sceneLengths.get(climaxPeakIdx - 3) ?? 0,
        sceneLengths.get(climaxPeakIdx - 2) ?? 0,
        sceneLengths.get(climaxPeakIdx - 1) ?? 0,
      ];
      if (runwayLens.every(l => l > avgLength)) {
        issues.push({
          location: `Scenes ${climaxPeakIdx - 3}–${climaxPeakIdx - 1} (climax runway)`,
          rule: 'CLIMAX_RUNWAY_OVERLONG',
          severity: 'minor',
          description: `The three scenes before the climax (Scenes ${climaxPeakIdx - 3}–${climaxPeakIdx - 1}) are all above average length — the approach to the climax sprawls rather than snapping.`,
          suggestedFix: 'Cut at least one pre-climax scene to a sharp, punchy beat. The runway should tighten, not sprawl.',
        });
      }
    }
  }

  // RESOLUTION_SCENE_BLOAT: The final two scenes are both above average length and
  // both low-tension — the denouement lingers beyond its emotional function.
  // A tight resolution lands harder than an extended one.
  if (records.length >= 6) {
    const lastTwoIdx = records.length - 1;
    const secondToLastIdx = records.length - 2;
    const lastTwoLen = sceneLengths.get(lastTwoIdx) ?? 0;
    const secondToLastLen = sceneLengths.get(secondToLastIdx) ?? 0;
    if (
      lastTwoLen > 0 && secondToLastLen > 0 &&
      lastTwoLen > avgLength && secondToLastLen > avgLength &&
      records[lastTwoIdx].suspenseDelta < 1.5 &&
      records[secondToLastIdx].suspenseDelta < 1.5
    ) {
      issues.push({
        location: `Scenes ${secondToLastIdx}–${lastTwoIdx} (resolution)`,
        rule: 'RESOLUTION_SCENE_BLOAT',
        severity: 'minor',
        description: `The final two scenes (Scenes ${secondToLastIdx}–${lastTwoIdx}) are both above average length and both low-tension — the resolution drags rather than releasing.`,
        suggestedFix: 'Trim the resolution to its essential emotional beats. A tight denouement lands harder than an extended one.',
      });
    }
  }

  // ── Wave 200: Compression spiral, Act 2 dead weight, late expansion ─────────

  // SCENE_COMPRESSION_SPIRAL: Five consecutive scenes each shorter than the
  // previous — a spiral that depletes page space before the climax. Even when
  // global variance is healthy, a sustained unbroken compression run strands
  // the story below the line-count floor it needs to land the climax.
  if (records.length >= 8) {
    const orderedLens200 = Array.from({ length: records.length }, (_, i) => sceneLengths.get(i) ?? 0);
    let spiralStart = -1;
    for (let i = 0; i + 4 < orderedLens200.length; i++) {
      if (
        orderedLens200[i] > 0 &&
        orderedLens200[i + 1] < orderedLens200[i] &&
        orderedLens200[i + 2] < orderedLens200[i + 1] &&
        orderedLens200[i + 3] < orderedLens200[i + 2] &&
        orderedLens200[i + 4] < orderedLens200[i + 3]
      ) {
        spiralStart = i;
        break;
      }
    }
    if (spiralStart >= 0) {
      issues.push({
        location: `Scenes ${spiralStart}–${spiralStart + 4}`,
        rule: 'SCENE_COMPRESSION_SPIRAL',
        severity: 'major',
        description: `Scenes ${spiralStart}–${spiralStart + 4} are each shorter than the last — a five-scene compression spiral that depletes page space before the climax. The story has no recovery or re-expansion within this run.`,
        suggestedFix: 'Break the spiral by expanding at least one mid-sequence scene with a set-piece, confrontation, or character beat. The story needs room to breathe before the climax.',
      });
    }
  }

  // ACT2_DEAD_WEIGHT: Three or more Act 2 scenes that are both below average
  // length and dramatically inert — no revelation, no rising tension, no
  // relationship shift. These scenes pad runtime without advancing story; the
  // audience feels the story idling at the moment it should be escalating.
  if (records.length >= 8) {
    const act2DwStart = Math.floor(records.length * 0.25);
    const act2DwEnd = Math.floor(records.length * 0.75);
    let deadWeightCount = 0;
    for (let i = act2DwStart; i < act2DwEnd; i++) {
      const r = records[i];
      const lineLen = sceneLengths.get(i) ?? 0;
      if (
        lineLen > 0 && lineLen < avgLength &&
        r.revelation === null &&
        !r.clockRaised &&
        r.suspenseDelta < 1 &&
        (r.relationshipShifts ?? []).every((s: any) => Math.abs(s.amount) < 0.3)
      ) {
        deadWeightCount++;
      }
    }
    if (deadWeightCount >= 3) {
      issues.push({
        location: `Act 2 (scenes ${act2DwStart}–${act2DwEnd - 1})`,
        rule: 'ACT2_DEAD_WEIGHT',
        severity: 'major',
        description: `${deadWeightCount} Act 2 scenes are both below average length and dramatically empty — no revelation, no rising tension, no relationship shift. These scenes pad runtime without advancing the story.`,
        suggestedFix: 'Either cut these scenes or inject a dramatic event into each: a revelation, a rising tension beat, or a meaningful character shift. Every Act 2 scene must change something.',
      });
    }
  }

  // LATE_EXPANSION: Act 3 average scene length exceeds Act 2 average by more
  // than 15%. As stakes reach their peak, scenes should compress, not expand.
  // A late expansion dissipates the urgency built through Act 2 and makes the
  // climax feel padded rather than inevitable.
  if (records.length >= 8) {
    const act2LeStart = Math.floor(records.length * 0.25);
    const act3LeStart = Math.floor(records.length * 0.75);
    const act2LeRecs = records.slice(act2LeStart, act3LeStart);
    const act3LeRecs = records.slice(act3LeStart);
    if (act2LeRecs.length >= 2 && act3LeRecs.length >= 2) {
      const avgAct2Le = act2LeRecs.reduce((s, _, i) => s + (sceneLengths.get(act2LeStart + i) ?? 0), 0) / act2LeRecs.length;
      const avgAct3Le = act3LeRecs.reduce((s, _, i) => s + (sceneLengths.get(act3LeStart + i) ?? 0), 0) / act3LeRecs.length;
      if (avgAct2Le > 0 && avgAct3Le > avgAct2Le * 1.15) {
        issues.push({
          location: 'Act 2 vs Act 3 pacing',
          rule: 'LATE_EXPANSION',
          severity: 'minor',
          description: `Act 3 averages ${Math.round(avgAct3Le)} lines per scene vs ${Math.round(avgAct2Le)} in Act 2 — the story expands when it should contract. A late expansion dissipates the urgency built through Act 2.`,
          suggestedFix: 'Tighten Act 3 scenes as stakes peak. Reserve expansion only for the climax itself, then snap into a lean denouement.',
        });
      }
    }
  }

  // ── Wave 218: Pacing signal-processing — trend slope, distribution inequality,
  //    oscillation rate. Three orthogonal measures of the whole scene-length sequence
  //    that variance and act-average comparisons cannot capture. ──
  if (records.length >= 8) {
    const orderedLens218 = Array.from({ length: records.length }, (_, i) => sceneLengths.get(i) ?? 0);
    const n218 = orderedLens218.length;

    // PACE_DECELERATION_TREND (major): the least-squares slope of scene length against
    // scene index, normalised by average length, is positive beyond 6% per scene — the
    // story systematically lengthens its scenes across the WHOLE arc. Distinct from
    // LATE_EXPANSION (which compares Act 2 vs Act 3 averages): a global upward trend can
    // exist even when the act averages look similar. As stakes rise scenes should quicken.
    {
      const meanIdx218 = (n218 - 1) / 2;
      let cov218 = 0, varIdx218 = 0;
      for (let i = 0; i < n218; i++) {
        cov218 += (i - meanIdx218) * (orderedLens218[i] - avgLength);
        varIdx218 += (i - meanIdx218) ** 2;
      }
      const slope218 = varIdx218 > 0 ? cov218 / varIdx218 : 0;
      const slopeNorm218 = slope218 / avgLength;
      if (slopeNorm218 > 0.06) {
        issues.push({
          location: 'Whole-story pacing trend',
          rule: 'PACE_DECELERATION_TREND',
          severity: 'major',
          description: `Scene length trends upward across the entire story (normalised slope +${(slopeNorm218 * 100).toFixed(0)}% of average per scene) — the pace systematically decelerates as the story advances. Scenes should quicken toward the climax, not stretch; a rising length trend bleeds urgency out of the back half.`,
          suggestedFix: 'Reverse the trend: tighten later scenes so the average scene gets shorter as stakes rise. The audience should feel the cutting accelerate toward the climax — the scene-length curve is one of the strongest implicit signals of momentum.',
        });
      }
    }

    // PAGE_SPACE_INEQUALITY (minor): the Gini coefficient of scene lengths exceeds 0.5 —
    // a few scenes hoard most of the page space while the rest are starved. The story
    // budgets its runtime unevenly, which reads as a handful of set-pieces stranded among
    // undernourished connective scenes. A distribution measure, orthogonal to variance.
    {
      let absDiffSum218 = 0;
      for (let i = 0; i < n218; i++) {
        for (let j = 0; j < n218; j++) absDiffSum218 += Math.abs(orderedLens218[i] - orderedLens218[j]);
      }
      const gini218 = avgLength > 0 ? absDiffSum218 / (2 * n218 * n218 * avgLength) : 0;
      if (gini218 > 0.5) {
        issues.push({
          location: 'Page-space distribution',
          rule: 'PAGE_SPACE_INEQUALITY',
          severity: 'minor',
          description: `Scene lengths have a Gini coefficient of ${gini218.toFixed(2)} — page space is concentrated in a few scenes while the rest are starved. The story spends its runtime unevenly, reading as a handful of bloated set-pieces among undernourished connective tissue.`,
          suggestedFix: 'Redistribute page space: trim the dominant scenes and give the starved ones enough room to land their beat. A healthier length distribution keeps the audience from feeling the story lurch between feast and famine.',
        });
      }
    }

    // RHYTHMIC_ALTERNATION_ABSENT (minor): scene lengths cross their own mean in fewer
    // than 25% of transitions — the pacing stays on one side of the average for long
    // stretches (a block of long scenes, then a block of short) instead of alternating
    // breath and sprint. Distinct from ENERGY_MONOTONE (low variance): a story can have
    // large length swings yet still fail to ALTERNATE, sitting high then sitting low.
    {
      let crossings218 = 0, transitions218 = 0;
      let prevSign218 = 0;
      for (let i = 0; i < n218; i++) {
        const sign218 = orderedLens218[i] > avgLength ? 1 : orderedLens218[i] < avgLength ? -1 : 0;
        if (sign218 !== 0) {
          if (prevSign218 !== 0) {
            transitions218++;
            if (sign218 !== prevSign218) crossings218++;
          }
          prevSign218 = sign218;
        }
      }
      const crossRate218 = transitions218 > 0 ? crossings218 / transitions218 : 1;
      if (transitions218 >= 6 && crossRate218 < 0.25) {
        issues.push({
          location: 'Pacing rhythm',
          rule: 'RHYTHMIC_ALTERNATION_ABSENT',
          severity: 'minor',
          description: `Scene lengths cross their average in only ${Math.round(crossRate218 * 100)}% of transitions — the pacing sits on one side of the mean for long stretches (a block of long scenes, then a block of short) rather than alternating. Even with large swings, the rhythm never breathes in and out.`,
          suggestedFix: 'Interleave long and short scenes rather than grouping them: follow an expansive scene with a clipped one and vice versa. Rhythmic pacing comes from frequent alternation around the mean, not from one long deceleration or acceleration.',
        });
      }
    }
  }

  // ── Wave 232: Pacing spike scene, peak length misplaced, act-transition jolt ──

  // PACING_SPIKE_SCENE (major, n≥6): A single scene is ≥2.5× the average scene
  // length, dominating the story's page space like a structural monster. Distinct
  // from LONG_SCENE (which fires per scene beyond a relative threshold) and
  // PAGE_SPACE_INEQUALITY (global distribution) — this fires specifically when one
  // scene's length is more than 2.5× the average, creating an extreme outlier.
  if (records.length >= 6 && avgLength > 0) {
    let spikeIdx232 = -1;
    let spikeLen232 = 0;
    for (let i = 0; i < records.length; i++) {
      const len = sceneLengths.get(i) ?? 0;
      if (len > spikeLen232) { spikeLen232 = len; spikeIdx232 = i; }
    }
    if (spikeIdx232 >= 0 && spikeLen232 >= 2.5 * avgLength) {
      issues.push({
        location: `Scene ${spikeIdx232} (${records[spikeIdx232]?.slug ?? ''})`,
        rule: 'PACING_SPIKE_SCENE',
        severity: 'major',
        description: `Scene ${spikeIdx232} is ${spikeLen232} weighted lines — ${(spikeLen232 / avgLength).toFixed(1)}× the story average (${Math.round(avgLength)}). One scene dominates the story's page space, creating a structural imbalance where all surrounding scenes are dwarfed by a single set-piece.`,
        suggestedFix: 'Break the oversized scene into 2-3 shorter ones, or trim it down to match the surrounding density. A pacing spike signals a scene that was never edited — every scene should earn its length relative to its dramatic weight.',
      });
    }
  }

  // PEAK_LENGTH_MISPLACED (minor, n≥8): The story's longest scene is in Act 1
  // (first 25%) — the most expansive moment front-loads the setup rather than
  // the climax. Scene length signals importance to the audience; the opening
  // should be lean and propulsive, not the most expensive real estate in the script.
  if (records.length >= 8 && avgLength > 0) {
    const act1EndPk232 = Math.floor(records.length * 0.25);
    let maxLen232 = 0;
    let maxIdx232 = -1;
    for (let i = 0; i < records.length; i++) {
      const len = sceneLengths.get(i) ?? 0;
      if (len > maxLen232) { maxLen232 = len; maxIdx232 = i; }
    }
    if (maxIdx232 >= 0 && maxIdx232 < act1EndPk232 && maxLen232 >= avgLength * 1.5) {
      issues.push({
        location: `Scene ${maxIdx232} (${records[maxIdx232]?.slug ?? ''})`,
        rule: 'PEAK_LENGTH_MISPLACED',
        severity: 'minor',
        description: `The story's longest scene (Scene ${maxIdx232}, ${maxLen232} lines, ${(maxLen232 / avgLength).toFixed(1)}× avg) is in Act 1 (first 25%). The most expansive real estate is in the setup rather than the climax — opening scenes should be crisp and propulsive, not the story's structural crown.`,
        suggestedFix: 'Trim the Act 1 scene to its essentials, then expand the climax zone with the reclaimed page space. The longest scene should be where the stakes are highest, not where the world is being introduced.',
      });
    }
  }

  // ACT_TRANSITION_JOLT (minor, n≥8): The scene immediately crossing an act
  // boundary (Act 1→2 at 25%, or Act 2→3 at 75%) changes in length by more than
  // 1.5× the average — a step-change in pacing at the structural seam. Gear shifts
  // at act transitions should be gradual; a sudden jump or drop at the act line
  // signals a tonal splice rather than a deliberate structural transition.
  if (records.length >= 8 && avgLength > 0) {
    const joltThreshold232 = avgLength * 1.5;
    const actBoundaries232 = [
      Math.floor(records.length * 0.25),
      Math.floor(records.length * 0.75),
    ];
    for (const boundary232 of actBoundaries232) {
      if (boundary232 <= 0 || boundary232 >= records.length) continue;
      const lenBefore = sceneLengths.get(boundary232 - 1) ?? 0;
      const lenAfter = sceneLengths.get(boundary232) ?? 0;
      if (lenBefore > 0 && lenAfter > 0) {
        const delta232 = Math.abs(lenAfter - lenBefore);
        if (delta232 >= joltThreshold232) {
          const dir232 = lenAfter > lenBefore ? 'expands' : 'contracts';
          issues.push({
            location: `Act boundary (Scene ${boundary232 - 1} → ${boundary232})`,
            rule: 'ACT_TRANSITION_JOLT',
            severity: 'minor',
            description: `At the act boundary (Scene ${boundary232 - 1} to ${boundary232}) the scene length ${dir232} by ${delta232.toFixed(0)} lines — a sudden step-change of ${(delta232 / avgLength).toFixed(1)}× the average. Act transitions should shift gear gradually; a pacing jolt at the structural seam reads as a tonal splice rather than a deliberate transition.`,
            suggestedFix: 'Smooth the transition: add a bridging scene at similar length to the crossing point, or compress the discrepancy across 2-3 scenes rather than one step. Act transitions should feel like a gear shift, not a gear break.',
          });
          break; // one flag per pass
        }
      }
    }
  }
  // ── Wave 246: Act 2 pacing valley, climax scene undersized, midpoint bloat ──

  // ACT2_PACING_VALLEY (minor, n≥10): Three or more consecutive Act 2 scenes
  // (25%–75% window) are each below 60% of the average scene length — a sustained
  // compression valley in the story's middle. Unlike RESOLUTION_BREVITY (end-only)
  // and pacing compression spiral (overall trend), this fires when a localized
  // compression pocket appears mid-story, suggesting a sequence of scenes that
  // were under-written or collapsed into narrative shorthand.
  if (records.length >= 10 && avgLength > 0) {
    const act2Start246 = Math.floor(records.length * 0.25);
    const act2End246 = Math.floor(records.length * 0.75);
    const threshold246 = avgLength * 0.6;
    let streak246 = 0;
    let streakStart246 = -1;
    for (let i = act2Start246; i < act2End246; i++) {
      const len246 = sceneLengths.get(i) ?? 0;
      if (len246 > 0 && len246 < threshold246) {
        if (streak246 === 0) streakStart246 = i;
        streak246++;
        if (streak246 >= 3) {
          issues.push({
            location: `Act 2 valley (Scenes ${streakStart246}–${i})`,
            rule: 'ACT2_PACING_VALLEY',
            severity: 'minor',
            description: `Scenes ${streakStart246}–${i} (Act 2) are each below 60% of the average scene length (avg ${Math.round(avgLength)} lines) — a sustained compression valley in the story's middle. Three or more consecutive under-written scenes create a pacing trough where the story loses physical presence.`,
            suggestedFix: 'Expand at least one of the valley scenes with a concrete dramatic beat: a new complication, a character reaction, or a piece of world detail. Compression pockets in Act 2 are where narrative momentum quietly dies — the story needs something to sustain forward pull here.',
          });
          break;
        }
      } else {
        streak246 = 0;
      }
    }
  }

  // CLIMAX_SCENE_UNDERSIZED (minor, n≥8): The scene with the story's peak
  // suspense (highest suspenseDelta across all records) is in the bottom 30%
  // of all scene lengths — the most intense moment is among the shortest scenes.
  // The climax should be the most substantial scene on the page; an undersized
  // climax delivers maximum tension in minimum space, spending the story's most
  // charged moment in a flash rather than giving it room to breathe.
  if (records.length >= 8 && avgLength > 0) {
    let peakIdx246 = 0;
    let peakDelta246 = -Infinity;
    for (let i = 0; i < records.length; i++) {
      if (records[i].suspenseDelta > peakDelta246) {
        peakDelta246 = records[i].suspenseDelta;
        peakIdx246 = i;
      }
    }
    if (peakDelta246 > 1) {
      const peakLen246 = sceneLengths.get(peakIdx246) ?? 0;
      const sortedLens246 = [...lengths].sort((a, b) => a - b);
      const p30246 = sortedLens246[Math.floor(sortedLens246.length * 0.3)] ?? 0;
      if (peakLen246 > 0 && peakLen246 <= p30246) {
        issues.push({
          location: `Scene ${peakIdx246} (peak suspense, ${peakLen246} lines)`,
          rule: 'CLIMAX_SCENE_UNDERSIZED',
          severity: 'minor',
          description: `The story's peak suspense scene (Scene ${peakIdx246}, suspenseDelta ${peakDelta246.toFixed(1)}) is ${peakLen246} lines — in the bottom 30% of all scene lengths. The most intense moment is among the shortest. The climax deserves the most space; an undersized peak scene spends the story's central dramatic charge in a flash.`,
          suggestedFix: 'Expand the climax scene: more character reaction, more physical consequence, more time inside the highest-stakes moment. The scene that carries the story\'s maximum tension should feel weightier than the setup scenes surrounding it — let the audience live in the peak longer.',
        });
      }
    }
  }

  // MIDPOINT_BLOAT (minor, n≥8): The scene closest to the story's structural
  // midpoint (50%) is ≥2.5× the average scene length. The pivot scene is the
  // story's most expensive real estate — an oversized midpoint signals a
  // "pivot dump," where the reversal is over-written rather than landing cleanly.
  // Distinct from PACING_SPIKE_SCENE (any scene ≥2.5× avg) — this fires
  // specifically when the bloated scene is at the story's structural midpoint.
  if (records.length >= 8 && avgLength > 0) {
    const midIdx246 = Math.floor(records.length * 0.5);
    const midLen246 = sceneLengths.get(midIdx246) ?? 0;
    if (midLen246 >= 2.5 * avgLength) {
      issues.push({
        location: `Scene ${midIdx246} (structural midpoint, ${midLen246} lines)`,
        rule: 'MIDPOINT_BLOAT',
        severity: 'minor',
        description: `The structural midpoint scene (Scene ${midIdx246}) is ${midLen246} lines — ${(midLen246 / avgLength).toFixed(1)}× the story average (${Math.round(avgLength)}). An oversized midpoint signals a "pivot dump": the reversal is over-explained rather than landing with the velocity a structural pivot requires.`,
        suggestedFix: 'Trim the midpoint scene to its essential reversal. The moment where the story\'s direction changes should feel clean and inevitable — not exhaustive. What you remove from the midpoint goes into building the climax instead.',
      });
    }
  }
  // ── End Wave 246 ─────────────────────────────────────────────────────────────

  // ── End Wave 232 ─────────────────────────────────────────────────────────────

  // ── Wave 260: Opening scene bloat, Act 1 overextended, short-scene flood ──

  // OPENING_SCENE_BLOAT (minor, n≥8): The first scene (Scene 0) is ≥2.5× the
  // average scene length — an overlong opening. The first scene must hook fast and
  // earn the audience's attention before spending it; a bloated opener front-loads
  // setup and atmosphere before anyone is invested. Distinct from MIDPOINT_BLOAT
  // (structural midpoint) and PACING_SPIKE_SCENE (any scene); this isolates the
  // first-impression scene, where overlength is most costly.
  if (records.length >= 8) {
    const openLen260 = sceneLengths.get(0) ?? 0;
    if (openLen260 >= 2.5 * avgLength) {
      issues.push({
        location: `Scene 0 (opening, ${openLen260} lines)`,
        rule: 'OPENING_SCENE_BLOAT',
        severity: 'minor',
        description: `The opening scene is ${openLen260} lines — ${(openLen260 / avgLength).toFixed(1)}× the story average (${Math.round(avgLength)}). An overlong first scene front-loads setup and atmosphere before the audience is invested. The opening must hook fast: it earns attention before it can spend it.`,
        suggestedFix: 'Trim the opening to its sharpest hook. Start as late into the first scene as possible, cut throat-clearing exposition, and let the world reveal itself across later scenes. The first scene is a promise, not an encyclopedia.',
      });
    }
  }

  // ACT1_OVEREXTENDED (minor, n≥10): Act 1 (first 25% of scenes) consumes more
  // than 40% of the script's total line count — the setup act hogs the page and
  // delays the inciting incident and Act 2. A proportionally oversized Act 1 means
  // the audience waits too long for the story to actually start. Distinct from the
  // per-scene bloat checks; this is a zone-aggregate page-budget measure.
  if (records.length >= 10) {
    const act1End260 = Math.floor(records.length * 0.25);
    if (act1End260 >= 2) {
      let act1Lines260 = 0;
      let totalLines260 = 0;
      for (const [idx, len] of sceneLengths) {
        totalLines260 += len;
        if (idx < act1End260) act1Lines260 += len;
      }
      const act1Ratio260 = totalLines260 > 0 ? act1Lines260 / totalLines260 : 0;
      if (act1Ratio260 > 0.4) {
        issues.push({
          location: `Act 1 (Scenes 0–${act1End260 - 1}) — page budget`,
          rule: 'ACT1_OVEREXTENDED',
          severity: 'minor',
          description: `Act 1 (the first ${act1End260} of ${records.length} scenes) consumes ${Math.round(act1Ratio260 * 100)}% of the script's total lines — the setup act hogs the page and delays the inciting incident. The audience waits too long for the story to actually begin while Act 1 over-establishes.`,
          suggestedFix: 'Compress the setup. Move exposition into later scenes where it can ride on action, and bring the inciting incident forward. Act 1 should be the leanest act — enough to establish the world and the want, then straight into complication.',
        });
      }
    }
  }

  // SHORT_SCENE_FLOOD (minor, n≥10): More than 60% of scenes run below 60% of the
  // average length — the story is dominated by undersized scenes and reads as choppy,
  // fragmentary, never settling into a beat. (The few longer scenes pull the average
  // up, so a majority falling well below it signals a script of fragments punctuated
  // by occasional set-pieces.) Distinct from ACT2_PACING_VALLEY (a local consecutive
  // run) and PAGE_SPACE_INEQUALITY (Gini concentration); this is a global proportion
  // of starved scenes.
  if (records.length >= 10) {
    const shortThreshold260 = avgLength * 0.6;
    let shortCount260 = 0;
    for (const len of lengths) {
      if (len > 0 && len < shortThreshold260) shortCount260++;
    }
    const shortRatio260 = shortCount260 / lengths.length;
    if (shortRatio260 > 0.6) {
      issues.push({
        location: 'Scene-length distribution',
        rule: 'SHORT_SCENE_FLOOD',
        severity: 'minor',
        description: `${shortCount260} of ${lengths.length} scenes (${Math.round(shortRatio260 * 100)}%) run below 60% of the average length — the story is dominated by undersized scenes. The script reads as choppy and fragmentary, a stream of fragments punctuated by a few set-pieces, never settling long enough for a beat to develop.`,
        suggestedFix: 'Consolidate fragments: merge adjacent micro-scenes that share a location or beat, and let the surviving scenes breathe. A few of the short scenes are surely doing real work — invest the page space there instead of scattering it across many thin ones.',
      });
    }
  }

  // ── Wave 274: ACT3_PAGE_OVERRUN ───────────────────────────────────────────
  // Act 3 (final 25%) consumes more than 35% of the script's total weighted
  // line count. The climax act is overlong: it takes more page space than the
  // final act typically earns. A bloated Act 3 often means the resolution
  // lingers too long after the climactic confrontation — the audience watches
  // the protagonist process victory/defeat in real time rather than having the
  // story land its final note and end. Distinct from CLIMAX_SCENE_UNDERSIZED
  // (one scene); this is a zone-level budget measure.
  // Requires 8+ records.
  if (records.length >= 8) {
    const act3Start274 = Math.floor(records.length * 0.75);
    let act3Lines274 = 0;
    let totalLines274 = 0;
    for (const [idx, len] of sceneLengths) {
      totalLines274 += len;
      if (idx >= act3Start274) act3Lines274 += len;
    }
    const act3Ratio274 = totalLines274 > 0 ? act3Lines274 / totalLines274 : 0;
    if (act3Ratio274 > 0.35) {
      issues.push({
        location: `Act 3 (Scenes ${act3Start274}–${records.length - 1}) — page budget`,
        rule: 'ACT3_PAGE_OVERRUN',
        severity: 'minor',
        description: `Act 3 (Scenes ${act3Start274}–${records.length - 1}) consumes ${Math.round(act3Ratio274 * 100)}% of total script pages — more than the final act should need. A bloated Act 3 means the resolution lingers: the story keeps spending pages after its dramatic question is answered, and the audience watches denouement instead of experiencing release.`,
        suggestedFix: 'Compress the resolution. Land the climax, pay its immediate emotional cost in one or two scenes, and end. Every page after the story\'s question is answered is a page the audience is waiting to leave. Act 3 should be the leanest act, not the longest.',
      });
    }
  }

  // ── Wave 274: LONG_SCENE_FLOOD ─────────────────────────────────────────────
  // More than 50% of scenes are over 1.5× the average length — the script is
  // dominated by oversized scenes with no brevity to provide contrast or pace
  // changes. Effective scripts alternate scene lengths: short scenes create
  // urgency and momentum while long scenes develop atmosphere and character.
  // A script where most scenes are long reads as monolithic and slow regardless
  // of how active the content is. The mirror of SHORT_SCENE_FLOOD.
  // Requires 8+ records.
  if (records.length >= 8) {
    const longThreshold274 = avgLength * 1.5;
    const longCount274 = lengths.filter(l => l > longThreshold274).length;
    if (longCount274 / lengths.length > 0.50) {
      issues.push({
        location: 'Scene-length distribution',
        rule: 'LONG_SCENE_FLOOD',
        severity: 'minor',
        description: `${longCount274} of ${lengths.length} scenes (${Math.round(longCount274 / lengths.length * 100)}%) exceed 1.5× the average length — the script is dominated by oversized scenes. Without shorter scenes to create contrast and momentum, the pace becomes monolithic: no quick beats, no breathing room, every scene settling in for an extended stay.`,
        suggestedFix: 'Trim at least half the long scenes to a leaner core, and introduce some genuinely short scenes as pace changes. The contrast between a 2-line beat and a 20-line scene creates rhythm that neither alone can — you need brevity to make length feel substantial.',
      });
    }
  }

  // ── Wave 274: ACT2_PAGE_WEIGHT ─────────────────────────────────────────────
  // Act 2 (the 25-75% zone) consumes less than 40% of total script pages.
  // Act 2 is the complication engine — it should be the longest act, carrying
  // the protagonist's journey from inciting incident to climax approach. A
  // lightweight Act 2 means the complications are rushed, the character
  // development is thin, and the story skips from setup to resolution with an
  // underdeveloped middle. Distinct from ACT2_PACING_VALLEY (suspense curve
  // depression); this is a page-budget distribution measure.
  // Requires 10+ records.
  if (records.length >= 10) {
    const act2Start274 = Math.floor(records.length * 0.25);
    const act2End274 = Math.floor(records.length * 0.75);
    let act2Lines274 = 0;
    let totalLines274b = 0;
    for (const [idx, len] of sceneLengths) {
      totalLines274b += len;
      if (idx >= act2Start274 && idx < act2End274) act2Lines274 += len;
    }
    const act2Ratio274 = totalLines274b > 0 ? act2Lines274 / totalLines274b : 0;
    if (act2Ratio274 < 0.40) {
      issues.push({
        location: `Act 2 (Scenes ${act2Start274}–${act2End274 - 1}) — page budget`,
        rule: 'ACT2_PAGE_WEIGHT',
        severity: 'minor',
        description: `Act 2 (Scenes ${act2Start274}–${act2End274 - 1}) consumes only ${Math.round(act2Ratio274 * 100)}% of total script pages — the complication engine is underweight. A thin Act 2 means complications are rushed, character development is compressed, and the story moves from setup to resolution without developing its middle. Act 2 should be the heaviest act.`,
        suggestedFix: 'Expand the complication zone: add scenes that develop the protagonist\'s relationships under pressure, deepen the opposition, and let the consequences of Act 1 decisions unfold. Act 2 earns the climax — compress it and the resolution will feel unearned.',
      });
    }
  }

  // ── Wave 288: PACING_SUSPENSE_EARLY_PEAK ─────────────────────────────────
  // Average suspenseDelta in Act 1 (first 25%) exceeds average suspenseDelta
  // in Act 3 (last 25%), and Act 3's average is ≤ 0. Suspense peaks in the
  // setup and dissipates before the climax — the story front-loads tension
  // and coasts to the finish. Requires 10+ records with at least 2 scenes
  // in both Act 1 and Act 3 windows.
  if (records.length >= 10) {
    const act1End288 = Math.floor(records.length * 0.25);
    const act3Start288 = Math.floor(records.length * 0.75);
    const act1Recs288 = (records as any[]).slice(0, act1End288);
    const act3Recs288 = (records as any[]).slice(act3Start288);
    if (act1Recs288.length >= 2 && act3Recs288.length >= 2) {
      const act1AvgSusp288 = act1Recs288.reduce((acc: number, r: any) => acc + (r.suspenseDelta ?? 0), 0) / act1Recs288.length;
      const act3AvgSusp288 = act3Recs288.reduce((acc: number, r: any) => acc + (r.suspenseDelta ?? 0), 0) / act3Recs288.length;
      if (act1AvgSusp288 > act3AvgSusp288 && act3AvgSusp288 <= 0) {
        issues.push({
          location: `Act 1 avg suspense (${act1AvgSusp288.toFixed(1)}) vs Act 3 avg (${act3AvgSusp288.toFixed(1)})`,
          rule: 'PACING_SUSPENSE_EARLY_PEAK',
          severity: 'minor',
          description: `Act 1's average suspenseDelta (${act1AvgSusp288.toFixed(2)}) exceeds Act 3's (${act3AvgSusp288.toFixed(2)}), and the climax zone is flat or declining. Suspense peaks in the setup and dissipates before the resolution — the story front-loads tension and coasts. The audience loses urgency exactly when the story needs them most engaged.`,
          suggestedFix: 'Redistribute suspense: let Act 1 establish stakes (moderate suspense), Act 2 escalate (rising suspense), and Act 3 peak and resolve (highest then cathartic release). An escalating suspense curve means each act is more urgent than the last.',
        });
      }
    }
  }

  // ── Wave 288: PACING_CURIOSITY_FINAL_DROP ────────────────────────────────
  // Average curiosityDelta in the final quarter (75–100%) is ≤ 0 while the
  // story's overall average curiosityDelta is positive. The mystery engine
  // shuts off before the payoff — the audience stops wondering just as the
  // answers arrive. A satisfying finale should sustain or intensify curiosity
  // until the very last revelation. Requires 10+ records and 3+ scenes in
  // the final quarter.
  if (records.length >= 10) {
    const finalStart288 = Math.floor(records.length * 0.75);
    const finalRecs288 = (records as any[]).slice(finalStart288);
    if (finalRecs288.length >= 3) {
      const overallAvgCuriosity288 = (records as any[]).reduce((acc: number, r: any) => acc + (r.curiosityDelta ?? 0), 0) / records.length;
      const finalAvgCuriosity288 = finalRecs288.reduce((acc: number, r: any) => acc + (r.curiosityDelta ?? 0), 0) / finalRecs288.length;
      if (overallAvgCuriosity288 > 0 && finalAvgCuriosity288 <= 0) {
        issues.push({
          location: `Final quarter (scenes ${finalStart288}+) — curiosity drop`,
          rule: 'PACING_CURIOSITY_FINAL_DROP',
          severity: 'minor',
          description: `Overall average curiosityDelta is ${overallAvgCuriosity288.toFixed(2)} (positive) but the final quarter drops to ${finalAvgCuriosity288.toFixed(2)} (≤ 0). The mystery engine cuts off before the payoff — the audience stops wondering just as the answers arrive. A finale that resolves curiosity without first intensifying it feels like answers to questions the audience has stopped asking.`,
          suggestedFix: 'Sustain curiosity into the final act: introduce a late complication, a new question raised by the approaching resolution, or a false resolution that opens a deeper mystery. The answers should arrive to an audience that is still desperately asking.',
        });
      }
    }
  }

  // ── Wave 288: PACING_CURIOSITY_OPENING_FLATLINE ──────────────────────────
  // Average curiosityDelta in the opening (first 25%) is ≤ 0. The story
  // fails to hook the audience in Act 1 — curiosity never builds in setup.
  // An opening with no curiosity momentum means the audience is given no
  // reason to ask "what happens next?" before the first act turn. Distinct
  // from PACING_CURIOSITY_FINAL_DROP (which fires when the final act loses
  // curiosity after building it); this fires when the opening never builds
  // curiosity at all. Requires 10+ records and 3+ opening scenes.
  if (records.length >= 10) {
    const openingEnd288 = Math.floor(records.length * 0.25);
    const openingRecs288 = (records as any[]).slice(0, openingEnd288);
    if (openingRecs288.length >= 3) {
      const openingAvgCuriosity288 = openingRecs288.reduce((acc: number, r: any) => acc + (r.curiosityDelta ?? 0), 0) / openingRecs288.length;
      if (openingAvgCuriosity288 <= 0) {
        issues.push({
          location: `Opening (scenes 0–${openingEnd288 - 1}) — curiosity flatline`,
          rule: 'PACING_CURIOSITY_OPENING_FLATLINE',
          severity: 'minor',
          description: `Average curiosityDelta across the opening scenes (0–${openingEnd288 - 1}) is ${openingAvgCuriosity288.toFixed(2)} — the story fails to generate curiosity in setup. The audience reaches the Act 1 turn without a question driving them forward. An opening that doesn't raise questions has no hook.`,
          suggestedFix: 'Plant a question in the first scene: an unexplained action, a mysterious object, a character whose goal is unclear. Every opening scene should make the audience wonder "why?" before it makes them wonder "what next?". Curiosity is the engine of story; start it early.',
        });
      }
    }
  }

  // ── Wave 302: ENDING_ON_PEAK ──────────────────────────────────────────────
  // The final scene carries the highest suspenseDelta in the story and it is
  // a genuine spike (> 1.5). The story ends at maximum charge with no
  // decompression — the audience is released mid-breath. Distinct from
  // RESOLUTION_TOO_BRIEF (page length of the final scene): this audits the
  // suspense state at the cut to black. Requires 8+ records.
  if (records.length >= 8) {
    const finalSusp302 = (records as any[])[records.length - 1].suspenseDelta ?? 0;
    const maxSusp302 = Math.max(...(records as any[]).map(r => r.suspenseDelta ?? 0));
    if (finalSusp302 > 1.5 && finalSusp302 >= maxSusp302) {
      issues.push({
        location: `Final scene (${(records as any[])[records.length - 1].slug})`,
        rule: 'ENDING_ON_PEAK',
        severity: 'minor',
        description: `The final scene carries the story's highest suspense (suspenseDelta ${finalSusp302}) — the story cuts to black at maximum charge with no decompression. Unless this is a deliberate cliffhanger, ending on the peak denies the audience the exhale that converts tension into satisfaction; they leave keyed-up rather than completed.`,
        suggestedFix: 'Add a decompression beat after the peak: even half a scene of aftermath — survivors taking stock, a held look, a quiet image that answers the opening — lets the accumulated tension resolve. If a cliffhanger is intended, make the unresolved question explicit so the charge reads as a promise rather than an omission.',
      });
    }
  }

  // ── Wave 302: POST_RELEASE_DEAD_AIR ──────────────────────────────────────
  // After the story's single biggest tension release (most negative
  // suspenseDelta, ≤ -1.5), the next three scenes all stay flat or falling
  // (suspenseDelta ≤ 0). The story deflates and then idles — dead air where
  // re-escalation should begin. Distinct from ACT2_PACING_VALLEY (zone-based
  // depression): this anchors on the release event wherever it occurs.
  // Requires 10+ records with 3+ scenes after the release.
  if (records.length >= 10) {
    let minIdx302 = 0;
    for (let i302 = 1; i302 < records.length; i302++) {
      if (((records as any[])[i302].suspenseDelta ?? 0) < ((records as any[])[minIdx302].suspenseDelta ?? 0)) minIdx302 = i302;
    }
    const minVal302 = (records as any[])[minIdx302].suspenseDelta ?? 0;
    if (minVal302 <= -1.5 && minIdx302 + 3 < records.length) {
      const wake302 = (records as any[]).slice(minIdx302 + 1, minIdx302 + 4);
      if (wake302.every(r => (r.suspenseDelta ?? 0) <= 0)) {
        issues.push({
          location: `Scenes ${(records as any[])[minIdx302].sceneIdx}–${(records as any[])[minIdx302 + 3].sceneIdx} — post-release dead air`,
          rule: 'POST_RELEASE_DEAD_AIR',
          severity: 'minor',
          description: `The story's biggest tension release (suspenseDelta ${minVal302} at scene ${(records as any[])[minIdx302].sceneIdx}) is followed by three scenes that all stay flat or falling. After a major discharge the story idles — the audience, having just exhaled, is given nothing new to hold their breath for, and momentum dies exactly where re-escalation should begin.`,
          suggestedFix: 'Start rebuilding within a scene or two of any major release: a new complication, a consequence of the resolution that opens a fresh problem, a clock that starts ticking. The release should feel like a trough between waves, not the tide going out.',
        });
      }
    }
  }

  // ── Wave 302: NET_TENSION_DEFICIT ────────────────────────────────────────
  // The cumulative sum of suspenseDelta across the whole story is negative —
  // more tension is discharged than is ever built. A net-negative suspense
  // ledger means the story spends charge it never accumulated; scene-level
  // releases outweigh scene-level builds and the overall trajectory is a
  // slow deflation. Requires 8+ records and at least one positive delta
  // (so an all-zero record set doesn't fire).
  if (records.length >= 8) {
    const netSusp302 = (records as any[]).reduce((acc: number, r: any) => acc + (r.suspenseDelta ?? 0), 0);
    const anyBuild302 = (records as any[]).some(r => (r.suspenseDelta ?? 0) > 0);
    if (netSusp302 < 0 && anyBuild302) {
      issues.push({
        location: 'Suspense ledger (whole story)',
        rule: 'NET_TENSION_DEFICIT',
        severity: 'minor',
        description: `The cumulative suspenseDelta across all ${records.length} scenes is ${netSusp302.toFixed(1)} — the story discharges more tension than it ever builds. A net-negative suspense ledger reads as a long deflation: each release outweighs the builds around it, and by the finale the story is running on charge it never banked.`,
        suggestedFix: 'Rebalance the ledger: deepen the builds (raise stakes more sharply in escalation scenes) or shrink the releases (partial resolutions that discharge some tension while leaving the core threat intact). Across the whole story, tension built should exceed tension spent until the climax settles the account.',
      });
    }
  }

  // ── Wave 316: REVELATION_SCENE_UNDERWEIGHT, PACING_CURIOSITY_MIDZONE_GAP, CLOCK_SCENE_PACING_MISMATCH ──

  // REVELATION_SCENE_UNDERWEIGHT (minor, n≥8, ≥2 revelation scenes): The
  // average weighted length of scenes containing a revelation is below 60% of
  // the overall scene average. Revelations are the weight-bearing moments of
  // story — being rushed through them in the script's thinnest page space
  // compresses the most important beats into the least breathing room. Distinct
  // from COMPRESSED_TURNING_POINT (per-scene, <30% avg, uses annotations);
  // this audits the aggregate of all revelation-tagged records at 60% threshold.
  if (records.length >= 8) {
    const revLengths316: number[] = [];
    for (let i316 = 0; i316 < records.length; i316++) {
      if ((records as any[])[i316].revelation) {
        revLengths316.push(sceneLengths.get(i316) ?? 0);
      }
    }
    if (revLengths316.length >= 2) {
      const revAvg316 = revLengths316.reduce((s, v) => s + v, 0) / revLengths316.length;
      if (revAvg316 < avgLength * 0.6) {
        issues.push({
          location: `${revLengths316.length} revelation scene(s)`,
          rule: 'REVELATION_SCENE_UNDERWEIGHT',
          severity: 'minor',
          description: `The ${revLengths316.length} revelation scene(s) average ${revAvg316.toFixed(1)} weighted lines — ${Math.round(revAvg316 / avgLength * 100)}% of the overall average (${avgLength.toFixed(1)}). Disclosures are rushed through in the script's thinnest scenes: the moment a truth lands should be given room to breathe, not compressed below the floor of dramatic pause.`,
          suggestedFix: 'Expand revelation scenes: add a beat of silence before the disclosure, an immediate physical reaction, a consequence that begins in the same scene. A revelation scene should be at least average length — the weight of the moment demands the space.',
        });
      }
    }
  }

  // PACING_CURIOSITY_MIDZONE_GAP (minor, n≥10, ≥3 midzone scenes): The midzone
  // (25%–75%) has avg curiosityDelta ≤ 0 while the opening quarter has avg > 0.
  // The curiosity engine fires in Act 1 setup, then immediately stalls in the
  // complication zone — questions raised early are never intensified. Distinct
  // from PACING_CURIOSITY_FINAL_DROP (final quarter collapse after a positive
  // overall), PACING_CURIOSITY_OPENING_FLATLINE (never builds curiosity at all).
  if (records.length >= 10) {
    const midStart316 = Math.floor(records.length * 0.25);
    const midEnd316 = Math.floor(records.length * 0.75);
    const openRecs316 = (records as any[]).slice(0, midStart316);
    const midRecs316 = (records as any[]).slice(midStart316, midEnd316);
    if (openRecs316.length >= 2 && midRecs316.length >= 3) {
      const openAvgCuriosity316 = openRecs316.reduce((acc: number, r: any) => acc + (r.curiosityDelta ?? 0), 0) / openRecs316.length;
      const midAvgCuriosity316 = midRecs316.reduce((acc: number, r: any) => acc + (r.curiosityDelta ?? 0), 0) / midRecs316.length;
      if (openAvgCuriosity316 > 0 && midAvgCuriosity316 <= 0) {
        issues.push({
          location: `Midzone (scenes ${midStart316}–${midEnd316 - 1}) — curiosity gap`,
          rule: 'PACING_CURIOSITY_MIDZONE_GAP',
          severity: 'minor',
          description: `The opening builds curiosity (avg curiosityDelta ${openAvgCuriosity316.toFixed(2)}) but the midzone (scenes ${midStart316}–${midEnd316 - 1}) stalls at ${midAvgCuriosity316.toFixed(2)} — the questions raised in Act 1 are never intensified through the complication zone. An Act 2 that stops deepening the mystery leaves the audience coasting on initial interest, and initial interest decays.`,
          suggestedFix: 'Sustain curiosity through the midzone: each complication should raise a new question while partially answering the last. The midzone should drive "I need to know" — not a plateau the audience waits through to reach the finale.',
        });
      }
    }
  }

  // CLOCK_SCENE_PACING_MISMATCH (minor, n≥8, ≥2 clock-raising scenes): Scenes
  // where clockRaised === true average more than 1.5× the overall scene length.
  // Clock scenes signal urgency, but if the "time is running out" moments are
  // the longest scenes in the script, the form contradicts the content.
  // Distinct from SUSPENSE_LENGTH_DECOUPLING (long scenes not correlating with
  // high suspense — not clock-specific); this targets the clock-raising mechanism.
  if (records.length >= 8) {
    const clockLengths316: number[] = [];
    for (let i316c = 0; i316c < records.length; i316c++) {
      if ((records as any[])[i316c].clockRaised === true) {
        clockLengths316.push(sceneLengths.get(i316c) ?? 0);
      }
    }
    if (clockLengths316.length >= 2) {
      const clockAvg316 = clockLengths316.reduce((s, v) => s + v, 0) / clockLengths316.length;
      if (clockAvg316 > avgLength * 1.5) {
        issues.push({
          location: `${clockLengths316.length} clock-raising scene(s)`,
          rule: 'CLOCK_SCENE_PACING_MISMATCH',
          severity: 'minor',
          description: `Clock-raising scenes (clockRaised) average ${clockAvg316.toFixed(1)} weighted lines — ${Math.round(clockAvg316 / avgLength * 100)}% of the overall scene average (${avgLength.toFixed(1)}). The moments that announce "time is running out" are the script's slowest-reading sequences: the form contradicts the urgency. A ticking clock should feel fast.`,
          suggestedFix: 'Compress clock scenes: strip all exposition, cut to the beat that introduces the deadline, and let the consequences unspool in subsequent scenes. Urgency is communicated by brevity — the faster the scene reads, the faster time appears to be moving.',
        });
      }
    }
  }

  // ── Wave 327: DRAMATIC_TURN_SCENE_UNDERWEIGHT, PAYOFF_SCENE_UNDERWEIGHT, EMOTIONAL_PEAK_SCENE_UNDERWEIGHT ──

  // DRAMATIC_TURN_SCENE_UNDERWEIGHT (minor, n≥8, ≥2 turn scenes): Scenes that
  // contain a dramatic turn (dramaticTurn !== 'nothing') average below 60% of
  // the overall scene length. A turn is a pivot — the audience needs room to
  // register the reversal and its consequence. Rushing pivots through the
  // script's thinnest scenes blunts the very moments meant to change the story's
  // direction. Distinct from REVELATION_SCENE_UNDERWEIGHT (revelation channel)
  // and CLOCK_SCENE_PACING_MISMATCH (clock channel, opposite direction).
  if (records.length >= 8) {
    const turnLengths327: number[] = [];
    for (let i327 = 0; i327 < records.length; i327++) {
      if (((records as any[])[i327].dramaticTurn ?? 'nothing') !== 'nothing') {
        turnLengths327.push(sceneLengths.get(i327) ?? 0);
      }
    }
    if (turnLengths327.length >= 2) {
      const turnAvg327 = turnLengths327.reduce((s, v) => s + v, 0) / turnLengths327.length;
      if (turnAvg327 < avgLength * 0.6) {
        issues.push({
          location: `${turnLengths327.length} dramatic-turn scene(s)`,
          rule: 'DRAMATIC_TURN_SCENE_UNDERWEIGHT',
          severity: 'minor',
          description: `The ${turnLengths327.length} dramatic-turn scene(s) average ${turnAvg327.toFixed(1)} weighted lines — ${Math.round(turnAvg327 / avgLength * 100)}% of the overall average (${avgLength.toFixed(1)}). Turns are pivots that change the story's direction; rushing them through the script's thinnest scenes denies the audience time to register the reversal and feel its consequence.`,
          suggestedFix: 'Give each turn room: stage the reversal, then hold for the reaction and the first consequence in the same scene. A pivot needs at least average length so the audience experiences the change rather than merely being informed of it.',
        });
      }
    }
  }

  // PAYOFF_SCENE_UNDERWEIGHT (minor, n≥8, ≥2 payoff scenes): Scenes that resolve
  // a setup (payoffSetupIds.length > 0) average below 60% of the overall scene
  // length. A payoff is a promise redeemed — compressing it into the thinnest
  // page space cheats the audience of the satisfaction the setup earned.
  // Distinct from REVELATION_SCENE_UNDERWEIGHT (revelation channel) and the
  // payoff-pass timing checks (this audits page weight, not scheduling).
  if (records.length >= 8) {
    const payoffLengths327: number[] = [];
    for (let i327p = 0; i327p < records.length; i327p++) {
      if (((((records as any[])[i327p].payoffSetupIds ?? []) as any[]).length) > 0) {
        payoffLengths327.push(sceneLengths.get(i327p) ?? 0);
      }
    }
    if (payoffLengths327.length >= 2) {
      const payoffAvg327 = payoffLengths327.reduce((s, v) => s + v, 0) / payoffLengths327.length;
      if (payoffAvg327 < avgLength * 0.6) {
        issues.push({
          location: `${payoffLengths327.length} payoff scene(s)`,
          rule: 'PAYOFF_SCENE_UNDERWEIGHT',
          severity: 'minor',
          description: `The ${payoffLengths327.length} payoff scene(s) average ${payoffAvg327.toFixed(1)} weighted lines — ${Math.round(payoffAvg327 / avgLength * 100)}% of the overall average (${avgLength.toFixed(1)}). A payoff is a promise the setup made coming due; compressing it into the thinnest page space cheats the audience of the satisfaction they have been waiting for. The harvest deserves at least as much room as the planting.`,
          suggestedFix: 'Expand payoff scenes: let the resolution land, then play the reaction and the changed situation it creates. A payoff rushed in two lines reads as a checkbox; given room, it reads as the moment the story was building toward.',
        });
      }
    }
  }

  // EMOTIONAL_PEAK_SCENE_UNDERWEIGHT (minor, n≥8, ≥3 non-neutral scenes): Scenes
  // carrying a non-neutral emotional shift average below 60% of the overall
  // scene length. The story's emotional high points are its shortest scenes —
  // feeling is given the least room to develop. Distinct from the suspense and
  // revelation underweight checks (different channels): this audits page weight
  // against the emotional channel specifically.
  if (records.length >= 8) {
    const emoLengths327: number[] = [];
    for (let i327e = 0; i327e < records.length; i327e++) {
      if ((records as any[])[i327e].emotionalShift !== 'neutral') {
        emoLengths327.push(sceneLengths.get(i327e) ?? 0);
      }
    }
    if (emoLengths327.length >= 3) {
      const emoAvg327 = emoLengths327.reduce((s, v) => s + v, 0) / emoLengths327.length;
      if (emoAvg327 < avgLength * 0.6) {
        issues.push({
          location: `${emoLengths327.length} emotionally charged scene(s)`,
          rule: 'EMOTIONAL_PEAK_SCENE_UNDERWEIGHT',
          severity: 'minor',
          description: `The ${emoLengths327.length} emotionally charged scene(s) average ${emoAvg327.toFixed(1)} weighted lines — ${Math.round(emoAvg327 / avgLength * 100)}% of the overall average (${avgLength.toFixed(1)}). The story's emotional high points are its shortest scenes: feeling is given the least room to develop. Emotion needs duration — a beat of silence, a held reaction, a consequence — to move from the page into the audience.`,
          suggestedFix: 'Give emotional peaks room to breathe: slow down at the moments of greatest feeling, let reactions land and aftermath register. The audience cannot be moved at the same speed the plot is advanced; the charged scenes are exactly where the script should linger.',
        });
      }
    }
  }

  // ── Wave 341: CONFLICT_SCENE_UNDERWEIGHT, CURIOSITY_PEAK_SCENE_UNDERWEIGHT, QUIET_SCENE_BLOAT ──

  // CONFLICT_SCENE_UNDERWEIGHT (minor, n≥8, ≥2 conflict scenes): Scenes carrying a
  // negative relationship shift (amount ≤ -0.3) average below 60% of the overall scene
  // length. The story's ruptures — the moments bonds crack — are its shortest scenes,
  // so the audience is told a relationship broke rather than made to watch it break.
  // Conflict needs room: the accusation, the defense, the wound landing. Distinct from
  // EMOTIONAL_PEAK_SCENE_UNDERWEIGHT (emotionalShift channel), DRAMATIC_TURN_SCENE_
  // UNDERWEIGHT (dramaticTurn channel), and SUSPENSE_LENGTH_DECOUPLING (suspense
  // channel): this audits page weight against the relationship-conflict channel.
  if (records.length >= 8) {
    const conflictLengths341: number[] = [];
    for (let i341c = 0; i341c < records.length; i341c++) {
      const shifts341 = ((records as any[])[i341c].relationshipShifts ?? []) as Array<{ amount: number }>;
      if (shifts341.some(s => s.amount <= -0.3)) {
        conflictLengths341.push(sceneLengths.get(i341c) ?? 0);
      }
    }
    if (conflictLengths341.length >= 2) {
      const conflictAvg341 = conflictLengths341.reduce((s, v) => s + v, 0) / conflictLengths341.length;
      if (conflictAvg341 < avgLength * 0.6) {
        issues.push({
          location: `${conflictLengths341.length} conflict scene(s)`,
          rule: 'CONFLICT_SCENE_UNDERWEIGHT',
          severity: 'minor',
          description: `The ${conflictLengths341.length} conflict scene(s) — scenes where a bond cracks — average ${conflictAvg341.toFixed(1)} weighted lines, ${Math.round(conflictAvg341 / avgLength * 100)}% of the overall average (${avgLength.toFixed(1)}). The story's ruptures are its shortest scenes, so the audience is told a relationship broke rather than made to watch it break. Conflict needs room: the accusation, the defense, the wound landing and registering.`,
          suggestedFix: 'Give conflict scenes room to play out: stage the disagreement, let each side land a blow, and hold for the damage to settle before cutting away. A relationship rupture compressed into two lines reads as a plot note; given space, it becomes a scene the audience feels.',
        });
      }
    }
  }

  // CURIOSITY_PEAK_SCENE_UNDERWEIGHT (minor, n≥8, ≥2 high-curiosity scenes): Scenes
  // with a high curiosityDelta (> 1) average below 60% of the overall scene length.
  // The story's most intriguing moments — where the biggest questions open — are its
  // shortest scenes, so the mystery is raised and abandoned in the same breath rather
  // than given space to take hold in the audience's mind. Distinct from CURIOSITY_
  // MIDZONE_GAP (zone-based curiosity average, not length) and all other underweight
  // checks (different channels): this audits page weight against the curiosity channel.
  if (records.length >= 8) {
    const curiosityLengths341: number[] = [];
    for (let i341q = 0; i341q < records.length; i341q++) {
      if (((records as any[])[i341q].curiosityDelta ?? 0) > 1) {
        curiosityLengths341.push(sceneLengths.get(i341q) ?? 0);
      }
    }
    if (curiosityLengths341.length >= 2) {
      const curiosityAvg341 = curiosityLengths341.reduce((s, v) => s + v, 0) / curiosityLengths341.length;
      if (curiosityAvg341 < avgLength * 0.6) {
        issues.push({
          location: `${curiosityLengths341.length} high-curiosity scene(s)`,
          rule: 'CURIOSITY_PEAK_SCENE_UNDERWEIGHT',
          severity: 'minor',
          description: `The ${curiosityLengths341.length} high-curiosity scene(s) average ${curiosityAvg341.toFixed(1)} weighted lines, ${Math.round(curiosityAvg341 / avgLength * 100)}% of the overall average (${avgLength.toFixed(1)}). The story's most intriguing moments — where its biggest questions open — are its shortest scenes, so each mystery is raised and abandoned in the same breath rather than given room to take hold and pull the audience forward.`,
          suggestedFix: 'Let the intriguing scenes breathe: when a scene opens a major question, hold on it long enough for the audience to register the gap and start wondering. A mystery flashed past in two lines never has time to hook; the scenes that raise the stakes of knowing deserve at least average length.',
        });
      }
    }
  }

  // QUIET_SCENE_BLOAT (minor, n≥8, ≥2 quiet scenes): Scenes carrying no dramatic
  // marker at all — neutral emotion, no dramatic turn, no revelation, no clock raise,
  // no relationship shift, no clue seeded, no payoff — average above 1.5× the overall
  // scene length. The script's most inert beats are its longest: it lingers exactly
  // where the least is happening. Distinct from OVERLONG_LOW_TENSION (a per-scene 2.5×
  // threshold gated on low suspense), LONG_SCENE_FLOOD (proportion of long scenes
  // regardless of content), and CLOCK_SCENE_PACING_MISMATCH (clock-channel bloat):
  // this aggregates length specifically across scenes that advance nothing.
  if (records.length >= 8) {
    const isQuiet341 = (r: any): boolean =>
      (r.emotionalShift ?? 'neutral') === 'neutral' &&
      (r.dramaticTurn ?? 'nothing') === 'nothing' &&
      (r.revelation === null || r.revelation === undefined) &&
      r.clockRaised !== true &&
      ((r.relationshipShifts ?? []) as any[]).length === 0 &&
      ((r.seededClueIds ?? []) as any[]).length === 0 &&
      ((r.payoffSetupIds ?? []) as any[]).length === 0;
    const quietLengths341: number[] = [];
    for (let i341z = 0; i341z < records.length; i341z++) {
      if (isQuiet341((records as any[])[i341z])) {
        quietLengths341.push(sceneLengths.get(i341z) ?? 0);
      }
    }
    if (quietLengths341.length >= 2) {
      const quietAvg341 = quietLengths341.reduce((s, v) => s + v, 0) / quietLengths341.length;
      if (quietAvg341 > avgLength * 1.5) {
        issues.push({
          location: `${quietLengths341.length} quiet scene(s)`,
          rule: 'QUIET_SCENE_BLOAT',
          severity: 'minor',
          description: `The ${quietLengths341.length} quiet scene(s) — scenes carrying no dramatic marker (no emotional shift, turn, revelation, clock, relationship move, clue, or payoff) — average ${quietAvg341.toFixed(1)} weighted lines, ${Math.round(quietAvg341 / avgLength * 100)}% of the overall average (${avgLength.toFixed(1)}). The script's most inert beats are its longest: it lingers exactly where the least is happening, spending page space on scenes that advance neither plot nor character nor feeling.`,
          suggestedFix: 'Compress or cut the quiet scenes: a scene that carries no dramatic charge should be the leanest on the page, not the longest. Find the one beat each inert scene exists to deliver, play it fast, and reinvest the recovered space in the scenes that actually move the story.',
        });
      }
    }
  }

  // ── Wave 355: SUSPENSE_PEAK_SCENE_UNDERWEIGHT, SEED_SCENE_BLOAT, STAKES_SCENE_UNDERWEIGHT ──

  // SUSPENSE_PEAK_SCENE_UNDERWEIGHT (minor, n≥8, maxSuspense>1): The single highest-
  // suspense scene runs below 60% of the overall scene length — the story's tensest
  // moment is one of its shortest. A suspense peak needs room to land: the held breath,
  // the reaction, the consequence. Rushing the most charged scene through the thinnest
  // page space blunts the very moment the whole arc has been building toward. Distinct
  // from SUSPENSE_LENGTH_DECOUPLING (a systemic, multi-scene misallocation) and CLIMAX_
  // SCENE_UNDERWEIGHT (the climax/Act-3 scene): this isolates the single peak-suspense
  // scene wherever it falls.
  if (records.length >= 8) {
    const maxSusp355 = Math.max(...(records as any[]).map(r => r.suspenseDelta ?? 0));
    if (maxSusp355 > 1) {
      const peakIdx355 = (records as any[]).findIndex(r => (r.suspenseDelta ?? 0) === maxSusp355);
      const peakLen355 = sceneLengths.get(peakIdx355) ?? 0;
      if (peakLen355 > 0 && peakLen355 < avgLength * 0.6) {
        issues.push({
          location: `Scene ${peakIdx355} (peak suspense: ${maxSusp355})`,
          rule: 'SUSPENSE_PEAK_SCENE_UNDERWEIGHT',
          severity: 'minor',
          description: `The story's highest-suspense scene (Scene ${peakIdx355}, suspenseDelta ${maxSusp355}) runs ${peakLen355} weighted lines — ${Math.round(peakLen355 / avgLength * 100)}% of the overall average (${avgLength.toFixed(1)}). The tensest moment in the story is one of its shortest scenes. A suspense peak needs room to land — the held breath, the reaction, the consequence — and rushing it through the thinnest page space blunts the beat the whole arc has been building toward.`,
          suggestedFix: 'Expand the peak-suspense scene: stage the danger, hold on the uncertainty, and let the immediate fallout register before cutting away. The scene of maximum tension should be among the script\'s most fully realized, not a beat the page hurries past.',
        });
      }
    }
  }

  // SEED_SCENE_BLOAT (minor, n≥8, ≥2 seed scenes): Scenes that plant story clues
  // (seededClueIds non-empty) average above 1.5× the overall scene length. Foreshadowing
  // is most effective when it is glimpsed — a detail the audience half-registers and only
  // recognizes in hindsight. When clue-planting scenes sprawl, the seed is lingered on so
  // long that it telegraphs its own importance, and the later payoff loses the pleasure of
  // surprise. Distinct from CLOCK_SCENE_PACING_MISMATCH (clock-raise scenes) and QUIET_
  // SCENE_BLOAT (scenes with no dramatic marker): this targets the clue-seeding channel.
  if (records.length >= 8) {
    const seedLengths355: number[] = [];
    for (let i355 = 0; i355 < records.length; i355++) {
      if ((((records as any[])[i355].seededClueIds ?? []) as any[]).length > 0) {
        seedLengths355.push(sceneLengths.get(i355) ?? 0);
      }
    }
    if (seedLengths355.length >= 2) {
      const seedAvg355 = seedLengths355.reduce((s, v) => s + v, 0) / seedLengths355.length;
      if (seedAvg355 > avgLength * 1.5) {
        issues.push({
          location: `${seedLengths355.length} clue-seeding scene(s)`,
          rule: 'SEED_SCENE_BLOAT',
          severity: 'minor',
          description: `The ${seedLengths355.length} clue-seeding scene(s) average ${seedAvg355.toFixed(1)} weighted lines — ${Math.round(seedAvg355 / avgLength * 100)}% of the overall average (${avgLength.toFixed(1)}). Foreshadowing works best glimpsed: a detail the audience half-registers and recognizes only in hindsight. When clue-planting scenes sprawl, the seed is lingered on so long that it telegraphs its own importance, and the eventual payoff loses the pleasure of surprise.`,
          suggestedFix: 'Compress clue-seeding scenes: plant the detail quickly, woven into action that has its own purpose, so it passes almost unnoticed. A clue earns its payoff by being remembered, not by being underlined — the less page space it occupies, the more satisfying its later return.',
        });
      }
    }
  }

  // STAKES_SCENE_UNDERWEIGHT (minor, n≥8, ≥2 raise_stakes scenes): Scenes whose purpose
  // is to raise the stakes (purpose === 'raise_stakes') average below 60% of the overall
  // scene length. The moments that escalate what is at risk are rushed through the
  // script's thinnest page space, so the audience is told the stakes rose without being
  // given time to feel the new weight. Escalation needs room to register the cost.
  // Distinct from the emotional/suspense/conflict underweight checks (different channels)
  // and from STAKES_RAISED_EXTERNALLY in intention.ts (which audits agency, not length).
  if (records.length >= 8) {
    const stakesLengths355: number[] = [];
    for (let i355s = 0; i355s < records.length; i355s++) {
      if ((records as any[])[i355s].purpose === 'raise_stakes') {
        stakesLengths355.push(sceneLengths.get(i355s) ?? 0);
      }
    }
    if (stakesLengths355.length >= 2) {
      const stakesAvg355 = stakesLengths355.reduce((s, v) => s + v, 0) / stakesLengths355.length;
      if (stakesAvg355 < avgLength * 0.6) {
        issues.push({
          location: `${stakesLengths355.length} stakes-raising scene(s)`,
          rule: 'STAKES_SCENE_UNDERWEIGHT',
          severity: 'minor',
          description: `The ${stakesLengths355.length} stakes-raising scene(s) average ${stakesAvg355.toFixed(1)} weighted lines — ${Math.round(stakesAvg355 / avgLength * 100)}% of the overall average (${avgLength.toFixed(1)}). The moments that escalate what is at risk are rushed through the script's thinnest page space, so the audience is told the stakes rose without being given time to feel the new weight. Escalation has to be absorbed to land.`,
          suggestedFix: 'Give stakes-raising scenes room to breathe: let the new danger or cost sink in through reaction and consequence, not just announcement. A raise that the audience experiences — sees what it threatens, feels what it could cost — lands far harder than one the script states and moves past.',
        });
      }
    }
  }

  // ── Wave 369: CLOCK_SCENE_UNDERWEIGHT, REVELATION_SCENE_BLOAT, PAYOFF_SCENE_BLOAT ──

  // CLOCK_SCENE_UNDERWEIGHT (minor, n≥8, ≥2 clock scenes): Scenes that raise a clock
  // (clockRaised === true) average below 60% of the overall scene length — deadlines are
  // raised in the script's thinnest page space, so the audience is told time is running
  // out without being given room to feel the pressure tighten. Urgency needs a beat to
  // register the cost of the shrinking window. The complement of CLOCK_SCENE_PACING_
  // MISMATCH (clock scenes running ABOVE 1.5× — urgency undercut by a slow page): this
  // fires on the opposite failure, clock scenes rushed too thin to land.
  if (records.length >= 8) {
    const clockLengths369: number[] = [];
    for (let i369 = 0; i369 < records.length; i369++) {
      if ((records as any[])[i369].clockRaised === true) {
        clockLengths369.push(sceneLengths.get(i369) ?? 0);
      }
    }
    if (clockLengths369.length >= 2) {
      const clockAvg369 = clockLengths369.reduce((s, v) => s + v, 0) / clockLengths369.length;
      if (clockAvg369 > 0 && clockAvg369 < avgLength * 0.6) {
        issues.push({
          location: `${clockLengths369.length} clock-raising scene(s)`,
          rule: 'CLOCK_SCENE_UNDERWEIGHT',
          severity: 'minor',
          description: `The ${clockLengths369.length} clock-raising scene(s) average ${clockAvg369.toFixed(1)} weighted lines — ${Math.round(clockAvg369 / avgLength * 100)}% of the overall average (${avgLength.toFixed(1)}). The deadlines that should tighten the screws are raised in the script's thinnest page space, so the audience is told time is running out without being given room to feel the window shrink. Urgency has to be absorbed to bite.`,
          suggestedFix: 'Give clock-raising scenes room to land the pressure: show what the shrinking window threatens and how the characters feel it closing, rather than announcing the deadline and cutting away. A clock the audience feel tightening is dread; a clock merely stated is a number.',
        });
      }
    }
  }

  // REVELATION_SCENE_BLOAT (minor, n≥8, ≥2 revelation scenes): Scenes carrying a
  // revelation average above 1.5× the overall scene length — disclosures are lingered on
  // and over-explained. A revelation lands hardest when it arrives clean and the audience
  // is left to feel its implications; when the scene sprawls, the truth is spelled out and
  // re-stated until its impact dissipates into exposition. The complement of REVELATION_
  // SCENE_UNDERWEIGHT (revelation scenes below 60% — disclosures rushed): this fires on
  // the opposite failure, revelations belabored.
  if (records.length >= 8) {
    const revLengths369: number[] = [];
    for (let i369r = 0; i369r < records.length; i369r++) {
      if ((records as any[])[i369r].revelation !== null && (records as any[])[i369r].revelation !== undefined) {
        revLengths369.push(sceneLengths.get(i369r) ?? 0);
      }
    }
    if (revLengths369.length >= 2) {
      const revAvg369 = revLengths369.reduce((s, v) => s + v, 0) / revLengths369.length;
      if (revAvg369 > avgLength * 1.5) {
        issues.push({
          location: `${revLengths369.length} revelation scene(s)`,
          rule: 'REVELATION_SCENE_BLOAT',
          severity: 'minor',
          description: `The ${revLengths369.length} revelation scene(s) average ${revAvg369.toFixed(1)} weighted lines — ${Math.round(revAvg369 / avgLength * 100)}% of the overall average (${avgLength.toFixed(1)}). The story's disclosures are lingered on and over-explained. A revelation lands hardest when it arrives clean and the audience is left to feel its implications; a scene that sprawls spells the truth out and re-states it until the impact dissolves into exposition.`,
          suggestedFix: 'Compress revelation scenes to the moment of disclosure and its immediate charge: deliver the truth, hold on the reaction, and cut before the scene starts explaining what the audience already grasps. The power of a reveal is in what it implies, not in how thoroughly it is unpacked.',
        });
      }
    }
  }

  // PAYOFF_SCENE_BLOAT (minor, n≥8, ≥2 payoff scenes): Scenes that fire a payoff
  // (payoffSetupIds non-empty) average above 1.5× the overall scene length — callbacks are
  // belabored. A payoff is most satisfying when it snaps shut: the audience recognizes the
  // planted thread and feels the click of completion. When the payoff scene sprawls, the
  // connection is over-drawn and the pleasure of recognition is replaced by the tedium of
  // being walked through it. The complement of PAYOFF_SCENE_UNDERWEIGHT (payoff scenes
  // below 60% — resolutions rushed): this fires on the opposite failure.
  if (records.length >= 8) {
    const payoffLengths369: number[] = [];
    for (let i369p = 0; i369p < records.length; i369p++) {
      if ((((records as any[])[i369p].payoffSetupIds ?? []) as any[]).length > 0) {
        payoffLengths369.push(sceneLengths.get(i369p) ?? 0);
      }
    }
    if (payoffLengths369.length >= 2) {
      const payoffAvg369 = payoffLengths369.reduce((s, v) => s + v, 0) / payoffLengths369.length;
      if (payoffAvg369 > avgLength * 1.5) {
        issues.push({
          location: `${payoffLengths369.length} payoff scene(s)`,
          rule: 'PAYOFF_SCENE_BLOAT',
          severity: 'minor',
          description: `The ${payoffLengths369.length} payoff scene(s) average ${payoffAvg369.toFixed(1)} weighted lines — ${Math.round(payoffAvg369 / avgLength * 100)}% of the overall average (${avgLength.toFixed(1)}). The story's callbacks are belabored. A payoff is most satisfying when it snaps shut — the audience recognizes the planted thread and feels the click of completion; a scene that sprawls over-draws the connection and trades the pleasure of recognition for the tedium of being walked through it.`,
          suggestedFix: 'Tighten payoff scenes to the beat of recognition: let the callback land and trust the audience to feel the connection without it being explained. The satisfaction of a payoff is in the click of "of course"; over-explaining the setup-to-payoff link smothers exactly the recognition that makes it land.',
        });
      }
    }
  }

  // ── Wave 383: CONFLICT_SCENE_BLOAT, DRAMATIC_TURN_SCENE_BLOAT, EMOTIONAL_PEAK_SCENE_BLOAT ──

  // CONFLICT_SCENE_BLOAT (minor, n≥8, ≥2 conflict scenes): Scenes carrying a negative
  // relationship shift (amount ≤ -0.3) average above 1.5× the overall scene length — the
  // story's ruptures are wallowed in. A bond-break lands hardest when it is sharp; a rupture
  // scene that sprawls dilutes the blow with over-played recrimination and the audience
  // disengages from a fight that will not end. The complement of CONFLICT_SCENE_UNDERWEIGHT
  // (rupture scenes below 60% — ruptures rushed): this fires on the opposite failure.
  if (records.length >= 8) {
    const conflictLengths383: number[] = [];
    for (let i383 = 0; i383 < records.length; i383++) {
      const shifts383 = ((records as any[])[i383].relationshipShifts ?? []) as Array<{ amount: number }>;
      if (shifts383.some(s => s.amount <= -0.3)) conflictLengths383.push(sceneLengths.get(i383) ?? 0);
    }
    if (conflictLengths383.length >= 2) {
      const conflictAvg383 = conflictLengths383.reduce((s, v) => s + v, 0) / conflictLengths383.length;
      if (conflictAvg383 > avgLength * 1.5) {
        issues.push({
          location: `${conflictLengths383.length} conflict scene(s)`,
          rule: 'CONFLICT_SCENE_BLOAT',
          severity: 'minor',
          description: `The ${conflictLengths383.length} conflict scene(s) average ${conflictAvg383.toFixed(1)} weighted lines — ${Math.round(conflictAvg383 / avgLength * 100)}% of the overall average (${avgLength.toFixed(1)}). The story's ruptures are wallowed in: a bond-break lands hardest when it is sharp, but a rupture that sprawls dilutes the blow with over-played recrimination, and the audience disengages from a fight that will not resolve.`,
          suggestedFix: 'Tighten conflict scenes to the blows that matter: the decisive accusation, the wound that lands, the line that cannot be taken back. A rupture is most devastating when it is swift and surgical; extended quarreling drains the tension it should concentrate.',
        });
      }
    }
  }

  // DRAMATIC_TURN_SCENE_BLOAT (minor, n≥8, ≥2 turn scenes): Scenes carrying a dramatic
  // turn (dramaticTurn !== 'nothing') average above 1.5× the overall scene length — the
  // story's pivots sprawl. A turn lands hardest as a sharp reversal the audience feels snap;
  // a pivot scene that runs long buries the turn in surrounding material and softens its
  // impact. The complement of DRAMATIC_TURN_SCENE_UNDERWEIGHT (turn scenes below 60% —
  // pivots rushed): this fires on the opposite failure.
  if (records.length >= 8) {
    const turnLengths383: number[] = [];
    for (let i383t = 0; i383t < records.length; i383t++) {
      if (((records as any[])[i383t].dramaticTurn ?? 'nothing') !== 'nothing') turnLengths383.push(sceneLengths.get(i383t) ?? 0);
    }
    if (turnLengths383.length >= 2) {
      const turnAvg383 = turnLengths383.reduce((s, v) => s + v, 0) / turnLengths383.length;
      if (turnAvg383 > avgLength * 1.5) {
        issues.push({
          location: `${turnLengths383.length} dramatic-turn scene(s)`,
          rule: 'DRAMATIC_TURN_SCENE_BLOAT',
          severity: 'minor',
          description: `The ${turnLengths383.length} dramatic-turn scene(s) average ${turnAvg383.toFixed(1)} weighted lines — ${Math.round(turnAvg383 / avgLength * 100)}% of the overall average (${avgLength.toFixed(1)}). The story's pivots sprawl: a turn lands hardest as a sharp reversal the audience feels snap, but a pivot scene that runs long buries the turn in surrounding material and softens the very jolt it should deliver.`,
          suggestedFix: 'Compress turn scenes to the moment of reversal and its immediate impact: stage the pivot, let it land, and cut before the scene over-processes it. The power of a turn is in its suddenness; padding it with lead-up and aftermath dissipates the surprise.',
        });
      }
    }
  }

  // EMOTIONAL_PEAK_SCENE_BLOAT (minor, n≥8, ≥2 charged scenes): Scenes carrying a
  // non-neutral emotional shift average above 1.5× the overall scene length — the story's
  // feeling is over-indulged. Emotion lands when it is earned and then released; a charged
  // scene that lingers tips into sentimentality, holding on the feeling past the point the
  // audience has absorbed it. The complement of EMOTIONAL_PEAK_SCENE_UNDERWEIGHT (charged
  // scenes below 60% — feeling rushed): this fires on the opposite failure.
  if (records.length >= 8) {
    const emoLengths383: number[] = [];
    for (let i383e = 0; i383e < records.length; i383e++) {
      if ((records as any[])[i383e].emotionalShift !== 'neutral') emoLengths383.push(sceneLengths.get(i383e) ?? 0);
    }
    if (emoLengths383.length >= 2) {
      const emoAvg383 = emoLengths383.reduce((s, v) => s + v, 0) / emoLengths383.length;
      if (emoAvg383 > avgLength * 1.5) {
        issues.push({
          location: `${emoLengths383.length} emotionally charged scene(s)`,
          rule: 'EMOTIONAL_PEAK_SCENE_BLOAT',
          severity: 'minor',
          description: `The ${emoLengths383.length} emotionally charged scene(s) average ${emoAvg383.toFixed(1)} weighted lines — ${Math.round(emoAvg383 / avgLength * 100)}% of the overall average (${avgLength.toFixed(1)}). The story's feeling is over-indulged: emotion lands when it is earned and released, but a charged scene that lingers tips into sentimentality, holding on the feeling well past the point the audience has absorbed it.`,
          suggestedFix: 'Trust the audience to feel it and move on: deliver the emotional beat, hold for the reaction, and cut before the scene starts wringing the moment. Restraint amplifies feeling; an emotional scene that overstays its welcome invites the audience to step back from it.',
        });
      }
    }
  }

  // ── Wave 397: SEED_SCENE_UNDERWEIGHT, STAKES_SCENE_BLOAT, CURIOSITY_PEAK_SCENE_BLOAT ──

  // SEED_SCENE_UNDERWEIGHT (minor, n≥8, ≥2 seed scenes): Clue-seeding scenes
  // (seededClueIds non-empty) average below 60% of overall length — seeds are dropped in
  // passing, too rushed to register as story material. Foreshadowing that is glimpsed too
  // briefly cannot prime the audience for the payoff; the later reveal will feel
  // arbitrary rather than earned. The complement of SEED_SCENE_BLOAT (seeding scenes above
  // 1.5× — telegraphed by page space): this fires on the opposite failure, seeds too thin.
  // Distinct from REVELATION_SCENE_UNDERWEIGHT (revelation flag, not clue-seeding),
  // PAYOFF_SCENE_UNDERWEIGHT (payoff signal), and CLOCK_SCENE_UNDERWEIGHT (clock channel).
  if (records.length >= 8) {
    const seedUWLengths397: number[] = [];
    for (let i397a = 0; i397a < records.length; i397a++) {
      if ((((records as any[])[i397a].seededClueIds ?? []) as any[]).length > 0) {
        seedUWLengths397.push(sceneLengths.get(i397a) ?? 0);
      }
    }
    if (seedUWLengths397.length >= 2) {
      const seedUWAvg397 = seedUWLengths397.reduce((s, v) => s + v, 0) / seedUWLengths397.length;
      if (seedUWAvg397 > 0 && seedUWAvg397 < avgLength * 0.6) {
        issues.push({
          location: `${seedUWLengths397.length} clue-seeding scene(s)`,
          rule: 'SEED_SCENE_UNDERWEIGHT',
          severity: 'minor',
          description: `The ${seedUWLengths397.length} clue-seeding scene(s) average ${seedUWAvg397.toFixed(1)} weighted lines — ${Math.round(seedUWAvg397 / avgLength * 100)}% of the overall average (${avgLength.toFixed(1)}). Seeds dropped too quickly cannot prime the audience for the payoff: a detail glimpsed in half a line registers as set dressing, not foreshadowing, and the eventual reveal feels arbitrary rather than earned. Planting a clue still requires enough space for it to land.`,
          suggestedFix: 'Give clue-seeding scenes enough room for the detail to land distinctly: have a character interact with it, have the environment hold it a beat, or let it generate a reaction. A seed glimpsed in a single line is easily forgotten; one that earns a moment of pause is the kind that pays off.',
        });
      }
    }
  }

  // STAKES_SCENE_BLOAT (minor, n≥8, ≥2 raise_stakes scenes): Scenes whose purpose is
  // to raise the stakes (purpose === 'raise_stakes') average above 1.5× the overall
  // scene length — escalation sprawls and loses its urgency. A raise-the-stakes scene
  // derives its power from forward momentum: it announces new danger and drives the
  // characters toward a response. Sprawling stakes scenes become explanation rather
  // than escalation. The complement of STAKES_SCENE_UNDERWEIGHT (below 60% — too rushed):
  // this fires on the opposite failure. Distinct from CONFLICT_SCENE_BLOAT (relationship-
  // shift channel) and DRAMATIC_TURN_SCENE_BLOAT (dramaticTurn signal).
  if (records.length >= 8) {
    const stakesBloatLengths397: number[] = [];
    for (let i397b = 0; i397b < records.length; i397b++) {
      if ((records as any[])[i397b].purpose === 'raise_stakes') {
        stakesBloatLengths397.push(sceneLengths.get(i397b) ?? 0);
      }
    }
    if (stakesBloatLengths397.length >= 2) {
      const stakesBloatAvg397 = stakesBloatLengths397.reduce((s, v) => s + v, 0) / stakesBloatLengths397.length;
      if (stakesBloatAvg397 > avgLength * 1.5) {
        issues.push({
          location: `${stakesBloatLengths397.length} stakes-raising scene(s)`,
          rule: 'STAKES_SCENE_BLOAT',
          severity: 'minor',
          description: `The ${stakesBloatLengths397.length} stakes-raising scene(s) average ${stakesBloatAvg397.toFixed(1)} weighted lines — ${Math.round(stakesBloatAvg397 / avgLength * 100)}% of the overall average (${avgLength.toFixed(1)}). Escalation sprawls and loses its urgency: a raise-the-stakes scene draws its power from forward momentum, announcing new danger and driving toward response. When it sprawls, it becomes explanation rather than escalation, and the urgency it was meant to inject dissipates in the length.`,
          suggestedFix: 'Compress stakes-raising scenes: deliver the new cost or danger clearly, show the immediate character response, and move on. The audience\'s sense of urgency lives in pace — a tight scene that raises the stakes and cuts away leaves them no room to relax.',
        });
      }
    }
  }

  // CURIOSITY_PEAK_SCENE_BLOAT (minor, n≥8, ≥2 high-curiosity scenes): Scenes with a
  // high curiosityDelta (> 1) average above 1.5× the overall scene length — the story's
  // most intriguing moments are over-explained. A scene that opens a big question should
  // raise it and withhold the answer; sprawling past the question into exposition collapses
  // the mystery it just created. The complement of CURIOSITY_PEAK_SCENE_UNDERWEIGHT
  // (high-curiosity scenes below 60% — mysteries raised too briefly): this fires on the
  // opposite failure. Distinct from QUIET_SCENE_BLOAT (inert scenes), EMOTIONAL_PEAK_
  // SCENE_BLOAT (emotional channel), and REVELATION_SCENE_BLOAT (revelation field).
  if (records.length >= 8) {
    const curioBloatLengths397: number[] = [];
    for (let i397c = 0; i397c < records.length; i397c++) {
      if (((records as any[])[i397c].curiosityDelta ?? 0) > 1) {
        curioBloatLengths397.push(sceneLengths.get(i397c) ?? 0);
      }
    }
    if (curioBloatLengths397.length >= 2) {
      const curioBloatAvg397 = curioBloatLengths397.reduce((s, v) => s + v, 0) / curioBloatLengths397.length;
      if (curioBloatAvg397 > avgLength * 1.5) {
        issues.push({
          location: `${curioBloatLengths397.length} high-curiosity scene(s)`,
          rule: 'CURIOSITY_PEAK_SCENE_BLOAT',
          severity: 'minor',
          description: `The ${curioBloatLengths397.length} high-curiosity scene(s) average ${curioBloatAvg397.toFixed(1)} weighted lines — ${Math.round(curioBloatAvg397 / avgLength * 100)}% of the overall average (${avgLength.toFixed(1)}). The story's most intriguing moments are over-explained: a scene that opens a large question derives its pull from the gap it creates, not from explaining what the gap is. Sprawling past the opening into exposition collapses the mystery it just raised, converting intrigue into information.`,
          suggestedFix: 'Trim high-curiosity scenes to the point of the question: raise it, let it sit for one reaction, and cut away with the audience still leaning forward. Restraint is the engine of curiosity — the longer a scene lingers after opening a question, the more it answers by implication, deflating the hook it was meant to set.',
        });
      }
    }
  }

  // ── Wave 411: SUSPENSE_PEAK_SCENE_BLOAT, RESOLUTION_BLOAT, OPENING_SCENE_UNDERWEIGHT ──

  // SUSPENSE_PEAK_SCENE_BLOAT (minor, n≥8, maxSuspense>1): The single highest-suspense scene
  // runs above 1.5× the overall scene length — the story's tensest moment sprawls. Suspense is
  // sustained by economy: the held breath works because nothing is wasted around it. When the
  // peak-tension scene balloons past the page space its neighbours occupy, the writing dilutes
  // the very pressure it should be concentrating — the audience's grip loosens as the scene
  // overstays. The complement of SUSPENSE_PEAK_SCENE_UNDERWEIGHT (the peak runs too SHORT);
  // distinct from QUIET_SCENE_BLOAT (no-marker scenes) and SUSPENSE_LENGTH_DECOUPLING (a
  // systemic, multi-scene misallocation): this isolates the single peak-suspense scene.
  if (records.length >= 8) {
    const maxSusp411 = Math.max(...(records as any[]).map(r => r.suspenseDelta ?? 0));
    if (maxSusp411 > 1) {
      const peakIdx411 = (records as any[]).findIndex(r => (r.suspenseDelta ?? 0) === maxSusp411);
      const peakLen411 = sceneLengths.get(peakIdx411) ?? 0;
      if (peakLen411 > 0 && peakLen411 > avgLength * 1.5) {
        issues.push({
          location: `Scene ${peakIdx411} (peak suspense: ${maxSusp411})`,
          rule: 'SUSPENSE_PEAK_SCENE_BLOAT',
          severity: 'minor',
          description: `The story's highest-suspense scene (Scene ${peakIdx411}, suspenseDelta ${maxSusp411}) runs ${peakLen411} weighted lines — ${Math.round(peakLen411 / avgLength * 100)}% of the overall average (${avgLength.toFixed(1)}). The tensest moment in the story is one of its longest scenes. Suspense is sustained by economy — the held breath works because nothing around it is wasted — and a peak-tension scene that sprawls past its neighbours dilutes the very pressure it should be concentrating, so the audience's grip loosens as the scene overstays.`,
          suggestedFix: 'Tighten the peak-suspense scene: cut everything that does not raise or hold the tension, and let the danger play in lean, propulsive beats. The scene of maximum tension should be among the script\'s most economical, not its most expansive — every extra line of digression is a place the held breath can escape.',
        });
      }
    }
  }

  // RESOLUTION_BLOAT (minor, n≥6): The final resolution scene runs above 2× the overall scene
  // length — the story overstays its ending. After the climax, decompression should be brief: a
  // beat of release, an image that lands the meaning, and out. When the closing scene balloons
  // to more than double the average, the story delivers a "long goodbye" — multiple endings,
  // belaboured reflection, a denouement that dissipates the energy the climax just generated.
  // The complement of RESOLUTION_TOO_BRIEF (the ending is rushed); distinct from ENDING_ON_PEAK
  // (no decompression at all — the opposite failure) and POST_RELEASE_DEAD_AIR (a run of flat
  // scenes after the tension release, not a single bloated final scene).
  if (records.length >= 6) {
    const lastIdx411 = records.length - 1;
    const lastLen411 = sceneLengths.get(lastIdx411) ?? 0;
    const lastRec411 = records[lastIdx411];
    const isResolution411 = lastRec411 &&
      (lastRec411.purpose === 'resolution' || (lastRec411.suspenseDelta ?? 0) < 0);
    if (isResolution411 && lastLen411 > 0 && lastLen411 > avgLength * 2) {
      issues.push({
        location: `Scene ${lastIdx411} (final/resolution)`,
        rule: 'RESOLUTION_BLOAT',
        severity: 'minor',
        description: `The final scene (Scene ${lastIdx411}) runs ${lastLen411} weighted lines — ${Math.round(lastLen411 / avgLength * 100)}% of the overall average (${avgLength.toFixed(1)}). The story overstays its ending: after the climax, decompression should be brief — a beat of release, an image that lands the meaning, and out. A closing scene more than double the average delivers a "long goodbye" of multiple endings and belaboured reflection that dissipates the energy the climax just generated.`,
        suggestedFix: 'Trim the resolution to its essential release: find the single image or exchange that earns the emotional landing and end on it. If the closing scene is doing several jobs — tying off subplots, reflecting, foreshadowing a sequel — keep only the one the story most needs, and let the rest be implied. The audience leaves most satisfied a beat before they expect to.',
      });
    }
  }

  // OPENING_SCENE_UNDERWEIGHT (minor, n≥6): The first scene runs below 50% of the overall scene
  // length — the story opens on a fragment. An opening scene does foundational work: it sets the
  // tone, establishes the world's rules, and gives the audience a character to attach to before
  // the plot accelerates. When the first scene is among the shortest in the script, the audience
  // is thrown into motion before they have anywhere to stand — they are asked to care before they
  // have been given a reason to. The complement of OPENING_SCENE_BLOAT (the opener is overlong);
  // distinct from RESOLUTION_TOO_BRIEF (the final scene) and CURIOSITY_OPENING_FLATLINE (a
  // suspense/curiosity-quality check on the opening, not a page-length check).
  if (records.length >= 6) {
    const openLen411 = sceneLengths.get(0) ?? 0;
    if (openLen411 > 0 && openLen411 < avgLength * 0.5) {
      issues.push({
        location: `Scene 0 (${records[0]?.slug ?? 'opening'})`,
        rule: 'OPENING_SCENE_UNDERWEIGHT',
        severity: 'minor',
        description: `The opening scene (Scene 0) runs ${openLen411} weighted lines — ${Math.round(openLen411 / avgLength * 100)}% of the overall average (${avgLength.toFixed(1)}). The story opens on a fragment. The first scene does foundational work — establishing tone, the world's rules, and a character to attach to — and when it is among the shortest in the script the audience is thrown into motion before they have anywhere to stand, asked to care before they have been given a reason to.`,
        suggestedFix: 'Give the opening room to establish: let the first scene render the world and the protagonist with enough texture that the audience knows whose story this is and what its register will be before the engine turns over. A lean opener can work, but if it is one of the shortest scenes in the script it is likely skipping the orientation the rest of the story depends on.',
      });
    }
  }

  // ── Wave 425: SCENE_EXPANSION_RUN, SUSPENSE_MIDPOINT_TROUGH, CURIOSITY_FRONTLOAD ──

  // SCENE_EXPANSION_RUN (run-based, n≥8): Five consecutive scenes where each runs strictly
  // longer than the previous — a sustained page-space expansion that mirrors SCENE_COMPRESSION_
  // SPIRAL's shrinking run in the opposite direction. While a compression spiral depletes space
  // before the climax, an expansion run balloons it: the story gathers mass across the stretch
  // when it should be cutting weight. An unchecked lengthening run signals unedited accumulation
  // rather than deliberate escalation — each successive scene adds more rather than distilling to
  // the essential.
  // Distinctness: SCENE_COMPRESSION_SPIRAL (n≥8) catches 5 scenes each SHORTER than the prior;
  // PACE_DECELERATION_TREND uses a global least-squares slope across all scenes — it fires on a
  // whole-story tilt, not a local run; SCENE_VELOCITY_DROP compares first-half vs second-half
  // averages. This is the only check for a local 5-consecutive strictly-growing run.
  if (records.length >= 8) {
    const orderedLens425a = Array.from({ length: records.length }, (_, i) => sceneLengths.get(i) ?? 0);
    let expandStart425 = -1;
    for (let i425 = 0; i425 + 4 < orderedLens425a.length; i425++) {
      if (
        orderedLens425a[i425] > 0 &&
        orderedLens425a[i425 + 1] > orderedLens425a[i425] &&
        orderedLens425a[i425 + 2] > orderedLens425a[i425 + 1] &&
        orderedLens425a[i425 + 3] > orderedLens425a[i425 + 2] &&
        orderedLens425a[i425 + 4] > orderedLens425a[i425 + 3]
      ) {
        expandStart425 = i425;
        break;
      }
    }
    if (expandStart425 >= 0) {
      issues.push({
        location: `Scenes ${expandStart425}–${expandStart425 + 4}`,
        rule: 'SCENE_EXPANSION_RUN',
        severity: 'minor',
        description: `Scenes ${expandStart425}–${expandStart425 + 4} are each strictly longer than the last — a five-scene expansion run that inflates page space rather than compressing toward the climax. A sustained lengthening across consecutive scenes signals unedited accumulation: the story is gaining mass across the stretch rather than distilling to essential beats.`,
        suggestedFix: 'Break the expansion: trim at least one mid-run scene to a leaner beat, or hard-cut a set-piece scene into a briefer punch. The story should tighten as it advances, not balloon — a consecutive expansion run is a sign that no scene in the sequence was asked whether it could do less.',
      });
    }
  }

  // SUSPENSE_MIDPOINT_TROUGH (single-peak isolation, n≥10): The structural midpoint scene
  // (at floor(n×0.5)) has a suspenseDelta strictly below BOTH the first-half average AND the
  // second-half average, while both halves carry positive average suspense. The midpoint is the
  // story's gear-change moment — the pivot where the energy of Act 2a converts into the forward
  // drive of Act 2b. When the midpoint suspense is a valley between two active zones, the pivot
  // sags rather than snaps: the audience feels the story dip at the moment it should change
  // direction, which reads as a structural dead zone at the centre.
  // Distinctness: MIDPOINT_COLLAPSE fires when midScene length < 50% avg AND suspenseDelta < 2
  // (a page-length gate plus a weak absolute threshold — this can fire even when surrounding
  // scenes are also low-energy). SUSPENSE_MIDPOINT_TROUGH fires purely on relative suspense
  // distribution: the midpoint must be a valley between two positive-energy halves, regardless
  // of scene length. RHYTHM_INVERSION compares first-third max vs last-third average; this
  // compares the single midpoint to both flanking zone averages. These are orthogonal measures.
  if (records.length >= 10) {
    const midIdx425 = Math.floor(records.length * 0.5);
    const firstHalf425 = (records as any[]).slice(0, midIdx425);
    const secondHalf425 = (records as any[]).slice(midIdx425 + 1);
    if (firstHalf425.length >= 3 && secondHalf425.length >= 2) {
      const firstHalfAvg425 = firstHalf425.reduce((s: number, r: any) => s + (r.suspenseDelta ?? 0), 0) / firstHalf425.length;
      const secondHalfAvg425 = secondHalf425.reduce((s: number, r: any) => s + (r.suspenseDelta ?? 0), 0) / secondHalf425.length;
      const midSusp425 = (records as any[])[midIdx425].suspenseDelta ?? 0;
      if (
        firstHalfAvg425 > 0 && secondHalfAvg425 > 0 &&
        midSusp425 < firstHalfAvg425 && midSusp425 < secondHalfAvg425
      ) {
        issues.push({
          location: `Scene ${midIdx425} (structural midpoint)`,
          rule: 'SUSPENSE_MIDPOINT_TROUGH',
          severity: 'minor',
          description: `The structural midpoint (Scene ${midIdx425}, suspenseDelta ${midSusp425.toFixed(1)}) is lower than both the first-half average (${firstHalfAvg425.toFixed(1)}) and second-half average (${secondHalfAvg425.toFixed(1)}), while both halves carry positive energy. The pivot scene is a suspense valley between two active zones: the story dips at the exact moment it should shift gear, creating a structural dead zone at the centre.`,
          suggestedFix: 'Raise the midpoint suspense: add a reversal, a new threat, or an acceleration that makes the pivot feel like a gear-change. The midpoint doesn\'t need to be the story\'s peak, but it must carry enough energy to make the transition from Act 2a to Act 2b feel propulsive rather than slack.',
        });
      }
    }
  }

  // CURIOSITY_FRONTLOAD (distribution/timing, n≥10, ≥4 positive-curiosity scenes): More than
  // 65% of all scenes with a positive curiosityDelta (> 0) sit in the story's first half. The
  // mystery engine runs hot during setup but stalls through complication and climax — the back
  // half of the story is starved of the question-opening that pulls the audience forward. Curiosity
  // should intensify toward resolution: each successive act should deepen the questions until the
  // climax finally answers them. A front-loaded distribution suggests the writer seeded all
  // intrigue in setup then let the questions decay without renewal, so the audience arrives at the
  // answers without urgency.
  // Distinctness: PACING_CURIOSITY_OPENING_FLATLINE fires when the opening LACKS curiosity
  // (avg ≤ 0). This fires when curiosity IS present in the opening but is over-concentrated
  // there, starving the back half. PACING_CURIOSITY_FINAL_DROP checks whether the final quarter
  // drops below zero vs overall average. PACING_CURIOSITY_MIDZONE_GAP checks the midzone average
  // vs the opening zone average. This checks the global PROPORTION of curiosity events — how
  // many are in the first half — which none of those checks address.
  if (records.length >= 10) {
    const halfIdx425c = Math.floor(records.length / 2);
    const posCurioScenes425 = (records as any[]).filter(r => (r.curiosityDelta ?? 0) > 0);
    if (posCurioScenes425.length >= 4) {
      const inFirstHalf425 = (records as any[]).filter(
        (r, i) => i < halfIdx425c && (r.curiosityDelta ?? 0) > 0,
      ).length;
      const ratio425 = inFirstHalf425 / posCurioScenes425.length;
      if (ratio425 > 0.65) {
        issues.push({
          location: 'Curiosity distribution (story halves)',
          rule: 'CURIOSITY_FRONTLOAD',
          severity: 'minor',
          description: `${inFirstHalf425} of ${posCurioScenes425.length} positive-curiosity scenes (${Math.round(ratio425 * 100)}%) sit in the first half of the story. The mystery engine runs hot in setup but stalls through complication and climax. Curiosity should intensify toward resolution — questions opening and deepening across Act 2 as the audience approaches answers — but this script front-loads its intrigue and lets the back half run dry.`,
          suggestedFix: 'Open new questions in Act 2 and Act 3: every revelation should answer one thing and raise another, every complication should deepen the central mystery rather than resolve it. Redistribute curiosity events toward the second half so the audience arrives at the climax still urgently needing to know.',
        });
      }
    }
  }

  // ── Wave 439: SUSPENSE_CURIOSITY_DECOUPLED, CURIOSITY_FLATLINE_RUN, CURIOSITY_AFTERMATH_FLAT ──

  // SUSPENSE_CURIOSITY_DECOUPLED (minor, n≥10, ≥3 high-suspense scenes, ≥3 high-curiosity scenes):
  // The story's high-suspense scenes (suspenseDelta > 1) and high-curiosity scenes (curiosityDelta
  // > 0) never coincide — both forward-pull engines are active in the story, but they always fire
  // in separate scenes. The most compelling beats combine pressure (the audience fears what may
  // happen next) with uncertainty (the audience wonders what is actually happening): when the two
  // engines are systematically in different scenes, neither amplifies the other. A scene that raises
  // both suspense and curiosity is doubly charged; when suspense and curiosity are always in separate
  // scenes, the story delivers partial engagement in each rather than full engagement in either.
  // Co-occurrence/decoupling mode × dual-channel (suspense × curiosity). Distinct from CURIOSITY_
  // FRONTLOAD (Wave 425: proportion of curiosity events in first half — distribution, not co-occurrence),
  // SUSPENSE_MIDPOINT_TROUGH (Wave 425: single-scene suspense vs zone averages), NET_TENSION_DEFICIT
  // (Wave 302: cumulative suspense sum — a global signal, not channel co-occurrence). This is the
  // first check auditing whether suspense and curiosity peaks ever overlap in the same scene.
  if (records.length >= 10) {
    const highSuspRecs439a = (records as any[]).filter(r => (r.suspenseDelta ?? 0) > 1);
    const highCurioRecs439a = (records as any[]).filter(r => (r.curiosityDelta ?? 0) > 0);
    if (highSuspRecs439a.length >= 3 && highCurioRecs439a.length >= 3) {
      const anyOverlap439a = highSuspRecs439a.some(r => (r.curiosityDelta ?? 0) > 0);
      if (!anyOverlap439a) {
        issues.push({
          location: `${highSuspRecs439a.length} high-suspense and ${highCurioRecs439a.length} high-curiosity scenes — never coincide`,
          rule: 'SUSPENSE_CURIOSITY_DECOUPLED',
          severity: 'minor',
          description: `The story has ${highSuspRecs439a.length} high-suspense scenes (suspenseDelta > 1) and ${highCurioRecs439a.length} high-curiosity scenes (curiosityDelta > 0), but the two forward-pull engines never fire in the same scene — every scene is either tense-but-not-curious or curious-but-not-tense. The most compelling beats combine pressure with uncertainty: the audience fears what may happen AND wonders what is actually happening. When suspense and curiosity are systematically decoupled, each scene delivers only partial engagement, and neither signal is amplified by the other.`,
          suggestedFix: 'Redesign at least one scene to carry both high suspense and high curiosity simultaneously: a confrontation that also surfaces a new question, a race against time that also reveals an ambiguity about a key character, a tense wait that also opens a thread the audience did not know was there. The scene that does double-duty — pressing the audience AND pulling them forward — is typically the story\'s most memorable beat.',
        });
      }
    }
  }

  // CURIOSITY_FLATLINE_RUN (minor, n≥10, ≥3 positive-curiosity scenes): Five or more consecutive
  // scenes all have curiosityDelta ≤ 0 while the story has at least three positive-curiosity scenes
  // elsewhere. The question-engine goes dark for a sustained local stretch — the audience carries
  // the same set of unresolved questions across 5+ scenes without a new one being raised or an
  // existing one deepening. While individual scenes may resolve questions (curiosityDelta ≤ 0 is
  // not always negative — it can be neutral), a run of ≥5 consecutive non-curious scenes creates
  // a stretch of story where the forward-pull of new unknowns is absent. The audience's questions
  // are either already answered or simply not renewed during this run, which reads as a curiosity
  // dead zone: the story becomes about watching events unfold without the pull of not-yet-knowing.
  // Run-based mode × curiosity channel. Distinct from CURIOSITY_FRONTLOAD (Wave 425: proportion
  // of curiosity events in the first half — a hemispheric distribution check, not a local run
  // check), PACING_CURIOSITY_OPENING_FLATLINE (Wave 288: the OPENING zone has avg ≤ 0 — a zone
  // average), PACING_CURIOSITY_MIDZONE_GAP (Wave 316: midzone average vs opening zone), and
  // PACING_CURIOSITY_FINAL_DROP (Wave 288: final quarter average ≤ 0 vs overall). This is the
  // first check to detect a local consecutive run of curiosity-flat scenes.
  if (records.length >= 10) {
    const posCurioCount439b = (records as any[]).filter(r => (r.curiosityDelta ?? 0) > 0).length;
    if (posCurioCount439b >= 3) {
      let maxFlatRun439b = 0;
      let curFlatRun439b = 0;
      let maxFlatStart439b = -1;
      let curFlatStart439b = -1;
      for (let i = 0; i < records.length; i++) {
        if (((records as any[])[i].curiosityDelta ?? 0) <= 0) {
          if (curFlatRun439b === 0) curFlatStart439b = i;
          if (++curFlatRun439b > maxFlatRun439b) {
            maxFlatRun439b = curFlatRun439b;
            maxFlatStart439b = curFlatStart439b;
          }
        } else {
          curFlatRun439b = 0;
        }
      }
      if (maxFlatRun439b >= 5) {
        issues.push({
          location: `Scenes ${maxFlatStart439b}–${maxFlatStart439b + maxFlatRun439b - 1} — curiosity flatline`,
          rule: 'CURIOSITY_FLATLINE_RUN',
          severity: 'minor',
          description: `Scenes ${maxFlatStart439b}–${maxFlatStart439b + maxFlatRun439b - 1} (${maxFlatRun439b} consecutive scenes) all have curiosityDelta ≤ 0 — the question-engine goes dark for a sustained stretch while ${posCurioCount439b} positive-curiosity scenes appear elsewhere. During these ${maxFlatRun439b} scenes the audience carries the same unresolved questions without any renewal or deepening: no new question is raised, no existing question is made more urgent. A curiosity dead zone of this length teaches the audience that this stretch of story does not generate forward pull — they are watching events unfold rather than being drawn into unknowns.`,
          suggestedFix: `Seed at least one or two new questions in the flatline run at Scenes ${maxFlatStart439b}–${maxFlatStart439b + maxFlatRun439b - 1}: introduce a new ambiguity, surface a fragment of information that implies there is more the audience doesn't know, or deepen an existing question by showing evidence that the answer is not what it seemed. The question-engine should be active throughout the story, not only in the zones that bookend this run.`,
        });
      }
    }
  }

  // CURIOSITY_AFTERMATH_FLAT (minor, n≥8, ≥2 high-suspense scenes): No scene with a high
  // suspenseDelta (> 1) is followed by a curiosity rise (curiosityDelta > 0) in the next two
  // scenes — tension peaks never open new questions downstream. When suspense rises the audience
  // is primed for new information: they are alert, vigilant, and expecting revelation or complication.
  // A scene that raises suspense creates the ideal conditions for seeding a new question in the
  // aftermath — the audience is maximally receptive. When every tension peak is followed by two
  // scenes of curiosity-flatness, the story wastes the alertness that suspense generates: each
  // peak delivers pressure but no new unknowns, so the pressure dissipates without leaving the
  // audience with anything new to hold. Sequence/aftermath mode × curiosity channel, triggered by
  // suspense peak. Distinct from SUSPENSE_CURIOSITY_DECOUPLED (Wave 439, same wave: checks same-scene
  // co-occurrence — whether high-suspense and high-curiosity coincide IN the same beat; this checks
  // what happens IN THE AFTERMATH of the suspense beat, i.e., the next 2 scenes), PROACTIVE_AFTERMATH_
  // CURIOSITY_ABSENT (intention.ts Wave 423: the trigger is proactive acts, not suspense peaks —
  // a different causal input to the same aftermath window), and POST_RELEASE_DEAD_AIR (Wave 302:
  // the aftermath of the story's tension RELEASE, which is a single-peak anchor; this fires on
  // ALL high-suspense scenes' aftermath systematically).
  if (records.length >= 8) {
    const highSuspRecs439c = (records as any[]).filter(r => (r.suspenseDelta ?? 0) > 1);
    if (highSuspRecs439c.length >= 2) {
      const anyAftermathCurio439c = highSuspRecs439c.some((r: any) => {
        const idx = (records as any[]).indexOf(r);
        const window = (records as any[]).slice(idx + 1, idx + 3);
        return window.some((a: any) => (a.curiosityDelta ?? 0) > 0);
      });
      if (!anyAftermathCurio439c) {
        issues.push({
          location: 'All high-suspense scenes — curiosity aftermath absent',
          rule: 'CURIOSITY_AFTERMATH_FLAT',
          severity: 'minor',
          description: `None of the story's ${highSuspRecs439c.length} high-suspense scenes (suspenseDelta > 1) is followed by a curiosity rise (curiosityDelta > 0) in the next two scenes — tension peaks never open new questions downstream. When suspense rises the audience is maximally alert and receptive to new information; the scenes immediately after a tension peak are the ideal moment to plant a new question or deepen an existing one. When every suspense peak is followed by two curiosity-flat scenes, the alertness that tension generates is wasted — pressure dissipates without leaving the audience with anything new to wonder about.`,
          suggestedFix: 'After at least one high-suspense scene, use the next scene to raise a new question: surface a new ambiguity as the tension clears, let the aftermath of the peak introduce a fragment of information the audience didn\'t have before, or complicate the situation in a way that generates forward uncertainty. The moment after maximum tension is the most fertile ground for a new question — the audience\'s attention is fully engaged and they are primed to wonder what comes next.',
        });
      }
    }
  }

  // ── Wave 453: EMOTIONAL_FLATLINE_RUN, SUSPENSE_EMOTIONAL_AFTERMATH_FLAT, SUSPENSE_EMOTION_DECOUPLED ──

  // EMOTIONAL_FLATLINE_RUN — Run-based × emotional channel (n≥10, ≥3 emotional scenes, maxNeutralRun≥5).
  // A run of 5+ consecutive neutral-emotionalShift scenes while at least 3 emotional scenes exist elsewhere
  // means the feeling register goes dark for a sustained stretch. Pacing requires that emotion and tension
  // interleave; a long neutral run signals a structural blindspot — a zone of the script where the
  // audience's emotional engagement has been allowed to go cold.
  // Distinct from CURIOSITY_FLATLINE_RUN (Wave 439, same file: tracks curiosityDelta flatness, a different
  // channel — this tracks emotionalShift, which captures mood-register shifts independent of question-
  // raising), EMOTIONAL_MONOTONE (originality.ts: single aggregate valence distribution across the whole
  // script — this targets a localized consecutive-run within the script, not a global proportion), and
  // SUSPENSE_FLATLINE_RUN (pacing.ts prior: checks suspenseDelta flatness — same run-based mode, different
  // channel — while this checks emotionalShift neutrality specifically).
  if (records.length >= 10) {
    const emotionalSceneCount453a = (records as any[]).filter(r => (r as any).emotionalShift !== 'neutral').length;
    if (emotionalSceneCount453a >= 3) {
      let maxNeutralRun453a = 0, curNeutralRun453a = 0;
      let maxNeutralStart453a = -1, curNeutralStart453a = -1;
      for (let i = 0; i < records.length; i++) {
        if ((records as any[])[i].emotionalShift === 'neutral') {
          if (curNeutralRun453a === 0) curNeutralStart453a = i;
          if (++curNeutralRun453a > maxNeutralRun453a) {
            maxNeutralRun453a = curNeutralRun453a;
            maxNeutralStart453a = curNeutralStart453a;
          }
        } else { curNeutralRun453a = 0; }
      }
      if (maxNeutralRun453a >= 5) {
        issues.push({
          location: `Scenes ${maxNeutralStart453a + 1}–${maxNeutralStart453a + maxNeutralRun453a}: emotional flatline run`,
          rule: 'EMOTIONAL_FLATLINE_RUN',
          severity: 'minor',
          description: `A run of ${maxNeutralRun453a} consecutive emotionally neutral scenes occurs while ${emotionalSceneCount453a} emotional scenes exist elsewhere — the feeling register goes dark for a sustained stretch. Pacing requires that emotional texture and dramatic tension interleave; when a long corridor of neutral scenes interrupts a story that otherwise has emotional range, the audience's engagement is allowed to go cold in a concentrated zone. The contrast with surrounding scenes makes this blindspot structurally visible.`,
          suggestedFix: `Give at least two or three scenes within the neutral corridor a distinct emotional texture — positive (relief, warmth, joy), negative (dread, guilt, grief), or a mixed valence. The emotional register does not need to be intense; even a small shift (wry recognition, quiet unease) prevents the feeling from going genuinely flat. Consider whether scenes in this zone serve purely functional or expository purposes that could be folded into emotionally active moments elsewhere.`,
        });
      }
    }
  }

  // SUSPENSE_EMOTIONAL_AFTERMATH_FLAT — Sequence/aftermath × emotional × suspense-peak trigger (n≥8, ≥2
  // high-suspense scenes, no emotional aftermath). When danger peaks but no emotional scene follows in
  // the next two scenes, suspense generates physical alertness without human aftershock — the audience
  // experiences a threat but is never shown how it registers in the characters' inner lives.
  // Distinct from CURIOSITY_AFTERMATH_FLAT (Wave 439, same wave: tracks curiosityDelta aftermath of
  // suspense peaks — the intellectual question channel; this tracks emotionalShift in the aftermath, the
  // feeling-register channel), SUSPENSE_EMOTION_DECOUPLED (Wave 453, below: checks same-scene co-occurrence
  // of suspense and emotion — whether high-suspense beats also carry emotional texture within the same scene;
  // this checks the NEXT scenes after the peak, not the peak itself), and PROACTIVE_AFTERMATH_CURIOSITY_
  // ABSENT (intention.ts Wave 423: different trigger — proactive acts, not suspense peaks).
  if (records.length >= 8) {
    const highSuspRecs453b = (records as any[]).filter(r => (r.suspenseDelta ?? 0) > 1);
    if (highSuspRecs453b.length >= 2) {
      const anyAftermathEmotion453b = highSuspRecs453b.some((r: any) => {
        const idx = (records as any[]).indexOf(r);
        const window = (records as any[]).slice(idx + 1, idx + 3);
        return window.some((a: any) => (a as any).emotionalShift !== 'neutral');
      });
      if (!anyAftermathEmotion453b) {
        issues.push({
          location: 'All high-suspense scenes — emotional aftermath absent',
          rule: 'SUSPENSE_EMOTIONAL_AFTERMATH_FLAT',
          severity: 'minor',
          description: `None of the story's ${highSuspRecs453b.length} high-suspense scenes (suspenseDelta > 1) is followed by an emotionally charged scene (emotionalShift ≠ 'neutral') within the next two scenes — danger peaks but the human aftershock is missing. Suspense creates physical alertness; the scenes immediately after a peak are the ideal moment to show how the threat registers in a character's inner life: fear, resolve, numbness, grief. When every suspense peak is followed by emotionally neutral scenes, danger becomes an abstract external event disconnected from the characters experiencing it.`,
          suggestedFix: `After at least one high-suspense scene, give the next scene a distinct emotional texture — the character can react with fear, determination, despair, or dark relief. Even a brief emotionally-charged moment in the scene following a threat peak grounds the audience in the human stakes. The aftermath of maximum danger is when the audience most wants to see what the threat costs the people involved.`,
        });
      }
    }
  }

  // SUSPENSE_EMOTION_DECOUPLED — Co-occurrence × suspense × emotional channel (n≥10, ≥3 high-suspense,
  // ≥3 emotional scenes, zero overlap). When suspense and emotional texture always appear in separate scenes,
  // danger and feeling are systematically structurally isolated — the story's tension and its humanity
  // occupy different territories of the script and never reinforce each other within a single beat.
  // Distinct from SUSPENSE_CURIOSITY_DECOUPLED (Wave 439, same file: co-occurrence of suspense × curiosity
  // channels — intellectual question-raising separated from danger; this checks emotional texture, the
  // feeling-register channel), SUSPENSE_EMOTIONAL_AFTERMATH_FLAT (Wave 453, above: sequence/aftermath mode
  // checking the NEXT scenes after a peak; this checks same-scene overlap, i.e., whether the high-suspense
  // scene itself also carries emotional weight), and EMOTIONAL_FLATLINE_RUN (Wave 453, above: run-based mode,
  // a consecutive-window test — this is a global decoupling pattern across all qualifying scenes).
  if (records.length >= 10) {
    const highSuspRecs453c = (records as any[]).filter(r => (r.suspenseDelta ?? 0) > 1);
    const emotionRecs453c = (records as any[]).filter(r => (r as any).emotionalShift !== 'neutral');
    if (highSuspRecs453c.length >= 3 && emotionRecs453c.length >= 3) {
      const anyOverlap453c = highSuspRecs453c.some(r => (r as any).emotionalShift !== 'neutral');
      if (!anyOverlap453c) {
        issues.push({
          location: 'All high-suspense scenes — emotional texture absent (decoupled)',
          rule: 'SUSPENSE_EMOTION_DECOUPLED',
          severity: 'minor',
          description: `All ${highSuspRecs453c.length} high-suspense scenes (suspenseDelta > 1) are emotionally neutral while ${emotionRecs453c.length} emotional scenes exist elsewhere — danger and feeling are systematically in separate scenes and never reinforce each other within a single beat. When suspense and emotional texture always occupy different structural territories, the audience experiences danger as an external event and feeling as an internal event that the story keeps at arm's length from its most intense moments. The most powerful scenes combine threat with felt stakes: a character in danger who also reveals something about who they are or what they want.`,
          suggestedFix: `Give at least one high-suspense scene an emotional undercurrent — a character's fear, desperation, grief, or dark resolve surfacing within the danger itself. The suspense does not need to be reduced; emotion can layer on top of it. A character who is terrified, angry, or devastated in the middle of a threat sequence is more gripping than one who faces the threat with neutral affect. Even a single scene where danger and feeling converge breaks the structural decoupling.`,
        });
      }
    }
  }

  // ── Wave 467: REVELATION_SUSPENSE_AFTERMATH_FLAT, CLOCK_PRESSURE_RUN, EMOTIONAL_CURIOSITY_DECOUPLED ──

  // REVELATION_SUSPENSE_AFTERMATH_FLAT (minor, n≥8, ≥2 revelation scenes): No revelation scene
  // is followed by a suspense rise (suspenseDelta > 0) in the next two scenes — disclosed truths
  // never escalate the danger downstream. A revelation should make the situation more urgent or
  // more dangerous: the audience now knows something that changes the stakes, and the scenes that
  // follow should reflect that escalation. When every disclosure is followed by two scenes of flat
  // or falling suspense, revelations land as information delivered rather than story turned.
  // Sequence/aftermath mode × suspense channel × revelation trigger. Distinct from SUSPENSE_
  // EMOTIONAL_AFTERMATH_FLAT (Wave 453: emotional aftermath of SUSPENSE peaks — different trigger
  // and channel), CURIOSITY_AFTERMATH_FLAT (Wave 439: curiosity aftermath of SUSPENSE peaks —
  // different trigger), and PROACTIVE_REVELATION_ABSENT (intention.ts Wave 339: revelation not
  // following proactive acts — different file and backward-cause direction). This is the first
  // aftermath check triggered by revelation scenes, auditing the suspense channel.
  if (records.length >= 8) {
    const revRecs467a = (records as any[]).filter(r =>
      r.revelation !== null && r.revelation !== undefined && r.revelation !== '',
    );
    if (revRecs467a.length >= 2) {
      const anySuspAftermath467a = revRecs467a.some((r: any) => {
        const idx = (records as any[]).indexOf(r);
        const window467a = (records as any[]).slice(idx + 1, idx + 3);
        return window467a.some((a: any) => (a.suspenseDelta ?? 0) > 0);
      });
      if (!anySuspAftermath467a) {
        issues.push({
          location: 'All revelation scenes — suspense aftermath absent',
          rule: 'REVELATION_SUSPENSE_AFTERMATH_FLAT',
          severity: 'minor',
          description: `None of the story's ${revRecs467a.length} revelation scenes is followed by a suspense rise (suspenseDelta > 0) in the next two scenes — disclosed truths never escalate the danger. A revelation should make the situation more urgent: the audience now knows something that changes the stakes, and what they know should tighten the screw in the scenes that follow. When every disclosure is followed by two scenes of flat or falling suspense, information is delivered without consequence — the truth is told but not felt as escalation.`,
          suggestedFix: 'After at least one revelation, let the next scene escalate tension: the disclosed truth has implications that make the situation more dangerous, the character now knows something that changes what they must do and how quickly, or the revelation exposes a threat the audience had not yet seen. A disclosure that leaves the story at the same temperature registers as information given, not as story turned.',
        });
      }
    }
  }

  // CLOCK_PRESSURE_RUN (minor, n≥10, ≥2 non-clock scenes, maxClockRun≥4): Four or more
  // consecutive scenes each under explicit clock pressure (clockRaised = true or clockDelta > 0).
  // Continuous deadline pressure across four or more consecutive scenes collapses urgency into
  // ambient noise: when every scene is under the same ticking clock, the deadline no longer
  // creates pacing contrast — it becomes the story's standing condition rather than a
  // rhythmically escalated threat. Effective urgency requires structural contrast; non-clock
  // scenes make the scenes with pressure land harder. Run-based mode × clock channel. Distinct
  // from CLOCK_SCENE_PACING_MISMATCH (Wave 316: clock scenes average above 1.5× overall length
  // — a page-weight issue, not a consecutive-run pattern), CLOCK_SCENE_UNDERWEIGHT (Wave 369:
  // clock scenes average below 60% — complementary page-weight), and all suspense/curiosity/
  // emotional flatline runs (different channels): this is the first run-based check for the
  // clock channel, detecting bloat through sustained consecutive urgency rather than proportion.
  if (records.length >= 10) {
    const nonClockCount467b = (records as any[]).filter(r =>
      r.clockRaised !== true && ((r as any).clockDelta ?? 0) <= 0,
    ).length;
    if (nonClockCount467b >= 2) {
      let maxClockRun467b = 0;
      let curClockRun467b = 0;
      let maxClockStart467b = -1;
      let curClockStart467b = -1;
      for (let i = 0; i < records.length; i++) {
        const isClocked467b = (records as any[])[i].clockRaised === true || ((records as any[])[i].clockDelta ?? 0) > 0;
        if (isClocked467b) {
          if (curClockRun467b === 0) curClockStart467b = i;
          if (++curClockRun467b > maxClockRun467b) {
            maxClockRun467b = curClockRun467b;
            maxClockStart467b = curClockStart467b;
          }
        } else {
          curClockRun467b = 0;
        }
      }
      if (maxClockRun467b >= 4) {
        issues.push({
          location: `Scenes ${maxClockStart467b}–${maxClockStart467b + maxClockRun467b - 1} — unbroken clock-pressure run`,
          rule: 'CLOCK_PRESSURE_RUN',
          severity: 'minor',
          description: `${maxClockRun467b} consecutive scenes (${maxClockStart467b}–${maxClockStart467b + maxClockRun467b - 1}) all carry explicit clock pressure (clockRaised or clockDelta > 0). When four or more scenes in a row are all under the same deadline, urgency collapses into ambient noise: the clock stops feeling like a ticking threat and becomes the story's permanent background condition. Effective deadline pacing relies on contrast — non-clock scenes give the audience a structural moment to breathe, making the return of pressure register as re-escalation rather than continuation of the same standing urgency.`,
          suggestedFix: `Break the clock run at Scenes ${maxClockStart467b}–${maxClockStart467b + maxClockRun467b - 1}: introduce at least one scene without clock pressure in the middle of the run. Even a brief scene of planning, connection, or reaction without an explicit deadline makes the next clock scene land as renewed threat. Sustained unrelenting urgency is a form of pacing monotony; the pressure must breathe to have impact.`,
        });
      }
    }
  }

  // EMOTIONAL_CURIOSITY_DECOUPLED (minor, n≥10, ≥3 emotional and ≥3 curiosity-positive scenes,
  // zero overlap): No scene is both emotionally charged (emotionalShift ≠ 'neutral') AND raises
  // curiosity (curiosityDelta > 0) — feeling and wondering never occur together in the same beat.
  // When the emotional register and the question-raising engine are systematically in separate
  // scenes, the audience can feel or wonder but never simultaneously. The most immersive
  // storytelling binds feeling to question: a character's devastation is more gripping when the
  // audience simultaneously does not know what comes next; a mystery is more compelling when a
  // character's emotional stakes are also on the line in the moment of discovery. Co-occurrence/
  // decoupling mode × emotional channel × curiosity channel. Distinct from SUSPENSE_CURIOSITY_
  // DECOUPLED (Wave 439: suspense × curiosity — not emotional), SUSPENSE_EMOTION_DECOUPLED (Wave
  // 453: suspense × emotional — not curiosity), and EMOTIONAL_FLATLINE_RUN (Wave 453: run-based
  // mode on emotional channel — consecutive window, not global co-occurrence pattern): this
  // completes the three-way co-occurrence decoupling family (suspense×curiosity, suspense×
  // emotion, emotion×curiosity).
  if (records.length >= 10) {
    const emotionRecs467c = (records as any[]).filter(r => (r as any).emotionalShift !== 'neutral');
    const curioRecs467c = (records as any[]).filter(r => (r.curiosityDelta ?? 0) > 0);
    if (emotionRecs467c.length >= 3 && curioRecs467c.length >= 3) {
      const anyOverlap467c = (records as any[]).some(r =>
        (r as any).emotionalShift !== 'neutral' && (r.curiosityDelta ?? 0) > 0,
      );
      if (!anyOverlap467c) {
        issues.push({
          location: 'Emotional and curiosity-positive scenes — never coincide',
          rule: 'EMOTIONAL_CURIOSITY_DECOUPLED',
          severity: 'minor',
          description: `All ${emotionRecs467c.length} emotionally charged scenes (emotionalShift ≠ 'neutral') have flat or negative curiosityDelta, and all ${curioRecs467c.length} curiosity-raising scenes (curiosityDelta > 0) are emotionally neutral — feeling and wondering never occur together in the same beat. When emotional activation and question-raising are systematically in separate scenes, the story keeps its two most important audience-engagement systems apart: the audience can feel or wonder, but never simultaneously. The most compelling scenes combine both — a character's grief or triumph is more immersive when the audience simultaneously doesn't know what comes next.`,
          suggestedFix: "Let at least one emotionally active scene also raise a question: a revelation that strikes with grief, a moment of triumph shadowed by a new unknown, a relationship rupture that opens a mystery. The co-presence of feeling and wondering is one of narrative's most powerful combinations — the audience is simultaneously attached (through emotion) and pulled forward (through curiosity). A scene that achieves both is harder to leave than one that achieves only one.",
        });
      }
    }
  }

  // ── Wave 481: CLOCK_AFTERMATH_SUSPENSE_FLAT, SUSPENSE_PEAK_UNCAUSED, EMOTIONAL_PEAK_UNCAUSED ──
  const n481 = records.length;

  // CLOCK_AFTERMATH_SUSPENSE_FLAT (sequence/aftermath × suspense × clock trigger, n≥8,
  // ≥3 qualifying clock scenes): Three or more clock-raising scenes exist, yet not one of them
  // is followed by a suspense rise (suspenseDelta > 0) in either of the next two scenes —
  // deadlines never translate into felt tension downstream. A clock event should accelerate
  // the story's danger signal: the moment a deadline appears or tightens, the audience should
  // experience the threat in the following scenes as elevated stakes. When clock pressure
  // consistently fails to raise suspense in its wake, the deadline operates as exposition rather
  // than escalation — the audience is informed about time but never feels it as mounting danger.
  // Sequence/aftermath mode × suspense channel × clock trigger. Distinct from CLOCK_PRESSURE_RUN
  // (Wave 467: run-based × clock, consecutive presence not aftermath), CURIOSITY_AFTERMATH_FLAT
  // (Wave 439: high-suspense trigger, not clock), REVELATION_SUSPENSE_AFTERMATH_FLAT (Wave 467:
  // revelation trigger), SUSPENSE_EMOTIONAL_AFTERMATH_FLAT (Wave 453: suspense peak trigger):
  // this is the fifth distinct trigger in the aftermath × suspense family, using the clock channel.
  if (n481 >= 8) {
    const clockRecs481a = (records as any[]).filter((r, pos) =>
      (r.clockRaised === true || (r.clockDelta ?? 0) > 0) && pos < n481 - 1,
    );
    if (clockRecs481a.length >= 3) {
      const allClockNoSuspenseAftermath481a = clockRecs481a.every((r: any) => {
        const pos481a = (records as any[]).indexOf(r);
        const next1481a = pos481a + 1 < n481 ? (records as any[])[pos481a + 1] : null;
        const next2481a = pos481a + 2 < n481 ? (records as any[])[pos481a + 2] : null;
        const susp1481a = next1481a ? (next1481a.suspenseDelta ?? 0) : 0;
        const susp2481a = next2481a ? (next2481a.suspenseDelta ?? 0) : 0;
        return susp1481a <= 0 && susp2481a <= 0;
      });
      if (allClockNoSuspenseAftermath481a) {
        issues.push({
          location: `${clockRecs481a.length} clock scene(s) — suspense aftermath absent`,
          rule: 'CLOCK_AFTERMATH_SUSPENSE_FLAT',
          severity: 'minor',
          description: `None of the story's ${clockRecs481a.length} clock-raising scenes is followed by a suspense rise (suspenseDelta > 0) in either of the next two scenes — every deadline lands without translating into felt danger downstream. A clock event should accelerate the story's tension signal: when a deadline appears or tightens, the scenes that follow should register the threat as elevated stakes — character behavior shifts, options narrow, decisions become costlier. When clock pressure consistently fails to raise suspense in its wake, the deadline mechanism operates as exposition: the audience is told about time, but never made to feel it as mounting danger.`,
          suggestedFix: 'Let at least one clock event directly trigger a suspense escalation in the scene or two that follow: the deadline is introduced in scene 12, and scenes 13–14 show options closing off, resources disappearing, or a confrontation becoming inevitable. The suspense in the aftermath is the structural proof that the clock is real — without it, the deadline is information, not pressure.',
        });
      }
    }
  }

  // SUSPENSE_PEAK_UNCAUSED (backward-cause × suspense peak, n≥8, peak at pos≥2): The story's
  // single highest-suspense scene has no clock event, dramatic turn, or revelation in itself or
  // in either of the two preceding scenes — the narrative's peak tension emerges from a dramatic
  // vacuum. A suspense peak should be the culmination of converging causes: a deadline tightening,
  // a truth exposed, or a pivotal turn that forces a new and more dangerous situation. When the
  // highest-tension moment in the script has no upstream cause in the surrounding scenes, the peak
  // reads as arbitrary — it spikes not because the story has driven there but because the writer
  // decided it should. The audience's tension is most fully earned when they can feel the
  // approaching peak as inevitable, not feel it as sudden. Backward-cause mode × suspense peak ×
  // cause-signal set {clock, turn, revelation}. First backward-cause check in pacing.ts. Distinct
  // from ENDING_ON_PEAK (Wave 302: whether the peak is the final scene — position, not cause),
  // SUSPENSE_PEAK_SCENE_UNDERWEIGHT (Wave 355: the peak scene's length — page weight, not cause),
  // all run/aftermath/co-occurrence checks (which target patterns not singular-peak backward cause).
  if (n481 >= 8) {
    let peakSuspensePos481b = -1;
    let peakSuspenseVal481b = -Infinity;
    for (let i481b = 0; i481b < n481; i481b++) {
      const sd481b = (records as any[])[i481b].suspenseDelta ?? 0;
      if (sd481b > peakSuspenseVal481b) {
        peakSuspenseVal481b = sd481b;
        peakSuspensePos481b = i481b;
      }
    }
    if (peakSuspenseVal481b > 0 && peakSuspensePos481b >= 2) {
      const hasCause481b = [-2, -1, 0].some(offset => {
        const r481b = (records as any[])[peakSuspensePos481b + offset];
        return (
          r481b.clockRaised === true ||
          (r481b.clockDelta ?? 0) > 0 ||
          (r481b.dramaticTurn ?? 'nothing') !== 'nothing' ||
          (r481b.revelation !== null && r481b.revelation !== undefined && r481b.revelation !== '')
        );
      });
      if (!hasCause481b) {
        issues.push({
          location: `Scene ${peakSuspensePos481b} — highest-suspense scene (suspenseDelta: ${peakSuspenseVal481b})`,
          rule: 'SUSPENSE_PEAK_UNCAUSED',
          severity: 'minor',
          description: `The story's highest-suspense scene (Scene ${peakSuspensePos481b}, suspenseDelta: ${peakSuspenseVal481b}) has no clock event, dramatic turn, or revelation in itself or in either of the two preceding scenes — the narrative's peak tension emerges from a dramatic vacuum. A suspense peak should be the culmination of converging causes: a deadline tightening, a truth exposed, a pivot that forecloses escape. When the tensest moment in the script has no upstream cause signal in the surrounding scenes, the peak reads as arbitrary — it spikes not because the story has driven there, but because the writer chose to raise the temperature.`,
          suggestedFix: `Add at least one of a clock event, dramatic turn, or revelation to Scene ${peakSuspensePos481b} or the two scenes before it. The peak tension should feel like the inevitable convergence of established pressures: the deadline the audience has been dreading, the truth that forces a confrontation, the pivot that removes the last exit. When the peak arrives with visible cause, the audience feels it as earned; without cause, it lands as manufactured.`,
        });
      }
    }
  }

  // EMOTIONAL_PEAK_UNCAUSED (backward-cause × emotional peak, n≥8, peak at pos≥2): The single
  // non-neutral scene with the highest suspense weight has no clock event, dramatic turn, or
  // revelation in itself or in either of the two preceding scenes — the emotional climax of the
  // story arrives without narrative motivation. An emotional peak should be the product of
  // accumulated pressure: a relationship forced to its breaking point by a revelation, a turn
  // that forces a character to feel the full weight of what they have done, a deadline that makes
  // the emotional stakes fully visible. When the most emotionally charged scene has no upstream
  // dramatic cause, the emotion reads as weather rather than consequence — the character feels
  // because the story needs them to, not because events have driven them there. Backward-cause
  // mode × emotional peak (emotionalShift ≠ neutral, highest suspenseDelta as tiebreak) × cause
  // set {clock, turn, revelation}. Second backward-cause check in pacing.ts. Distinct from
  // SUSPENSE_PEAK_UNCAUSED (Wave 481b: pure suspense peak — this targets the emotional peak,
  // which may not be the same scene), SUSPENSE_EMOTION_DECOUPLED (Wave 453: co-occurrence
  // pattern, not single-scene backward cause), EMOTIONAL_FLATLINE_RUN (Wave 453: run-based mode).
  if (n481 >= 8) {
    let emotPeakPos481c = -1;
    let emotPeakSusp481c = -Infinity;
    for (let i481c = 0; i481c < n481; i481c++) {
      const r481c = (records as any[])[i481c];
      if (r481c.emotionalShift !== 'neutral') {
        const sd481c = r481c.suspenseDelta ?? 0;
        if (sd481c > emotPeakSusp481c) {
          emotPeakSusp481c = sd481c;
          emotPeakPos481c = i481c;
        }
      }
    }
    if (emotPeakPos481c >= 2 && emotPeakSusp481c > 0) {
      const hasCause481c = [-2, -1, 0].some(offset => {
        const r481c = (records as any[])[emotPeakPos481c + offset];
        return (
          r481c.clockRaised === true ||
          (r481c.clockDelta ?? 0) > 0 ||
          (r481c.dramaticTurn ?? 'nothing') !== 'nothing' ||
          (r481c.revelation !== null && r481c.revelation !== undefined && r481c.revelation !== '')
        );
      });
      if (!hasCause481c) {
        issues.push({
          location: `Scene ${emotPeakPos481c} — highest-suspense emotional scene (emotionalShift: ${(records as any[])[emotPeakPos481c].emotionalShift}, suspenseDelta: ${emotPeakSusp481c})`,
          rule: 'EMOTIONAL_PEAK_UNCAUSED',
          severity: 'minor',
          description: `The story's most dramatically charged emotional scene (Scene ${emotPeakPos481c}, the non-neutral scene with the highest suspenseDelta) has no clock event, dramatic turn, or revelation in itself or in either of the two preceding scenes — the emotional climax arrives without narrative motivation. An emotional peak should be the consequence of accumulated pressure: a revelation that forces a character to confront what they have avoided, a turn that makes the full emotional cost visible, a deadline that strips the last protection. Without an upstream cause, the emotion reads as weather — a feeling that exists because the story needs it rather than because events have driven the character there.`,
          suggestedFix: `Provide Scene ${emotPeakPos481c}'s emotional peak with a dramatic cause in itself or the prior two scenes: a revelation that reframes everything, a dramatic turn that closes the character's last exit, or a clock event that makes waiting any longer impossible. The cause doesn't need to be the only reason for the emotion — but one visible dramatic trigger in the surrounding scenes transforms the peak from mood into consequence, and consequence is always more moving than mood.`,
        });
      }
    }
  }

  // ── Wave 495: CLOCK_AFTERMATH_CURIOSITY_FLAT, REVELATION_EMOTIONAL_AFTERMATH_FLAT, CURIOSITY_PEAK_UNCAUSED ──
  const n495 = records.length;

  // CLOCK_AFTERMATH_CURIOSITY_FLAT (sequence/aftermath × curiosity × clock trigger, n≥8,
  // ≥3 qualifying clock scenes not in last 2 positions): Every clock-raising scene is followed
  // by 2 scenes with curiosityDelta ≤ 0 — deadlines never open new questions downstream.
  // A clock event should do more than compress time: it should also raise the audience's
  // wondering, generating the question "can the protagonist beat this deadline and how?" When
  // clock pressure consistently fails to produce curiosity in its wake, the deadline operates
  // as a structural label rather than a mystery engine — the audience is told time is short but
  // not compelled to ask what will happen next. Sequence/aftermath mode × curiosity channel ×
  // clock trigger. Distinct from CLOCK_AFTERMATH_SUSPENSE_FLAT (Wave 481: suspense channel —
  // this checks whether deadlines open questions, not whether they escalate danger), CURIOSITY_
  // AFTERMATH_FLAT (Wave 439: trigger is a high-suspense scene, not a clock event), CLOCK_PRESSURE_
  // RUN (Wave 467: consecutive presence, not aftermath): this is the second cross-channel aftermath
  // check for the clock trigger, adding curiosity to the suspense channel already covered.
  if (n495 >= 8) {
    const qualClockRecs495a = (records as any[]).filter((r, pos) =>
      (r.clockRaised === true || (r.clockDelta ?? 0) > 0) && pos < n495 - 2,
    );
    if (qualClockRecs495a.length >= 3) {
      const allClockNoCuriosityAftermath495a = qualClockRecs495a.every((r: any) => {
        const pos495a = (records as any[]).indexOf(r);
        for (let off = 1; off <= 2; off++) {
          const nxt = (records as any[])[pos495a + off];
          if (nxt && (nxt.curiosityDelta ?? 0) > 0) return false;
        }
        return true;
      });
      if (allClockNoCuriosityAftermath495a) {
        issues.push({
          location: `${qualClockRecs495a.length} clock scene(s) — curiosity aftermath absent`,
          rule: 'CLOCK_AFTERMATH_CURIOSITY_FLAT',
          severity: 'minor',
          description: `None of the story's ${qualClockRecs495a.length} clock-raising scenes is followed by a curiosity rise (curiosityDelta > 0) in either of the next two scenes — every deadline lands without opening a new question downstream. A clock event should do more than compress time: it should also generate wondering in its wake — "can the protagonist beat this, and how?" When deadlines consistently fail to raise curiosity downstream, the ticking-clock mechanism operates as a structural label rather than a mystery engine: the audience is told time is short but not prompted to ask what happens next, robbing the deadline of its forward-pull.`,
          suggestedFix: `Let at least one clock event trigger a curiosity rise in the following scene or two: the deadline introduced in scene 10 should have scenes 11–12 raising the question of how — new complications that the audience doesn't know how to resolve yet. The curiosity in the clock's aftermath is what converts a deadline from information into suspense; without it, the audience notes the timer but doesn't lean forward.`,
        });
      }
    }
  }

  // REVELATION_EMOTIONAL_AFTERMATH_FLAT (sequence/aftermath × emotional × revelation trigger,
  // n≥8, ≥3 qualifying revelation scenes not in last 2 positions): Every revelation scene is
  // followed by 2 scenes with neutral emotionalShift — disclosures never register in any
  // character's feelings. A revelation should cause an emotional aftershock: the character
  // absorbs a new truth and it changes how they feel, even briefly. When every disclosure is
  // followed by emotional silence, the audience watches truths surface without any human
  // reaction — the story's revelations are informational updates rather than gut-level
  // shocks. Sequence/aftermath mode × emotional channel × revelation trigger. Distinct from
  // REVELATION_SUSPENSE_AFTERMATH_FLAT (Wave 467: suspense channel — this checks emotional
  // feeling, not danger level), SUSPENSE_EMOTIONAL_AFTERMATH_FLAT (Wave 453: trigger is suspense,
  // not revelation): this completes the revelation-trigger aftermath family alongside the
  // suspense-channel check, adding the emotional channel.
  if (n495 >= 8) {
    const qualRevRecs495b = (records as any[]).filter((r, pos) =>
      r.revelation !== null && r.revelation !== undefined && r.revelation !== '' &&
      pos < n495 - 2,
    );
    if (qualRevRecs495b.length >= 3) {
      const allRevNoEmotionalAftermath495b = qualRevRecs495b.every((r: any) => {
        const pos495b = (records as any[]).indexOf(r);
        for (let off = 1; off <= 2; off++) {
          const nxt = (records as any[])[pos495b + off];
          if (nxt && (nxt.emotionalShift ?? 'neutral') !== 'neutral') return false;
        }
        return true;
      });
      if (allRevNoEmotionalAftermath495b) {
        issues.push({
          location: `${qualRevRecs495b.length} revelation scene(s) — emotional aftermath absent`,
          rule: 'REVELATION_EMOTIONAL_AFTERMATH_FLAT',
          severity: 'minor',
          description: `None of the story's ${qualRevRecs495b.length} revelation scenes is followed by an emotional shift (positive or negative) in either of the next two scenes — every disclosure is absorbed without any character's feelings visibly changing. A revelation should cause an emotional aftershock: a truth that shifts the picture changes how the characters feel about themselves, each other, and the world they are navigating. When every disclosure is met with emotional silence in the scenes that follow, the audience watches information surface but never witnesses the human weight of knowing — the revelations become plot events rather than experiences that cost or elate the people they concern.`,
          suggestedFix: `Let at least one revelation trigger an emotional shift in the scene or two that follow: a character receiving a truth that makes them grieve, rage, recoil, or feel the lifting of a weight they have been carrying. The emotional aftermath of a revelation is what converts information into consequence — the revelation says "this is true," and the emotional scene that follows says "and here is what it costs or frees."`,
        });
      }
    }
  }

  // CURIOSITY_PEAK_UNCAUSED (backward-cause × curiosity peak, n≥8, peak at pos≥2): The story's
  // single highest-curiosity scene has no revelation, dramatic turn, or clock event in itself or
  // in either of the two preceding scenes — the greatest question-raise in the story emerges from
  // a dramatic vacuum. A curiosity peak should be caused by an informational or pivotal event:
  // a revelation that opens a deeper mystery, a dramatic turn that reframes everything the
  // audience thought they knew, or a deadline that raises the stakes of the unanswered question.
  // When the highest-curiosity moment has no upstream cause, the question-raise reads as
  // authorial manipulation — the audience is made to wonder not because events have opened a gap
  // but because the writer withheld something. Backward-cause mode × curiosity peak ×
  // cause-signal set {revelation, turn, clock}. Third backward-cause check in pacing.ts,
  // completing the peak-cause family: SUSPENSE_PEAK_UNCAUSED (Wave 481b: suspense channel)
  // and EMOTIONAL_PEAK_UNCAUSED (Wave 481c: emotional peak) — this adds the curiosity peak.
  if (n495 >= 8) {
    let peakCurPos495c = -1;
    let peakCurVal495c = -Infinity;
    for (let i495c = 0; i495c < n495; i495c++) {
      const cd495c = (records as any[])[i495c].curiosityDelta ?? 0;
      if (cd495c > peakCurVal495c) {
        peakCurVal495c = cd495c;
        peakCurPos495c = i495c;
      }
    }
    if (peakCurVal495c > 0 && peakCurPos495c >= 2) {
      const hasCause495c = [-2, -1, 0].some(offset => {
        const r495c = (records as any[])[peakCurPos495c + offset];
        return (
          r495c.clockRaised === true ||
          (r495c.clockDelta ?? 0) > 0 ||
          (r495c.dramaticTurn ?? 'nothing') !== 'nothing' ||
          (r495c.revelation !== null && r495c.revelation !== undefined && r495c.revelation !== '')
        );
      });
      if (!hasCause495c) {
        issues.push({
          location: `Scene ${peakCurPos495c} — highest-curiosity scene (curiosityDelta: ${peakCurVal495c})`,
          rule: 'CURIOSITY_PEAK_UNCAUSED',
          severity: 'minor',
          description: `The story's highest-curiosity scene (Scene ${peakCurPos495c}, curiosityDelta: ${peakCurVal495c}) has no revelation, dramatic turn, or clock event in itself or in either of the two preceding scenes — the greatest question-raise in the story emerges from a dramatic vacuum. A curiosity peak should be the consequence of an informational or pivotal event: a disclosure that opens a deeper mystery, a turn that reframes everything the audience thought they knew, or a deadline that raises the stakes of an unanswered question. When the highest-curiosity moment has no upstream cause, the question-raise reads as authorial withholding — the audience wonders not because events have opened a gap but because information was simply not provided.`,
          suggestedFix: `Add at least one of a revelation, dramatic turn, or clock event to Scene ${peakCurPos495c} or the two scenes before it. The peak curiosity should feel like a question that the story has actively opened — a disclosure that generates a deeper mystery, a pivot that recontextualises the unknown, a deadline that makes the unanswered question urgent. A question-raise caused by an event lands as earned mystery; one without cause lands as a gap the audience can't locate.`,
        });
      }
    }
  }

  // ── Wave 509: SUSPENSE_FLATLINE_RUN, PAYOFF_SUSPENSE_DECOUPLED, PAYOFF_AFTERMATH_CURIOSITY_FLAT ──
  const n509 = records.length;

  // SUSPENSE_FLATLINE_RUN (run-based × suspense channel, n≥8, ≥3 positive-suspense scenes elsewhere):
  // 5+ consecutive scenes all with suspenseDelta ≤ 0 while positive-suspense scenes exist. Completes
  // the flatline-run family: CURIOSITY_FLATLINE_RUN (Wave 439) covers the curiosity channel,
  // EMOTIONAL_FLATLINE_RUN (Wave 453) covers the emotional channel — this adds suspense. A sustained
  // stretch where tension never rises (5+ scenes) drains the audience's sense of stakes: every scene
  // that passes without pressure signals the danger has been indefinitely suspended, not temporarily
  // held. Distinct from CLOCK_PRESSURE_RUN (Wave 467: clock consecutive presence, not a flatline) and
  // NET_TENSION_DEFICIT (Wave 302: aggregate valence, not a run-based stretch).
  if (n509 >= 8) {
    const posSuspScenes509a = (records as any[]).filter(r => (r.suspenseDelta ?? 0) > 0);
    if (posSuspScenes509a.length >= 3) {
      let maxFlatRun509a = 0;
      let curFlatRun509a = 0;
      for (const r of records as any[]) {
        if ((r.suspenseDelta ?? 0) <= 0) {
          curFlatRun509a++;
          if (curFlatRun509a > maxFlatRun509a) maxFlatRun509a = curFlatRun509a;
        } else {
          curFlatRun509a = 0;
        }
      }
      if (maxFlatRun509a >= 5) {
        issues.push({
          location: `${maxFlatRun509a} consecutive scenes — suspense flatline`,
          rule: 'SUSPENSE_FLATLINE_RUN',
          severity: 'minor',
          description: `The script has a run of ${maxFlatRun509a} consecutive scenes without any suspense rise (suspenseDelta ≤ 0) while ${posSuspScenes509a.length} scenes elsewhere carry positive suspense — the tension engine goes dark for a sustained stretch. A flatline of five or more scenes drains the audience's sense that anything is at stake: each scene that passes without raising the pressure signals that the danger has been suspended indefinitely, not temporarily. The effect is not restful — it is disengaging, because the audience can feel the stakes have been parked rather than held in abeyance.`,
          suggestedFix: `Introduce at least one suspense-rising event within the flatline run — a complication, a threat, a revelation that reactivates what is at risk. The rise doesn't need to be large; a single scene with a positive suspenseDelta breaks the plateau and signals to the audience that the story's danger is still present, still building, even during a quieter stretch.`,
        });
      }
    }
  }

  // PAYOFF_SUSPENSE_DECOUPLED (co-occurrence/decoupling × payoff × suspense, n≥8, ≥3 payoff scenes
  // and ≥3 high-suspense scenes): Payoff scenes (payoffSetupIds.length > 0) and high-suspense scenes
  // (suspenseDelta > 1) never coincide — every callback lands in a low-tension scene and every
  // high-tension moment passes without a payoff. Callbacks gain their deepest force when they land
  // inside the tension they were built to resolve; high-tension moments gain semantic weight when a
  // setup collects inside them. Full separation keeps both channels thinner than they need to be.
  // Co-occurrence/decoupling mode × payoff × suspense. Distinct from SUSPENSE_CURIOSITY_DECOUPLED
  // (Wave 439: curiosity channel), SUSPENSE_EMOTION_DECOUPLED (Wave 453: emotional channel),
  // EMOTIONAL_CURIOSITY_DECOUPLED (Wave 467: emotional × curiosity) — first payoff-channel entry.
  if (n509 >= 8) {
    const payoffScenes509b = (records as any[]).filter(r => Array.isArray(r.payoffSetupIds) && r.payoffSetupIds.length > 0);
    const highSuspScenes509b = (records as any[]).filter(r => (r.suspenseDelta ?? 0) > 1);
    if (payoffScenes509b.length >= 3 && highSuspScenes509b.length >= 3) {
      const payoffIdxSet509b = new Set(payoffScenes509b.map((r: any) => (records as any[]).indexOf(r)));
      const highSuspIdxSet509b = new Set(highSuspScenes509b.map((r: any) => (records as any[]).indexOf(r)));
      const hasOverlap509b = [...payoffIdxSet509b].some(idx => highSuspIdxSet509b.has(idx));
      if (!hasOverlap509b) {
        issues.push({
          location: `${payoffScenes509b.length} payoff scene(s) and ${highSuspScenes509b.length} high-suspense scene(s) — no overlap`,
          rule: 'PAYOFF_SUSPENSE_DECOUPLED',
          severity: 'minor',
          description: `The script's ${payoffScenes509b.length} payoff scenes and ${highSuspScenes509b.length} high-suspense scenes (suspenseDelta > 1) never coincide — every callback lands in a low-tension scene and every high-tension moment passes without a payoff. When the two channels are fully decoupled, each loses its fullest force: a payoff in a calm scene reads like a footnote, and a suspense peak without a callback has no semantic anchor — the audience feels pressure without resonance. Payoffs gain their deepest effect when they land inside the tension they were built to resolve, converting two parallel threads into a unified dramatic beat.`,
          suggestedFix: `Arrange at least one payoff to fire within a high-suspense scene — a callback that resolves an earlier setup at the moment of greatest pressure. The payoff need not resolve the core tension; a small resolution landing inside a larger threat gives the high-suspense scene both forward momentum and backward meaning.`,
        });
      }
    }
  }

  // PAYOFF_AFTERMATH_CURIOSITY_FLAT (sequence/aftermath × curiosity × payoff trigger, n≥8, ≥3
  // qualifying payoff scenes not in last 2 positions): Every payoff scene is followed by 2 scenes
  // with curiosityDelta ≤ 0 — callbacks never open new questions downstream. A resolved setup should
  // reorient the audience's wondering: the answer to an old mystery reveals what they now need to
  // understand next. When every payoff is met by curiosity silence, the resolution machinery operates
  // strictly as exhaust — closing loops without generating forward pull.
  // Sequence/aftermath mode × curiosity × payoff trigger. Distinct from CURIOSITY_AFTERMATH_FLAT
  // (Wave 439: trigger is high-suspense scene), CLOCK_AFTERMATH_CURIOSITY_FLAT (Wave 495: trigger is
  // clock event) — first payoff-trigger entry in the curiosity-aftermath family.
  if (n509 >= 8) {
    const qualPayoffRecs509c = (records as any[]).filter((r, pos) =>
      Array.isArray(r.payoffSetupIds) && r.payoffSetupIds.length > 0 && pos < n509 - 2,
    );
    if (qualPayoffRecs509c.length >= 3) {
      const allPayoffNoCurAftermath509c = qualPayoffRecs509c.every((r: any) => {
        const pos509c = (records as any[]).indexOf(r);
        for (let off = 1; off <= 2; off++) {
          const nxt = (records as any[])[pos509c + off];
          if (nxt && (nxt.curiosityDelta ?? 0) > 0) return false;
        }
        return true;
      });
      if (allPayoffNoCurAftermath509c) {
        issues.push({
          location: `${qualPayoffRecs509c.length} payoff scene(s) — curiosity aftermath absent`,
          rule: 'PAYOFF_AFTERMATH_CURIOSITY_FLAT',
          severity: 'minor',
          description: `None of the story's ${qualPayoffRecs509c.length} payoff scenes is followed by a curiosity rise (curiosityDelta > 0) in either of the next two scenes — every callback closes a loop without opening a new question downstream. A resolved setup should do more than satisfy: the answer to an old mystery should reorient the audience's wondering, revealing what they need to understand next. When every payoff is followed by curiosity silence, the resolution machinery operates strictly as exhaust — closing loops without generating forward pull — and the story gradually loses the engine that keeps the audience leaning forward between acts.`,
          suggestedFix: `Let at least one payoff trigger a question in the scene or two that follows: the answered setup should reveal a new layer of the story's central mystery, or show the protagonist realising that the resolved question has exposed a more pressing one. A callback that generates a new question is a ratchet, converting the earned satisfaction of a closed loop into the forward pressure of a newly opened one.`,
        });
      }
    }
  }

  // ── Wave 523 checks ──────────────────────────────────────────────────────
  {
    // CLOCK_AFTERMATH_EMOTION_FLAT — sequence/aftermath × emotion × clock trigger.
    // n≥8, ≥3 clockRaised scenes (not in last 2 positions). Every clockRaised scene is
    // followed by 2 emotionally neutral scenes → fire. Deadlines never register in
    // the protagonist's felt state: a clock is raised and then the next two scenes play
    // out without any emotional response to the imposed urgency.
    // Distinct from: CLOCK_AFTERMATH_SUSPENSE_FLAT (Wave 481: clock→suspense aftermath),
    // CLOCK_AFTERMATH_CURIOSITY_FLAT (Wave 495: clock→curiosity aftermath — different channels).
    // REVELATION_EMOTIONAL_AFTERMATH_FLAT (Wave 495: revelation trigger), SUSPENSE_EMOTIONAL_
    // AFTERMATH_FLAT (suspense trigger). Completes clock-aftermath family on the emotion channel.
    const n523a = records.length;
    if (n523a >= 8) {
      const qualClockRecs523a = (records as any[]).filter((r, pos) =>
        r.clockRaised === true && pos < n523a - 2,
      );
      if (qualClockRecs523a.length >= 3) {
        const allClockNoEmoAftermath523a = qualClockRecs523a.every((r: any) => {
          const pos = (records as any[]).indexOf(r);
          for (let off = 1; off <= 2; off++) {
            const nxt = (records as any[])[pos + off];
            if (nxt && (nxt.emotionalShift ?? 'neutral') !== 'neutral') return false;
          }
          return true;
        });
        if (allClockNoEmoAftermath523a) {
          issues.push({
            location: `${qualClockRecs523a.length} clock scene(s) — emotion absent in all aftermath windows`,
            rule: 'CLOCK_AFTERMATH_EMOTION_FLAT',
            severity: 'minor',
            description: `Every deadline beat in the story (${qualClockRecs523a.length} clockRaised scene(s)) is followed by two emotionally neutral scenes. Deadlines are designed to produce urgency — but urgency that never registers in the protagonist's emotional state is purely mechanical. When a clock is raised and the next two scenes play out with no felt response to the imposed time pressure, the deadline reads as a logistical fact rather than as something the protagonist is experiencing. Pacing depends on the audience feeling the cost of time; a clock that triggers no emotional reaction teaches them that deadlines in this story do not matter to the people inside it.`,
            suggestedFix: `After at least one clockRaised scene, introduce an emotional beat in the following scene — a moment of fear, resolve, grief, or desperate hope that shows the protagonist registering the time pressure. The emotional response need not be large; even a brief beat of felt urgency before the next action beat grounds the deadline in character experience and tells the audience that the clock is real to someone inside the story.`,
          });
        }
      }
    }
  }

  {
    // PAYOFF_AFTERMATH_EMOTION_FLAT — sequence/aftermath × emotion × payoff trigger.
    // n≥8, ≥3 payoff scenes (payoffSetupIds non-empty) not in last 2 positions. Every payoff
    // is followed by 2 emotionally neutral scenes → fire. Thread resolutions never register
    // in the protagonist's felt state: a promise is cashed and then the next two scenes play
    // out without any emotional consequence to the delivery.
    // Distinct from: PAYOFF_AFTERMATH_CURIOSITY_FLAT (Wave 509: payoff→curiosity — different
    // aftermath channel), REVELATION_EMOTIONAL_AFTERMATH_FLAT (Wave 495: revelation trigger),
    // SUSPENSE_EMOTIONAL_AFTERMATH_FLAT (suspense trigger), CLOCK_AFTERMATH_EMOTION_FLAT (above:
    // clock trigger). Extends payoff-aftermath family to the emotion channel.
    const n523b = records.length;
    if (n523b >= 8) {
      const qualPayoffRecs523b = (records as any[]).filter((r, pos) =>
        ((r.payoffSetupIds ?? []) as any[]).length > 0 && pos < n523b - 2,
      );
      if (qualPayoffRecs523b.length >= 3) {
        const allPayoffNoEmoAftermath523b = qualPayoffRecs523b.every((r: any) => {
          const pos = (records as any[]).indexOf(r);
          for (let off = 1; off <= 2; off++) {
            const nxt = (records as any[])[pos + off];
            if (nxt && (nxt.emotionalShift ?? 'neutral') !== 'neutral') return false;
          }
          return true;
        });
        if (allPayoffNoEmoAftermath523b) {
          issues.push({
            location: `${qualPayoffRecs523b.length} payoff scene(s) — emotion absent in all aftermath windows`,
            rule: 'PAYOFF_AFTERMATH_EMOTION_FLAT',
            severity: 'minor',
            description: `Every planted promise delivered in the story (${qualPayoffRecs523b.length} payoff scene(s)) is followed by two emotionally neutral scenes. Payoffs should carry emotional weight: when a setup delivers, the protagonist should feel something — relief, grief, vindication, horror, joy — in the scenes that follow. When every payoff is met by affective silence, resolution feels procedural: threads are checked off rather than experienced. The emotional aftermath of a delivered promise is the moment the audience is reminded of what the setup cost and what the delivery means for the protagonist's arc.`,
            suggestedFix: `After at least one payoff scene, introduce an emotional beat in the following scene — a character's immediate felt response to the delivered promise. The response can be brief; even a single line of emotionally charged action or dialogue that shows someone feeling the weight of what just resolved is enough to anchor the payoff in the character's experience and lift it from logistics to drama.`,
          });
        }
      }
    }
  }

  {
    // PAYOFF_AFTERMATH_SUSPENSE_FLAT — sequence/aftermath × suspense × payoff trigger.
    // n≥8, ≥3 payoff scenes (payoffSetupIds non-empty) not in last 2 positions.
    // Average suspenseDelta of the scene immediately following each payoff ≤ 0 → fire.
    // Callbacks never generate forward tension: every thread resolution lands in scenes that
    // produce no net suspense gain in what follows, so payoffs flatten rather than accelerate.
    // Distinct from: PAYOFF_SUSPENSE_DECOUPLED (Wave 509: co-occurrence — payoff and high-
    // suspense never in the same scene; this is aftermath — what follows the payoff scene),
    // PAYOFF_AFTERMATH_CURIOSITY_FLAT (Wave 509: curiosity channel), PAYOFF_AFTERMATH_EMOTION_FLAT
    // (above: emotion channel), CLOCK_AFTERMATH_SUSPENSE_FLAT (clock trigger), REVELATION_
    // SUSPENSE_AFTERMATH_FLAT (revelation trigger). Adds suspense channel to payoff-aftermath family.
    const n523c = records.length;
    if (n523c >= 8) {
      const qualPayoffRecs523c = (records as any[]).filter((r, pos) =>
        ((r.payoffSetupIds ?? []) as any[]).length > 0 && pos < n523c - 2,
      );
      if (qualPayoffRecs523c.length >= 3) {
        const avgNextSusp523c = qualPayoffRecs523c.reduce((sum: number, r: any) => {
          const pos = (records as any[]).indexOf(r);
          const nxt = (records as any[])[pos + 1];
          return sum + (nxt ? (nxt.suspenseDelta ?? 0) : 0);
        }, 0) / qualPayoffRecs523c.length;
        if (avgNextSusp523c <= 0) {
          issues.push({
            location: `${qualPayoffRecs523c.length} payoff scene(s) — avg next-scene suspenseDelta: ${avgNextSusp523c.toFixed(2)}`,
            rule: 'PAYOFF_AFTERMATH_SUSPENSE_FLAT',
            severity: 'minor',
            description: `The scenes immediately following the story's ${qualPayoffRecs523c.length} payoff scenes average a suspenseDelta of ${avgNextSusp523c.toFixed(2)} — callbacks never generate forward tension in what immediately follows. A delivered promise should either resolve tension (the threat was cashed and the audience can exhale) or escalate it (the payoff reveals a deeper problem and raises the stakes). When every payoff is followed by a suspense-neutral scene, deliveries flatten rather than pivot the pacing; the audience receives the resolution and then drifts forward without any ratcheting effect. Payoffs that don't affect the tension level in what follows feel like isolated episodes rather than story-structural turning points.`,
            suggestedFix: `After at least one payoff scene, let the following scene carry a positive suspenseDelta — either by having the payoff reveal an escalating threat, or by having a character respond to the delivery in a way that raises the stakes. A payoff followed by a suspense rise is a ratchet: it both satisfies a prior setup and applies new pressure, converting closure into acceleration rather than rest.`,
          });
        }
      }
    }
  }

  // ── Wave 537: REVELATION_CURIOSITY_AFTERMATH_FLAT, PAYOFF_OPENING_ZONE_ABSENT,
  //              REVELATION_MIDDLE_ZONE_ABSENT ──────────────────────────────────────────────────────

  // REVELATION_CURIOSITY_AFTERMATH_FLAT — Sequence/aftermath × curiosity × revelation trigger.
  // n≥8, ≥3 revelation scenes (revelation non-null/empty) not in last 2 positions. Every
  // revelation is followed by 2 scenes with curiosityDelta ≤ 0 → fire. Disclosures never ignite
  // wondering in what follows: every truth surfaced lands without generating a new open question
  // in the next two scenes. A revelation should not only satisfy prior wondering — it should open
  // new curiosity: what does this mean? what happens now that we know? what was concealed alongside
  // it? When every revelation is followed by curiosity-flat scenes, the disclosure engine delivers
  // closure without generating the forward pull that keeps the audience invested through what follows.
  // Distinct from: REVELATION_SUSPENSE_AFTERMATH_FLAT (Wave 467: suspense channel — different
  // aftermath signal), REVELATION_EMOTIONAL_AFTERMATH_FLAT (Wave 495: emotion channel), CLOCK_
  // AFTERMATH_CURIOSITY_FLAT (Wave 495: clock trigger), PAYOFF_AFTERMATH_CURIOSITY_FLAT (Wave 509:
  // payoff trigger). Completes the revelation-aftermath family across all three channels.
  {
    const n537a = records.length;
    if (n537a >= 8) {
      const qualRevRecs537a = (records as any[]).filter((r, pos) =>
        r.revelation !== null && r.revelation !== '' && r.revelation !== undefined && pos < n537a - 2,
      );
      if (qualRevRecs537a.length >= 3) {
        const allRevNoCurAftermath537a = qualRevRecs537a.every((r: any) => {
          const pos = (records as any[]).indexOf(r);
          for (let off = 1; off <= 2; off++) {
            const nxt = (records as any[])[pos + off];
            if (nxt && (nxt.curiosityDelta ?? 0) > 0) return false;
          }
          return true;
        });
        if (allRevNoCurAftermath537a) {
          issues.push({
            location: `${qualRevRecs537a.length} revelation scene(s) — curiosity aftermath absent in all 2-scene windows`,
            rule: 'REVELATION_CURIOSITY_AFTERMATH_FLAT',
            severity: 'minor',
            description: `Every one of the story's ${qualRevRecs537a.length} revelation scenes is followed by two scenes with no curiosity rise (curiosityDelta ≤ 0 in both). Disclosures consistently land without generating a new open question in the scenes that follow — the truth surfaces and the audience's wondering closes rather than deepens. The most powerful revelations do two things at once: they answer a prior question AND open a new one. When every disclosed truth is followed by curiosity-flat scenes, the revelation engine is delivering closure without forward pull, and the audience exits each disclosure slightly less engaged with what comes next rather than more.`,
            suggestedFix: `After at least one revelation, let the following scene carry a positive curiosityDelta: introduce an implication of the disclosed truth that raises a new question, have a character react in a way that makes the audience wonder about their motives, or let the revelation expose a new layer of the situation that the audience did not know to ask about. The best revelations create more questions than they answer.`,
          });
        }
      }
    }
  }

  // PAYOFF_OPENING_ZONE_ABSENT — Zone presence/absence × payoff × opening third.
  // n≥9, ≥3 payoff scenes (payoffSetupIds non-empty). None of the payoff scenes falls in the
  // opening structural third (positions 0 to floor(n/3)−1) → fire. All thread resolutions are
  // deferred past the opening act: the story's first structural third passes without delivering
  // any planted promise. The opening third is where the audience forms expectations; an opening
  // that plants threads without resolving even one teaches the audience to expect pure accumulation
  // without early proof that the story delivers. An early payoff — even a minor one — confirms the
  // story's contract and raises confidence in the planted material that remains unresolved.
  // Distinct from: PAYOFF_TEMPORAL_CLUSTER in payoff.ts (distribution × concentration — checks
  // whether >75% of payoffs are in one third; fires on overconcentration, not on specific-zone
  // absence), PAYOFF_BACK_LOADED in intention.ts (distribution × first/second half ratio — checks
  // binary half split, not thirds-based zone absence). First zone-absence check on the payoff
  // channel in this pass.
  {
    const n537b = records.length;
    if (n537b >= 9) {
      const payoffPositions537b = (records as any[])
        .map((r, pos) => ({ pos, isPayoff: ((r.payoffSetupIds ?? []) as any[]).length > 0 }))
        .filter(x => x.isPayoff)
        .map(x => x.pos);
      if (payoffPositions537b.length >= 3) {
        const openingThird537b = Math.floor(n537b / 3);
        const anyInOpening537b = payoffPositions537b.some(p => p < openingThird537b);
        if (!anyInOpening537b) {
          issues.push({
            location: `Opening third (scenes 0–${openingThird537b - 1}) has no payoff scenes (${payoffPositions537b.length} payoff(s) start at scene ${payoffPositions537b[0]})`,
            rule: 'PAYOFF_OPENING_ZONE_ABSENT',
            severity: 'minor',
            description: `The story has ${payoffPositions537b.length} thread-resolution scenes, but none fall in the opening structural third (scenes 0–${openingThird537b - 1}). All planted promises are deferred past the opening act. The first structural third is where the audience learns to trust the story — whether it plants threads that actually resolve. When the opening passes without delivering even one minor payoff, the audience may track the seeded material with less confidence, unsure whether the story will follow through. An early resolution, even minor, confirms the story's contract and raises the audience's investment in the threads that remain open.`,
            suggestedFix: `Move or add at least one payoff scene into the opening structural third: a minor thread resolved, a small promise kept, or an early confirmation that a seeded element has been heard and will be answered. The opening payoff does not need to resolve the main dramatic question — it can be a small satisfaction that earns the audience's trust while the major threads remain live and unresolved.`,
          });
        }
      }
    }
  }

  // REVELATION_MIDDLE_ZONE_ABSENT — Zone presence/absence × revelation × middle third.
  // n≥9, ≥3 revelation scenes (revelation non-null/empty). None falls in the middle structural
  // third (positions floor(n/3) to 2×floor(n/3)−1) → fire. The story's disclosure engine skips
  // the complication zone: truths surface in the opening or closing acts but the central section
  // — where complications deepen and the protagonist's situation becomes most pressured — passes
  // without any revelation. The middle third is the structural space where revelations are most
  // powerful: they change what the audience understands mid-game, when there is still time for
  // the disclosed truth to complicate the protagonist's course. When the middle is disclosure-free,
  // that zone's complications arrive without any informational shift that would change what the
  // audience or protagonist is tracking.
  // Distinct from: REVELATION_TEMPORAL_CLUSTER in belief.ts (distribution × concentration × thirds
  // — checks whether >75% of revelations are in one zone; fires on overconcentration, not on
  // specific-zone absence; this fires when middle specifically has zero), REVELATION_SUSPENSE_
  // AFTERMATH_FLAT (sequence/aftermath — different mode), CURIOSITY_FRONTLOAD (Wave 425: curiosity
  // channel in first half, not revelation in middle third). First zone check on revelation in this pass.
  {
    const n537c = records.length;
    if (n537c >= 9) {
      const revPositions537c = (records as any[])
        .map((r, pos) => ({
          pos,
          hasRev: r.revelation !== null && r.revelation !== '' && r.revelation !== undefined,
        }))
        .filter(x => x.hasRev)
        .map(x => x.pos);
      if (revPositions537c.length >= 3) {
        const third537c = Math.floor(n537c / 3);
        const anyInMiddle537c = revPositions537c.some(p => p >= third537c && p < 2 * third537c);
        if (!anyInMiddle537c) {
          issues.push({
            location: `Middle third (scenes ${third537c}–${2 * third537c - 1}) has no revelation scenes (${revPositions537c.length} revelation(s) outside this zone)`,
            rule: 'REVELATION_MIDDLE_ZONE_ABSENT',
            severity: 'minor',
            description: `The story has ${revPositions537c.length} revelation scene(s), but none fall in the middle structural third (scenes ${third537c}–${2 * third537c - 1}). The disclosure engine skips the complication zone entirely: truths surface in the opening or closing acts but the central section — where complications deepen and the protagonist's situation becomes most pressured — passes without any informational shift. The middle third is where revelations are most structurally powerful: a truth disclosed mid-game changes what the protagonist is tracking and makes the complication zone feel like discovery rather than accumulation. When the middle has no revelations, the complication zone relies on action alone without the informational dimension that changes what the audience understands about what they are watching.`,
            suggestedFix: `Introduce at least one revelation in the middle structural third: a truth disclosed at the moment the protagonist's situation is most pressured, a secret that reframes the earlier complications, or a disclosure that changes what the protagonist must do and how urgently. A mid-story revelation is the most powerful tool for converting accumulating pressure into informational gear-change.`,
          });
        }
      }
    }
  }

  // ── Wave 551: TURN_AFTERMATH_SUSPENSE_FLAT, TURN_AFTERMATH_CURIOSITY_FLAT,
  //              TURN_AFTERMATH_EMOTION_FLAT ──────────────────────────────────────────────────────────

  // TURN_AFTERMATH_SUSPENSE_FLAT — sequence/aftermath × suspense × dramatic-turn trigger.
  // n≥8, ≥3 dramatic-turn scenes (dramaticTurn ≠ 'nothing' and ≠ '') not in last 2 positions.
  // Average suspenseDelta of the scene immediately following each turn ≤ 0 → fire. Story pivots —
  // reversals, recognitions, twists — never accelerate tension in what immediately follows. A dramatic
  // turn is one of the most structurally powerful events in a screenplay: it reorients the story, and
  // the scene after a pivot should feel the force of that reorientation as rising pressure. When every
  // turn is followed by a suspense-neutral or negative scene, the pivots flatten into informational
  // updates rather than escalating events. The structural purpose of a turn is to increase the
  // protagonist's predicament — and that should translate to a measurable suspense rise in the scene
  // that follows.
  // Distinct from: REVELATION_SUSPENSE_AFTERMATH_FLAT (Wave 467: revelation trigger — same aftermath
  // channel, different trigger), CLOCK_AFTERMATH_SUSPENSE_FLAT (Wave 481: clock trigger), PAYOFF_
  // AFTERMATH_SUSPENSE_FLAT (Wave 523: payoff trigger). First aftermath × suspense check on the
  // dramatic-turn trigger in this pass.
  {
    const n551a = records.length;
    if (n551a >= 8) {
      const qualTurnRecs551a = (records as any[]).filter((r, pos) =>
        (r.dramaticTurn ?? 'nothing') !== 'nothing' && r.dramaticTurn !== '' && pos < n551a - 2,
      );
      if (qualTurnRecs551a.length >= 3) {
        const avgNextSusp551a = qualTurnRecs551a.reduce((sum: number, r: any) => {
          const pos = (records as any[]).indexOf(r);
          const nxt = (records as any[])[pos + 1];
          return sum + (nxt ? (nxt.suspenseDelta ?? 0) : 0);
        }, 0) / qualTurnRecs551a.length;
        if (avgNextSusp551a <= 0) {
          issues.push({
            location: `${qualTurnRecs551a.length} dramatic-turn scene(s) — avg next-scene suspenseDelta: ${avgNextSusp551a.toFixed(2)}`,
            rule: 'TURN_AFTERMATH_SUSPENSE_FLAT',
            severity: 'minor',
            description: `The scenes immediately following the story's ${qualTurnRecs551a.length} dramatic-turn scenes (reversals, recognitions, twists) average a suspenseDelta of ${avgNextSusp551a.toFixed(2)} — story pivots never accelerate tension in what immediately follows. A dramatic turn should rearrange the protagonist's predicament in a way that tightens the situation: the scene after a reversal should feel the force of the pivot as increased pressure. When every turn is followed by a tension-neutral or downward scene, the pivots read as informational updates — they tell the audience something has changed without making the change feel dangerous. Pacing depends on turns generating escalation; turns that do not increase the felt stakes in the scene that follows are structural gear-changes that fail to shift the vehicle into a higher register.`,
            suggestedFix: `After at least one dramatic-turn scene, let the following scene carry a positive suspenseDelta: introduce a consequence of the turn that immediately increases the protagonist's danger or the story's uncertainty. Even a brief scene of rising pressure in the wake of a pivot — the protagonist now under a threat the turn created — translates the structural turn into a felt pacing event.`,
          });
        }
      }
    }
  }

  // TURN_AFTERMATH_CURIOSITY_FLAT — sequence/aftermath × curiosity × dramatic-turn trigger.
  // n≥8, ≥3 dramatic-turn scenes (dramaticTurn ≠ 'nothing') not in last 2 positions. Every turn
  // is followed by 2 scenes with curiosityDelta ≤ 0 → fire. Story pivots — reversals, recognitions,
  // twists — never ignite wondering in what follows: every pivot lands and the audience stops asking
  // new questions in the two scenes that follow. A dramatic turn should reframe what the audience
  // does not know: a reversal suggests new implications, a recognition reveals that prior
  // understanding was wrong, a twist makes the audience re-evaluate what they have seen. The scenes
  // following a turn should carry the heightened wondering that comes from a changed landscape. When
  // every turn is followed by curiosity-flat scenes, the pivots deliver informational closure without
  // the epistemic opening that would make the reorientation feel generative rather than merely complete.
  // Distinct from: REVELATION_CURIOSITY_AFTERMATH_FLAT (Wave 537: revelation trigger), CLOCK_
  // AFTERMATH_CURIOSITY_FLAT (Wave 495: clock trigger). First aftermath × curiosity check on the
  // dramatic-turn trigger in this pass.
  {
    const n551b = records.length;
    if (n551b >= 8) {
      const qualTurnRecs551b = (records as any[]).filter((r, pos) =>
        (r.dramaticTurn ?? 'nothing') !== 'nothing' && r.dramaticTurn !== '' && pos < n551b - 2,
      );
      if (qualTurnRecs551b.length >= 3) {
        const allTurnNoCurAftermath551b = qualTurnRecs551b.every((r: any) => {
          const pos = (records as any[]).indexOf(r);
          for (let off = 1; off <= 2; off++) {
            const nxt = (records as any[])[pos + off];
            if (nxt && (nxt.curiosityDelta ?? 0) > 0) return false;
          }
          return true;
        });
        if (allTurnNoCurAftermath551b) {
          issues.push({
            location: `${qualTurnRecs551b.length} dramatic-turn scene(s) — curiosity aftermath absent in all 2-scene windows`,
            rule: 'TURN_AFTERMATH_CURIOSITY_FLAT',
            severity: 'minor',
            description: `Every one of the story's ${qualTurnRecs551b.length} dramatic-turn scenes (reversals, recognitions, twists) is followed by two scenes with no curiosity rise (curiosityDelta ≤ 0 in both). Story pivots consistently land without generating new open questions in what follows — every reversal, recognition, or twist closes rather than opens the audience's wondering. The most structurally powerful turns do two things at once: they reorient the story AND create new questions about what the reorientation means. A turn that is followed by curiosity-flat scenes tells the audience that the pivot has been processed and integrated rather than that it has opened a new and more complex landscape to explore.`,
            suggestedFix: `After at least one dramatic-turn scene, let the following scene carry a positive curiosityDelta: introduce an implication of the turn that raises a new question, reveal that the reversal has a layer the audience did not know about, or let the recognition reframe what the audience thought they understood in a way that generates more wondering rather than less. The best turns accelerate the audience's need to see what comes next rather than completing a question they had already formed.`,
          });
        }
      }
    }
  }

  // TURN_AFTERMATH_EMOTION_FLAT — sequence/aftermath × emotion × dramatic-turn trigger.
  // n≥8, ≥3 dramatic-turn scenes (dramaticTurn ≠ 'nothing') not in last 2 positions. Every turn
  // is followed by 2 emotionally neutral scenes → fire. Story pivots — reversals, recognitions,
  // twists — never produce a felt response in what follows: characters pivot and then continue
  // through the next two scenes without any registered emotional consequence. The purpose of a
  // dramatic turn is to change something about the protagonist's situation dramatically enough
  // that it must be felt, not just acknowledged. A turn that is structurally complete (something
  // reversed or recognized) but affectively silent in the aftermath reads as a mechanical plot
  // adjustment rather than a story event. The felt state of the protagonist after a turn is what
  // converts the structural event into narrative momentum — without it, the pivot is a diagram,
  // not a story.
  // Distinct from: REVELATION_EMOTIONAL_AFTERMATH_FLAT (Wave 495: revelation trigger), CLOCK_
  // AFTERMATH_EMOTION_FLAT (Wave 523: clock trigger), PAYOFF_AFTERMATH_EMOTION_FLAT (Wave 523:
  // payoff trigger). Completes the dramatic-turn-aftermath family alongside TURN_AFTERMATH_SUSPENSE_
  // FLAT and TURN_AFTERMATH_CURIOSITY_FLAT, and completes the emotion-aftermath family across all
  // triggers (revelation, clock, payoff, and dramatic turn).
  {
    const n551c = records.length;
    if (n551c >= 8) {
      const qualTurnRecs551c = (records as any[]).filter((r, pos) =>
        (r.dramaticTurn ?? 'nothing') !== 'nothing' && r.dramaticTurn !== '' && pos < n551c - 2,
      );
      if (qualTurnRecs551c.length >= 3) {
        const allTurnNoEmoAftermath551c = qualTurnRecs551c.every((r: any) => {
          const pos = (records as any[]).indexOf(r);
          for (let off = 1; off <= 2; off++) {
            const nxt = (records as any[])[pos + off];
            if (nxt && (nxt.emotionalShift ?? 'neutral') !== 'neutral') return false;
          }
          return true;
        });
        if (allTurnNoEmoAftermath551c) {
          issues.push({
            location: `${qualTurnRecs551c.length} dramatic-turn scene(s) — emotion absent in all aftermath windows`,
            rule: 'TURN_AFTERMATH_EMOTION_FLAT',
            severity: 'minor',
            description: `Every one of the story's ${qualTurnRecs551c.length} dramatic-turn scenes (reversals, recognitions, twists) is followed by two emotionally neutral scenes. Story pivots are landing without felt consequences: the story turns, and then the characters continue through the next two scenes as if nothing has changed in their emotional state. A dramatic turn should change what the protagonist is up against — and that change should register as a felt experience before the plot moves on. When pivots are never followed by emotional beats, the turns read as informational updates rather than as events that cost the protagonist something. Pacing is not just about events per unit time; it is about events that land in the character's interiority, and turns without emotional aftermath are structurally complete but dramatically unanchored.`,
            suggestedFix: `After at least one dramatic-turn scene, let the following scene carry a non-neutral emotional shift — a moment of dread, relief, resolve, or grief that shows the protagonist registering what the pivot has cost or revealed. The emotional beat need not be long; a single line of acted response before the next scene of action is enough to anchor the turn in the character's experience and convert the structural event into a felt story moment.`,
          });
        }
      }
    }
  }

  // ── Wave 565: SEED_AFTERMATH_SUSPENSE_FLAT, SEED_AFTERMATH_CURIOSITY_FLAT,
  //              SEED_AFTERMATH_EMOTION_FLAT ──────────────────────────────────────────────────────
  // The seed (foreshadowing) trigger is the one missing row in this pass's aftermath matrix: the
  // suspense, curiosity, and emotion aftermath families already cover the revelation, clock, payoff,
  // and dramatic-turn triggers (Waves 467/481/495/523/537/551) but never the seed trigger. This wave
  // completes the matrix by auditing what happens in the scenes immediately after a clue is planted.

  // SEED_AFTERMATH_SUSPENSE_FLAT — sequence/aftermath × suspense × seed trigger.
  // n≥8, ≥3 seed scenes (seededClueIds non-empty) not in the last 2 positions. Average suspenseDelta
  // of the scene immediately following each seed ≤ 0 → fire. Foreshadowing never tightens tension in
  // its wake: a clue is planted and the next scene carries no rising pressure. A well-placed seed
  // should create anticipatory dread — the audience registers that something has been set in motion,
  // and the following scene should feel the weight of that pending consequence. When every seed is
  // followed by a suspense-neutral or downward scene, the planted clues read as inert bookkeeping —
  // information filed for later rather than a charge that makes the immediate aftermath feel more
  // dangerous. Foreshadowing is a tension instrument; a seed that does not raise the pressure of what
  // follows is a promise made without any accompanying unease.
  // Distinct from: REVELATION_SUSPENSE_AFTERMATH_FLAT (Wave 467: revelation trigger), CLOCK_AFTERMATH_
  // SUSPENSE_FLAT (Wave 481: clock trigger), PAYOFF_AFTERMATH_SUSPENSE_FLAT (Wave 523: payoff trigger),
  // TURN_AFTERMATH_SUSPENSE_FLAT (Wave 551: dramatic-turn trigger). First aftermath × suspense check on
  // the seed trigger in this pass — the seed row of the suspense-aftermath family.
  {
    const n565a = records.length;
    if (n565a >= 8) {
      const qualSeedRecs565a = (records as any[]).filter((r, pos) =>
        ((r.seededClueIds ?? []) as any[]).length > 0 && pos < n565a - 2,
      );
      if (qualSeedRecs565a.length >= 3) {
        const avgNextSusp565a = qualSeedRecs565a.reduce((sum: number, r: any) => {
          const pos = (records as any[]).indexOf(r);
          const nxt = (records as any[])[pos + 1];
          return sum + (nxt ? (nxt.suspenseDelta ?? 0) : 0);
        }, 0) / qualSeedRecs565a.length;
        if (avgNextSusp565a <= 0) {
          issues.push({
            location: `${qualSeedRecs565a.length} seed scene(s) — avg next-scene suspenseDelta: ${avgNextSusp565a.toFixed(2)}`,
            rule: 'SEED_AFTERMATH_SUSPENSE_FLAT',
            severity: 'minor',
            description: `The scenes immediately following the story's ${qualSeedRecs565a.length} clue-planting (seed) scenes average a suspenseDelta of ${avgNextSusp565a.toFixed(2)} — foreshadowing never tightens tension in its wake. A well-placed seed should create anticipatory dread: the audience registers that something has been set in motion, and the scene that follows should feel the weight of that pending consequence. When every seed is followed by a tension-neutral or downward scene, the planted clues read as inert bookkeeping — information filed for later rather than a charge that makes the immediate aftermath feel more dangerous. Pacing depends on planted promises generating unease; a seed that does not raise the pressure of what follows is a promise made without any accompanying tension.`,
            suggestedFix: `After at least one seed scene, let the following scene carry a positive suspenseDelta — a beat where the planted clue's implication begins to press on the protagonist, or where the act of planting itself creates a new exposure or risk. Even a brief rise in pressure after a seed converts the foreshadowing from a filed note into a felt threat, and gives the eventual payoff a tension lineage the audience has already been made to feel.`,
          });
        }
      }
    }
  }

  // SEED_AFTERMATH_CURIOSITY_FLAT — sequence/aftermath × curiosity × seed trigger.
  // n≥8, ≥3 seed scenes (seededClueIds non-empty) not in the last 2 positions. Every seed is
  // followed by 2 scenes with curiosityDelta ≤ 0 → fire. Foreshadowing never ignites wondering in
  // what follows: a clue is planted and the audience asks no new questions in the two scenes after.
  // A seed is, at its core, a question-generator — it shows the audience something whose significance
  // is not yet clear, and the scenes that follow should carry the heightened wondering of "what does
  // that mean / when will it matter." When every seed's aftermath is curiosity-flat, the clues are
  // being planted without the epistemic hook that makes foreshadowing pull the audience forward.
  // Distinct from: REVELATION_CURIOSITY_AFTERMATH_FLAT (Wave 537: revelation trigger), CLOCK_AFTERMATH_
  // CURIOSITY_FLAT (Wave 495: clock trigger), TURN_AFTERMATH_CURIOSITY_FLAT (Wave 551: dramatic-turn
  // trigger), PAYOFF_AFTERMATH_CURIOSITY_FLAT (Wave 509: payoff trigger). First aftermath × curiosity
  // check on the seed trigger in this pass — the seed row of the curiosity-aftermath family.
  {
    const n565b = records.length;
    if (n565b >= 8) {
      const qualSeedRecs565b = (records as any[]).filter((r, pos) =>
        ((r.seededClueIds ?? []) as any[]).length > 0 && pos < n565b - 2,
      );
      if (qualSeedRecs565b.length >= 3) {
        const allSeedNoCurAftermath565b = qualSeedRecs565b.every((r: any) => {
          const pos = (records as any[]).indexOf(r);
          for (let off = 1; off <= 2; off++) {
            const nxt = (records as any[])[pos + off];
            if (nxt && (nxt.curiosityDelta ?? 0) > 0) return false;
          }
          return true;
        });
        if (allSeedNoCurAftermath565b) {
          issues.push({
            location: `${qualSeedRecs565b.length} seed scene(s) — curiosity aftermath absent in all 2-scene windows`,
            rule: 'SEED_AFTERMATH_CURIOSITY_FLAT',
            severity: 'minor',
            description: `Every one of the story's ${qualSeedRecs565b.length} clue-planting (seed) scenes is followed by two scenes with no curiosity rise (curiosityDelta ≤ 0 in both). Foreshadowing consistently lands without generating new open questions in what follows — every planted clue is filed away rather than turned into a hook. A seed is fundamentally a question-generator: it shows the audience something whose significance is not yet clear, and the scenes that follow should carry the heightened wondering of "what does that mean" and "when will it matter." When every seed's aftermath is curiosity-flat, the clues are being planted without the epistemic pull that makes foreshadowing propulsive rather than merely tidy.`,
            suggestedFix: `After at least one seed scene, let the following scene carry a positive curiosityDelta — a beat that draws attention to the planted clue's strangeness, raises a question about its meaning, or shows a character noticing something is off. The most propulsive foreshadowing makes the audience actively wonder about the seed in the scenes right after it is planted, so the eventual payoff answers a question they have been carrying rather than one they had forgotten they were asked.`,
          });
        }
      }
    }
  }

  // SEED_AFTERMATH_EMOTION_FLAT — sequence/aftermath × emotion × seed trigger.
  // n≥8, ≥3 seed scenes (seededClueIds non-empty) not in the last 2 positions. Every seed is
  // followed by 2 emotionally neutral scenes → fire. Foreshadowing never produces a felt response
  // in what follows: a clue is planted and the protagonist moves through the next two scenes with no
  // registered emotional consequence. The strongest seeds are not neutral information drops — they
  // carry an emotional charge for the character who plants or witnesses them (unease, hope, dread,
  // suspicion) that colors the scenes that follow. When every seed's aftermath is affectively silent,
  // the clues read as authorial plumbing rather than as events the characters experience — the
  // machinery of the plot showing through without the human texture that makes foreshadowing feel
  // like part of the story rather than scaffolding for it.
  // Distinct from: REVELATION_EMOTIONAL_AFTERMATH_FLAT (Wave 495: revelation trigger), CLOCK_AFTERMATH_
  // EMOTION_FLAT (Wave 523: clock trigger), PAYOFF_AFTERMATH_EMOTION_FLAT (Wave 523: payoff trigger),
  // TURN_AFTERMATH_EMOTION_FLAT (Wave 551: dramatic-turn trigger). Completes the seed-aftermath family
  // alongside SEED_AFTERMATH_SUSPENSE_FLAT and SEED_AFTERMATH_CURIOSITY_FLAT, and completes the
  // emotion-aftermath family across all five triggers (revelation, clock, payoff, turn, and seed).
  {
    const n565c = records.length;
    if (n565c >= 8) {
      const qualSeedRecs565c = (records as any[]).filter((r, pos) =>
        ((r.seededClueIds ?? []) as any[]).length > 0 && pos < n565c - 2,
      );
      if (qualSeedRecs565c.length >= 3) {
        const allSeedNoEmoAftermath565c = qualSeedRecs565c.every((r: any) => {
          const pos = (records as any[]).indexOf(r);
          for (let off = 1; off <= 2; off++) {
            const nxt = (records as any[])[pos + off];
            if (nxt && (nxt.emotionalShift ?? 'neutral') !== 'neutral') return false;
          }
          return true;
        });
        if (allSeedNoEmoAftermath565c) {
          issues.push({
            location: `${qualSeedRecs565c.length} seed scene(s) — emotion absent in all aftermath windows`,
            rule: 'SEED_AFTERMATH_EMOTION_FLAT',
            severity: 'minor',
            description: `Every one of the story's ${qualSeedRecs565c.length} clue-planting (seed) scenes is followed by two emotionally neutral scenes. Foreshadowing is landing without felt consequence: a clue is planted, and the protagonist moves through the next two scenes as if nothing of weight has been set in motion. The strongest seeds are not neutral information drops — they carry an emotional charge for the character who plants or witnesses them (unease, hope, dread, suspicion) that colors the scenes that follow. When every seed's aftermath is affectively silent, the clues read as authorial plumbing rather than as events the characters experience: the machinery of the plot shows through without the human texture that makes foreshadowing feel woven into the story rather than bolted onto it.`,
            suggestedFix: `After at least one seed scene, let the following scene carry a non-neutral emotional shift — a flicker of dread, suspicion, or hope that shows the planted clue has registered on the protagonist's interior state. The emotional beat need not be large; a single acted response colors the foreshadowing with feeling and tells the audience that the seed matters to the character, not just to the plot. Seeds that are felt are remembered; seeds that are merely filed are the ones whose eventual payoff lands flat.`,
          });
        }
      }
    }
  }

  // ── Wave 579: ─────────────────────────────────────────────────────────────

  // PAYOFF_PEAK_UNCAUSED — backward-cause × payoff channel × single-peak isolation.
  // n≥8, ≥2 payoff scenes; the scene with the highest count of payoff setup resolutions
  // (payoffSetupIds.length) has no revelation, dramatic turn, or clock event in itself or
  // either of the two preceding scenes → fire. A payoff is the culminating moment where
  // everything the story seeded finally arrives. The most powerful payoffs feel caused: they
  // follow a revelation, a turn, or a deadline that gathers the earlier setups into one
  // convergent beat. When the story's densest payoff emerges from a dramatic vacuum, the
  // resolution reads as arbitrary arrival rather than earned climax.
  // Distinct from: SUSPENSE_PEAK_UNCAUSED (Wave 481: backward-cause × suspense peak — a
  // different signal), EMOTIONAL_PEAK_UNCAUSED (Wave 481: backward-cause × emotional peak),
  // CURIOSITY_PEAK_UNCAUSED (Wave 495: backward-cause × curiosity peak), PAYOFF_SUSPENSE_
  // DECOUPLED (co-occurrence × same-scene — payoff and suspense never coincide; not a causal
  // analysis). First backward-cause check on the payoff channel — completes the backward-cause
  // family across suspense, emotional, curiosity, and payoff peak types.
  {
    const n579a = records.length;
    if (n579a >= 8) {
      const payoffRecs579a = (records as any[]).filter((r: any) =>
        ((r.payoffSetupIds ?? []) as any[]).length > 0,
      );
      if (payoffRecs579a.length >= 2) {
        const peakRec579a = payoffRecs579a.reduce((best: any, r: any) =>
          ((r.payoffSetupIds ?? []) as any[]).length > ((best.payoffSetupIds ?? []) as any[]).length ? r : best,
        );
        const peakPos579a = (records as any[]).indexOf(peakRec579a);
        const hasCause579a = [0, 1, 2].some(off => {
          const r = (records as any[])[peakPos579a - off];
          if (!r) return false;
          return r.revelation === true ||
            (r.dramaticTurn && r.dramaticTurn !== 'nothing') ||
            r.clockRaised === true;
        });
        if (!hasCause579a) {
          issues.push({
            location: `Payoff peak at scene ${peakPos579a + 1} has no causal event in prior 2 scenes`,
            rule: 'PAYOFF_PEAK_UNCAUSED',
            severity: 'minor',
            description: `The story's densest payoff scene — the one resolving the most planted setups — occurs at scene ${peakPos579a + 1} with no revelation, dramatic turn, or clock event in itself or either of the two preceding scenes. A payoff is the culminating moment where everything the story seeded finally arrives; the most powerful payoffs feel caused. They follow a revelation that reframes everything, a turn that forces a new path, or a deadline that makes waiting impossible — some convergent event that gathers the earlier setups into one earned arrival. When the story's most semantically loaded payoff scene emerges from a dramatic vacuum, the resolution reads as arbitrary rather than inevitable: the audience receives the answer without having felt the question pressurized into urgency.`,
            suggestedFix: `Give the payoff peak a motivating cause in the scenes immediately before it — a revelation that makes the planted promise suddenly urgent, a dramatic turn that forces the payoff to land now rather than later, or a raised clock that makes delay impossible. The cause need not be elaborate; even a brief trigger scene that signals "this is the moment and here is why" converts the payoff from coincidental arrival to earned convergence. Alternatively, restructure so the payoff peak arrives in the wake of another major structural event rather than in undisturbed dramatic air.`,
          });
        }
      }
    }
  }

  // SUSPENSE_CLOSING_ZONE_ABSENT — zone presence/absence × suspense × closing structural third.
  // n≥9, ≥3 scenes with suspenseDelta>0 exist, none of them fall in the final structural third
  // (positions ≥ ⌊2n/3⌋) → fire. The story's tension engine goes quiet at the very end: all
  // suspense is spent before the climax zone arrives. A screenplay that raises tension in the
  // first two acts but carries none into the third leaves the closing stretch emotionally cold
  // — the audience has been cued to expect escalating danger and instead the pressure dissolves
  // when it should be at its highest.
  // Distinct from: SUSPENSE_EARLY_PEAK (Wave 288: compares Act 1 avg to Act 3 avg — relative
  // magnitudes, not complete absence; early peak can fire even if closing third has some tension),
  // SUSPENSE_FLATLINE_RUN (Wave 509: run-based — consecutive stretch of flat suspense, not a zone-
  // level absence), PAYOFF_OPENING_ZONE_ABSENT (Wave 537: zone absence × payoff channel, not
  // suspense), REVELATION_MIDDLE_ZONE_ABSENT (Wave 537: zone absence × revelation × middle third,
  // not closing third). First zone-absence check on the suspense channel in this pass.
  {
    const n579b = records.length;
    if (n579b >= 9) {
      const suspScenes579b = (records as any[]).filter((r: any) => (r.suspenseDelta ?? 0) > 0);
      if (suspScenes579b.length >= 3) {
        const closingStart579b = Math.floor(2 * n579b / 3);
        const hasSuspInClosing579b = (records as any[]).some((r: any, i: number) =>
          i >= closingStart579b && (r.suspenseDelta ?? 0) > 0,
        );
        if (!hasSuspInClosing579b) {
          issues.push({
            location: `${suspScenes579b.length} suspense scenes all fall before the final structural third (scene ${closingStart579b + 1}–${n579b})`,
            rule: 'SUSPENSE_CLOSING_ZONE_ABSENT',
            severity: 'minor',
            description: `The story has ${suspScenes579b.length} scenes with rising suspense, but none of them fall in the closing structural third (scenes ${closingStart579b + 1}–${n579b}). The tension engine goes quiet precisely when it should be running hottest: all of the story's suspense is spent in the first two-thirds, leaving the climax zone empty of forward-pulling dread. A screenplay that builds tension in setup and complication but carries none into the resolution leaves the closing stretch emotionally cold — the audience has been cued to expect escalating danger and instead the pressure dissolves when it should converge. The closing third is the structural zone where suspense should be most concentrated; its complete absence signals that the dramatic engine has stalled before the finish.`,
            suggestedFix: `Introduce at least one suspense-raising beat in the closing third — a deadline that closes in, a new threat that emerges, or a consequence of the climax that raises the stakes for the final resolution. Even a single positive suspenseDelta in the closing stretch demonstrates that the tension engine is still running as the story arrives at its climax. If the story intentionally releases all tension early for a quiet, reflective ending, that choice should be deliberate — and the earlier suspense should escalate far enough to earn the full release.`,
          });
        }
      }
    }
  }

  // CLOCK_ZONE_CLUSTER — distribution/timing × clock × structural zone concentration.
  // n≥9, ≥3 scenes with clockRaised === true; >75% of those clock-raising scenes concentrated
  // in one structural third (opening/middle/closing) → fire. Temporal urgency loaded into a
  // single act rather than escalating through the story. A deadline machine works by escalating:
  // early urgency is overtaken by tighter deadlines, each act adding new time pressure. When
  // more than three-quarters of all clock raises are packed into one structural third, the
  // urgency is isolated instead of escalating — a burst of deadline-pressure in one zone
  // followed by temporal ease in the others.
  // Distinct from: CLOCK_PRESSURE_RUN (Wave 467: run-based — ≥4 consecutive clock scenes,
  // tests local adjacency not global zone distribution), CLOCK_SCENE_PACING_MISMATCH and
  // CLOCK_SCENE_UNDERWEIGHT (scene-length checks on clock scenes — a different analytical
  // axis), CURIOSITY_FRONTLOAD (Wave 425: distribution/timing × curiosity — different channel).
  // First distribution/timing check on the clock channel in this pass.
  {
    const n579c = records.length;
    if (n579c >= 9) {
      const clockTotal579c = (records as any[]).filter((r: any) => r.clockRaised === true).length;
      if (clockTotal579c >= 3) {
        const third579c = Math.floor(n579c / 3);
        const z1Count579c = (records as any[]).filter((r: any, i: number) => i < third579c && r.clockRaised === true).length;
        const z2Count579c = (records as any[]).filter((r: any, i: number) => i >= third579c && i < 2 * third579c && r.clockRaised === true).length;
        const z3Count579c = (records as any[]).filter((r: any, i: number) => i >= 2 * third579c && r.clockRaised === true).length;
        const maxZ579c = Math.max(z1Count579c, z2Count579c, z3Count579c);
        if (maxZ579c / clockTotal579c > 0.75) {
          const dominantZone579c = maxZ579c === z1Count579c ? 'opening' : maxZ579c === z2Count579c ? 'middle' : 'closing';
          issues.push({
            location: `${maxZ579c} of ${clockTotal579c} clock-raising scenes concentrated in the ${dominantZone579c} structural third`,
            rule: 'CLOCK_ZONE_CLUSTER',
            severity: 'minor',
            description: `${maxZ579c} of ${clockTotal579c} clock-raising scenes (${Math.round(maxZ579c / clockTotal579c * 100)}%) are concentrated in the ${dominantZone579c} structural third. A deadline machine works by escalating: early urgency is overtaken by tighter deadlines, each act adding new time pressure until the final race against the clock. When more than three-quarters of all clock raises are packed into one structural zone, urgency is isolated rather than escalating — a burst of deadline-pressure in one act followed by temporal ease in the others. The story's urgency feels episodic and local rather than cumulative, and the zones without clock pressure lose the forward-pull that makes pacing feel driven. The audience experiences a deadline spike rather than a sustained build.`,
            suggestedFix: `Redistribute clock-raising moments across all three structural thirds so that urgency escalates rather than spikes. The opening third should introduce a first deadline; the middle should tighten or add to it; the closing third should make the clock impossible to ignore. If the ${dominantZone579c} third genuinely belongs as the urgency zone for this story, at minimum ensure at least one other third carries at least one clock raise — even a single seed of urgency in an otherwise loose zone gives the temporal pressure a lineage across the whole story rather than a single-act burst.`,
          });
        }
      }
    }
  }

  // ── Wave 593: STAKES_AFTERMATH_SUSPENSE_FLAT, STAKES_AFTERMATH_CURIOSITY_FLAT,
  //              STAKES_AFTERMATH_EMOTION_FLAT ───────────────────────────────────────────────
  // The stakes-raise trigger is the one missing row in this pass's 6-trigger aftermath matrix:
  // the suspense/curiosity/emotion aftermath families already cover revelation, clock, payoff,
  // dramatic-turn, and seed (Waves 467/481/495/509/523/537/551/565) but never the moment a scene's
  // purpose is explicitly to raise the stakes (purpose === 'raise_stakes', the same predicate
  // STAKES_SCENE_BLOAT/UNDERWEIGHT already use for scene length). Built on checkAftermathVoid from
  // the shared check-template library (audit M2.2) rather than a hand-rolled loop — the first checks
  // in this pass to do so.

  {
    const isStakesRaise593 = (r: ScreenplaySceneRecord) => r.purpose === 'raise_stakes';

    // STAKES_AFTERMATH_SUSPENSE_FLAT — sequence/aftermath × suspense × stakes-raise trigger.
    // n≥8, ≥3 qualifying stakes-raise scenes (pos<n-2), ≥2 suspense-rise scenes existing elsewhere.
    // Every stakes-raise is followed by 2 scenes with no suspenseDelta>0 → fire. Explicitly raising
    // the stakes should tighten what follows — the audience has just been told more is at risk, and
    // the next beats should feel that risk pressing on the story. When every stakes-raise is followed
    // by flat or falling tension, the escalation is announced but not felt downstream.
    // Distinct from: SEED_AFTERMATH_SUSPENSE_FLAT / CLOCK_AFTERMATH_SUSPENSE_FLAT / PAYOFF_AFTERMATH_
    // SUSPENSE_FLAT / TURN_AFTERMATH_SUSPENSE_FLAT / REVELATION_SUSPENSE_AFTERMATH_FLAT (different
    // triggers), STAKES_SCENE_UNDERWEIGHT/BLOAT (scene-length signal, not aftermath). First aftermath
    // × suspense check on the stakes-raise trigger — the stakes row of the suspense-aftermath family.
    {
      const r593a = checkAftermathVoid({
        records, minRecords: 8, minTriggerCount: 3, minAftermathCount: 2, window: 2,
        isTrigger: isStakesRaise593, isAftermath: r => (r.suspenseDelta ?? 0) > 0,
      });
      if (r593a.fires) {
        issues.push({
          location: `${r593a.triggerCount} stakes-raise scene(s) — no suspense rise within 2 scenes of any`,
          rule: 'STAKES_AFTERMATH_SUSPENSE_FLAT',
          severity: 'minor',
          description: `Every one of the story's ${r593a.triggerCount} stakes-raising scenes is followed by two scenes with no suspense rise, even though ${r593a.aftermathCount} suspense-rise scene(s) exist elsewhere in the script. Raising the stakes is a promise to the audience that more is now at risk — the scenes that follow should feel that promise pressing on the story as rising tension. When every stakes-raise is followed by flat or falling suspense, the escalation is announced in the abstract but never converted into felt pressure in what actually happens next.`,
          suggestedFix: `After at least one stakes-raising scene, let the following scene or the one after carry a suspense rise — a complication that makes the newly-raised stakes concrete, a countdown that starts ticking, or a threat that becomes immediate. The escalation should be felt in the story's tension, not just stated in its premise.`,
        });
      }
    }

    // STAKES_AFTERMATH_CURIOSITY_FLAT — sequence/aftermath × curiosity × stakes-raise trigger.
    // Same guards as above; fires when no stakes-raise is followed by a curiosityDelta>0 within 2
    // scenes. Raising the stakes should also raise questions — what will the higher cost mean, who
    // will pay it, can it still be avoided — and a stakes-raise that generates no forward wondering
    // treats the escalation as settled information rather than an open, consequential question.
    // Distinct from the other four aftermath×curiosity triggers (seed/clock/payoff/turn/revelation)
    // and from CURIOSITY_FRONTLOAD/CURIOSITY_FLATLINE_RUN (global distribution, not per-trigger
    // aftermath). Stakes row of the curiosity-aftermath family.
    {
      const r593b = checkAftermathVoid({
        records, minRecords: 8, minTriggerCount: 3, minAftermathCount: 2, window: 2,
        isTrigger: isStakesRaise593, isAftermath: r => (r.curiosityDelta ?? 0) > 0,
      });
      if (r593b.fires) {
        issues.push({
          location: `${r593b.triggerCount} stakes-raise scene(s) — no curiosity rise within 2 scenes of any`,
          rule: 'STAKES_AFTERMATH_CURIOSITY_FLAT',
          severity: 'minor',
          description: `Every one of the story's ${r593b.triggerCount} stakes-raising scenes is followed by two scenes with no curiosity rise, even though ${r593b.aftermathCount} curiosity-rise scene(s) exist elsewhere in the script. Raising the stakes should open questions along with raising risk: what will the higher cost mean, who ends up paying it, is there still a way out. When every stakes-raise's aftermath is curiosity-flat, the escalation reads as settled information delivered to the audience rather than an unresolved question they are pulled forward to answer.`,
          suggestedFix: `After at least one stakes-raising scene, let the following scene raise a new question tied to the heightened cost — a character wondering aloud whether it's still worth it, an ambiguous consequence whose shape isn't yet clear, or a choice whose outcome is deliberately left open. The stakes should not just be higher; they should be uncertain.`,
        });
      }
    }

    // STAKES_AFTERMATH_EMOTION_FLAT — sequence/aftermath × emotion × stakes-raise trigger.
    // Same guards; fires when no stakes-raise is followed by a non-neutral emotionalShift within 2
    // scenes. A stakes-raise that lands with no felt consequence in its aftermath is escalation as
    // bookkeeping — the characters register no dread, hope, or resolve in response to the newly-
    // raised cost, so the audience has no emotional anchor for why the higher stakes should matter.
    // Distinct from the other four aftermath×emotion triggers and from EMOTIONAL_FLATLINE_RUN
    // (global consecutive-neutral run, not tied to the stakes-raise trigger specifically). Stakes
    // row of the emotion-aftermath family — completes the 6-trigger x 3-channel matrix.
    {
      const r593c = checkAftermathVoid({
        records, minRecords: 8, minTriggerCount: 3, minAftermathCount: 2, window: 2,
        isTrigger: isStakesRaise593, isAftermath: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
      });
      if (r593c.fires) {
        issues.push({
          location: `${r593c.triggerCount} stakes-raise scene(s) — no emotional shift within 2 scenes of any`,
          rule: 'STAKES_AFTERMATH_EMOTION_FLAT',
          severity: 'minor',
          description: `Every one of the story's ${r593c.triggerCount} stakes-raising scenes is followed by two emotionally neutral scenes, even though ${r593c.aftermathCount} emotionally-charged scene(s) exist elsewhere in the script. Raising the stakes should register on the characters who now stand to lose more — dread, resolve, or hope — and when every stakes-raise's aftermath is affectively flat, the escalation is announced to the audience but not felt by anyone inside the story.`,
          suggestedFix: `After at least one stakes-raising scene, let the following scene carry a non-neutral emotional beat from a character who now has more to lose — a flicker of fear, a hardened resolve, or a flare of hope that the higher cost is worth it. The audience should feel the weight of the raised stakes through a character's reaction, not just infer it from the premise.`,
        });
      }
    }
  }

  // ── Wave 607: OPEN_THREAD_AFTERMATH_SUSPENSE_FLAT, OPEN_THREAD_AFTERMATH_CURIOSITY_FLAT,
  //              OPEN_THREAD_AFTERMATH_EMOTION_FLAT ─────────────────────────────────────────
  // Wave 593 called this pass's aftermath matrix complete at 6 triggers (revelation, clock,
  // payoff, dramatic-turn, seed, stakes-raise) × 3 channels (suspense, curiosity, emotion). The
  // unresolvedClues field — outstanding, unpaid clue-debt — was never used anywhere in this
  // 103-rule pass despite being exactly the kind of accumulating pressure this pass's aftermath
  // family exists to track: a 7th trigger row, keyed to a magnitude threshold (heavy debt,
  // unresolvedClues.length≥3) rather than a discrete event like the other six triggers.

  {
    const isHeavyDebt607 = (r: ScreenplaySceneRecord) => (r.unresolvedClues ?? []).length >= 3;

    // OPEN_THREAD_AFTERMATH_SUSPENSE_FLAT — sequence/aftermath × suspense × heavy clue-debt
    // trigger. n≥8, ≥2 qualifying heavy-debt scenes (pos<n-2), ≥2 suspense-rise scenes existing
    // elsewhere. Every heavy-debt scene is followed by 2 scenes with no suspenseDelta>0 → fire.
    // A story carrying substantial unresolved debt should feel that weight as tension in what
    // follows; when the aftermath of every debt-heavy scene is suspense-flat, the accumulated
    // pressure of open threads never converts into felt tension downstream. Distinct from
    // STAKES_AFTERMATH_SUSPENSE_FLAT and every other trigger in the suspense-aftermath family
    // (different trigger channel entirely), and from REVELATION_DROUGHT/CURIOSITY_FLATLINE_RUN
    // (global runs, not tied to a specific trigger's aftermath).
    {
      const r607a = checkAftermathVoid({
        records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
        isTrigger: isHeavyDebt607, isAftermath: r => (r.suspenseDelta ?? 0) > 0,
      });
      if (r607a.fires) {
        issues.push({
          location: `${r607a.triggerCount} heavy clue-debt scene(s) — no suspense rise within 2 scenes of any`,
          rule: 'OPEN_THREAD_AFTERMATH_SUSPENSE_FLAT',
          severity: 'minor',
          description: `Every one of the story's ${r607a.triggerCount} heavy clue-debt scenes (3 or more open threads at once) is followed by two scenes with no suspense rise, even though ${r607a.aftermathCount} suspense-rise scene(s) exist elsewhere in the script. Carrying substantial unresolved debt is itself a source of pressure — the audience is holding several open questions at once — and when that pressure never converts into rising tension downstream, the accumulated debt sits inert rather than compounding into felt stakes.`,
          suggestedFix: `After at least one heavy clue-debt scene, let the following scene or the one after carry a suspense rise — a complication that makes the accumulated open threads feel more urgent, or a new pressure that forces at least one of them toward a head. The weight of unresolved debt should be felt as tightening tension, not just tracked as an open tally.`,
        });
      }
    }

    // OPEN_THREAD_AFTERMATH_CURIOSITY_FLAT — sequence/aftermath × curiosity × heavy clue-debt
    // trigger. Same guards; fires when no heavy-debt scene is followed by a curiosityDelta>0
    // within 2 scenes. Heavy accumulated debt should itself provoke wondering — which thread
    // resolves first, how they connect, what the cost of leaving them open will be — and a
    // debt-heavy aftermath that raises no further curiosity treats the pile of open questions as
    // static rather than as fuel for more. Distinct from the other seven aftermath×curiosity
    // triggers and from OPEN_THREAD_CURIOSITY_DECOUPLED (originality.ts: same-scene co-occurrence
    // in a different pass, not a windowed aftermath check in this one).
    {
      const r607b = checkAftermathVoid({
        records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
        isTrigger: isHeavyDebt607, isAftermath: r => (r.curiosityDelta ?? 0) > 0,
      });
      if (r607b.fires) {
        issues.push({
          location: `${r607b.triggerCount} heavy clue-debt scene(s) — no curiosity rise within 2 scenes of any`,
          rule: 'OPEN_THREAD_AFTERMATH_CURIOSITY_FLAT',
          severity: 'minor',
          description: `Every one of the story's ${r607b.triggerCount} heavy clue-debt scenes is followed by two scenes with no curiosity rise, even though ${r607b.aftermathCount} curiosity-rise scene(s) exist elsewhere in the script. A pile of unresolved threads should itself be generative — prompting new wondering about how they connect or which resolves first — and when the aftermath of every debt-heavy scene raises no further curiosity, the accumulated questions read as inert bookkeeping rather than a live engine for more.`,
          suggestedFix: `After at least one heavy clue-debt scene, let the following scene introduce a new wrinkle tied to the open threads — a detail that makes the audience wonder how two of the unresolved questions might connect, or a hint that one of them is about to break open. Let accumulated debt actively generate more curiosity instead of sitting static.`,
        });
      }
    }

    // OPEN_THREAD_AFTERMATH_EMOTION_FLAT — sequence/aftermath × emotion × heavy clue-debt
    // trigger. Same guards; fires when no heavy-debt scene is followed by a non-neutral
    // emotionalShift within 2 scenes. Carrying several open threads at once should weigh on a
    // character — frustration, anxiety, or a flicker of hope that answers are close — and an
    // aftermath that registers nothing emotionally treats the accumulated debt as a purely
    // structural tally rather than something anyone in the story actually feels. Distinct from
    // the other seven aftermath×emotion triggers and from EMOTIONAL_FLATLINE_RUN (global
    // consecutive-neutral run, not tied to the debt trigger specifically). Completes the newly
    // added 7th row across all three channels.
    {
      const r607c = checkAftermathVoid({
        records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
        isTrigger: isHeavyDebt607, isAftermath: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
      });
      if (r607c.fires) {
        issues.push({
          location: `${r607c.triggerCount} heavy clue-debt scene(s) — no emotional shift within 2 scenes of any`,
          rule: 'OPEN_THREAD_AFTERMATH_EMOTION_FLAT',
          severity: 'minor',
          description: `Every one of the story's ${r607c.triggerCount} heavy clue-debt scenes is followed by two emotionally neutral scenes, even though ${r607c.aftermathCount} emotionally-charged scene(s) exist elsewhere in the script. Carrying several open threads at once should register on a character — frustration at not knowing, anxiety about what's still unresolved, or hope that an answer is close — and when the aftermath of every debt-heavy scene is affectively flat, the accumulated pressure exists only as a structural tally, never as something felt.`,
          suggestedFix: `After at least one heavy clue-debt scene, let the following scene carry a non-neutral emotional beat rooted in the unresolved pressure — a character's visible frustration, a flash of anxiety, or a moment of hope that the open threads are about to close. The weight of accumulated debt should be felt, not only tracked.`,
        });
      }
    }
  }

  // ── Wave 621: PACING_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE, PACING_PAYOFF_STAGING_DECOUPLED,
  //              REVELATION_AFTERMATH_STAGING_FLAT ───────────────────────────────────────────

  // PACING_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE — Underweight/bloat × dialogueHighlights × four
  // structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 scenes
  // carrying a curated dialogue highlight, divided across four equal structural zones. Fires only
  // when one zone has zero such scenes while another holds ≥50% of the total. First use of the
  // dialogueHighlights field anywhere in this 106-rule pass — every existing check here audits
  // suspense/curiosity/emotion/clock/payoff/revelation/stakes/open-thread signals, never the
  // story's own record of which lines stood out.
  {
    const r621a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r621a.fires) {
      const emptyNames621a = r621a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName621a = FOUR_ZONE_NAMES[r621a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames621a} empty; ${bloatName621a} has ${r621a.counts[r621a.bloatZoneIdx]}/${r621a.totalCount} dialogue-highlight scenes`,
        rule: 'PACING_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r621a.totalCount} dialogue-highlight scenes are unevenly distributed across its four structural zones: ${bloatName621a} contains ${r621a.counts[r621a.bloatZoneIdx]} of them (${Math.round((r621a.counts[r621a.bloatZoneIdx] / r621a.totalCount) * 100)}%) while ${emptyNames621a} contains none. Memorable dialogue bloats in one structural quarter and vanishes from another, giving the story's verbal rhythm an uneven pulse across its four quarters.`,
        suggestedFix: `Redistribute standout dialogue: bring at least one memorable line into ${emptyNames621a}, so every structural quarter carries some verbal high point rather than only the quarter currently carrying most of them.`,
      });
    }
  }

  // PACING_PAYOFF_STAGING_DECOUPLED — Co-occurrence/decoupling × payoffSetupIds × visualBeats.
  // Built on checkCoOccurrenceDecoupled from the shared checks library. n≥6, ≥2 payoff scenes, ≥2
  // visually-staged scenes (visualBeats.length≥2). Zero overlap → fire. First use of the
  // visualBeats field anywhere in this pass. A resolution and a scene rich in physical staging
  // never happen together — every payoff lands through dialogue or interiority alone, with no
  // physical beat carrying the weight of what just resolved.
  {
    const r621b = checkCoOccurrenceDecoupled({
      records, minRecords: 6, minACount: 2, minBCount: 2,
      isA: r => (r.payoffSetupIds ?? []).length > 0,
      isB: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r621b.fires) {
      issues.push({
        location: `${r621b.aCount} payoff scene(s), ${r621b.bCount} visually-staged scene(s) — zero overlap`,
        rule: 'PACING_PAYOFF_STAGING_DECOUPLED',
        severity: 'minor',
        description: `The ${r621b.aCount} scenes where a planted thread resolves never coincide with the ${r621b.bCount} scenes leaning heavily on physical staging — resolution and physical presence run on separate tracks. A payoff often lands with more force when a character's action embodies what the resolution means, rather than the moment being carried entirely through dialogue.`,
        suggestedFix: `Let at least one payoff scene also lean on physical staging — an action or object a character handles that embodies what just resolved, pacing the release of tension through something visible rather than only through what is said.`,
      });
    }
  }

  // REVELATION_AFTERMATH_STAGING_FLAT — Sequence/aftermath × visualBeats × revelation trigger.
  // Built on checkAftermathVoid from the shared checks library. n≥8, ≥2 qualifying revelation
  // scenes (pos<n-2), ≥3 scenes anywhere with substantial physical staging, a 2-scene lookahead
  // window. Fires when every revelation's two-scene aftermath contains no visually dense scene,
  // while such scenes do occur elsewhere. A 4th channel for the revelation row of this pass's
  // trigger×channel aftermath matrix, alongside REVELATION_SUSPENSE_AFTERMATH_FLAT (Wave 467),
  // REVELATION_CURIOSITY_AFTERMATH_FLAT, and REVELATION_EMOTIONAL_AFTERMATH_FLAT (Wave 495) — a
  // disclosed truth should register physically somewhere nearby, not only as a tension, curiosity,
  // or emotional signal.
  {
    const r621c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 3, window: 2,
      isTrigger: r => r.revelation != null,
      isAftermath: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r621c.fires) {
      issues.push({
        location: `${r621c.triggerCount} revelation scene(s) — no visually dense scene within 2 scenes of any`,
        rule: 'REVELATION_AFTERMATH_STAGING_FLAT',
        severity: 'minor',
        description: `Every one of the story's ${r621c.triggerCount} revelation scenes is followed by two scenes with no substantial physical staging, even though ${r621c.aftermathCount} such scenes exist elsewhere in the script. A disclosed truth often changes how a character moves through the world — what they now handle differently, avoid, or seek out — and when that physical aftermath consistently stays unstaged, the revelation's consequences are only ever discussed, never shown.`,
        suggestedFix: `After at least one revelation, let one of the following two scenes carry substantial physical staging — a character's changed behavior made visible through action, object, or space, not only through what they say about it.`,
      });
    }
  }

  // ── Wave 635: PACING_OPEN_THREAD_STAGING_DECOUPLED, PACING_SEED_STAGING_AFTERMATH_VOID,
  //              PACING_OPEN_THREAD_ZONE_IMBALANCE ─────────────────────────────────────────

  // PACING_OPEN_THREAD_STAGING_DECOUPLED — Co-occurrence/decoupling × unresolvedClues ×
  // visualBeats. Built on checkCoOccurrenceDecoupled from the shared checks library. n≥6, ≥2
  // scenes carrying outstanding clue-debt, ≥2 visually-staged scenes (visualBeats.length≥2). Zero
  // overlap → fire. First pairing of these two fields in this 109-rule pass — unresolvedClues had
  // only ever been used as an aftermath trigger (Wave 607), never paired with a second field in
  // same-scene co-occurrence.
  {
    const r635a = checkCoOccurrenceDecoupled({
      records, minRecords: 6, minACount: 2, minBCount: 2,
      isA: r => (r.unresolvedClues ?? []).length > 0,
      isB: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r635a.fires) {
      issues.push({
        location: `${r635a.aCount} open-thread scene(s), ${r635a.bCount} visually-staged scene(s) — zero overlap`,
        rule: 'PACING_OPEN_THREAD_STAGING_DECOUPLED',
        severity: 'minor',
        description: `The ${r635a.aCount} scenes carrying outstanding clue-debt never coincide with the ${r635a.bCount} scenes leaning heavily on physical staging — unresolved mystery and physical presence run on separate tracks. A scene rich in staging is a natural place to give an open thread a physical anchor, but that pairing never occurs here.`,
        suggestedFix: `Let at least one heavily staged scene also carry open clue-debt — physical details tied to what's still unresolved, giving the mystery a tangible presence rather than existing only as a narrative tally.`,
      });
    }
  }

  // PACING_SEED_STAGING_AFTERMATH_VOID — Sequence/aftermath × seededClueIds trigger →
  // visualBeats absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying seed scenes (pos<n-2), ≥3 scenes anywhere with substantial physical staging, a
  // 2-scene lookahead window. Fires when every seed's two-scene aftermath contains no visually
  // dense scene, while such scenes do occur elsewhere. First pairing of these two fields in this
  // pass — every planted clue passes into an aftermath with no physical presence giving the
  // material texture.
  {
    const r635b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 3, window: 2,
      isTrigger: r => (r.seededClueIds ?? []).length > 0,
      isAftermath: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r635b.fires) {
      issues.push({
        location: `${r635b.triggerCount} seed scene(s) — no visually dense scene within 2 scenes of any`,
        rule: 'PACING_SEED_STAGING_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r635b.triggerCount} clue-planting scenes is followed by two scenes with no substantial physical staging, even though ${r635b.aftermathCount} such scenes exist elsewhere in the script. Seeds gain texture when the world around them briefly holds physical attention, but that opportunity consistently passes unstaged in the scenes immediately following every seed.`,
        suggestedFix: `After at least one seed, let one of the following two scenes carry substantial physical staging — the planted material or its surroundings given some visible presence before the pacing moves on.`,
      });
    }
  }

  // PACING_OPEN_THREAD_ZONE_IMBALANCE — Underweight/bloat × unresolvedClues × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 debt-carrying
  // scenes total, divided across four equal structural zones. Fires only when one zone has zero
  // such scenes while another holds ≥50% of the total. unresolvedClues had only ever been used as
  // an aftermath trigger (Wave 607's 7th-row extension); its own structural distribution had never
  // been audited in this file.
  {
    const r635c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r635c.fires) {
      const emptyNames635c = r635c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName635c = FOUR_ZONE_NAMES[r635c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames635c} empty; ${bloatName635c} has ${r635c.counts[r635c.bloatZoneIdx]}/${r635c.totalCount} debt-carrying scenes`,
        rule: 'PACING_OPEN_THREAD_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r635c.totalCount} scenes carrying outstanding clue-debt are unevenly distributed across its four structural zones: ${bloatName635c} contains ${r635c.counts[r635c.bloatZoneIdx]} of them (${Math.round((r635c.counts[r635c.bloatZoneIdx] / r635c.totalCount) * 100)}%) while ${emptyNames635c} contains none. Outstanding narrative debt bloats in one structural quarter and vanishes from another, giving the story's pacing of active mystery an uneven structural rhythm.`,
        suggestedFix: `Redistribute open threads: let at least one clue remain unresolved into the empty zone(s) — ${emptyNames635c} — so every structural quarter carries some sense of active, unanswered mystery.`,
      });
    }
  }

  // ── Wave 649: PACING_STAGING_PEAK_UNCAUSED, PACING_OPEN_THREAD_DROUGHT_RUN,
  //              PACING_HIGHLIGHT_ZONE_CLUSTER ───────────────────────────────────────────────

  // PACING_STAGING_PEAK_UNCAUSED — Single-peak isolation/backward-cause × visualBeats magnitude.
  // Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 visually-staged scenes, a
  // 2-scene lookback. Finds the single scene with the densest physical staging; fires when
  // neither that scene nor either of the two before it contains a dramatic turn or revelation.
  // First checkPeakUncaused use in this pass via the shared library — distinct from the existing
  // SUSPENSE/EMOTIONAL/CURIOSITY/PAYOFF_PEAK_UNCAUSED family, none of which audit the staging
  // channel.
  {
    const r649a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.visualBeats ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r649a.fires) {
      issues.push({
        location: `scene ${r649a.peakIdx + 1} — peak physical-staging density (${r649a.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'PACING_STAGING_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for physical staging (scene ${r649a.peakIdx + 1}, with ${r649a.peakMagnitude} staged beats) has no dramatic turn or revelation in itself or the two scenes before it. The moment where physical action concentrates most heavily arrives without any structural pivot or disclosure driving it, leaving the story's pacing to spend its most staged beat on causally unearned momentum.`,
        suggestedFix: `Give scene ${r649a.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most physically active moment is earned by a shift in the plot rather than arriving in a causal vacuum.`,
      });
    }
  }

  // PACING_OPEN_THREAD_DROUGHT_RUN — Run-based × unresolvedClues absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 open-thread scenes overall, fires
  // when the longest consecutive run of scenes with zero outstanding clue-debt reaches 6. This
  // pass already hand-rolls flatline/run logic for curiosity, emotion, clock, and suspense, but
  // never via the shared helper and never on the unresolvedClues channel — a long unbroken
  // stretch where every mystery is settled leaves the pacing engine with no open question to
  // modulate against.
  {
    const r649b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r649b.fires) {
      issues.push({
        location: `longest stretch with no outstanding clue-debt: ${r649b.longestRun} consecutive scenes`,
        rule: 'PACING_OPEN_THREAD_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r649b.longestRun} consecutive scenes with no outstanding clue-debt at all, even though ${r649b.presentCount} scenes elsewhere do carry open mysteries. A long stretch where nothing is left unresolved means the pacing has no open question to modulate its rhythm against for an extended run.`,
        suggestedFix: `Seed a new thread somewhere within the ${r649b.longestRun}-scene stretch so the pacing keeps some outstanding mystery to work against throughout that stretch.`,
      });
    }
  }

  // PACING_HIGHLIGHT_ZONE_CLUSTER — Distribution/timing × dialogueHighlights × structural thirds.
  // Built on checkZoneCluster from the shared checks library. n≥9, ≥3 highlighted-dialogue
  // scenes, fires when >75% of them fall in a single structural third. This pass already applies
  // the zone-cluster template to clock (CLOCK_ZONE_CLUSTER); this is the second channel — a scene
  // where a line of dialogue is flagged as memorable concentrates almost exclusively in one
  // third rather than surfacing throughout the story's pacing.
  {
    const r649c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r649c.fires) {
      const zoneName649c = r649c.zoneNames[r649c.maxZoneIdx];
      issues.push({
        location: `${zoneName649c} third — ${r649c.maxZoneCount}/${r649c.count} highlighted-dialogue scenes`,
        rule: 'PACING_HIGHLIGHT_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r649c.maxZoneCount} of the story's ${r649c.count} scenes carrying a standout line of dialogue (${Math.round((r649c.maxZoneCount / r649c.count) * 100)}%) cluster in the ${zoneName649c} third. Memorable dialogue concentrates almost exclusively in that stretch rather than landing throughout, leaving other structural thirds paced without a verbal high point to punctuate them.`,
        suggestedFix: `Give at least one scene outside the ${zoneName649c} third a standout line of dialogue — spreading memorable dialogue across the story lets each structural third carry its own verbal punctuation.`,
      });
    }
  }

  // ── Wave 663: PACING_RELATIONSHIP_PEAK_UNCAUSED, PACING_SEED_DROUGHT_RUN,
  //              PACING_PAYOFF_ZONE_CLUSTER ──────────────────────────────────────────────────

  // PACING_RELATIONSHIP_PEAK_UNCAUSED — Single-peak isolation/backward-cause × relationshipShifts
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 scenes carrying
  // a relationship shift, a 2-scene lookback. Finds the single scene with the most simultaneous
  // bond changes; fires when neither that scene nor either of the two before it contains a
  // dramatic turn or revelation. Distinct from the existing SUSPENSE/EMOTIONAL/CURIOSITY/PAYOFF/
  // STAGING_PEAK_UNCAUSED family, none of which audit the relational channel.
  {
    const r663a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.relationshipShifts ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r663a.fires) {
      issues.push({
        location: `scene ${r663a.peakIdx + 1} — peak relationship-shift density (${r663a.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'PACING_RELATIONSHIP_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for relationship shifts (scene ${r663a.peakIdx + 1}, with ${r663a.peakMagnitude} simultaneous bond changes) has no dramatic turn or revelation in itself or the two scenes before it. The moment where relational upheaval concentrates most heavily arrives without any structural pivot or disclosure driving it, leaving the story's pacing to spend its most relationally dense beat on causally unearned momentum.`,
        suggestedFix: `Give scene ${r663a.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most relationally dense moment is earned by a shift in the plot rather than arriving in a causal vacuum.`,
      });
    }
  }

  // PACING_SEED_DROUGHT_RUN — Run-based × seededClueIds absence. Built on checkDroughtRun from
  // the shared checks library. n≥10, ≥3 seed scenes overall, fires when the longest consecutive
  // run of scenes with zero clue seeded reaches 6. seededClueIds has only ever been an
  // aftermath-flat trigger in this pass; the drought-run template applied to a sixth channel.
  {
    const r663b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.seededClueIds ?? []).length > 0,
    });
    if (r663b.fires) {
      issues.push({
        location: `longest stretch with no clue seeded: ${r663b.longestRun} consecutive scenes`,
        rule: 'PACING_SEED_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r663b.longestRun} consecutive scenes with no clue seeded at all, even though ${r663b.presentCount} scenes elsewhere do plant new material. A long unbroken stretch where nothing new is planted leaves the pacing coasting on prior setups with nothing fresh to draw on.`,
        suggestedFix: `Seed a new clue or thread somewhere within the ${r663b.longestRun}-scene stretch so the pacing keeps planting forward momentum throughout, not only in isolated bursts.`,
      });
    }
  }

  // PACING_PAYOFF_ZONE_CLUSTER — Distribution/timing × payoffSetupIds × structural thirds. Built
  // on checkZoneCluster from the shared checks library. n≥9, ≥3 payoff scenes, fires when >75% of
  // them fall in a single structural third. payoffSetupIds anchors three aftermath-flat checks
  // and a peak-uncaused check already, but has never been cluster-audited; the zone-cluster
  // template applied to a third channel after clock and highlight.
  {
    const r663c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.payoffSetupIds ?? []).length > 0,
    });
    if (r663c.fires) {
      const zoneName663c = r663c.zoneNames[r663c.maxZoneIdx];
      issues.push({
        location: `${zoneName663c} third — ${r663c.maxZoneCount}/${r663c.count} payoff scenes`,
        rule: 'PACING_PAYOFF_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r663c.maxZoneCount} of the story's ${r663c.count} thread-resolution scenes (${Math.round((r663c.maxZoneCount / r663c.count) * 100)}%) cluster in the ${zoneName663c} third. Resolution concentrates almost exclusively in that stretch rather than landing throughout, leaving other structural thirds paced without a sense of accumulated payoff.`,
        suggestedFix: `Let at least one thread resolve outside the ${zoneName663c} third — spreading resolutions across the story lets each structural third carry its own sense of payoff.`,
      });
    }
  }

  // ── Wave 677: PACING_CLOCK_DELTA_PEAK_UNCAUSED, PACING_TURN_DROUGHT_RUN,
  //              PACING_STAKES_ZONE_CLUSTER ──────────────────────────────────────────────────

  // PACING_CLOCK_DELTA_PEAK_UNCAUSED — Single-peak isolation/backward-cause × clockDelta
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 scenes with
  // clockDelta>0, a 2-scene lookback. Finds the single scene with the highest clockDelta; fires
  // when neither that scene nor either of the two before it contains a dramatic turn or
  // revelation. clockDelta has only ever appeared as an OR-condition alongside clockRaised
  // inside aftermath triggers; the backward-cause peak mode applied to it standalone for the
  // first time.
  {
    const r677a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => r.clockDelta ?? 0,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r677a.fires) {
      issues.push({
        location: `scene ${r677a.peakIdx + 1} — peak clockDelta (${r677a.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'PACING_CLOCK_DELTA_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The scene with the story's single highest clockDelta (scene ${r677a.peakIdx + 1}, at ${r677a.peakMagnitude}) has no dramatic turn or revelation in itself or the two scenes before it. The moment time pressure compresses most sharply arrives without any structural pivot or disclosure driving it, leaving the story's pacing to spend its sharpest urgency beat on causally unearned momentum.`,
        suggestedFix: `Give scene ${r677a.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's sharpest deadline compression is earned by a shift in the plot rather than arriving in a causal vacuum.`,
      });
    }
  }

  // PACING_TURN_DROUGHT_RUN — Run-based × dramaticTurn presence absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 dramatic-turn scenes overall, fires
  // when the longest consecutive run of scenes with no dramatic turn reaches 6. dramaticTurn has
  // only ever served as an aftermath-void trigger or hasCause condition in this pass; the
  // drought-run mode applied to this channel for the first time.
  {
    const r677b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
    });
    if (r677b.fires) {
      issues.push({
        location: `longest stretch with no dramatic turn: ${r677b.longestRun} consecutive scenes`,
        rule: 'PACING_TURN_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r677b.longestRun} consecutive scenes with no dramatic turn at all, even though ${r677b.presentCount} scenes elsewhere do carry a structural pivot. A long stretch with no reversal or twist leaves the story's pacing running flat, without a structural joint to punctuate it for an extended run.`,
        suggestedFix: `Give at least one scene within the ${r677b.longestRun}-scene stretch a dramatic turn — even a modest reversal keeps the pacing structurally punctuated throughout that stretch.`,
      });
    }
  }

  // PACING_STAKES_ZONE_CLUSTER — Distribution/timing × purpose === 'raise_stakes' × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 stakes-raising
  // scenes, fires when >75% of them fall in a single structural third. `purpose` has only ever
  // anchored a single aftermath-flat trigger (STAKES_AFTERMATH_EMOTION_FLAT); the zone-cluster
  // mode applied to it for the first time.
  {
    const r677c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'raise_stakes',
    });
    if (r677c.fires) {
      const zoneName677c = r677c.zoneNames[r677c.maxZoneIdx];
      issues.push({
        location: `${zoneName677c} third — ${r677c.maxZoneCount}/${r677c.count} stakes-raising scenes`,
        rule: 'PACING_STAKES_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r677c.maxZoneCount} of the story's ${r677c.count} scenes purposed to raise stakes (${Math.round((r677c.maxZoneCount / r677c.count) * 100)}%) cluster in the ${zoneName677c} third. Escalation concentrates almost exclusively in that stretch of the story rather than compounding throughout, leaving other structural thirds paced without any mounting pressure.`,
        suggestedFix: `Purpose at least one scene outside the ${zoneName677c} third to raise stakes — spreading escalation across the story lets every structural third carry its own share of mounting pressure.`,
      });
    }
  }

  // ── Wave 691: PACING_SEED_PEAK_UNCAUSED, PACING_CLOCK_DROUGHT_RUN, PACING_TURN_ZONE_CLUSTER ──

  // PACING_SEED_PEAK_UNCAUSED — Single-peak isolation/backward-cause × seededClueIds magnitude.
  // Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 seed scenes, a 2-scene
  // lookback. Finds the single scene with the most simultaneous clues planted; fires when neither
  // that scene nor either of the two before it contains a dramatic turn or revelation. Wave 663
  // applied the drought-run mode to seededClueIds; the backward-cause peak mode has never been
  // applied to this channel.
  {
    const r691a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.seededClueIds ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r691a.fires) {
      issues.push({
        location: `scene ${r691a.peakIdx + 1} — peak seed density (${r691a.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'PACING_SEED_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for planting new clues (scene ${r691a.peakIdx + 1}, with ${r691a.peakMagnitude} clues seeded at once) has no dramatic turn or revelation in itself or the two scenes before it. The moment where foreshadowing concentrates most heavily arrives without any structural pivot or disclosure driving it, leaving the story's pacing to spend its most seed-dense beat on causally unearned momentum.`,
        suggestedFix: `Give scene ${r691a.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most seed-dense moment is earned by a shift in the plot rather than arriving in a causal vacuum.`,
      });
    }
  }

  // PACING_CLOCK_DROUGHT_RUN — Run-based × clockRaised absence. Built on checkDroughtRun from the
  // shared checks library. n≥10, ≥3 clock-raised scenes overall, fires when the longest
  // consecutive run of scenes with no clock raised reaches 6. This pass's Wave 579 hand-rolled
  // CLOCK_ZONE_CLUSTER already audits clockRaised distributionally; the shared-library drought-run
  // mode has never been applied to it.
  {
    const r691b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.clockRaised === true,
    });
    if (r691b.fires) {
      issues.push({
        location: `longest stretch with no clock raised: ${r691b.longestRun} consecutive scenes`,
        rule: 'PACING_CLOCK_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r691b.longestRun} consecutive scenes with no clock raised at all, even though ${r691b.presentCount} scenes elsewhere do establish time pressure. A long unbroken stretch with no deadline in play leaves the story's pacing without any urgency to modulate against for an extended run.`,
        suggestedFix: `Raise a clock somewhere within the ${r691b.longestRun}-scene stretch — a deadline, a closing window, a ticking consequence — so the pacing has some time pressure to work against throughout that stretch.`,
      });
    }
  }

  // PACING_TURN_ZONE_CLUSTER — Distribution/timing × dramaticTurn presence × structural thirds.
  // Built on checkZoneCluster from the shared checks library. n≥9, ≥3 dramatic-turn scenes, fires
  // when >75% of them fall in a single structural third. Wave 677 applied the drought-run mode to
  // dramaticTurn; the zone-cluster mode has never been applied to this channel.
  {
    const r691c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
    });
    if (r691c.fires) {
      const zoneName691c = r691c.zoneNames[r691c.maxZoneIdx];
      issues.push({
        location: `${zoneName691c} third — ${r691c.maxZoneCount}/${r691c.count} dramatic-turn scenes`,
        rule: 'PACING_TURN_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r691c.maxZoneCount} of the story's ${r691c.count} dramatic-turn scenes (${Math.round((r691c.maxZoneCount / r691c.count) * 100)}%) cluster in the ${zoneName691c} third. Structural pivots concentrate almost exclusively in that stretch of the story rather than surfacing throughout, leaving other structural thirds paced without a reversal to punctuate them.`,
        suggestedFix: `Give at least one scene outside the ${zoneName691c} third a dramatic turn — spreading structural pivots across the story lets every structural third carry its own punctuating reversal.`,
      });
    }
  }

  // ── Wave 705: PACING_SEED_ZONE_CLUSTER, PACING_OPEN_THREAD_PEAK_UNCAUSED,
  //              PACING_PAYOFF_PEAK_UNCAUSED ───────────────────────────────────────────────────

  // PACING_SEED_ZONE_CLUSTER — Distribution/timing × seededClueIds × structural thirds. Built on
  // checkZoneCluster from the shared checks library. n≥9, ≥3 seed scenes, fires when >75% of them
  // fall in a single structural third. Waves 663/691 applied the drought-run and backward-cause
  // peak modes to seededClueIds; the zone-cluster mode has never been applied to it, completing
  // the trio.
  {
    const r705a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.seededClueIds ?? []).length > 0,
    });
    if (r705a.fires) {
      const zoneName705a = r705a.zoneNames[r705a.maxZoneIdx];
      issues.push({
        location: `${zoneName705a} third — ${r705a.maxZoneCount}/${r705a.count} seed scenes`,
        rule: 'PACING_SEED_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r705a.maxZoneCount} of the story's ${r705a.count} clue-planting scenes (${Math.round((r705a.maxZoneCount / r705a.count) * 100)}%) cluster in the ${zoneName705a} third. Foreshadowing concentrates almost exclusively in that stretch of the story rather than surfacing throughout, giving the story's pacing an uneven structural rhythm.`,
        suggestedFix: `Plant at least one clue outside the ${zoneName705a} third — spreading foreshadowing across the story lets the pacing build gradually instead of arriving all at once.`,
      });
    }
  }

  // PACING_OPEN_THREAD_PEAK_UNCAUSED — Single-peak isolation/backward-cause × unresolvedClues
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 scenes carrying
  // outstanding clue-debt, a 2-scene lookback. Finds the single scene with the most simultaneous
  // open threads; fires when neither that scene nor either of the two before it contains a
  // dramatic turn or revelation. Wave 649 applied the drought-run mode to unresolvedClues; the
  // backward-cause peak mode has never been applied to it.
  {
    const r705b = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.unresolvedClues ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r705b.fires) {
      issues.push({
        location: `scene ${r705b.peakIdx + 1} — peak open-thread density (${r705b.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'PACING_OPEN_THREAD_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for outstanding clue-debt (scene ${r705b.peakIdx + 1}, with ${r705b.peakMagnitude} open threads) has no dramatic turn or revelation in itself or the two scenes before it. The moment where unresolved mystery concentrates most heavily arrives without any structural pivot or disclosure driving it, leaving the story's pacing to spend its most mystery-dense beat on causally unearned momentum.`,
        suggestedFix: `Give scene ${r705b.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most mystery-dense moment is earned by a shift in the plot rather than arriving in a causal vacuum.`,
      });
    }
  }

  // PACING_PAYOFF_PEAK_UNCAUSED — Single-peak isolation/backward-cause × payoffSetupIds magnitude.
  // Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 payoff scenes, a 2-scene
  // lookback. Finds the single scene with the most simultaneous thread resolutions; fires when
  // neither that scene nor either of the two before it contains a dramatic turn or revelation.
  // Wave 663 applied the zone-cluster mode to payoffSetupIds; the backward-cause peak mode has
  // never been applied to it.
  {
    const r705c = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.payoffSetupIds ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r705c.fires) {
      issues.push({
        location: `scene ${r705c.peakIdx + 1} — peak payoff density (${r705c.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'PACING_PAYOFF_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for thread resolution (scene ${r705c.peakIdx + 1}, with ${r705c.peakMagnitude} payoffs resolving at once) has no dramatic turn or revelation in itself or the two scenes before it. The moment where the most convergent resolution lands arrives without any structural pivot or disclosure driving it, leaving the story's pacing to spend its most convergent beat on causally unearned momentum.`,
        suggestedFix: `Give scene ${r705c.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most convergent resolution is earned by a shift in the plot rather than arriving in a causal vacuum.`,
      });
    }
  }

  // ── Wave 719: PACING_OPEN_THREAD_ZONE_CLUSTER, PACING_PAYOFF_DROUGHT_RUN,
  //              PACING_HIGHLIGHT_PEAK_UNCAUSED ───────────────────────────────────────────────

  // PACING_OPEN_THREAD_ZONE_CLUSTER — Distribution/timing × unresolvedClues × structural thirds.
  // Built on checkZoneCluster from the shared checks library. n≥9, ≥3 open-thread scenes, fires
  // when >75% of them fall in a single structural third. Waves 649/705 applied the drought-run
  // and backward-cause peak modes to unresolvedClues; the zone-cluster mode has never been
  // applied to it, completing the trio.
  {
    const r719a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r719a.fires) {
      const zoneName719a = r719a.zoneNames[r719a.maxZoneIdx];
      issues.push({
        location: `${zoneName719a} third — ${r719a.maxZoneCount}/${r719a.count} open-thread scenes`,
        rule: 'PACING_OPEN_THREAD_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r719a.maxZoneCount} of the story's ${r719a.count} scenes carrying outstanding clue-debt (${Math.round((r719a.maxZoneCount / r719a.count) * 100)}%) cluster in the ${zoneName719a} third. Open questions concentrate almost exclusively in that stretch of the story rather than persisting throughout, leaving other structural thirds with no live mystery for the pacing to modulate against.`,
        suggestedFix: `Let a clue remain unresolved into a scene outside the ${zoneName719a} third — spreading open threads across the story gives the pacing something to modulate against in every structural third.`,
      });
    }
  }

  // PACING_PAYOFF_DROUGHT_RUN — Run-based × payoffSetupIds absence. Built on checkDroughtRun from
  // the shared checks library. n≥10, ≥3 payoff scenes overall, fires when the longest consecutive
  // run of scenes with zero thread resolution reaches 6. Waves 663/705 applied the zone-cluster
  // and backward-cause peak modes to payoffSetupIds; the drought-run mode has never been applied
  // to it, completing the trio.
  {
    const r719b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.payoffSetupIds ?? []).length > 0,
    });
    if (r719b.fires) {
      issues.push({
        location: `longest stretch with no payoff: ${r719b.longestRun} consecutive scenes`,
        rule: 'PACING_PAYOFF_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r719b.longestRun} consecutive scenes with no thread resolving at all, even though ${r719b.presentCount} scenes elsewhere do pay off a setup. A long stretch where nothing resolves leaves the story's pacing running on unresolved momentum for an extended run.`,
        suggestedFix: `Resolve at least one thread somewhere within the ${r719b.longestRun}-scene stretch so the pacing keeps building toward release throughout that stretch.`,
      });
    }
  }

  // PACING_HIGHLIGHT_PEAK_UNCAUSED — Single-peak isolation/backward-cause × dialogueHighlights
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 highlighted-
  // dialogue scenes, a 2-scene lookback. Finds the single scene with the most highlighted lines;
  // fires when neither that scene nor either of the two before it contains a dramatic turn or
  // revelation. Wave 649 applied the zone-cluster mode to dialogueHighlights; the backward-cause
  // peak mode has never been applied to it.
  {
    const r719c = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.dialogueHighlights ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r719c.fires) {
      issues.push({
        location: `scene ${r719c.peakIdx + 1} — peak highlighted-dialogue density (${r719c.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'PACING_HIGHLIGHT_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for highlighted dialogue (scene ${r719c.peakIdx + 1}, with ${r719c.peakMagnitude} standout lines) has no dramatic turn or revelation in itself or the two scenes before it. The moment where the script's most memorable dialogue concentrates arrives without any structural pivot or disclosure driving it, leaving the story's pacing to spend its most verbally dense beat on causally unearned momentum.`,
        suggestedFix: `Give scene ${r719c.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most quotable moment is earned by a shift in the plot rather than arriving in a causal vacuum.`,
      });
    }
  }

  const { revised, usedLLM } = await rewritePass({ fountain, issues, passName: 'pacing', approvedSpans, storyContext: input.storyContext, priorPassResults: input.priorPassResults });
  const changed = revised !== fountain;

  return {
    pass: 'pacing',
    issues,
    revisedFountain: revised,
    changed,
    summary: issues.length === 0
      ? 'Pacing pass: scene lengths are balanced'
      : `Pacing pass: ${issues.length} issue(s) — ${usedLLM ? 'rewritten' : 'flagged (stub mode)'}`,
  };
}
