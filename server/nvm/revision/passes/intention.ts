// Wave 39 — Pass 3: Intention
// Checks character intention clarity: characters acting without readable goals,
// want/fear asymmetry, unmotivated entrances.
// Wave 142 additions: scene entropy detection (scenes that don't advance plot,
// character development, or theme; scenes with zero narrative momentum).
// Wave 156 additions: protagonist reactive dominance (protagonist is purely reactive
// in Act 2 with no initiation), intention dropout (character introduced in Act 1
// dialogue vanishes from second half), want/fear collision absent (no scene shows
// the protagonist gaining something while losing a relationship, or vice versa).
// Wave 258 additions: proactive midpoint void (initiative dead at the pivot),
// proactive desert run (4+ passive scenes in an active story), revelation without
// proactive (discoveries unearned by the protagonist's initiative).
// Wave 272 additions: proactive Act 2a void (25-50% zone initiative-free),
// proactive late surge (passive first half, burst in second half),
// payoff without effort (callbacks not preceded by protagonist action).
// Wave 286 additions: reactive climax (climax scene has no proactive markers),
// seed graveyard (seeded clues with no payoffs in second half),
// purpose monotone (>70% of scenes share the same purpose).
// Wave 300 additions: curiosity without agency (curiosity spikes never tied to
// protagonist initiative), turns undriven (no dramatic turn occurs at or right
// after a proactive act), seeding curiosity flat (clue plants never raise curiosity).
// Wave 314 additions: proactive suspense decoupled (proactive scenes' own avg
// suspenseDelta ≤ 0), proactive global scarcity (<15% of all scenes proactive),
// stakes raised externally (raise_stakes scenes none of which are proactive).
// Wave 339 additions: proactive emotion decoupled (≥3 proactive scenes all emotionally
// neutral — initiative without feeling), proactive revelation absent (≥3 proactive
// scenes none followed by a revelation in the next 2 scenes — agency without discovery),
// proactive relationship void (≥3 proactive scenes none with any relationship shift).
// Wave 353 additions: proactive curiosity decoupled (proactive scenes avg curiosityDelta ≤ 0
// — initiative opens no questions), proactive suspense peak decoupled (the story's highest-
// suspense scene is not protagonist-driven), proactive curiosity peak decoupled (the story's
// highest-curiosity scene is not protagonist-driven).
// Wave 367 additions: proactive adversity absent (the protagonist's negative-emotion scenes
// are never proactive — they never fight back from a low point), proactive backloaded (>70%
// of proactive acts fall in the second half — initiative arrives late, distributed differently
// from the all-or-nothing late-surge and the single-burst overclustering checks), proactive
// payoff coincidence absent (no scene is both proactive and a payoff — the protagonist's
// initiative never lands a payoff in the same moment it is exerted).
// Wave 381 additions: proactive Act 2b void (no initiative in the 50%–75% run-up to the
// climax while the protagonist acts elsewhere — fills the Act-zone set), proactive front-
// loaded (>70% of proactive acts in the first half — the distribution mirror of proactive
// backloaded), proactive revelation coincidence absent (no proactive scene is itself a
// revelation — initiative never directly turns up a truth in the same beat).
// Wave 395 additions: proactive relationship peak absent (the single largest relational
// shift is not in a proactive scene even though smaller shifts coincide with initiative —
// single-peak isolation × relationship magnitude), proactive emotional recoil absent (no
// proactive act is followed by a negative emotional shift in the next 2 scenes —
// aftermath/sequence × emotional cost), seed backloaded (all seeded clues fall in the
// second half — distribution mirror of INTENTION_SEED_GRAVEYARD).
// Wave 409 additions: proactive payoff peak decoupled (the scene that resolves the most
// setups is not proactive even though smaller payoffs coincide with initiative — single-peak
// isolation × payoff magnitude, the payoff sibling of PROACTIVE_RELATIONSHIP_PEAK_ABSENT),
// seed frontloaded (all seeded clues fall in the first half — the back half plants no new
// threads, the distribution mirror of SEED_BACKLOADED), proactive suspense aftermath absent
// (no proactive act is followed by a suspense spike in the next 2 scenes — initiative never
// raises tension downstream, aftermath/sequence × suspense channel).
// Wave 423 additions: seed midpoint void (no clue-seeding scene falls in the 40%–60% zone
// while seeds exist elsewhere — the structural pivot receives no new threads; zone presence/
// absence × seed × midpoint), proactive aftermath curiosity absent (no proactive act is
// followed by a curiosity rise in the next 2 scenes — initiative opens no forward questions;
// sequence/aftermath × curiosity, completing the aftermath family alongside suspense and
// revelation), seed drama decoupled (no clue-seeding scene coincides with a dramatic turn —
// threads planted in quiet exposition rather than at story pivots; co-occurrence/decoupling ×
// seed × dramatic turn).
// Wave 437 additions: seed run isolated (≥3 consecutive scenes each planting a clue — a rapid-fire
// burst of thread-laying that overwhelms individual threads; run-based × seed channel, first
// consecutive-run check for seeds), proactive zone imbalance (one structural zone has 0 proactive
// acts while another has ≥50% of all initiative — bloat and void co-present simultaneously;
// underweight/bloat × initiative distribution, first four-zone audit of imbalance), seed clockless
// (all seed scenes have no clock pressure — threads always planted in calm moments, never under
// urgency; co-occurrence/decoupling × seed × clock, first seed × clock intersection check).
// Wave 451 additions: proactive relationship aftermath absent (≥3 proactive acts all followed by
// 2 scenes with no relationship shift — initiative never moves any relationship downstream;
// sequence/aftermath × relationship × proactive, fourth aftermath check completing the family),
// seed emotional decoupled (≥3 seed scenes all emotionally neutral — threads planted at room
// temperature with no emotional charge attached; co-occurrence × seed × emotional channel),
// seed cause void (≥3 seed scenes all lacking any upstream dramatic trigger in themselves or
// the prior scene — clues arrive in a dramatic vacuum with no primed attention; backward-cause ×
// seed channel, first backward-cause check for seeds).
// Wave 465 additions: proactive clock aftermath absent (≥3 proactive acts none followed by a
// clock event in the next 2 scenes — initiative never escalates a deadline downstream;
// sequence/aftermath × clock channel, fifth and final proactive-aftermath family member),
// payoff drama decoupled (≥2 payoff scenes and ≥2 turn scenes but no payoff coincides with a
// turn — callbacks land in quiet moments while pivots resolve no planted threads;
// co-occurrence/decoupling × payoff × dramatic turn), revelation frontloaded (≥4 revelations
// with >70% in the first half — the story discloses its truths early and the back half runs on
// established fact; distribution/timing × revelation channel).
// Wave 479 additions: revelation run (≥3 consecutive revelation scenes — rapid information
// dump that crowds out audience processing time; run-based × revelation channel, third
// run-based check completing the family alongside PROACTIVE_DESERT_RUN and SEED_RUN_ISOLATED),
// payoff final zone void (≥4 payoffs, none in the final 25% — Act 3 resolves no planted
// threads, the climax carries no callback weight; zone presence/absence × payoff × Act 3,
// extending the zone family to the payoff channel), revelation curiosity flat (≥3 revelation
// scenes averaging curiosityDelta ≤ 0 — disclosures collectively fail to open new questions;
// average/aggregate × revelation × curiosity, new average/aggregate check on the revelation
// channel).
// Wave 493 additions: payoff curiosity flat (≥3 payoff scenes averaging curiosityDelta ≤ 0 —
// callbacks close questions but open none; average/aggregate × payoff × curiosity, the payoff
// sibling of REVELATION_CURIOSITY_FLAT and distinct from all proactive-curiosity checks which
// target initiative, not closure scenes), seed Act 1 void (no clue seeded in the first 25%
// while seeds exist later — the audience enters Act 2 carrying no planted threads; zone
// presence/absence × seed × opening quarter, distinct from SEED_MIDPOINT_VOID which targets
// the 40-60% zone and SEED_FRONTLOADED/BACKLOADED which use distribution ratios), payoff run
// (≥3 consecutive payoff scenes — thread-closures dump in a burst overwhelming individual
// resolution weight; run-based × payoff channel, completing the run family alongside
// PROACTIVE_DESERT_RUN, SEED_RUN_ISOLATED, and REVELATION_RUN).
// Wave 507 additions: payoff suspense aftermath void (average/aggregate × payoff → suspense
// aftermath — n≥8, ≥3 payoff scenes not at last position, avg suspenseDelta of immediately
// following scene ≤ 0; thread resolutions never carry forward tension into what follows; distinct
// from PAYOFF_CURIOSITY_FLAT which checks the payoff scene's OWN curiosity, and from PROACTIVE_
// SUSPENSE_AFTERMATH_ABSENT which uses an initiative trigger not a payoff trigger), revelation
// closing void (zone presence/absence × revelation × closing third — n≥9, ≥3 revelations, none
// in the final third; the resolution zone discloses nothing; distinct from REVELATION_FRONTLOADED
// which uses a 70% first-half ratio and REVELATION_RUN which is run-based), payoff seed decoupled
// (co-occurrence/decoupling × payoff × seed — n≥8, ≥2 payoff scenes, ≥2 seed scenes, zero
// overlap; resolutions never simultaneously plant new threads; distinct from PAYOFF_DRAMA_DECOUPLED
// which pairs payoff × dramatic turn, and SEED_DRAMA_DECOUPLED which pairs seed × dramatic turn).
// Wave 535 additions: payoff clock decoupled (co-occurrence/decoupling × payoff × clockRaised —
// n≥8, ≥3 payoff scenes, ≥2 clockRaised scenes, zero overlap; thread resolutions never coincide
// with deadline pressure; completes the payoff co-occurrence family alongside payoff × dramatic-
// turn, revelation, seed, and emotion; distinct from PAYOFF_SUSPENSE_FLAT which uses average mode
// on suspenseDelta not co-occurrence on clockRaised), payoff peak uncaused (backward-cause ×
// single-peak × payoff — n≥8, ≥2 payoff scenes at pos≥2; the scene with the most payoffSetupIds
// has no revelation, dramatic-turn, suspense rise, or clockRaise in either prior scene; the
// heaviest resolution arrives without preparation; the payoff-peak complement of SEED_PEAK_UNCAUSED
// which audits the seed peak, and of PROACTIVE_PAYOFF_PEAK_DECOUPLED which checks the payoff peak
// for absence of initiative rather than backward-cause), payoff back-loaded (distribution/timing ×
// payoff × second half — n≥8, ≥4 payoff scenes, >70% in second half while first half has ≥1;
// all resolutions deferred to the back half; the back-loaded complement of SEED_FRONTLOADED which
// audits the seed channel front-loaded; distinct from PAYOFF_EMOTION_DECOUPLED which is co-
// occurrence and from PAYOFF_SUSPENSE_AFTERMATH_VOID which is aftermath mode).
// Wave 549 additions: revelation suspense flat (average/aggregate × revelation × suspenseDelta —
// n≥8, ≥3 revelation scenes, avg suspenseDelta ≤ 0; disclosures never raise tension; sibling of
// REVELATION_CURIOSITY_FLAT in the suspense direction; distinct from CONFLICT_SUSPENSE_DECOUPLED
// [conflict scenes] and PAYOFF_SUSPENSE_AFTERMATH_VOID [payoff aftermath]), revelation emotion
// decoupled (co-occurrence × revelation × emotionalShift — n≥8, ≥3 revelation scenes, ≥2 emotional
// scenes, zero overlap; truths always surface in emotionally flat scenes; distinct from PAYOFF_
// EMOTION_DECOUPLED [payoff × emotion] and SEED_EMOTIONAL_DECOUPLED [seed × emotion]; first check
// pairing revelation with emotionalShift in co-occurrence mode), revelation cause void (backward-cause
// × revelation as effect — n≥8, ≥3 revelation scenes; every disclosure has no proactive act, dramatic
// turn, or suspense rise in itself or the prior scene; revelation-channel parallel of SEED_CAUSE_VOID;
// distinct from PROACTIVE_REVELATION_ABSENT [aftermath: proactive → revelation downstream] and from
// PAYOFF_PEAK_UNCAUSED [backward-cause × peak payoff]).
// Wave 577 additions: seed zone cluster (distribution/timing × seed × structural thirds — n≥9,
// ≥3 seed scenes, >75% in one third; clue-planting ghettoized into one zone; finer-grained than
// SEED_FRONT_LOADED [binary half-partition]; distinct from SEED_MIDPOINT_VOID [zone-absence at
// midpoint not concentration in any third], SEED_PEAK_UNCAUSED [backward-cause × seed peak]),
// clock revelation aftermath void (sequence/aftermath × clock → revelation aftermath — n≥8, ≥2
// qualifying clockRaised scenes [pos<n-1], ≥2 revelation scenes globally, every clock scene
// followed by 2 scenes with no revelation; deadline escalations never surface hidden truths in
// their wake; the clock-trigger complement of REVELATION_CLOCK_AFTERMATH_VOID [revelation trigger
// → clock aftermath; this reverses the causal direction]; distinct from PROACTIVE_CLOCK_AFTERMATH_
// ABSENT [different aftermath channel]), seed curiosity decoupled (co-occurrence/decoupling × seed
// × curiosity — n≥8, ≥2 seed scenes, ≥2 curiosity-positive scenes, zero overlap; every seed scene
// has curiosityDelta ≤ 0 while curiosity rises elsewhere; clue-planting never raises wonder in the
// same scene; first co-occurrence check pairing the seed channel with curiosityDelta in this pass,
// distinct from PAYOFF_EMOTION_DECOUPLED [payoff not seed channel] and REVELATION_CLOCK_AFTERMATH_
// VOID [aftermath mode not co-occurrence × same scene]).
// Wave 563 additions: revelation drought run (run-based × revelation absence — n≥10, ≥2 revelation
// scenes, longest consecutive run of non-revelation scenes ≥6; the disclosure engine goes dark for
// an extended local stretch; the ABSENCE complement of REVELATION_RUN [presence run], distinct from
// REVELATION_FRONTLOADED [global half-skew] and REVELATION_CLOSING_VOID [fixed closing zone]),
// revelation zone cluster (distribution/timing × revelation × structural thirds — n≥9, ≥3 revelation
// scenes, >75% in a single third; disclosures ghettoized into one zone; finer-grained than the binary
// REVELATION_FRONTLOADED half-partition and can fire on a middle-third cluster it would miss, distinct
// from REVELATION_CLOSING_VOID [absence not over-concentration]), revelation clock aftermath void
// (sequence/aftermath × revelation → clock — n≥8, ≥2 revelation scenes [pos<n-1], ≥2 clock scenes
// globally, every revelation followed by 2 scenes with no clockRaised; disclosure never tightens the
// deadline in its wake; the revelation-trigger sibling of PROACTIVE_CLOCK_AFTERMATH_ABSENT, distinct
// from REVELATION_CAUSE_VOID [backward-cause, what precedes] and PAYOFF_CLOCK_DECOUPLED [same-scene]).
// Wave 591 additions: payoff relationship decoupled (co-occurrence/decoupling × payoff ×
// relationshipShifts — n≥8, ≥3 payoff scenes, ≥2 relational-shift scenes, zero overlap;
// thread resolutions never coincide with a relational shift; completes the payoff co-occurrence
// family — which already pairs payoff with dramatic turn, seed, clock, and emotionalShift — by
// adding the one signal it had never touched; distinct from PAYOFF_EMOTION_DECOUPLED [categorical
// emotionalShift, not relational structure] and from PROACTIVE_RELATIONSHIP_AFTERMATH_ABSENT
// [sequence/aftermath on the proactive channel, checks the 2 FOLLOWING scenes, not same-scene
// payoff co-occurrence]), revelation relationship decoupled (co-occurrence/decoupling ×
// revelation × relationshipShifts — n≥8, ≥3 revelation scenes, ≥2 relational-shift scenes, zero
// overlap; disclosures never coincide with a relational shift — truths surface without moving any
// bond; distinct from REVELATION_EMOTION_DECOUPLED [emotionalShift not relationshipShifts] and
// REVELATION_CAUSE_VOID [backward-cause, what precedes a revelation, not what co-occurs with it];
// first check pairing the revelation channel with relationshipShifts in this pass), payoff zone
// imbalance (underweight/bloat × payoff × four structural zones — n≥10, ≥4 payoff scenes; at
// least one zone has zero payoffs while another holds ≥50% of the total; resolutions simultaneously
// vanish from one structural quarter and bloat in another; mirrors PROACTIVE_ZONE_IMBALANCE [Wave
// 437: same 4-zone void+bloat co-presence test, but on the initiative channel] applied here to the
// payoff channel for the first time; distinct from PAYOFF_BACK_LOADED [binary half-partition ratio,
// not 4-zone void+bloat] and PAYOFF_FINAL_ZONE_VOID [single fixed zone absence, no bloat
// requirement]).
// Wave 521 additions: seed peak uncaused (backward-cause × single-peak × seed — n≥8, ≥2 seed
// scenes, the single scene planting the most clues has no revelation, dramatic turn, suspense rise,
// or clockRaise in either of the 2 preceding scenes; foreshadowing peaks without preparation; first
// backward-cause check in this pass, distinct from PROACTIVE_PAYOFF_PEAK_DECOUPLED which audits
// the payoff peak vs. initiative and PROACTIVE_SUSPENSE_PEAK_DECOUPLED which audits suspense peak),
// seed front-loaded (distribution/timing × seed × first half — n≥8, ≥4 seed scenes, >70% in first
// half while back half has ≥1; foreshadowing planted before the midpoint leaves the back half
// threadless; first distribution check on the seed channel, distinct from REVELATION_FRONTLOADED
// which uses the revelation channel and SEED_MIDPOINT_VOID which is a zone not distribution check),
// payoff emotion decoupled (co-occurrence × payoff × emotionalShift — n≥8, ≥3 payoff scenes, ≥2
// emotional scenes, zero overlap; thread resolutions are always emotionally flat; first check
// pairing the payoff channel with emotionalShift in co-occurrence mode, distinct from PAYOFF_
// CURIOSITY_FLAT and PAYOFF_SUSPENSE_FLAT which use average mode, and from PAYOFF_DRAMA_DECOUPLED /
// PAYOFF_REVELATION_DECOUPLED / PAYOFF_SEED_DECOUPLED which pair payoff with different channels).
// Wave 605 additions (built on the shared checks library, audit M2.2): OPEN_THREAD_REVELATION_
// DECOUPLED (co-occurrence/decoupling × unresolvedClues × revelation — first use of unresolvedClues
// anywhere in this 99-rule pass, despite its central concern with seed/payoff debt), PHYSICAL_
// STAGING_ZONE_IMBALANCE (underweight/bloat × visualBeats × four structural zones — first use of
// visualBeats anywhere in this pass), OPEN_THREAD_PAYOFF_AFTERMATH_VOID (sequence/aftermath ×
// heavy unresolvedClues debt → payoff absence).
// Wave 619 additions (built on the shared checks library, audit M2.2): PAYOFF_PHYSICAL_STAGING_
// DECOUPLED (co-occurrence/decoupling × payoffSetupIds × visualBeats — visualBeats has never been
// paired with any other field in this 102-rule pass, only used standalone in Wave 605's zone
// check), SEED_STAGING_AFTERMATH_VOID (sequence/aftermath × seededClueIds trigger → visualBeats
// absence), PHYSICAL_STAGING_PEAK_UNCAUSED (backward-cause × visualBeats-density peak ×
// revelation/dramaticTurn cause).
// Wave 633 additions (built on the shared checks library, audit M2.2): INTENTION_HIGHLIGHT_OPEN_
// THREAD_DECOUPLED (co-occurrence/decoupling × dialogueHighlights × unresolvedClues — first
// pairing of these two fields in this 105-rule pass), INTENTION_CLOCK_STAGING_AFTERMATH_VOID
// (sequence/aftermath × clockRaised trigger → visualBeats absence — first pairing of these two
// fields), INTENTION_OPEN_THREAD_ZONE_IMBALANCE (underweight/bloat × unresolvedClues × four
// structural zones — Wave 605 applied this template to visualBeats only; unresolvedClues itself
// has never been zone-audited here).

import type { PassInput, PassResult, RevisionIssue } from './types.ts';
import { rewritePass } from '../rewrite.ts';
import { checkCoOccurrenceDecoupled, checkZoneImbalance, checkAftermathVoid, checkPeakUncaused, FOUR_ZONE_NAMES } from './lib/checks.ts';

/** Extract unique character IDs from dialogue highlights across all records */
function extractCharacterIds(records: PassInput['records']): Set<string> {
  const chars = new Set<string>();
  for (const r of records) {
    for (const d of r.dialogueHighlights) {
      // Highlights are propositions like "alice: believes X"
      const match = d.match(/^(\w+):/);
      if (match) chars.add(match[1]);
    }
    // Also extract from slug (primitive heuristic)
  }
  return chars;
}

export async function intentionPass(input: PassInput): Promise<PassResult> {
  const { fountain, records, structure, approvedSpans } = input;
  const issues: RevisionIssue[] = [];
  const n = records.length;

  // ── Characters with no dialogue/belief traces may be props ────────────────
  const activeChars = extractCharacterIds(records);
  const linesInFountain = fountain.split('\n');
  // Fountain character cues are ALL-CAPS lines that aren't sluglines/transitions
  const fountainChars = new Set<string>();
  for (const line of linesInFountain) {
    if (/^[A-Z][A-Z0-9\s\-'\.]{2,}$/.test(line.trim()) && !/^(INT\.|EXT\.|CUT TO|FADE|SMASH|THE END|ACT|MIDPOINT|SCENE)/i.test(line.trim())) {
      fountainChars.add(line.trim().split('(')[0].trim());
    }
  }

  // Characters in fountain with no belief traces are intention-invisible
  for (const char of fountainChars) {
    const slug = char.toLowerCase().replace(/\s+/g, '_');
    if (!activeChars.has(slug) && !activeChars.has(char.toLowerCase())) {
      if (char !== 'NARRATOR' && char !== 'V.O.' && char !== 'O.S.') {
        issues.push({
          location: `Character: ${char}`,
          rule: 'INTENTION_INVISIBLE',
          description: `${char} appears in the screenplay but has no tracked beliefs or goals — their intention is opaque`,
          severity: 'minor',
          suggestedFix: `Give ${char} a clear want in their first scene (verbal or physical action)`,
        });
      }
    }
  }

  // ── Escalation without character agency ───────────────────────────────────
  if (structure.escalating && structure.reversalCount === 0) {
    issues.push({
      location: 'Overall intention layer',
      rule: 'PASSIVE_ESCALATION',
      description: 'Story escalates but no character causes a reversal — escalation feels external/accidental',
      severity: 'major',
      suggestedFix: 'Make a character\'s deliberate choice the engine of the next escalation',
    });
  }

  // ── Repeated scene purpose (3+ consecutive same-purpose scenes) ──────────
  // Three consecutive scenes tagged with the same purpose signal stalled momentum.
  if (records.length >= 3) {
    let streakPurpose = records[0].purpose;
    let streakStart = 0;
    let streakLen = 1;
    for (let i = 1; i < records.length; i++) {
      if (records[i].purpose === streakPurpose) {
        streakLen++;
      } else {
        streakPurpose = records[i].purpose;
        streakStart = i;
        streakLen = 1;
      }
      if (streakLen === 3) {
        // Low-momentum ScenePurpose values that stall the story when repeated 3+
        // times. These are the non-escalating purposes from the ScenePurpose enum;
        // the dramatic purposes (raise_stakes, revelation, turning_point, climax,
        // complicate, introduce_conflict) are expected to recur and aren't flagged.
        const lowMomentumPurposes = new Set<string>([
          'establish_world', 'character_moment', 'resolution',
        ]);
        if (lowMomentumPurposes.has(streakPurpose)) {
          issues.push({
            location: `Scenes ${streakStart}–${i} (${records[streakStart].slug})`,
            rule: 'REPEATED_PURPOSE',
            description: `Three consecutive scenes share the same purpose (${streakPurpose}) — the story stalls without a shift in function`,
            severity: 'major',
            suggestedFix: `Break the run of "${streakPurpose}" scenes with a scene that raises stakes, complicates the situation, or delivers a revelation`,
          });
          // Reset streak so a longer run doesn't re-fire at exactly 3 again
          streakLen = 0;
          streakStart = i + 1;
        }
      }
    }
  }

  // ── Act 3 without a character making the climactic choice ─────────────────
  if (structure.actPosition === 'act3' || structure.actPosition === 'epilogue') {
    const act3Records = records.slice(Math.floor(records.length * 0.75));
    // Check purpose rather than dramaticTurn string: deriveDramaticTurn never returns 'none',
    // so the dramaticTurn field is always truthy. Purpose reflects actual op content.
    const dramaticPurposes = new Set(['climax', 'turning_point', 'revelation', 'raise_stakes']);
    const hasClearTurn = act3Records.some(r => dramaticPurposes.has(r.purpose));
    if (!hasClearTurn && act3Records.length > 0) {
      issues.push({
        location: 'Act 3',
        rule: 'CLIMAX_WITHOUT_CHOICE',
        description: 'The third act contains no climax, turning point, or revelation — the climax lacks a character-driven resolution',
        severity: 'critical',
        suggestedFix: 'Add a moment where the protagonist makes an irreversible choice that resolves the central tension',
      });
    }
  }

  // ── Wave 142: Scene Entropy — scenes that don't advance story ──────────────
  // ZERO_ENTROPY_SCENE: A scene with no emotional shift, no relationship change,
  // no clues planted, and no clock raised — the scene changes nothing. These are
  // narrative dead zones that kill momentum.
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const hasEmotionalShift = r.emotionalShift !== 'neutral';
    const hasRelationshipShift = (r.relationshipShifts?.length ?? 0) > 0;
    const hasPlantedClues = (r.seededClueIds?.length ?? 0) > 0;
    const hasClockPressure = r.clockRaised || r.clockDelta > 1;
    const isHighDrama = r.suspenseDelta > 2;

    const hasAnyMomentum = hasEmotionalShift || hasRelationshipShift || hasPlantedClues || hasClockPressure || isHighDrama;

    if (!hasAnyMomentum && records.length >= 6) {
      // Only flag if this is a middle scene (not opening setup, not closing epilogue)
      const isMiddle = i > 0 && i < records.length - 1;
      if (isMiddle) {
        issues.push({
          location: `Scene ${i} (${r.slug})`,
          rule: 'ZERO_ENTROPY_SCENE',
          description: `Scene ${i} has no emotional shift, relationship change, planted clues, or clock pressure — the scene advances neither plot nor character`,
          severity: 'major',
          suggestedFix: 'Either add a moment where someone learns something, feels something, or commits to something; or cut the scene entirely',
        });
      }
    }
  }

  // ENTROPY_CLUSTER: Three consecutive scenes with low momentum (suspense delta < 1).
  // This indicates a pacing dead zone where the story stalls.
  let lowMomentumCount = 0;
  let clusterStart = -1;
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const isLowMomentum = r.suspenseDelta < 1 && (r.relationshipShifts?.length ?? 0) === 0 && (r.seededClueIds?.length ?? 0) === 0;

    if (isLowMomentum) {
      if (lowMomentumCount === 0) clusterStart = i;
      lowMomentumCount++;
    } else {
      lowMomentumCount = 0;
    }

    if (lowMomentumCount === 3) {
      issues.push({
        location: `Scenes ${clusterStart}–${i}`,
        rule: 'ENTROPY_CLUSTER',
        description: `Three consecutive scenes (${clusterStart}–${i}) have low suspense and no relationship/clue advancement — the story stalls in a dead zone`,
        severity: 'major',
        suggestedFix: 'Add a turning point, revelation, or relationship shift to one of these scenes; or consolidate them into a single tighter scene',
      });
      lowMomentumCount = 0; // reset to avoid duplicate flags
    }
  }

  // ── Wave 156: Protagonist reactive dominance ──────────────────────────────
  // PROTAGONIST_REACTIVE_DOMINANCE: In Act 2 (scenes 25%-75%), the protagonist
  // faces sustained high-stakes pressure but never once initiates action — no
  // clock raised, no clue planted. A protagonist who only reacts to external
  // forces is a passenger in their own story. Requires 8+ scenes, 3+ high-
  // stakes reactive scenes in Act 2, and zero proactive scenes in Act 2.
  if (n >= 8) {
    const act2Start = Math.floor(n * 0.25);
    const act2End = Math.floor(n * 0.75);
    const act2Records = records.slice(act2Start, act2End);

    const proactiveScenes = act2Records.filter(
      r => r.clockRaised || (r.seededClueIds?.length ?? 0) > 0,
    ).length;
    const reactiveHighStakeScenes = act2Records.filter(
      r => r.suspenseDelta > 1.5 && !r.clockRaised && (r.seededClueIds?.length ?? 0) === 0,
    ).length;

    if (reactiveHighStakeScenes >= 3 && proactiveScenes === 0) {
      issues.push({
        location: `Act 2 (Scenes ${act2Start}–${act2End - 1})`,
        rule: 'PROTAGONIST_REACTIVE_DOMINANCE',
        description: `Act 2 has ${reactiveHighStakeScenes} high-stakes scenes but the protagonist never initiates action (no clock raised, no clue planted) — the protagonist is entirely reactive, a passenger in their own story`,
        severity: 'major',
        suggestedFix: 'Add at least one Act 2 scene where the protagonist drives the plot forward: they raise a clock, plant a trap, reveal a secret, or confront the antagonist on their own terms',
      });
    }
  }

  // ── INTENTION_DROPOUT ────────────────────────────────────────────────────
  // A character who appears prominently in Act 1 dialogue (2+ belief traces
  // in the first 30% of scenes) but never appears again in the second half
  // (from the midpoint onward). Their intention is opened but never resolved —
  // the audience's investment in them has nowhere to land.
  if (n >= 8) {
    const act1TraceEnd = Math.floor(n * 0.3);
    const secondHalfStart = Math.floor(n * 0.5);

    const charEarlyCount = new Map<string, number>();
    for (const r of records.slice(0, act1TraceEnd)) {
      for (const d of r.dialogueHighlights) {
        const m = d.match(/^(\w+):/);
        if (m) charEarlyCount.set(m[1], (charEarlyCount.get(m[1]) ?? 0) + 1);
      }
    }

    const charsInSecondHalf = new Set<string>();
    for (const r of records.slice(secondHalfStart)) {
      for (const d of r.dialogueHighlights) {
        const m = d.match(/^(\w+):/);
        if (m) charsInSecondHalf.add(m[1]);
      }
    }

    for (const [char, count] of charEarlyCount) {
      if (count >= 2 && !charsInSecondHalf.has(char)) {
        issues.push({
          location: `Character: ${char} (last seen before Scene ${act1TraceEnd})`,
          rule: 'INTENTION_DROPOUT',
          description: `Character "${char}" has ${count} dialogue appearances in Act 1 but vanishes from the second half of the story — their intention is opened but never resolved`,
          severity: 'major',
          suggestedFix: `Give "${char}" a scene in the second half where their Act 1 intention is fulfilled, frustrated, or transformed; or cut their early appearances if they serve no ongoing story function`,
        });
      }
    }
  }

  // ── WANT_FEAR_COLLISION_ABSENT ────────────────────────────────────────────
  // The classic want/fear collision: a scene where the protagonist gains what
  // they want emotionally but damages a key relationship (or sacrifices
  // relationally to gain emotionally). When this collision never occurs, the
  // protagonist's wants and fears never intersect — there is no true dramatic
  // cost. Requires 6+ scenes and at least one scene with a relationship shift.
  if (n >= 6) {
    const hasRelationshipShifts = records.some(r => (r.relationshipShifts?.length ?? 0) > 0);
    if (hasRelationshipShifts) {
      const hasCollision = records.some(r => {
        const posEmotion = r.emotionalShift === 'positive';
        const negEmotion = r.emotionalShift === 'negative';
        const hasNegRelShift = (r.relationshipShifts ?? []).some(s => s.amount < -0.3);
        const hasPosRelShift = (r.relationshipShifts ?? []).some(s => s.amount > 0.3);
        // Win emotionally while damaging a relationship — OR sacrifice to strengthen one
        return (posEmotion && hasNegRelShift) || (negEmotion && hasPosRelShift);
      });
      if (!hasCollision) {
        issues.push({
          location: 'Character intention layer',
          rule: 'WANT_FEAR_COLLISION_ABSENT',
          description: 'No scene shows a want/fear collision: the protagonist never gains something while losing a relationship, nor sacrifices something to protect one. Their wants and fears never intersect.',
          severity: 'major',
          suggestedFix: 'Add a scene where achieving what the protagonist wants damages a key relationship (or where they sacrifice their goal to protect one) — this collision is what creates emotional stakes and forces a character-defining choice',
        });
      }
    }
  }

  // ── Wave 171: GOAL_INVERSION_ABSENT ───────────────────────────────────────
  // Dramatic irony of pursuit: at no point does the protagonist's active
  // pursuit (a proactive scene — clock raised or clue planted) directly
  // produce the opposite of its intended effect (a negative emotional shift
  // or a relationship loss in that same scene). When every proactive scene
  // pays off cleanly, the protagonist's drive never backfires — there is no
  // dramatic irony baked into the pursuit itself, and the story feels too
  // frictionless. Requires 6+ scenes and at least 2 proactive scenes.
  if (n >= 6) {
    const proactiveScenes = records.filter(
      r => r.clockRaised || (r.seededClueIds?.length ?? 0) > 0,
    );
    if (proactiveScenes.length >= 2) {
      const hasInversion = proactiveScenes.some(r => {
        const negEmotion = r.emotionalShift === 'negative';
        const hasNegRelShift = (r.relationshipShifts ?? []).some(s => s.amount < -0.3);
        return negEmotion || hasNegRelShift;
      });
      if (!hasInversion) {
        issues.push({
          location: 'Character intention layer',
          rule: 'GOAL_INVERSION_ABSENT',
          description: `The protagonist has ${proactiveScenes.length} proactive scenes but none of them backfire — pursuing the goal never produces a negative emotional shift or a relationship loss. The pursuit is frictionless, with no dramatic irony built into the wanting itself`,
          severity: 'major',
          suggestedFix: 'Add a scene where the protagonist actively pursues their goal and the pursuit itself makes things worse — they win the battle but lose an ally, or get what they asked for and regret it. The goal should bite back',
        });
      }
    }
  }

  // ── Wave 171: PASSIVE_ACT3_INTENTION ──────────────────────────────────────
  // In Act 3 (the final 25% of scenes), the protagonist initiates nothing:
  // no clock raised, no clue planted across the entire act. They are carried
  // to the climax rather than choosing it. This is distinct from
  // CLIMAX_WITHOUT_CHOICE (which checks scene purpose/dramatic turn) — this
  // checks raw agency signals. Requires 8+ scenes and a non-empty Act 3.
  if (n >= 8) {
    const act3Start = Math.floor(n * 0.75);
    const act3Records = records.slice(act3Start);
    if (act3Records.length >= 2) {
      const act3Proactive = act3Records.filter(
        r => r.clockRaised || (r.seededClueIds?.length ?? 0) > 0,
      ).length;
      if (act3Proactive === 0) {
        issues.push({
          location: `Act 3 (Scenes ${act3Start}–${n - 1})`,
          rule: 'PASSIVE_ACT3_INTENTION',
          description: `Across all ${act3Records.length} Act 3 scenes the protagonist initiates no action — no clock raised, no clue planted. They are carried to the ending rather than choosing it; the climax happens to them instead of being driven by them`,
          severity: 'critical',
          suggestedFix: 'Give the protagonist at least one decisive proactive beat in Act 3: they set the final trap, force the confrontation, or make the irreversible move that triggers the climax. The ending must be something they cause, not something they merely survive',
        });
      }
    }
  }

  // ── Wave 171: ENTROPY_SPIKE_MISPLACED ─────────────────────────────────────
  // The story's single highest-entropy scene — the moment of maximum narrative
  // momentum (suspense + relationship turbulence + clue density) — lands in
  // Act 1 (the first 25%) rather than near the climax. When the most
  // informationally dense moment is in the setup, the story front-loads its
  // peak and has nowhere to build toward. Requires 8+ scenes.
  if (n >= 8) {
    const entropyOf = (r: PassInput['records'][number]): number => {
      const suspense = Math.max(0, r.suspenseDelta);
      const relTurbulence = (r.relationshipShifts ?? []).reduce(
        (sum, s) => sum + Math.abs(s.amount), 0,
      );
      const clueDensity = (r.seededClueIds?.length ?? 0) + (r.payoffSetupIds?.length ?? 0);
      const emotionWeight = r.emotionalShift !== 'neutral' ? 1 : 0;
      return suspense + relTurbulence * 2 + clueDensity + emotionWeight;
    };

    let peakIdx = 0;
    let peakEntropy = -Infinity;
    for (let i = 0; i < records.length; i++) {
      const e = entropyOf(records[i]);
      if (e > peakEntropy) {
        peakEntropy = e;
        peakIdx = i;
      }
    }

    const act1End = Math.floor(n * 0.25);
    // Only meaningful if the peak actually carries momentum (entropy > 2) and
    // there is a genuine spread (peak isn't trivially flat across the story).
    if (peakIdx < act1End && peakEntropy > 2) {
      issues.push({
        location: `Scene ${peakIdx} (${records[peakIdx].slug})`,
        rule: 'ENTROPY_SPIKE_MISPLACED',
        description: `The story's highest-momentum scene (Scene ${peakIdx}, entropy ${peakEntropy.toFixed(1)}) lands in Act 1 rather than near the climax — the most informationally dense moment is in the setup, so the story front-loads its peak and has nowhere left to build`,
        severity: 'major',
        suggestedFix: 'Redistribute momentum so the entropy peak lands in the back half: dial down the Act 1 spike, or escalate the climax so the densest concentration of suspense, relationship turns, and revelations arrives when the stakes are highest',
      });
    }
  }

  // ── Wave 188: Entropy arc flat, intention convergence absent, entropy cliff ──

  // Shared entropy helper (same formula as ENTROPY_SPIKE_MISPLACED, scoped here)
  const w188Entropy = (r: typeof records[0]): number => {
    const s = Math.max(0, r.suspenseDelta);
    const t = (r.relationshipShifts ?? []).reduce(
      (sum: number, x: { amount: number }) => sum + Math.abs(x.amount), 0,
    );
    const c = (r.seededClueIds?.length ?? 0) + (r.payoffSetupIds?.length ?? 0);
    const em = r.emotionalShift !== 'neutral' ? 1 : 0;
    return s + t * 2 + c + em;
  };

  // ESCALATION_ENTROPY_FLAT: The composite narrative entropy (suspense + relational
  // turbulence×2 + clue density + emotion weight) of Act 2b (50%–75%) is no higher
  // than Act 2a (25%–50%). The story's complexity and momentum stall in the second
  // half of the conflict zone instead of building toward the climax. Distinct from
  // ESCALATION_REVERSED (structure pass, raw suspense) and SECOND_ACT_INVERSION
  // (structure pass, raw suspense); this tracks composite narrative heat.
  if (n >= 10) {
    const act2aStart = Math.floor(n * 0.25);
    const act2bStart = Math.floor(n * 0.5);
    const act2bEnd   = Math.floor(n * 0.75);
    const act2aRecs  = records.slice(act2aStart, act2bStart);
    const act2bRecs  = records.slice(act2bStart, act2bEnd);
    if (act2aRecs.length >= 2 && act2bRecs.length >= 2) {
      const avgE = (recs: typeof records) =>
        recs.reduce((s, r) => s + w188Entropy(r), 0) / recs.length;
      const avgAct2a = avgE(act2aRecs);
      const avgAct2b = avgE(act2bRecs);
      if (avgAct2a > 1.5 && avgAct2b <= avgAct2a) {
        issues.push({
          location: `Act 2 (Scenes ${act2aStart}–${act2bEnd - 1})`,
          rule: 'ESCALATION_ENTROPY_FLAT',
          description: `Act 2a (Scenes ${act2aStart}–${act2bStart - 1}) has average narrative entropy ${avgAct2a.toFixed(1)} but Act 2b (Scenes ${act2bStart}–${act2bEnd - 1}) drops to ${avgAct2b.toFixed(1)} — the composite momentum (suspense + relational turbulence + clue density) fails to build across the conflict zone.`,
          severity: 'major',
          suggestedFix: 'Escalate Act 2b: add a revelation, deepen a relationship rupture, or raise a new clock. The second half of the conflict zone must be denser with narrative event than the first — the audience should feel the story accelerating, not plateauing.',
        });
      }
    }
  }

  // INTENTION_CONVERGENCE_ABSENT: The story has both seeded clues (the protagonist
  // plants things for future resolution) and a raised clock (external deadline) but
  // no scene combines both — proactive intention and urgent pressure run on separate
  // tracks and never converge. Real climaxes occur when a character's plan meets an
  // unavoidable deadline in the same scene. Requires 8+ scenes.
  if (n >= 8) {
    const hasSeededClues = records.some(r => (r.seededClueIds?.length ?? 0) > 0);
    const hasClockRaised = records.some(r => r.clockRaised);
    if (hasSeededClues && hasClockRaised) {
      const hasConvergence = records.some(r =>
        (r.seededClueIds?.length ?? 0) > 0 && r.clockRaised,
      );
      if (!hasConvergence) {
        issues.push({
          location: 'Plot intention layer',
          rule: 'INTENTION_CONVERGENCE_ABSENT',
          description: 'The story seeds clues and raises a deadline but no scene combines both — proactive intention and external urgency never meet in the same beat. The story lacks the convergence moment where a character\'s plan collides with an unavoidable deadline.',
          severity: 'major',
          suggestedFix: 'Design a scene where the protagonist plants a trap, seeds a clue, or commits to a plan while simultaneously under active deadline pressure. This convergence creates the "point of no return" that defines dramatic peaks.',
        });
      }
    }
  }

  // ENTROPY_CLIFF: Three or more consecutive high-entropy scenes (entropy > 2.0)
  // are immediately followed by two consecutive zero-entropy scenes (entropy < 0.5).
  // The story hits a cliff — maximum intensity with no transitional de-escalation.
  // A proper denouement should descend gradually through a reckoning or aftershock;
  // a cliff drops the audience without the emotional processing that makes the peak
  // feel earned. Distinct from ENTROPY_SPIKE_MISPLACED (peak placement) — this
  // catches a sudden collapse anywhere in the story.
  if (n >= 8) {
    let highRun = 0;
    let highStart = -1;
    for (let i = 0; i < records.length; i++) {
      const e = w188Entropy(records[i]);
      if (e > 2.0) {
        if (highRun === 0) highStart = i;
        highRun++;
      } else {
        if (highRun >= 3 && e < 0.5 && i + 1 < records.length) {
          const nextE = w188Entropy(records[i + 1]);
          if (nextE < 0.5) {
            issues.push({
              location: `Scenes ${highStart}–${i + 1}`,
              rule: 'ENTROPY_CLIFF',
              description: `${highRun} high-momentum scenes (Scenes ${highStart}–${i - 1}, entropy > 2.0) are followed by an immediate dead drop (Scenes ${i}–${i + 1}, entropy < 0.5) — the story loses all narrative momentum in two steps instead of de-escalating through a measured denouement.`,
              severity: 'minor',
              suggestedFix: 'Add 1-2 transitional scenes between the peak and the quiet ending: show the aftershock, the reckoning, or the changed world before the narrative fully relaxes. The audience needs to process the climax before the story goes quiet.',
            });
            break;
          }
        }
        highRun = 0;
      }
    }
  }

  // ── Wave 205: Proactive opening absent, agency frontloaded, stakes never personal ──

  // PROACTIVE_OPENING_ABSENT: Across the entire first quarter (Act 1) the
  // protagonist initiates nothing — no clock raised, no clue planted. The story
  // opens with a passive protagonist; the inciting situation is something that
  // happens to them rather than something they set in motion. Distinct from
  // PASSIVE_ACT3_INTENTION (final act) and PROTAGONIST_REACTIVE_DOMINANCE (Act 2,
  // requires sustained high-stakes pressure). Requires 8+ scenes.
  if (n >= 8) {
    const act1End205 = Math.floor(n * 0.25);
    const act1Recs205 = records.slice(0, act1End205);
    if (act1Recs205.length >= 2) {
      const act1Proactive205 = act1Recs205.filter(
        r => r.clockRaised || (r.seededClueIds?.length ?? 0) > 0,
      ).length;
      if (act1Proactive205 === 0) {
        issues.push({
          location: `Act 1 (Scenes 0–${act1End205 - 1})`,
          rule: 'PROACTIVE_OPENING_ABSENT',
          severity: 'major',
          description: `Across all ${act1Recs205.length} Act 1 scenes the protagonist initiates no action — no clock raised, no clue planted. The story opens with a passive protagonist; the inciting situation happens to them rather than being set in motion by their own choice.`,
          suggestedFix: 'Give the protagonist at least one proactive beat in Act 1: a decision, a plan begun, a question they choose to chase. The audience must see the protagonist want something and move toward it before the world complicates that want.',
        });
      }
    }
  }

  // AGENCY_FRONTLOADED: The protagonist takes proactive action in the first half
  // (2+ proactive scenes) but goes entirely passive across the whole second half
  // — no clock raised, no clue planted from the midpoint onward. Their initiative
  // burns out exactly when the story should be accelerating toward the climax.
  // Distinct from PASSIVE_ACT3_INTENTION (final 25% only). Requires 8+ scenes.
  if (n >= 8) {
    const half205 = Math.floor(n * 0.5);
    let firstHalfProactive205 = 0;
    let secondHalfProactive205 = 0;
    for (let i = 0; i < n; i++) {
      const isPro205 = records[i].clockRaised || (records[i].seededClueIds?.length ?? 0) > 0;
      if (isPro205) {
        if (i < half205) firstHalfProactive205++;
        else secondHalfProactive205++;
      }
    }
    if (firstHalfProactive205 >= 2 && secondHalfProactive205 === 0) {
      issues.push({
        location: `Second half (Scenes ${half205}–${n - 1})`,
        rule: 'AGENCY_FRONTLOADED',
        severity: 'minor',
        description: `The protagonist initiates ${firstHalfProactive205} proactive beats in the first half but none in the second half — their agency burns out at the midpoint, exactly when the story should be accelerating toward the climax.`,
        suggestedFix: 'Redistribute the protagonist\'s initiative: hold back at least one proactive beat for the back half. The drive toward the goal should intensify after the midpoint, not evaporate.',
      });
    }
  }

  // STAKES_NEVER_PERSONAL: The story raises an external clock (a deadline,
  // ticking pressure) but no scene ever pairs that pressure with an emotional or
  // relationship shift — the stakes stay purely mechanical and never become
  // personal. A deadline only matters dramatically when it threatens something
  // the protagonist feels or someone they care about. Distinct from
  // INTENTION_CONVERGENCE_ABSENT (clock + planted clue). Requires 6+ scenes.
  if (n >= 6) {
    const hasClock205 = records.some(r => r.clockRaised);
    if (hasClock205) {
      const hasPersonalStakes205 = records.some(
        r => r.clockRaised && (r.emotionalShift !== 'neutral' || (r.relationshipShifts?.length ?? 0) > 0),
      );
      if (!hasPersonalStakes205) {
        issues.push({
          location: 'Stakes layer',
          rule: 'STAKES_NEVER_PERSONAL',
          severity: 'minor',
          description: 'The story raises an external clock but no scene ever pairs that deadline with an emotional or relationship shift — the stakes stay purely mechanical. A ticking clock only matters dramatically when it threatens something the protagonist feels or someone they love.',
          suggestedFix: 'Tie the deadline to a personal cost: in at least one clock-raising scene, show what the protagonist stands to lose emotionally or relationally if the clock runs out. External pressure becomes dramatic only when it endangers something internal.',
        });
      }
    }
  }

  // ── Wave 216: Agency physics — distribution entropy, effort↔consequence coupling,
  //    commitment density ramp. These treat intention as a measurable quantity with a
  //    distribution, a causal yield, and a trajectory rather than a per-scene flag. ──

  // AGENCY_ENTROPY_COLLAPSE (major): the normalised Shannon entropy of intention-bearing
  // dialogue (who is given tracked beliefs/goals, drawn from dialogueHighlights) falls
  // below 0.5. A single character carries almost all of the story's legible intention
  // while everyone else is a prop with no inner agenda. Distinct from the dialogue pass's
  // SPEAKER_MONOPOLY (raw fountain line count) — this measures concentration of AGENCY,
  // not of word count.
  {
    const intentCounts216 = new Map<string, number>();
    let totalHL216 = 0;
    for (const r of records) {
      for (const d of (r.dialogueHighlights ?? [])) {
        const m216 = d.match(/^(\w+):/);
        if (m216) {
          const c216 = m216[1].toLowerCase();
          intentCounts216.set(c216, (intentCounts216.get(c216) ?? 0) + 1);
          totalHL216++;
        }
      }
    }
    if (intentCounts216.size >= 2 && totalHL216 >= 8) {
      let entropy216 = 0;
      for (const cnt of intentCounts216.values()) {
        const p216 = cnt / totalHL216;
        entropy216 -= p216 * Math.log2(p216);
      }
      const normEntropy216 = entropy216 / Math.log2(intentCounts216.size);
      if (normEntropy216 < 0.5) {
        const dominant216 = [...intentCounts216.entries()].sort((a, b) => b[1] - a[1])[0];
        issues.push({
          location: 'Intention distribution',
          rule: 'AGENCY_ENTROPY_COLLAPSE',
          severity: 'major',
          description: `Intention is concentrated in one character: ${dominant216[0].toUpperCase()} carries ${dominant216[1]} of ${totalHL216} intention-bearing lines (normalised agency entropy ${normEntropy216.toFixed(2)}). The rest of the cast has no legible agenda — they are reactive furniture around a single willing agent.`,
          suggestedFix: 'Give at least one other character a tracked want that competes with the protagonist\'s: a belief they act on, a goal they pursue on-screen. Drama is the collision of intentions; with only one agent there is nothing to collide.',
        });
      }
    }
  }

  // AGENCY_WITHOUT_CONSEQUENCE (major): the protagonist is proactive in 3+ scenes
  // (raises a clock or plants a clue) but 75%+ of those efforts are inert — the seeded
  // clue is never paid off AND the next two scenes register no suspense rise, no
  // relationship shift, and no revelation. Proactivity that the story never answers is
  // busy-work; agency only reads as agency when the world visibly responds to it.
  if (n >= 6) {
    const proactiveIdx216: number[] = [];
    for (let i = 0; i < n; i++) {
      if (records[i].clockRaised || (records[i].seededClueIds?.length ?? 0) > 0) proactiveIdx216.push(i);
    }
    if (proactiveIdx216.length >= 3) {
      const allPayoffs216 = new Set<string>();
      for (const r of records) for (const p of (r.payoffSetupIds ?? [])) allPayoffs216.add(p);
      let inert216 = 0;
      for (const i of proactiveIdx216) {
        const seedPaidOff216 = (records[i].seededClueIds ?? []).some(s => allPayoffs216.has(s));
        const window216 = records.slice(i + 1, i + 3);
        const downstream216 = window216.some(r =>
          r.suspenseDelta > 1 || (r.relationshipShifts?.length ?? 0) > 0 || r.revelation !== null,
        );
        if (!seedPaidOff216 && !downstream216) inert216++;
      }
      const inertRatio216 = inert216 / proactiveIdx216.length;
      if (inertRatio216 >= 0.75) {
        issues.push({
          location: 'Agency layer',
          rule: 'AGENCY_WITHOUT_CONSEQUENCE',
          severity: 'major',
          description: `${inert216} of ${proactiveIdx216.length} proactive beats produce no consequence — the protagonist raises clocks and plants clues, but those efforts are never paid off and the scenes that follow register no suspense, no relationship change, and no revelation. The protagonist acts into a vacuum.`,
          suggestedFix: 'Make each proactive beat land: pay off the planted clue later, or let the very next scenes show the world reacting — a rise in pressure, a relationship altered, a truth surfaced. Agency without consequence is indistinguishable from inertia.',
        });
      }
    }
  }

  // COMMITMENT_RAMP_INVERSION (major): proactive density in the final third is positive
  // but less than half the proactive density of the opening third — the protagonist's
  // initiative is measurably decaying as the climax approaches. Distinct from
  // AGENCY_FRONTLOADED (which requires the back half to be exactly zero); this catches a
  // declining commitment ramp even while the protagonist is still nominally active.
  if (n >= 9) {
    const third216 = Math.floor(n / 3);
    const proDensity216 = (recs: PassInput['records']) =>
      recs.filter(r => r.clockRaised || (r.seededClueIds?.length ?? 0) > 0).length / recs.length;
    const firstDensity216 = proDensity216(records.slice(0, third216));
    const lastDensity216 = proDensity216(records.slice(n - third216));
    if (firstDensity216 > 0 && lastDensity216 > 0 && lastDensity216 < 0.5 * firstDensity216) {
      issues.push({
        location: `Commitment ramp (opening third vs final third)`,
        rule: 'COMMITMENT_RAMP_INVERSION',
        severity: 'major',
        description: `Proactive density falls from ${(firstDensity216 * 100).toFixed(0)}% of opening-third scenes to ${(lastDensity216 * 100).toFixed(0)}% of final-third scenes — the protagonist's initiative is decaying toward the climax instead of intensifying. The commitment ramp runs backwards.`,
        suggestedFix: 'The drive toward the goal should escalate, not fade: load more proactive beats into the final third than the opening. As the stakes peak, the protagonist must be pushing hardest, not coasting on early momentum.',
      });
    }
  }

  // ── Wave 230: Secondary intention vacuum, proactive overclustering, reactive goal adoption ──

  // SECONDARY_INTENTION_VACUUM (minor, n≥8): The story has ≥3 proactive acts
  // (clock raised or clue planted) but ALL tracked intentions collapse to a single
  // character — every dialogue highlight belongs to one speaker. The protagonist's
  // agency exists in a social vacuum where no other character is demonstrably
  // pursuing anything. Complements AGENCY_ENTROPY_COLLAPSE (which requires ≥2
  // distinct speakers to even compute entropy); this catches the extreme collapse
  // where the secondary cast has zero legible goal-bearing dialogue.
  if (n >= 8) {
    const proactiveCount230 = records.filter(
      r => r.clockRaised || (r.seededClueIds?.length ?? 0) > 0,
    ).length;
    if (proactiveCount230 >= 3) {
      const charIds230 = new Set<string>();
      let totalHL230 = 0;
      for (const r of records) {
        for (const d of (r.dialogueHighlights ?? [])) {
          const m = d.match(/^(\w+):/);
          if (m) {
            charIds230.add(m[1]);
            totalHL230++;
          }
        }
      }
      if (totalHL230 >= 4 && charIds230.size === 1) {
        const [onlyChar230] = charIds230;
        issues.push({
          location: 'Intention distribution',
          rule: 'SECONDARY_INTENTION_VACUUM',
          severity: 'minor',
          description: `All ${totalHL230} intention-bearing dialogue highlights belong to a single character (${onlyChar230.toUpperCase()}) — the rest of the cast has no tracked goals or beliefs. The protagonist's agency exists in a social vacuum where no other character is demonstrably pursuing anything.`,
          suggestedFix: 'Give at least one secondary character a legible intention: a belief they act on, a goal that competes with or complements the protagonist\'s. Drama is the collision of visible desires — a cast of props around one willing agent flattens the conflict field.',
        });
      }
    }
  }

  // PROACTIVE_OVERCLUSTERING (minor, n≥10): The protagonist's proactive acts (≥3)
  // are all clustered within a tight zone spanning ≤20% of the story, while ≥50%
  // of scenes are passive. All initiative arrives in one burst — the protagonist is
  // active for one chapter and passive for everything else before and after it.
  if (n >= 10) {
    const proactiveIdxs230: number[] = [];
    for (let i = 0; i < n; i++) {
      if (records[i].clockRaised || (records[i].seededClueIds?.length ?? 0) > 0) {
        proactiveIdxs230.push(i);
      }
    }
    if (proactiveIdxs230.length >= 3) {
      const firstPro230 = proactiveIdxs230[0];
      const lastPro230 = proactiveIdxs230[proactiveIdxs230.length - 1];
      const span230 = lastPro230 - firstPro230;
      const passiveScenes230 = n - proactiveIdxs230.length;
      if (span230 <= Math.floor(n * 0.2) && passiveScenes230 / n >= 0.5) {
        issues.push({
          location: `Proactive cluster (Scenes ${firstPro230}–${lastPro230})`,
          rule: 'PROACTIVE_OVERCLUSTERING',
          severity: 'minor',
          description: `All ${proactiveIdxs230.length} proactive scenes are clustered within a ${span230}-scene span (Scenes ${firstPro230}–${lastPro230}, ≤20% of the story). The protagonist's initiative arrives in one burst and is absent for the rest of the arc — initiative must be threaded throughout, not discharged all at once.`,
          suggestedFix: 'Redistribute proactive beats across the full arc: move some earlier to establish agency from the outset, and reserve at least one for the final act to drive the climax. The protagonist must be continuously willing, not intermittently active.',
        });
      }
    }
  }

  // REACTIVE_GOAL_ADOPTION (minor, n≥6): All proactive acts (≥2) are immediately
  // preceded by or coincident with a negative trigger — a reversal (suspenseDelta < -1)
  // in the prior scene, or a negative emotional shift in the same or prior scene.
  // The protagonist only acts when forced by adversity; they never initiate from
  // autonomous desire. True protagonism requires at least one proactive beat born
  // from internal want, not external push.
  if (n >= 6) {
    const proactiveItems230: number[] = [];
    for (let i = 0; i < n; i++) {
      if (records[i].clockRaised || (records[i].seededClueIds?.length ?? 0) > 0) {
        proactiveItems230.push(i);
      }
    }
    if (proactiveItems230.length >= 2) {
      const allReactive230 = proactiveItems230.every(idx => {
        const selfNeg230 = records[idx].emotionalShift === 'negative';
        const priorReversal230 = idx > 0 && records[idx - 1].suspenseDelta < -1;
        const priorNeg230 = idx > 0 && records[idx - 1].emotionalShift === 'negative';
        return selfNeg230 || priorReversal230 || priorNeg230;
      });
      if (allReactive230) {
        issues.push({
          location: 'Intention layer — protagonist drive',
          rule: 'REACTIVE_GOAL_ADOPTION',
          severity: 'minor',
          description: `All ${proactiveItems230.length} proactive acts follow immediately after a negative trigger (reversal or negative emotional beat) — the protagonist only acts when forced by adversity, never from autonomous desire. True protagonism requires at least one proactive move born from internal want.`,
          suggestedFix: 'Add at least one proactive scene where the protagonist initiates from their own desire rather than in response to a setback — a choice made from hope, curiosity, or ambition. Reactive protagonism reduces the character to a rubber ball: the story bounces them rather than watching them run.',
        });
      }
    }
  }
  // ── Wave 244: Proactive Act 3 void, intention discovery absent, goal pivot absent ──

  // PROACTIVE_ACT3_VOID (minor, n≥8): Act 3 (last 25%) contains zero proactive
  // acts — no clockRaised, no seededClueIds. The protagonist stops driving in the
  // final act: they react to the climax rather than engineering it. A passive Act 3
  // protagonist is a passenger in their own resolution. Distinct from
  // PROACTIVE_OVERCLUSTERING (which fires when all acts cluster in a burst): this
  // fires specifically when the final act is initiative-free.
  if (n >= 8) {
    const act3Start244 = Math.floor(n * 0.75);
    const act3Records244 = records.slice(act3Start244);
    if (act3Records244.length >= 2) {
      const hasAct3Proactive244 = act3Records244.some(r =>
        r.clockRaised || (r.seededClueIds?.length ?? 0) > 0,
      );
      if (!hasAct3Proactive244) {
        issues.push({
          location: `Act 3 (Scenes ${act3Start244}–${n - 1})`,
          rule: 'PROACTIVE_ACT3_VOID',
          severity: 'minor',
          description: `Act 3 (scenes ${act3Start244}–${n - 1}, ${act3Records244.length} scenes) contains no proactive acts — no clocks raised, no clues planted. The protagonist stops initiating in the final act, reacting to a climax rather than engineering one.`,
          suggestedFix: "Give the protagonist at least one proactive move in Act 3: a decisive action, a gambit, or a piece of evidence planted. The climax should feel like the culmination of the protagonist's agency — a choice they made, not a situation they endured.",
        });
      }
    }
  }

  // INTENTION_DISCOVERY_ABSENT (minor, n≥8, ≥3 proactive acts): The story has
  // ≥3 proactive acts (protagonist drives events) but no revelation occurs in
  // Act 3 (last 25%). The protagonist's goal-pursuit never produces a discovery
  // in the climax zone — they chase without finding. A story where all discoveries
  // land before the climax means the protagonist enters Act 3 with complete
  // information, reducing the resolution to execution rather than revelation.
  if (n >= 8) {
    const proactiveCount244 = records.filter(r =>
      r.clockRaised || (r.seededClueIds?.length ?? 0) > 0,
    ).length;
    if (proactiveCount244 >= 3) {
      const act3Start244b = Math.floor(n * 0.75);
      const hasAct3Rev244 = records.slice(act3Start244b).some(r => r.revelation !== null);
      if (!hasAct3Rev244) {
        issues.push({
          location: `Act 3 (Scenes ${act3Start244b}–${n - 1}) — discovery layer`,
          rule: 'INTENTION_DISCOVERY_ABSENT',
          severity: 'minor',
          description: `The story has ${proactiveCount244} proactive acts but no revelation lands in Act 3 (Scenes ${act3Start244b}–${n - 1}) — the protagonist's goal-pursuit produces no discovery in the climax zone. All discoveries precede the resolution; Act 3 is execution without revelation.`,
          suggestedFix: "Engineer at least one discovery in Act 3: a truth the protagonist's pursuit finally uncovers, a consequence of their initiative that transforms the climax. The resolution should be earned by discovery, not just by effort.",
        });
      }
    }
  }

  // GOAL_PIVOT_ABSENT (minor, n≥10, ≥4 proactive acts): The story has ≥4
  // proactive acts but ALL of them are the same type — either all clockRaised
  // (no clue-planting) or all seededClueIds (no clock-raising). The protagonist's
  // goal-pursuit strategy never adapts — they use only one tool throughout.
  // An agent who never changes strategy in the face of failure is inflexible rather
  // than determined. Requires both signals to be present in the records array.
  if (n >= 10) {
    const proactiveActs244 = records.filter(r =>
      r.clockRaised || (r.seededClueIds?.length ?? 0) > 0,
    );
    if (proactiveActs244.length >= 4) {
      const hasClockAct244 = proactiveActs244.some(r => r.clockRaised === true);
      const hasClueAct244 = proactiveActs244.some(r => (r.seededClueIds?.length ?? 0) > 0);
      if (!hasClockAct244 || !hasClueAct244) {
        const onlyType244 = !hasClockAct244 ? 'clue-planting' : 'clock-raising';
        issues.push({
          location: 'Intention strategy layer',
          rule: 'GOAL_PIVOT_ABSENT',
          severity: 'minor',
          description: `All ${proactiveActs244.length} proactive acts use only ${onlyType244} — the protagonist's strategy never adapts. An agent who pursues goals with only one modality is predictable; genuine goal-pursuit requires adapting method when the situation changes.`,
          suggestedFix: `Introduce at least one proactive act using the other strategy: if the protagonist only raises clocks, give them a scene where they plant a clue or gather evidence; if they only plant clues, give them a scene where they escalate a deadline. Strategy variety reveals tactical intelligence.`,
        });
      }
    }
  }
  // ── End Wave 244 ─────────────────────────────────────────────────────────────

  // ── End Wave 230 ─────────────────────────────────────────────────────────────

  // ── Wave 258: Proactive midpoint void, proactive desert run, revelation without proactive ──

  // A proactive act = the protagonist initiates: a clock raised or a clue planted.
  // Shared by the three Wave 258 checks.
  const isProactive258 = (r: any): boolean =>
    r.clockRaised === true || (r.seededClueIds?.length ?? 0) > 0;

  // PROACTIVE_MIDPOINT_VOID (minor, n≥10): The midpoint zone (40%–60%) contains
  // no proactive act, while the protagonist does initiate elsewhere. Initiative
  // collapses precisely at the structural pivot — the moment the protagonist's
  // goal should transform and their drive intensify. Distinct from PROACTIVE_
  // OPENING_ABSENT (Act 1), AGENCY_FRONTLOADED (whole second half), and PROACTIVE_
  // ACT3_VOID (Act 3); this isolates a dead spot at the fulcrum.
  if (n >= 10) {
    const midStart258 = Math.floor(n * 0.4);
    const midEnd258 = Math.floor(n * 0.6);
    const midRecs258 = records.slice(midStart258, midEnd258);
    if (midRecs258.length >= 2) {
      const midProactive258 = midRecs258.some(isProactive258);
      const outsideProactive258 =
        records.slice(0, midStart258).some(isProactive258) ||
        records.slice(midEnd258).some(isProactive258);
      if (!midProactive258 && outsideProactive258) {
        issues.push({
          location: `Midpoint zone (Scenes ${midStart258}–${midEnd258 - 1})`,
          rule: 'PROACTIVE_MIDPOINT_VOID',
          severity: 'minor',
          description: `The midpoint zone (Scenes ${midStart258}–${midEnd258 - 1}) contains no proactive act — no clock raised, no clue planted — though the protagonist initiates elsewhere. Initiative collapses at the structural pivot, exactly where the protagonist's goal should transform and their drive intensify.`,
          suggestedFix: 'Give the protagonist a decisive proactive beat at the midpoint: a plan launched, a deadline set, a piece of evidence pursued. The midpoint is the gear-change — the protagonist should seize the wheel there, not drift through it.',
        });
      }
    }
  }

  // PROACTIVE_DESERT_RUN (minor, n≥8, ≥2 proactive acts total): A run of four or
  // more consecutive scenes in which the protagonist initiates nothing, inside a
  // story that is otherwise active. An extended passive stretch reads as the
  // protagonist surrendering the wheel: events happen around them while they wait.
  // Distinct from the zone-specific voids; this fires on any sustained run.
  if (n >= 8) {
    const totalProactive258 = records.filter(isProactive258).length;
    if (totalProactive258 >= 2) {
      let runStart258 = 0;
      let runLen258 = 0;
      for (let i = 0; i < n; i++) {
        if (!isProactive258(records[i])) {
          if (runLen258 === 0) runStart258 = i;
          runLen258++;
        } else {
          runLen258 = 0;
        }
        if (runLen258 >= 4) {
          issues.push({
            location: `Scenes ${runStart258}–${i}`,
            rule: 'PROACTIVE_DESERT_RUN',
            severity: 'minor',
            description: `Scenes ${runStart258}–${i} form a run of ${runLen258} consecutive scenes in which the protagonist initiates nothing — no clock raised, no clue planted — inside an otherwise active story. An extended passive stretch reads as the protagonist surrendering the wheel: events happen around them while they wait.`,
            suggestedFix: 'Break the passive run with at least one proactive beat: a choice that commits the protagonist to a course, a deadline they impose, a lead they decide to chase. A protagonist who goes four scenes without initiating becomes a spectator in their own story.',
          });
          break;
        }
      }
    }
  }

  // REVELATION_WITHOUT_PROACTIVE (minor, n≥8, ≥2 revelations): No witnessed
  // revelation is preceded by a proactive act within the two scenes before it
  // (inclusive of the revelation scene). Every discovery falls into the
  // protagonist's lap rather than being earned by their initiative — they learn
  // truths passively. Distinct from INTENTION_DISCOVERY_ABSENT (Act 3 revelation
  // presence); this couples discovery to effort across the whole story.
  if (n >= 8) {
    const revRecs258 = records
      .map((r: any, i: number) => ({ r, i }))
      .filter(({ r }: any) => r.revelation !== null);
    if (revRecs258.length >= 2) {
      const anyEarned258 = revRecs258.some(({ i }: any) => {
        for (let k = Math.max(0, i - 2); k <= i; k++) {
          if (isProactive258(records[k])) return true;
        }
        return false;
      });
      if (!anyEarned258) {
        issues.push({
          location: 'Discovery / initiative coupling',
          rule: 'REVELATION_WITHOUT_PROACTIVE',
          severity: 'minor',
          description: `None of the story's ${revRecs258.length} revelations is preceded by a proactive act within the two scenes before it — every discovery arrives without the protagonist's initiative driving it. The truths fall into their lap; they learn passively rather than uncovering anything through their own effort.`,
          suggestedFix: "Make at least one major discovery the consequence of the protagonist's action: a clue they chose to chase, a deadline that forced a confrontation, an investigation they launched. A revelation that the protagonist earned lands harder than one the plot simply hands them.",
        });
      }
    }
  }

  // ── Wave 272: PROACTIVE_ACT2A_VOID ────────────────────────────────────────
  // Act 2a (the 25-50% zone, where the protagonist first starts testing the
  // world after the inciting event) contains no proactive act — no clock
  // raised, no clue planted — while the protagonist does initiate elsewhere.
  // Act 2a is where first moves and early investigations belong; a passive Act
  // 2a protagonist drifts through the first complication zone without steering.
  // Distinct from PROACTIVE_OPENING_ABSENT (Act 1), PROACTIVE_MIDPOINT_VOID
  // (40-60% window), and PROACTIVE_ACT3_VOID (final 25%).
  // Requires 10+ records and 3+ total proactive acts.
  if (n >= 10) {
    const act2aStart272 = Math.floor(n * 0.25);
    const act2aEnd272 = Math.floor(n * 0.5);
    const totalProactive272 = records.filter(isProactive258).length;
    if (totalProactive272 >= 3) {
      const act2aProactive272 = records.slice(act2aStart272, act2aEnd272).filter(isProactive258).length;
      if (act2aProactive272 === 0) {
        issues.push({
          location: `Act 2a (Scenes ${act2aStart272}–${act2aEnd272 - 1})`,
          rule: 'PROACTIVE_ACT2A_VOID',
          severity: 'minor',
          description: `Act 2a (Scenes ${act2aStart272}–${act2aEnd272 - 1}) contains no proactive act — no clock raised, no clue planted — though the protagonist initiates elsewhere. Act 2a is where the protagonist should start testing and investigating; leaving this entire zone initiative-free means they drift through the first complication zone as a passenger.`,
          suggestedFix: 'Give the protagonist at least one proactive move in Act 2a: a lead they decide to chase, a deadline they impose, a gambit they launch. The first complication zone should open with the protagonist in motion — their earliest tests of the world establish the audience\'s sense that they can drive events.',
        });
      }
    }
  }

  // ── Wave 272: PROACTIVE_LATE_SURGE ────────────────────────────────────────
  // The protagonist is entirely passive in the first half of the story (no
  // proactive acts in scenes 0 to n/2-1) then suddenly launches 3 or more
  // proactive acts in the second half. The agency that should be established
  // from early scenes arrives as a late explosion — the protagonist is reactive
  // for the entire first half and then overactive in the second, with no
  // gradual development of drive. The mirror of AGENCY_FRONTLOADED.
  // Requires 8+ records.
  if (n >= 8) {
    const half272 = Math.floor(n * 0.5);
    const firstHalfPro272 = records.slice(0, half272).filter(isProactive258).length;
    const secondHalfPro272 = records.slice(half272).filter(isProactive258).length;
    if (firstHalfPro272 === 0 && secondHalfPro272 >= 3) {
      issues.push({
        location: `First half entirely passive (Scenes 0–${half272 - 1})`,
        rule: 'PROACTIVE_LATE_SURGE',
        severity: 'minor',
        description: `The protagonist initiates nothing in the first half (Scenes 0–${half272 - 1}) then launches ${secondHalfPro272} proactive acts in the second half. The agency that should be established gradually arrives as a sudden burst — the protagonist transforms from passive observer to hyperactive driver without buildup. A protagonist's drive should be visible from early scenes.`,
        suggestedFix: 'Move at least one proactive beat into the first half — even a small act of initiative (a question pursued, a decision made, a deadline set) establishes that the protagonist is a driver from the start. The second-half surge will feel earned when the audience has seen the protagonist act with intention throughout.',
      });
    }
  }

  // ── Wave 272: PAYOFF_WITHOUT_EFFORT ───────────────────────────────────────
  // Two or more scenes fire payoffs (payoffSetupIds not empty) but none of them
  // is preceded within the prior 3 scenes by a proactive act. Every callback
  // the story delivers arrives without the protagonist having worked for it —
  // they fire planted payoffs without having initiated the work that makes the
  // payoff feel earned. Distinct from REVELATION_WITHOUT_PROACTIVE (which
  // couples discovered truths to effort); this couples payoffs to initiative.
  // Requires 6+ records and 2+ payoff scenes.
  if (n >= 6) {
    const payoffRecs272 = records
      .map((r: any, i: number) => ({ r, i }))
      .filter(({ r }: any) => (r.payoffSetupIds?.length ?? 0) > 0);
    if (payoffRecs272.length >= 2) {
      const anyEarned272 = (payoffRecs272 as Array<{ r: any; i: number }>).some(({ i }) => {
        for (let k = Math.max(0, i - 3); k <= i; k++) {
          if (isProactive258(records[k])) return true;
        }
        return false;
      });
      if (!anyEarned272) {
        issues.push({
          location: 'Payoff / effort coupling',
          rule: 'PAYOFF_WITHOUT_EFFORT',
          severity: 'minor',
          description: `${payoffRecs272.length} payoff scenes fire without any of them being preceded by a protagonist initiative within the prior 3 scenes — every callback arrives without the protagonist having worked for it. Payoffs feel earned when they follow visible effort; unearned callbacks read as coincidence rather than consequence.`,
          suggestedFix: 'Ensure at least one payoff scene is preceded (within 3 scenes) by a proactive act: a clue the protagonist planted, a clock they raised, a lead they pursued. A payoff earned by visible effort lands as satisfying resolution; a payoff that just happens reads as the plot solving itself.',
        });
      }
    }
  }

  // ── Wave 286: INTENTION_REACTIVE_CLIMAX ──────────────────────────────────
  // The climax zone (final 15% of scenes) contains no proactive acts, while
  // the protagonist was proactive at least twice earlier in the story. The
  // climax should be the story's most decisive moment — where the protagonist
  // acts rather than reacts. A passive climax squanders all the agency built
  // through the arc. Requires 6+ records and 2+ proactive scenes before the
  // climax zone.
  if (n >= 6) {
    const climaxStart286 = Math.max(n - Math.ceil(n * 0.15), n - 2);
    const preClimaxProactive286 = records.slice(0, climaxStart286).filter(isProactive258).length;
    if (preClimaxProactive286 >= 2) {
      const climaxProactive286 = records.slice(climaxStart286).filter(isProactive258).length;
      if (climaxProactive286 === 0) {
        issues.push({
          location: `Climax zone (scene ${climaxStart286}+) — no protagonist initiative`,
          rule: 'INTENTION_REACTIVE_CLIMAX',
          severity: 'minor',
          description: `The protagonist is proactive ${preClimaxProactive286} time(s) before the climax but takes no initiative in the final scenes (scene ${climaxStart286}+). The climax — where stakes peak — plays out as pure reaction. A passive climax undermines all the agency built through the arc: the protagonist is acted upon rather than acting.`,
          suggestedFix: 'Give the protagonist at least one decisive action in the climax: a final gambit, a clock they raise, a choice that changes everything. The climax should be the story\'s most compressed expression of what the protagonist wants and fears — it demands initiative, not passivity.',
        });
      }
    }
  }

  // ── Wave 286: INTENTION_SEED_GRAVEYARD ───────────────────────────────────
  // The story plants seeded clues in the first half but the second half
  // has no payoff scenes (payoffSetupIds empty for all scenes). Seeds are
  // promises the story makes to the audience; an unanswered promise is
  // a structural betrayal. Requires 8+ records, 3+ total seeded-clue scenes
  // in the first half, and 0 payoff scenes in the second half.
  if (n >= 8) {
    const half286 = Math.floor(n / 2);
    const firstHalfSeeds286 = records.slice(0, half286).filter((r: any) => (r.seededClueIds?.length ?? 0) > 0).length;
    if (firstHalfSeeds286 >= 3) {
      const secondHalfPayoffs286 = records.slice(half286).filter((r: any) => (r.payoffSetupIds?.length ?? 0) > 0).length;
      if (secondHalfPayoffs286 === 0) {
        issues.push({
          location: `Second half (scenes ${half286}+) — no payoffs`,
          rule: 'INTENTION_SEED_GRAVEYARD',
          severity: 'minor',
          description: `${firstHalfSeeds286} clue-seeding scene(s) appear in the first half but no payoff scene fires in the second half (scenes ${half286}+). Every seeded clue is a promise to the audience; leaving all of them unanswered by the story\'s midpoint and beyond signals the narrative has forgotten its own setup.`,
          suggestedFix: 'Return to the seeds planted in the first half and pay them off in the second half — ideally with a twist that recontextualizes what was seeded. The payoff does not need to be triumphant; even a tragic resolution of a seeded clue closes the loop. An unresolved seed is a dangling thread.',
        });
      }
    }
  }

  // ── Wave 286: INTENTION_PURPOSE_MONOTONE ─────────────────────────────────
  // More than 70% of all scenes share the same purpose value. Purpose
  // monotony means every scene serves the same structural function —
  // the story is all development, or all raising stakes, with no variation.
  // A well-structured story mixes purposes: initiating, development,
  // revelation, climax, transitional. Monotony collapses the structural
  // arc into a single repeating beat. Requires 8+ records.
  if (n >= 8) {
    const purposeCounts286 = new Map<string, number>();
    for (const r of records as any[]) {
      const p286 = r.purpose ?? 'development';
      purposeCounts286.set(p286, (purposeCounts286.get(p286) ?? 0) + 1);
    }
    const maxPurposeCount286 = Math.max(...purposeCounts286.values());
    if (maxPurposeCount286 / n > 0.70) {
      const dominantPurpose286 = [...purposeCounts286.entries()].sort((a, b) => b[1] - a[1])[0][0];
      issues.push({
        location: 'Scene purposes throughout',
        rule: 'INTENTION_PURPOSE_MONOTONE',
        severity: 'minor',
        description: `${maxPurposeCount286} of ${n} scenes (${Math.round(maxPurposeCount286 / n * 100)}%) share the same purpose ("${dominantPurpose286}"). Purpose monotony signals structural flatness — the story repeats a single function rather than mixing development, revelation, climax, and transition into a varied arc.`,
        suggestedFix: `Diversify scene purposes: ensure at least one scene each of revelation, climax, and transition alongside the development scenes. A scene tagged "${dominantPurpose286}" should be surrounded by scenes with different purposes to create structural rhythm and signal to the audience that the story is moving forward.`,
      });
    }
  }

  // ── Wave 300: CURIOSITY_WITHOUT_AGENCY ────────────────────────────────────
  // Curiosity spikes (curiosityDelta > 1) never coincide with — or follow
  // within one scene of — a proactive act. The mystery deepens by itself;
  // the protagonist's digging never causes a question to open. Distinct from
  // REVELATION_WITHOUT_PROACTIVE (which couples answers to effort): this
  // couples the raising of questions to effort. Requires 8+ records, 3+
  // curiosity spikes, and at least one proactive act somewhere.
  if (n >= 8) {
    const spikes300 = records
      .map((r: any, i: number) => ({ r, i }))
      .filter(({ r }: any) => (r.curiosityDelta ?? 0) > 1);
    const anyProactive300 = records.some(isProactive258);
    if (spikes300.length >= 3 && anyProactive300) {
      const anyDriven300 = (spikes300 as Array<{ r: any; i: number }>).some(({ r, i }) =>
        isProactive258(r) || (i > 0 && isProactive258(records[i - 1])),
      );
      if (!anyDriven300) {
        issues.push({
          location: 'Curiosity spikes throughout',
          rule: 'CURIOSITY_WITHOUT_AGENCY',
          severity: 'minor',
          description: `${spikes300.length} curiosity spikes occur but none coincides with — or follows — a proactive act by the protagonist. Every question the story opens, it opens by itself: the mystery deepens through coincidence and ambient events rather than through anyone digging. Curiosity earned by initiative binds the audience to the protagonist; curiosity that just happens binds them to nothing.`,
          suggestedFix: 'Let at least one major question open because the protagonist pried: a clue they chase exposes a deeper mystery, a door they force reveals something they were not meant to see. When investigation causes the question, the audience\'s curiosity and the character\'s drive become the same engine.',
        });
      }
    }
  }

  // ── Wave 300: TURNS_UNDRIVEN ──────────────────────────────────────────────
  // The story has 3+ dramatic turns and none occurs in — or within one scene
  // after — a proactive scene. Every pivot happens TO the protagonist, never
  // BECAUSE of them: the turns are weather, not consequences. Distinct from
  // PROTAGONIST_REACTIVE_DOMINANCE (Act-2 zone passivity count): this
  // correlates the story's declared turns with initiative. Requires 8+
  // records and at least one proactive act somewhere.
  if (n >= 8) {
    const turns300 = records
      .map((r: any, i: number) => ({ r, i }))
      .filter(({ r }: any) => (r.dramaticTurn ?? 'nothing') !== 'nothing');
    const anyProactive300b = records.some(isProactive258);
    if (turns300.length >= 3 && anyProactive300b) {
      const anyTurnDriven300 = (turns300 as Array<{ r: any; i: number }>).some(({ r, i }) =>
        isProactive258(r) || (i > 0 && isProactive258(records[i - 1])),
      );
      if (!anyTurnDriven300) {
        issues.push({
          location: 'Dramatic turns throughout',
          rule: 'TURNS_UNDRIVEN',
          severity: 'minor',
          description: `All ${turns300.length} dramatic turns occur without a proactive act in or immediately before them — every pivot happens TO the protagonist rather than because of them. Turns that arrive like weather make the protagonist a passenger in their own story: the plot changes direction and the character merely experiences it.`,
          suggestedFix: 'Tie at least one major turn to the protagonist\'s initiative: the reversal that happens because they pushed too hard, the revelation their investigation forced into the open. A turn the protagonist caused — especially one that backfires — converts plot mechanics into character consequence.',
        });
      }
    }
  }

  // ── Wave 300: SEEDING_CURIOSITY_FLAT ──────────────────────────────────────
  // Three or more clue-seeding scenes all have curiosityDelta ≤ 0 — the
  // story plants threads without making the audience curious about any of
  // them. A seed the audience doesn't wonder about is a seed they won't
  // remember at payoff time. Distinct from CLUE_SEED_CLUSTER (spatial
  // clustering) and the payoff-timing checks: this audits whether planting
  // generates the curiosity that makes payoffs land. Requires 8+ records.
  if (n >= 8) {
    const seedScenes300 = records.filter((r: any) => (r.seededClueIds?.length ?? 0) > 0);
    if (seedScenes300.length >= 3 && seedScenes300.every((r: any) => (r.curiosityDelta ?? 0) <= 0)) {
      issues.push({
        location: 'Clue-seeding scenes',
        rule: 'SEEDING_CURIOSITY_FLAT',
        severity: 'minor',
        description: `All ${seedScenes300.length} clue-seeding scenes have a flat or negative curiosityDelta — the story plants threads without making the audience wonder about any of them. A seed that raises no question is invisible: the audience will not carry it, and the eventual payoff will read as new information rather than a thread resolving.`,
        suggestedFix: 'Make at least the most important plant conspicuous enough to itch: a detail a character reacts to and then dismisses, an object the camera lingers on a beat too long, a remark that does not quite fit. The audience should notice without understanding — noticing is what converts a plant into a promise.',
      });
    }
  }

  // ── Wave 314: PROACTIVE_SUSPENSE_DECOUPLED ───────────────────────────────
  // Proactive scenes (the protagonist raises a clock or plants a clue) have an
  // average suspenseDelta of zero or below — the protagonist takes initiative
  // but the initiative never raises tension. Distinct from AGENCY_WITHOUT_
  // CONSEQUENCE (which audits the scenes that FOLLOW a proactive beat for a
  // downstream ripple): this audits the proactive scenes' OWN suspense. Agency
  // that generates no tension reads as busywork. Requires 8+ records and 3+
  // proactive scenes.
  if (n >= 8) {
    const proactiveScenes314 = records.filter(isProactive258);
    if (proactiveScenes314.length >= 3) {
      const avgSusp314 = proactiveScenes314.reduce((acc: number, r: any) => acc + (r.suspenseDelta ?? 0), 0) / proactiveScenes314.length;
      if (avgSusp314 <= 0) {
        issues.push({
          location: 'Proactive scenes — suspense decoupled',
          rule: 'PROACTIVE_SUSPENSE_DECOUPLED',
          severity: 'minor',
          description: `The protagonist's ${proactiveScenes314.length} proactive scenes have an average suspenseDelta of ${avgSusp314.toFixed(2)} — initiative never raises tension. When the protagonist raises a clock or plants a clue and the scene generates no suspense, agency reads as procedure: the audience watches them act without feeling that anything is at risk in the acting.`,
          suggestedFix: 'Make initiative dangerous: when the protagonist commits to a course, show what it could cost — a risk taken, a door that locks behind them, an enemy alerted. A proactive beat should tighten the screw, not just advance the to-do list.',
        });
      }
    }
  }

  // ── Wave 314: PROACTIVE_GLOBAL_SCARCITY ──────────────────────────────────
  // Fewer than 15% of all scenes are proactive across the whole story — the
  // protagonist almost never drives events. Distinct from PROTAGONIST_REACTIVE_
  // DOMINANCE (Act 2 specifically), AGENCY_FRONTLOADED (distribution skew), and
  // the zone-specific voids: this is a whole-story agency-density floor. A
  // protagonist who initiates this rarely is a passenger for the entire film.
  // Requires 10+ records and at least one proactive scene (a total void is
  // covered by the opening/zone checks).
  if (n >= 10) {
    const proactiveCount314 = records.filter(isProactive258).length;
    if (proactiveCount314 >= 1 && proactiveCount314 / n < 0.15) {
      issues.push({
        location: 'Whole-story agency density',
        rule: 'PROACTIVE_GLOBAL_SCARCITY',
        severity: 'minor',
        description: `Only ${proactiveCount314} of ${n} scenes (${Math.round(proactiveCount314 / n * 100)}%) are proactive — the protagonist raises a clock or plants a clue in fewer than one scene in six. Across the whole story the protagonist almost never drives events; they spend the film reacting to a plot that happens around them rather than because of them.`,
        suggestedFix: 'Raise the agency floor: give the protagonist initiative in each act — a goal they pursue, a deadline they set, a lead they chase. A story is the record of a character trying to get something; if they rarely try, there is no story, only events.',
      });
    }
  }

  // ── Wave 314: STAKES_RAISED_EXTERNALLY ───────────────────────────────────
  // Two or more scenes carry the purpose "raise_stakes" but none of them is a
  // proactive scene — the stakes only ever rise from outside, never from the
  // protagonist's own choices. Distinct from conflict's STAKES_LABEL_UNBACKED
  // (raise_stakes scenes with no conflict markers at all) and STAKES_NEVER_
  // PERSONAL (clock never paired with emotion): this flags escalation that the
  // protagonist never authors. Requires 8+ records.
  if (n >= 8) {
    const stakesScenes314 = records.filter((r: any) => r.purpose === 'raise_stakes');
    if (stakesScenes314.length >= 2 && !stakesScenes314.some(isProactive258)) {
      issues.push({
        location: 'Stakes-raising scenes',
        rule: 'STAKES_RAISED_EXTERNALLY',
        severity: 'minor',
        description: `${stakesScenes314.length} scenes raise the stakes but none is proactive — the protagonist never authors an escalation. Stakes that only ever rise from outside (events, antagonists, circumstance) make the protagonist the object of the story's pressure rather than a source of it; their choices never raise the temperature.`,
        suggestedFix: 'Let the protagonist raise the stakes at least once: a gambit that forces the antagonist\'s hand, a deadline they impose, a confession that escalates the conflict. When the protagonist authors an escalation, the rising stakes become a consequence of who they are, not just weather they endure.',
      });
    }
  }

  // ── Wave 339: PROACTIVE_EMOTION_DECOUPLED, PROACTIVE_REVELATION_ABSENT, PROACTIVE_RELATIONSHIP_VOID ──

  // PROACTIVE_EMOTION_DECOUPLED (minor, n≥8, ≥3 proactive scenes): Three or more
  // proactive scenes (clockRaised or seededClueIds non-empty) are all emotionally
  // neutral — the protagonist takes initiative without feeling anything while doing
  // it. When the acts of agency are consistently flat, the protagonist reads as an
  // efficient operator rather than a person: they raise clocks and plant seeds without
  // any visible emotional stake in doing so. The audience needs to see that the
  // protagonist cares about their own plans. Distinct from PROACTIVE_SUSPENSE_
  // DECOUPLED (suspenseDelta on proactive scenes) and CURIOSITY_WITHOUT_AGENCY
  // (curiosity spikes unlinked to initiative — different direction).
  if (n >= 8) {
    const proactiveScenes339e = (records as any[]).filter(isProactive258);
    if (proactiveScenes339e.length >= 3 && proactiveScenes339e.every(r => r.emotionalShift === 'neutral')) {
      issues.push({
        location: 'Proactive scenes',
        rule: 'PROACTIVE_EMOTION_DECOUPLED',
        severity: 'minor',
        description: `All ${proactiveScenes339e.length} proactive scenes are emotionally neutral — the protagonist takes initiative without feeling anything while doing it. When acts of agency are consistently flat, the protagonist reads as an efficient operator: they raise clocks and plant seeds without visible emotional investment, so the audience has no feeling to follow into the outcome. The protagonist's plans need to matter to the protagonist.`,
        suggestedFix: "Let initiative carry feeling: when the protagonist plants a clue or sets a deadline, show what it costs them emotionally — hope at the gambit, dread at what it might expose, grim resolve at the risk. A proactive act with no emotion is a chess move; one with feeling is a story beat.",
      });
    }
  }

  // PROACTIVE_REVELATION_ABSENT (minor, n≥8, ≥3 proactive scenes): Three or more
  // proactive scenes exist and not one of them is followed by a revelation in that
  // same scene or in either of the two subsequent scenes — the protagonist's
  // initiative never leads to discovery. When agency produces motion but no
  // revelation, the protagonist is busy but ineffective: they raise clocks and plant
  // clues, but these actions never uncover anything the audience did not already know.
  // Distinct from REVELATION_WITHOUT_PROACTIVE (Wave 258 — looks backward from
  // revelations to find proactive setup; this looks forward from proactive acts to
  // find revelations) and TURNS_UNDRIVEN (dramatic turns not following agency).
  if (n >= 8) {
    const proactiveScenes339r = (records as any[]).filter(isProactive258);
    if (proactiveScenes339r.length >= 3) {
      const hasRevNearby339 = proactiveScenes339r.some((_r: any) => {
        const idx339 = (records as any[]).indexOf(_r);
        for (let k339 = idx339; k339 <= Math.min(idx339 + 2, n - 1); k339++) {
          const rec339 = (records as any[])[k339];
          if (rec339.revelation !== null && rec339.revelation !== undefined) return true;
        }
        return false;
      });
      if (!hasRevNearby339) {
        issues.push({
          location: 'Proactive scenes',
          rule: 'PROACTIVE_REVELATION_ABSENT',
          severity: 'minor',
          description: `${proactiveScenes339r.length} proactive scenes exist but none is followed by a revelation within two scenes — the protagonist's initiative never leads to discovery. When the protagonist raises clocks and plants clues but nothing is ever uncovered as a result, their agency produces motion without revelation: they are busy without being effective, and the audience watches effort that never pays off in new understanding.`,
          suggestedFix: "Let initiative produce insight: at least one proactive act should lead to a revelation within the next two scenes — the planted clue turns up a secret, the deadline forces a confession, the pursued lead reveals the antagonist's hand. Agency that never uncovers anything is action without consequence.",
        });
      }
    }
  }

  // PROACTIVE_RELATIONSHIP_VOID (minor, n≥8, ≥3 proactive scenes): Three or more
  // proactive scenes exist and not one of them carries any relationship shift — the
  // protagonist's acts of agency have no interpersonal consequence. When initiative
  // never affects bonds, the story runs on two parallel tracks that never intersect:
  // what the protagonist does, and how relationships change. The audience can feel this
  // disconnect — the protagonist is solving a puzzle that exists apart from their
  // relationships rather than one they are entangled in. Distinct from CONFLICT_CLOCK_
  // DECOUPLED (conflict.ts: clock scenes without relational conflict) and from all
  // proactive checks which focus on suspense, emotion, or curiosity.
  if (n >= 8) {
    const proactiveScenes339rv = (records as any[]).filter(isProactive258);
    if (
      proactiveScenes339rv.length >= 3 &&
      !proactiveScenes339rv.some(r => (r.relationshipShifts?.length ?? 0) > 0)
    ) {
      issues.push({
        location: 'Proactive scenes',
        rule: 'PROACTIVE_RELATIONSHIP_VOID',
        severity: 'minor',
        description: `${proactiveScenes339rv.length} proactive scenes exist but none carries a relationship shift — the protagonist's acts of agency have no interpersonal consequence. When initiative never affects bonds, the story runs on two parallel tracks: the protagonist solves a puzzle apart from their relationships, and the audience can feel that disconnect. The protagonist's plans should be entangled with the people they are responsible to or in conflict with.`,
        suggestedFix: "Root at least one proactive act in a relationship: the protagonist plants a clue that implicates someone they care about, raises a clock that forces a partner to choose, or makes a move that fractures a bond in order to win. Initiative that moves people, not just plot, gives the protagonist something to lose.",
      });
    }
  }

  // ── Wave 353: PROACTIVE_CURIOSITY_DECOUPLED, PROACTIVE_SUSPENSE_PEAK_DECOUPLED, PROACTIVE_CURIOSITY_PEAK_DECOUPLED ──

  // PROACTIVE_CURIOSITY_DECOUPLED (minor, n≥8, ≥2 proactive scenes): The protagonist's
  // proactive scenes (clockRaised or seededClueIds) have an average curiosityDelta of zero
  // or less — initiative never opens a question. When the protagonist acts but their action
  // raises no new uncertainty, agency reads as task-completion: the audience watches them
  // execute rather than investigate, and the forward pull of "what will this turn up?" is
  // missing. Completes the proactive-scene channel set with PROACTIVE_SUSPENSE_DECOUPLED
  // and PROACTIVE_EMOTION_DECOUPLED; distinct from CURIOSITY_WITHOUT_AGENCY (which checks
  // whether curiosity spikes are driven by initiative — the opposite direction).
  if (n >= 8) {
    const proCur353 = (records as any[]).filter(isProactive258);
    if (proCur353.length >= 2) {
      const avgCur353 = proCur353.reduce((s: number, r: any) => s + (r.curiosityDelta ?? 0), 0) / proCur353.length;
      if (avgCur353 <= 0) {
        issues.push({
          location: `${proCur353.length} proactive scene(s) — curiosity register`,
          rule: 'PROACTIVE_CURIOSITY_DECOUPLED',
          severity: 'minor',
          description: `The protagonist's ${proCur353.length} proactive scenes have an average curiosityDelta of ${avgCur353.toFixed(2)} — initiative never opens a question. When the protagonist acts but the action raises no new uncertainty, agency reads as task-completion: the audience watches them execute rather than investigate, and the forward pull of "what will this turn up?" never attaches to what the protagonist does.`,
          suggestedFix: 'Let initiative generate questions: when the protagonist plants a clue or makes a move, have it expose something unexpected — a complication, a half-answer, a new unknown. Agency that deepens the mystery binds the audience to the protagonist; agency that only ticks boxes leaves them watching a checklist.',
        });
      }
    }
  }

  // PROACTIVE_SUSPENSE_PEAK_DECOUPLED (minor, n≥8, maxSuspense>1, ≥1 proactive): The
  // single highest-suspense scene in the story is not a proactive scene — the most
  // dangerous moment happens TO the protagonist rather than because of them, even though
  // they take initiative elsewhere. The story's tensest beat should ideally be one the
  // protagonist precipitated: the gambit that backfires, the confrontation they forced.
  // Distinct from INTENTION_REACTIVE_CLIMAX (the final-15% climax zone) and PROACTIVE_
  // SUSPENSE_DECOUPLED (the average suspense of proactive scenes): this isolates the
  // single peak-suspense scene wherever it falls.
  if (n >= 8) {
    const maxSusp353 = Math.max(...(records as any[]).map(r => r.suspenseDelta ?? 0));
    const anyPro353 = (records as any[]).some(isProactive258);
    if (maxSusp353 > 1 && anyPro353) {
      const peakSusp353 = (records as any[]).find(r => (r.suspenseDelta ?? 0) === maxSusp353);
      if (peakSusp353 && !isProactive258(peakSusp353)) {
        issues.push({
          location: `Scene ${peakSusp353.sceneIdx} (peak suspense: ${maxSusp353}) — not protagonist-driven`,
          rule: 'PROACTIVE_SUSPENSE_PEAK_DECOUPLED',
          severity: 'minor',
          description: `The story's highest-suspense scene (Scene ${peakSusp353.sceneIdx}, suspenseDelta ${maxSusp353}) is not a proactive scene — the most dangerous moment happens to the protagonist rather than because of them, even though they take initiative elsewhere. The tensest beat in the story lands hardest when the protagonist precipitated it: a gambit that backfires, a confrontation they forced.`,
          suggestedFix: 'Tie the peak-suspense moment to the protagonist\'s initiative: let the scene of maximum danger be the consequence of a choice they made — the trap they sprang, the line they crossed. Suspense the protagonist causes implicates them; suspense that merely befalls them makes them a victim of the plot.',
        });
      }
    }
  }

  // PROACTIVE_CURIOSITY_PEAK_DECOUPLED (minor, n≥8, maxCuriosity>1, ≥1 proactive): The
  // single highest-curiosity scene in the story is not a proactive scene — the most
  // intriguing question opens by itself rather than through the protagonist's action, even
  // though they take initiative elsewhere. The story's biggest hook should ideally be
  // something the protagonist's digging uncovered. Distinct from CURIOSITY_WITHOUT_AGENCY
  // (whether ANY curiosity spike >1 is driven by initiative — a set check) and PROACTIVE_
  // CURIOSITY_DECOUPLED (the average curiosity of proactive scenes): this isolates the
  // single peak-curiosity scene.
  if (n >= 8) {
    const maxCur353b = Math.max(...(records as any[]).map(r => r.curiosityDelta ?? 0));
    const anyPro353b = (records as any[]).some(isProactive258);
    if (maxCur353b > 1 && anyPro353b) {
      const peakCur353 = (records as any[]).find(r => (r.curiosityDelta ?? 0) === maxCur353b);
      if (peakCur353 && !isProactive258(peakCur353)) {
        issues.push({
          location: `Scene ${peakCur353.sceneIdx} (peak curiosity: ${maxCur353b}) — not protagonist-driven`,
          rule: 'PROACTIVE_CURIOSITY_PEAK_DECOUPLED',
          severity: 'minor',
          description: `The story's highest-curiosity scene (Scene ${peakCur353.sceneIdx}, curiosityDelta ${maxCur353b}) is not a proactive scene — the most intriguing question opens by itself rather than through the protagonist's action, even though they take initiative elsewhere. The biggest hook in the story binds the audience to the protagonist when it is something their digging uncovered, not something that merely surfaced.`,
          suggestedFix: 'Let the protagonist\'s initiative open the story\'s biggest question: route the peak-curiosity beat through a choice they made — the door they opened, the lead they chased, the secret they pried loose. A mystery the protagonist triggers makes their agency the engine of intrigue.',
        });
      }
    }
  }

  // ── Wave 367: PROACTIVE_ADVERSITY_ABSENT, PROACTIVE_BACKLOADED, PROACTIVE_PAYOFF_COINCIDENCE_ABSENT ──

  // PROACTIVE_ADVERSITY_ABSENT (minor, n≥8, ≥2 negative scenes, proactive exists):
  // None of the protagonist's negative-emotion scenes (their setbacks and low points)
  // is proactive — they take initiative only when things are going well, never fighting
  // back from adversity. A protagonist who acts only from comfort and goes passive the
  // moment they suffer reads as fragile rather than driven; the most compelling agency
  // is the kind exerted from the floor. Distinct from PROACTIVE_EMOTION_DECOUPLED (which
  // audits whether proactive scenes are emotionally neutral — this audits whether the
  // protagonist's worst moments contain any initiative).
  if (n >= 8) {
    const negScenes367 = (records as any[]).filter(r => r.emotionalShift === 'negative');
    const anyProactive367 = (records as any[]).some(isProactive258);
    if (negScenes367.length >= 2 && anyProactive367 && !negScenes367.some(isProactive258)) {
      issues.push({
        location: `${negScenes367.length} negative-emotion scene(s) — no initiative`,
        rule: 'PROACTIVE_ADVERSITY_ABSENT',
        severity: 'minor',
        description: `None of the protagonist's ${negScenes367.length} negative-emotion scenes is proactive — they take initiative elsewhere but never while suffering a setback. A protagonist who acts only when things go well and goes passive the moment they're hurt reads as fragile rather than driven. The most compelling agency is the kind exerted from the floor: the choice to fight back precisely when everything has gone wrong.`,
        suggestedFix: "Give the protagonist a proactive beat at a low point: a clue they chase through grief, a deadline they force despite the setback. Initiative born of adversity — acting because things are bad, not because they're good — is what separates a driven protagonist from one the plot merely rewards when convenient.",
      });
    }
  }

  // PROACTIVE_BACKLOADED (minor, n≥10, ≥3 proactive scenes): More than 70% of the
  // protagonist's proactive acts fall in the second half of the story. Initiative arrives
  // late — the setup and first complication zone pass with the protagonist mostly passive,
  // then agency concentrates toward the climax. Distinct from PROACTIVE_LATE_SURGE (the
  // all-or-nothing case: zero proactive acts in the first half) — this fires even when the
  // first half has some initiative, as long as it is a small minority — and from PROACTIVE_
  // OVERCLUSTERING (a single tight burst spanning ≤20% of the story, anywhere).
  if (n >= 10) {
    const mid367 = Math.floor(n * 0.5);
    const proIdxs367: number[] = [];
    for (let i = 0; i < n; i++) {
      if (isProactive258(records[i])) proIdxs367.push(i);
    }
    if (proIdxs367.length >= 3) {
      const secondHalf367 = proIdxs367.filter(i => i >= mid367).length;
      if (secondHalf367 / proIdxs367.length > 0.7) {
        issues.push({
          location: `Proactive distribution — ${secondHalf367}/${proIdxs367.length} acts in the back half`,
          rule: 'PROACTIVE_BACKLOADED',
          severity: 'minor',
          description: `${secondHalf367} of the protagonist's ${proIdxs367.length} proactive acts (${Math.round(secondHalf367 / proIdxs367.length * 100)}%) fall in the second half — initiative arrives late. The setup and first complication zone pass with the protagonist mostly passive, and agency only concentrates as the climax approaches. A protagonist who is reactive through the front half asks the audience to invest in someone who isn't yet driving their own story.`,
          suggestedFix: 'Move some proactive beats into the first half: an early choice, a goal pursued from the outset, a clock the protagonist raises before the midpoint. Agency established early makes the protagonist the engine of the story from the start, rather than someone who wakes up to their own plot halfway through.',
        });
      }
    }
  }

  // PROACTIVE_PAYOFF_COINCIDENCE_ABSENT (minor, n≥8, ≥3 proactive scenes, ≥2 payoff
  // scenes): No single scene is both proactive and a payoff — the protagonist's moments
  // of initiative and the story's moments of payoff never coincide. The protagonist
  // exerts agency and the story delivers callbacks, but never in the same beat, so the
  // satisfaction of a payoff is never the direct, immediate product of the protagonist's
  // action. Distinct from PAYOFF_WITHOUT_EFFORT (which checks a 3-scene lookback before
  // each payoff for any proactive act): this checks same-scene coincidence specifically,
  // catching stories where payoffs follow effort but never land in the act itself.
  if (n >= 8) {
    const proScenes367 = (records as any[]).filter(isProactive258);
    const payoffScenes367 = (records as any[]).filter(r => ((r.payoffSetupIds ?? []) as any[]).length > 0);
    if (proScenes367.length >= 3 && payoffScenes367.length >= 2) {
      const anyCoincide367 = (records as any[]).some(r =>
        isProactive258(r) && ((r.payoffSetupIds ?? []) as any[]).length > 0,
      );
      if (!anyCoincide367) {
        issues.push({
          location: 'Initiative / payoff coincidence',
          rule: 'PROACTIVE_PAYOFF_COINCIDENCE_ABSENT',
          severity: 'minor',
          description: `Across ${proScenes367.length} proactive scenes and ${payoffScenes367.length} payoff scenes, no single scene is both — the protagonist's initiative and the story's payoffs never land in the same beat. The protagonist exerts agency and the story delivers callbacks, but the satisfaction of a payoff is never the immediate product of an action the protagonist is taking in that very moment, so cause and reward stay structurally separated.`,
          suggestedFix: 'Let at least one payoff fire inside a proactive scene: the moment the protagonist plants the decisive clue or forces the confrontation should also be the moment a long-seeded thread pays off. When agency and payoff coincide, the protagonist visibly earns the resolution in real time rather than triggering it from a distance.',
        });
      }
    }
  }

  // ── Wave 381: PROACTIVE_ACT2B_VOID, PROACTIVE_FRONTLOADED, PROACTIVE_REVELATION_COINCIDENCE_ABSENT ──

  // PROACTIVE_ACT2B_VOID (minor, n≥10, ≥3 total proactive): Act 2b (the 50%–75% zone, the
  // run-up to the climax) contains no proactive act, while the protagonist initiates
  // elsewhere. The approach to the peak is where the protagonist should be pushing hardest —
  // springing the trap, forcing the confrontation — yet here they go passive precisely as
  // the stakes crest. Fills the Act-zone set alongside PROACTIVE_OPENING_ABSENT (Act 1),
  // PROACTIVE_ACT2A_VOID (25%–50%), PROACTIVE_MIDPOINT_VOID (40%–60%), and PROACTIVE_ACT3_
  // VOID (final 25%).
  if (n >= 10) {
    const a2bStart381 = Math.floor(n * 0.5);
    const a2bEnd381 = Math.floor(n * 0.75);
    const totalPro381 = records.filter(isProactive258).length;
    if (totalPro381 >= 3) {
      const a2bRecs381 = records.slice(a2bStart381, a2bEnd381);
      if (a2bRecs381.length >= 2 && a2bRecs381.filter(isProactive258).length === 0) {
        issues.push({
          location: `Act 2b (Scenes ${a2bStart381}–${a2bEnd381 - 1})`,
          rule: 'PROACTIVE_ACT2B_VOID',
          severity: 'minor',
          description: `Act 2b (Scenes ${a2bStart381}–${a2bEnd381 - 1}) contains no proactive act — no clock raised, no clue planted — while the protagonist initiates elsewhere. The run-up to the climax is where they should be pushing hardest, springing the trap or forcing the confrontation; going passive here means the protagonist is carried toward the peak rather than driving toward it.`,
          suggestedFix: 'Give the protagonist a decisive proactive beat in Act 2b: the gambit that sets up the climax, the deadline they impose, the lead they chase into the final confrontation. The approach to the peak should be the protagonist at their most driven, not their most passive.',
        });
      }
    }
  }

  // PROACTIVE_FRONTLOADED (minor, n≥10, ≥3 proactive scenes): More than 70% of the
  // protagonist's proactive acts fall in the first half. Initiative is spent early and
  // dwindles toward the climax, so the protagonist drives the setup but is carried through
  // the back half where agency matters most. The distribution mirror of PROACTIVE_BACKLOADED
  // (>70% in the second half); distinct from COMMITMENT_RAMP_INVERSION (which compares
  // opening-third density to final-third density — a different statistic) and from PROACTIVE_
  // OVERCLUSTERING (a single tight burst, anywhere).
  if (n >= 10) {
    const mid381 = Math.floor(n * 0.5);
    const proIdxs381: number[] = [];
    for (let i = 0; i < n; i++) {
      if (isProactive258(records[i])) proIdxs381.push(i);
    }
    if (proIdxs381.length >= 3) {
      const firstHalf381 = proIdxs381.filter(i => i < mid381).length;
      if (firstHalf381 / proIdxs381.length > 0.7) {
        issues.push({
          location: `Proactive distribution — ${firstHalf381}/${proIdxs381.length} acts in the front half`,
          rule: 'PROACTIVE_FRONTLOADED',
          severity: 'minor',
          description: `${firstHalf381} of the protagonist's ${proIdxs381.length} proactive acts (${Math.round(firstHalf381 / proIdxs381.length * 100)}%) fall in the first half — initiative is spent early and dwindles toward the climax. The protagonist drives the setup but is carried through the back half, where agency matters most; a front-loaded drive leaves the ending happening to them rather than because of them.`,
          suggestedFix: 'Reserve proactive beats for the back half: the protagonist\'s drive should intensify toward the climax, not fade. Move some initiative later — the decisive move, the forced confrontation — so the character is pushing hardest exactly when the stakes peak.',
        });
      }
    }
  }

  // PROACTIVE_REVELATION_COINCIDENCE_ABSENT (minor, n≥8, ≥3 proactive scenes, ≥2 revelation
  // scenes): No single scene is both proactive and a revelation — the protagonist's
  // initiative never directly turns up a truth in the same beat it is exerted. Discoveries
  // and agency exist but never coincide, so the protagonist never visibly digs up a truth in
  // the moment of digging. Mirror of PROACTIVE_PAYOFF_COINCIDENCE_ABSENT (initiative ×
  // payoff); distinct from REVELATION_WITHOUT_PROACTIVE (which checks a 2-scene lookback
  // before each revelation — this checks same-scene coincidence specifically).
  if (n >= 8) {
    const proScenes381 = records.filter(isProactive258);
    const revScenes381 = records.filter((r: any) => r.revelation !== null && r.revelation !== undefined);
    if (proScenes381.length >= 3 && revScenes381.length >= 2 &&
        !records.some((r: any) => isProactive258(r) && r.revelation !== null && r.revelation !== undefined)) {
      issues.push({
        location: 'Initiative / revelation coincidence',
        rule: 'PROACTIVE_REVELATION_COINCIDENCE_ABSENT',
        severity: 'minor',
        description: `Across ${proScenes381.length} proactive scenes and ${revScenes381.length} revelation scenes, no single scene is both — the protagonist's initiative never directly turns up a truth in the same beat it is exerted. Discoveries and agency exist but never coincide, so the audience never watches the protagonist dig up a truth in the act of digging; revelations arrive adjacent to their effort rather than as its immediate product.`,
        suggestedFix: 'Let at least one revelation fire inside a proactive scene: the moment the protagonist forces a confrontation or chases a lead should also be the moment the truth surfaces. When agency and discovery coincide, the protagonist visibly earns the revelation rather than receiving it after the fact.',
      });
    }
  }

  // ── Wave 395: PROACTIVE_RELATIONSHIP_PEAK_ABSENT, PROACTIVE_EMOTIONAL_RECOIL_ABSENT, SEED_BACKLOADED ──

  // PROACTIVE_RELATIONSHIP_PEAK_ABSENT (minor, n≥8, ≥2 proactive-with-shift scenes,
  // peak magnitude >0.4): The scene with the largest relational shift magnitude in the
  // story is not a proactive scene, even though the protagonist does take agency in scenes
  // that carry relationship shifts elsewhere. The most consequential bond change — the
  // story's biggest relational moment — happens outside their initiative: they are a
  // bystander at the most important relational event.
  // Distinct from PROACTIVE_RELATIONSHIP_VOID (Wave 339: NO proactive scene has ANY shift;
  // this fires even when some proactive scenes DO have shifts, as long as the single peak-
  // magnitude shift is not among them), PROACTIVE_PAYOFF_COINCIDENCE_ABSENT (payoffSetupIds
  // signal, not relationship magnitude), and PROACTIVE_SUSPENSE_PEAK_DECOUPLED (suspenseDelta
  // peak, not relational-shift magnitude).
  if (n >= 8) {
    const proWithRelShift395a = (records as any[]).filter(r =>
      isProactive258(r) && (r.relationshipShifts?.length ?? 0) > 0,
    );
    if (proWithRelShift395a.length >= 2) {
      let peakRelRec395a: any = null;
      let peakRelMag395a = 0;
      for (const r of records as any[]) {
        for (const s of (r.relationshipShifts ?? []) as Array<{ amount: number }>) {
          if (Math.abs(s.amount) > peakRelMag395a) {
            peakRelMag395a = Math.abs(s.amount);
            peakRelRec395a = r;
          }
        }
      }
      if (peakRelRec395a && peakRelMag395a > 0.4 && !isProactive258(peakRelRec395a)) {
        issues.push({
          location: `Scene ${peakRelRec395a.sceneIdx} — peak relational shift (magnitude ${peakRelMag395a.toFixed(2)})`,
          rule: 'PROACTIVE_RELATIONSHIP_PEAK_ABSENT',
          severity: 'minor',
          description: `The story's largest relational shift (magnitude ${peakRelMag395a.toFixed(2)} at Scene ${peakRelRec395a.sceneIdx}) is not proactive — the most consequential bond change happens outside the protagonist's initiative. Though the protagonist takes agency in scenes that carry smaller relational shifts elsewhere, the single most important relational moment in the story occurs without their drive behind it: they are a bystander at the event that most reshapes the human relationships in the story.`,
          suggestedFix: 'Route the story\'s biggest relational moment through the protagonist\'s agency: let the largest bond change — the deepest rupture or the most significant repair — happen because of a choice they made. The protagonist should be the agent of the story\'s most important relational consequence, not simply present when it happens.',
        });
      }
    }
  }

  // PROACTIVE_EMOTIONAL_RECOIL_ABSENT (minor, n≥8, ≥3 proactive scenes): No proactive
  // act is followed in the next 2 scenes by a negative emotional shift — the protagonist
  // takes initiative but initiative never costs them emotionally in the scenes that follow.
  // Agency that produces no adverse emotional aftermath reads as risk-free by design: the
  // protagonist acts and the world absorbs it without pushing back. Drama is what happens
  // when a character's choices cost them something; initiative with no emotional recoil
  // exists outside consequence.
  // Distinct from GOAL_INVERSION_ABSENT (Wave 171: checks within the proactive scene
  // itself for a negative emotion/shift — this audits the 2-scene aftermath window),
  // AGENCY_WITHOUT_CONSEQUENCE (Wave 216: fires when ≥75% of proactive acts produce NO
  // downstream signal at all — positive or negative; this fires when there is downstream
  // activity but never a specifically negative emotional cost).
  if (n >= 8) {
    const proactiveIdxs395b: number[] = [];
    for (let i = 0; i < n; i++) {
      if (isProactive258(records[i])) proactiveIdxs395b.push(i);
    }
    if (proactiveIdxs395b.length >= 3) {
      const noCostAftermath395b = proactiveIdxs395b.every(idx => {
        const window395b = (records as any[]).slice(idx + 1, idx + 3);
        return window395b.every(a => a.emotionalShift !== 'negative');
      });
      if (noCostAftermath395b) {
        issues.push({
          location: 'Proactive scenes — emotional recoil absent',
          rule: 'PROACTIVE_EMOTIONAL_RECOIL_ABSENT',
          severity: 'minor',
          description: `None of the protagonist's ${proactiveIdxs395b.length} proactive acts is followed by a negative emotional shift in the next two scenes — initiative never costs the protagonist emotionally. Agency that produces no adverse aftermath reads as risk-free by design: they act and the world absorbs it without emotional consequence. A character who acts without ever paying an emotional price exists outside the logic of cost that makes stakes feel real.`,
          suggestedFix: 'Let initiative carry a cost: at least once, the protagonist\'s proactive act should leave an emotional bruise in the scenes that follow — grief at what the gambit required, fear at what it exposed, or anguish at what it cost someone else. A character who acts without emotional recoil is executing a plan; a character who acts and pays a price is living a story.',
        });
      }
    }
  }

  // SEED_BACKLOADED (minor, n≥8, ≥3 seeded-clue scenes all in second half): All clue-
  // seeding scenes fall in the second half of the story — no seeds are planted in the
  // first half. The audience carries no planted threads through the opening and complication
  // zones; all foreshadowing concentrates near the climax, leaving seeds too little time to
  // mature into resonant payoffs. An audience that was never taught to watch for a detail
  // cannot feel the satisfaction of seeing it return.
  // Distinct from INTENTION_SEED_GRAVEYARD (Wave 286: seeds IN the first half with no
  // payoffs in the second — the opposite failure direction), SEEDING_CURIOSITY_FLAT (Wave
  // 300: all seed scenes have low curiosityDelta — a quality check on seeds wherever they
  // are, not a timing check), and PAYOFF_WITHOUT_EFFORT (Wave 272: payoff scenes not
  // preceded by proactive effort — the payoff signal, not the seeding signal).
  if (n >= 8) {
    const half395c = Math.floor(n * 0.5);
    const seedRecs395c = (records as any[]).filter(r => ((r.seededClueIds ?? []) as string[]).length > 0);
    if (seedRecs395c.length >= 3) {
      const firstHalfSeeds395c = seedRecs395c.filter(r => (records as any[]).indexOf(r) < half395c).length;
      if (firstHalfSeeds395c === 0) {
        issues.push({
          location: `Clue seeds — all ${seedRecs395c.length} in the back half (Scenes ${half395c}+)`,
          rule: 'SEED_BACKLOADED',
          severity: 'minor',
          description: `All ${seedRecs395c.length} clue-seeding scenes fall in the second half (none in the first ${half395c} scenes) — the story plants no threads for the audience to carry through the opening and complication zones. Foreshadowing that arrives near the climax has no time to mature: an audience never taught to notice a detail cannot feel the satisfaction of seeing it return. Back-loaded seeds read as afterthoughts rather than architecture.`,
          suggestedFix: 'Plant at least one seed in the first half: a detail the audience notices and carries without yet understanding, a question opened in the setup that the second half finally answers. Early seeds are promises; the audience invests in the story by holding them. A first half with no seeds is a first half without promises to the audience.',
        });
      }
    }
  }

  // ── Wave 409: PROACTIVE_PAYOFF_PEAK_DECOUPLED, SEED_FRONTLOADED, PROACTIVE_SUSPENSE_AFTERMATH_ABSENT ──

  // PROACTIVE_PAYOFF_PEAK_DECOUPLED (minor, n≥8, ≥2 proactive payoff scenes): The scene that
  // resolves the most setups (the highest payoffSetupIds.length in the story) is not a proactive
  // scene, even though smaller payoffs DO coincide with the protagonist's initiative. The
  // single biggest narrative payoff — the moment the audience collects the largest return on its
  // investment — lands without the protagonist's agency behind it: the story's most satisfying
  // resolution happens to them rather than because of them. The payoff sibling of PROACTIVE_
  // RELATIONSHIP_PEAK_ABSENT (relationship magnitude). Distinct from PROACTIVE_PAYOFF_COINCIDENCE_
  // ABSENT (co-occurrence: NO proactive scene is a payoff — this fires even when some proactive
  // scenes deliver payoffs, as long as the single biggest payoff is not among them) and
  // PAYOFF_WITHOUT_EFFORT (payoff scenes not preceded by proactive effort — a backward-sequence
  // check, not a single-peak isolation).
  if (n >= 8) {
    const proWithPayoff409 = (records as any[]).filter(r =>
      isProactive258(r) && ((r.payoffSetupIds ?? []) as string[]).length > 0,
    );
    if (proWithPayoff409.length >= 2) {
      const peakPayoffCount409 = Math.max(...(records as any[]).map(r => ((r.payoffSetupIds ?? []) as string[]).length));
      const peakPayoffRec409 = (records as any[]).find(r => ((r.payoffSetupIds ?? []) as string[]).length === peakPayoffCount409);
      if (peakPayoffRec409 && peakPayoffCount409 >= 1 && !isProactive258(peakPayoffRec409)) {
        issues.push({
          location: `Scene ${peakPayoffRec409.sceneIdx} — peak payoff (${peakPayoffCount409} setup(s) resolved)`,
          rule: 'PROACTIVE_PAYOFF_PEAK_DECOUPLED',
          severity: 'minor',
          description: `The story's largest payoff (Scene ${peakPayoffRec409.sceneIdx}, ${peakPayoffCount409} setup(s) resolved) is not proactive — the single biggest narrative return lands without the protagonist's agency behind it. Though smaller payoffs coincide with the protagonist's initiative elsewhere, the most satisfying resolution in the story — where the audience collects the largest return on its investment — happens to them rather than because of them, so the climax of the seeding/payoff architecture is not something they earned.`,
          suggestedFix: 'Route the story\'s biggest payoff through the protagonist\'s initiative: let the moment that resolves the most threads be the consequence of a choice they made — the plan that finally pays off, the lead they chased that delivers everything at once. The largest return on the audience\'s investment should be the protagonist\'s achievement, not a windfall the plot hands them.',
        });
      }
    }
  }

  // SEED_FRONTLOADED (minor, n≥8, ≥3 seeded-clue scenes all in first half): All clue-seeding
  // scenes fall in the first half — the back half plants no new threads. The story stops opening
  // questions after the midpoint, so the audience heads into the complication and climax zones
  // with nothing new to wonder about: every thread it is tracking was planted early and the late
  // story only closes loops, never opens them. A back half that seeds nothing has no forward pull
  // of its own — it lives entirely on promises made before the midpoint. The distribution mirror
  // of SEED_BACKLOADED (all seeds in the second half). Distinct from INTENTION_SEED_GRAVEYARD
  // (seeds in the first half with no payoffs in the second — a seed/payoff pairing failure; this
  // is purely a timing-distribution check on where seeds fall) and SEEDING_CURIOSITY_FLAT
  // (a quality check on seed scenes' curiosityDelta, not their placement).
  if (n >= 8) {
    const half409s = Math.floor(n * 0.5);
    const seedRecs409 = (records as any[]).filter(r => ((r.seededClueIds ?? []) as string[]).length > 0);
    if (seedRecs409.length >= 3) {
      const secondHalfSeeds409 = seedRecs409.filter(r => (records as any[]).indexOf(r) >= half409s).length;
      if (secondHalfSeeds409 === 0) {
        issues.push({
          location: `Clue seeds — all ${seedRecs409.length} in the front half (Scenes 0–${half409s - 1})`,
          rule: 'SEED_FRONTLOADED',
          severity: 'minor',
          description: `All ${seedRecs409.length} clue-seeding scenes fall in the first half (none at or after Scene ${half409s}) — the back half plants no new threads. The story stops opening questions after the midpoint, so the audience enters the complication and climax zones with nothing new to wonder about: every thread it tracks was planted early, and the late story only closes loops rather than opening them. A back half that seeds nothing has no forward pull of its own.`,
          suggestedFix: 'Plant at least one seed in the second half: a fresh question raised as the climax nears, a new detail that complicates what the audience thought it understood. Late seeds keep the back half generative — the story should still be opening doors even as it begins closing them, so the run-up to the climax carries its own momentum rather than only paying off early promises.',
        });
      }
    }
  }

  // PROACTIVE_SUSPENSE_AFTERMATH_ABSENT (minor, n≥8, ≥3 proactive scenes): No proactive act is
  // followed in the next 2 scenes by a suspense spike (suspenseDelta > 1) — the protagonist takes
  // initiative but their action never raises the temperature in the scenes that follow. Agency
  // that generates no downstream tension reads as inconsequential: the protagonist acts, and the
  // story's danger level is unmoved by it, so initiative and suspense run on separate tracks.
  // Distinct from PROACTIVE_SUSPENSE_DECOUPLED (the proactive scene's OWN average suspenseDelta
  // ≤ 0 — same-scene, not downstream), PROACTIVE_SUSPENSE_PEAK_DECOUPLED (the global peak-suspense
  // scene is not proactive — single-peak isolation), and PROACTIVE_REVELATION_ABSENT (the
  // revelation channel of the same 2-scene aftermath window): this audits the suspense aftermath.
  if (n >= 8) {
    const proactiveIdxs409: number[] = [];
    for (let i = 0; i < n; i++) {
      if (isProactive258(records[i])) proactiveIdxs409.push(i);
    }
    if (proactiveIdxs409.length >= 3) {
      const anyDownstreamSpike409 = proactiveIdxs409.some(idx => {
        const window409 = (records as any[]).slice(idx + 1, idx + 3);
        return window409.some(a => (a.suspenseDelta ?? 0) > 1);
      });
      if (!anyDownstreamSpike409) {
        issues.push({
          location: 'Proactive scenes — suspense aftermath absent',
          rule: 'PROACTIVE_SUSPENSE_AFTERMATH_ABSENT',
          severity: 'minor',
          description: `None of the protagonist's ${proactiveIdxs409.length} proactive acts is followed by a suspense spike (suspenseDelta > 1) in the next two scenes — initiative never raises the temperature downstream. Agency that generates no following tension reads as inconsequential: the protagonist acts and the story's danger level is unmoved, so what they do and how dangerous the story feels run on separate tracks. The audience never learns to brace when the protagonist makes a move.`,
          suggestedFix: 'Let at least one proactive act raise the stakes in its wake: the gambit that provokes a retaliation, the clue planted that draws the antagonist\'s attention, the deadline set that tightens the screws over the next scenes. When initiative reliably escalates danger, the audience leans forward every time the protagonist acts — because they have learned that the protagonist\'s moves have teeth.',
        });
      }
    }
  }

  // ── Wave 423: SEED_MIDPOINT_VOID, PROACTIVE_AFTERMATH_CURIOSITY_ABSENT, SEED_DRAMA_DECOUPLED ──

  // SEED_MIDPOINT_VOID (minor, n≥10, ≥3 seed scenes, at least one outside midpoint): No clue-
  // planting scene falls in the 40%–60% midpoint zone while seeds exist in other parts of the
  // story. The midpoint is where the protagonist crosses from reactive to proactive and where
  // the audience is most receptive to a thread that will pay off in the back half — a seed
  // planted at the story's pivot has the longest runway to accumulate anticipation before its
  // resolution. When the midpoint zone receives no new threads, the pivot lands with nothing
  // newly promised: the audience heads into Act 2b carrying only the threads from the first half,
  // with nothing the pivot specifically generated for them to wonder about. Zone presence/absence
  // × seed channel × midpoint zone. Distinct from PROACTIVE_MIDPOINT_VOID (Wave 258: the general
  // proactive-act family at the midpoint — clock raises and seeds combined), SEED_FRONTLOADED
  // (Wave 409: ALL seeds in the first half — a distribution check), and SEED_BACKLOADED (Wave 395:
  // all seeds in the second half — the distribution mirror). This audits specifically the midpoint
  // zone while those audit hemispheres.
  if (n >= 10) {
    const midS423a = Math.floor(n * 0.40);
    const midE423a = Math.floor(n * 0.60);
    const seedRecs423a = (records as any[]).filter(r => ((r.seededClueIds ?? []) as string[]).length > 0);
    if (seedRecs423a.length >= 3) {
      const hasMidSeed423a = seedRecs423a.some(r => {
        const idx = (records as any[]).indexOf(r);
        return idx >= midS423a && idx < midE423a;
      });
      const hasOutsideMid423a = seedRecs423a.some(r => {
        const idx = (records as any[]).indexOf(r);
        return !(idx >= midS423a && idx < midE423a);
      });
      if (!hasMidSeed423a && hasOutsideMid423a) {
        issues.push({
          location: `Midpoint zone (Scenes ${midS423a}–${midE423a - 1}) — no clue seeded`,
          rule: 'SEED_MIDPOINT_VOID',
          severity: 'minor',
          description: `No clue is seeded in the midpoint zone (Scenes ${midS423a}–${midE423a - 1}), though ${seedRecs423a.length} seeds land elsewhere. The midpoint is the story's pivot and its most generative moment for planting threads that will pay off in the second half — a seed planted here has the longest runway between promise and delivery. Without any new thread introduced at the pivot, the audience heads into Act 2b carrying only first-half questions, and the structural turn generates no wonder of its own.`,
          suggestedFix: 'Plant at least one clue in the midpoint zone: a fragment of information that makes the audience wonder about something they have not wondered about before, timed specifically to the story\'s pivot point. A midpoint seed integrates foreshadowing into the structure — the thread introduced as everything changes will feel connected to the change, and its eventual payoff will feel like a consequence of the turn rather than of an arbitrary earlier beat.',
        });
      }
    }
  }

  // PROACTIVE_AFTERMATH_CURIOSITY_ABSENT (minor, n≥8, ≥3 proactive scenes): No proactive act is
  // followed by a curiosity rise (curiosityDelta > 0) in the next two scenes — the protagonist
  // takes initiative but their action never opens a new question in the scenes that immediately
  // follow. Agency that generates no downstream curiosity reads as narratively inert: the
  // protagonist acts and the story's question-engine is unmoved by it. Ideally, initiative should
  // both drive events AND generate new unknowns — the plan the protagonist sets in motion should
  // leave the audience wondering what comes of it. Sequence/aftermath mode × curiosity.
  // Distinct from PROACTIVE_CURIOSITY_DECOUPLED (Wave 353: the proactive scenes' OWN
  // curiosityDelta ≤ 0 — this audits the same-scene curiosity, not what follows), PROACTIVE_
  // SUSPENSE_AFTERMATH_ABSENT (Wave 409: suspense channel of the 2-scene aftermath window),
  // and PROACTIVE_REVELATION_ABSENT (Wave 339: revelation in the aftermath — different channel).
  // This completes the curiosity dimension of the proactive-aftermath family.
  if (n >= 8) {
    const proactiveIdxs423b: number[] = [];
    for (let i = 0; i < n; i++) {
      if (isProactive258((records as any[])[i])) proactiveIdxs423b.push(i);
    }
    if (proactiveIdxs423b.length >= 3) {
      const anyDownstreamCuriosity423b = proactiveIdxs423b.some(idx => {
        const window = (records as any[]).slice(idx + 1, idx + 3);
        return window.some(a => (a.curiosityDelta ?? 0) > 0);
      });
      if (!anyDownstreamCuriosity423b) {
        issues.push({
          location: 'Proactive scenes — curiosity aftermath absent',
          rule: 'PROACTIVE_AFTERMATH_CURIOSITY_ABSENT',
          severity: 'minor',
          description: `None of the protagonist's ${proactiveIdxs423b.length} proactive acts is followed by a curiosity rise (curiosityDelta > 0) in the next two scenes — initiative never opens a new question downstream. The protagonist acts and the story's question-engine is unmoved by it: every act of agency closes without generating forward wonder. When initiative is systematically uncurious in its aftermath, the audience learns not to speculate about what happens next when the protagonist makes a move — the answers will be flat.`,
          suggestedFix: 'Let at least one proactive act spawn a new question in the scene or two that follow: the protagonist takes an action whose consequences are immediately unclear, a plan set in motion raises a new "but what if...?", or initiative in one area opens a hole in another. The aftermath of agency should generate as much intrigue as the act itself — initiative that raises no questions produces a story with no sense of forward momentum from the protagonist.',
        });
      }
    }
  }

  // SEED_DRAMA_DECOUPLED (minor, n≥8, ≥2 seed scenes, ≥2 turn scenes): No clue-planting scene
  // coincides with a dramatic turn (dramaticTurn !== 'nothing') — threads are always planted in
  // quiet, non-pivotal beats while dramatic pivots never simultaneously open new questions. When
  // a clue is planted at a story turn, the audience simultaneously receives new information AND
  // feels the story shift direction — a doubly charged beat that is far more memorable than either
  // a seed or a turn in isolation. When the two engines never coincide, seeds are always background
  // texture (exposition, quiet foreshadowing) rather than the forward-driving events of pivotal
  // moments. Co-occurrence/decoupling mode × seed × dramatic turn. Distinct from SEEDING_CURIOSITY_
  // FLAT (Wave 300: seeds don't raise curiosity — a quality check on seed scenes, not co-occurrence),
  // CONFLICT_CLUE_DECOUPLED (Wave 394: no rupture seeds a clue — the relationship-conflict channel),
  // and PROACTIVE_REVELATION_COINCIDENCE_ABSENT (Wave 381: no proactive scene is itself a revelation
  // — agency × disclosure, not seeding × pivot).
  if (n >= 8) {
    const seedRecs423c = (records as any[]).filter(r => ((r.seededClueIds ?? []) as string[]).length > 0);
    const turnRecs423c = (records as any[]).filter(r => (r.dramaticTurn ?? 'nothing') !== 'nothing');
    if (seedRecs423c.length >= 2 && turnRecs423c.length >= 2) {
      const anyCoincide423c = seedRecs423c.some(r => (r.dramaticTurn ?? 'nothing') !== 'nothing');
      if (!anyCoincide423c) {
        issues.push({
          location: `${seedRecs423c.length} seed scene(s) and ${turnRecs423c.length} turn scene(s) — never coincide`,
          rule: 'SEED_DRAMA_DECOUPLED',
          severity: 'minor',
          description: `None of the story's ${seedRecs423c.length} clue-seeding scenes coincides with a dramatic turn — threads are always planted in quiet, non-pivotal beats while the story's ${turnRecs423c.length} pivots never simultaneously open a new question. A seed planted at a dramatic turn is doubly charged: the audience receives new information and feels the story shift direction in the same beat. When the seeding engine and the pivot engine never meet, clues feel like background texture rather than integrated into the story's turning machinery.`,
          suggestedFix: 'Let at least one dramatic turn also plant a clue: a reversal that surfaces a fragment of truth, a twist that leaves a new thread dangling, a pivot whose aftermath contains a piece of information the audience wasn\'t expecting. A seed at a turning point integrates foreshadowing into the story\'s structure rather than treating it as separate groundwork done in exposition.',
        });
      }
    }
  }

  // ── Wave 437: SEED_RUN_ISOLATED, PROACTIVE_ZONE_IMBALANCE, SEED_CLOCKLESS ──

  // SEED_RUN_ISOLATED (minor, n≥8, ≥4 seed scenes, maxSeedRun≥3): Three or more consecutive
  // scenes each plant at least one seeded clue — the story delivers a burst of new threads
  // without pause for any single thread to register. When clues are distributed across isolated
  // scenes the audience can absorb each thread before the next arrives; when ≥3 consecutive
  // scenes all seed clues, the audience is overwhelmed with rapid-fire thread-laying, causing
  // individual questions to blur together and the entire batch to feel like undifferentiated
  // exposition rather than carefully staged foreshadowing. Run-based mode × seed channel.
  // Distinct from SEED_FRONTLOADED (Wave 409: ALL seeds in the first half — hemispheric
  // distribution, not consecutive-run detection), SEED_BACKLOADED (Wave 395: the distribution
  // mirror), SEED_MIDPOINT_VOID (Wave 423: zone absence, not run bloat), and SEED_DRAMA_DECOUPLED
  // (Wave 423: co-occurrence with turns — quality, not run). This is the first run-based check
  // for the seed channel.
  if (n >= 8) {
    const seedRecs437a = (records as any[]).filter(r => ((r.seededClueIds ?? []) as string[]).length > 0);
    if (seedRecs437a.length >= 4) {
      let maxSeedRun437a = 0;
      let curSeedRun437a = 0;
      let maxSeedStart437a = -1;
      let curSeedStart437a = -1;
      for (let i = 0; i < n; i++) {
        const isSeed = ((records as any[])[i].seededClueIds ?? [] as string[]).length > 0;
        if (isSeed) {
          if (curSeedRun437a === 0) curSeedStart437a = i;
          if (++curSeedRun437a > maxSeedRun437a) {
            maxSeedRun437a = curSeedRun437a;
            maxSeedStart437a = curSeedStart437a;
          }
        } else {
          curSeedRun437a = 0;
        }
      }
      if (maxSeedRun437a >= 3) {
        issues.push({
          location: `Scenes ${maxSeedStart437a}–${maxSeedStart437a + maxSeedRun437a - 1} — consecutive seed burst`,
          rule: 'SEED_RUN_ISOLATED',
          severity: 'minor',
          description: `${maxSeedRun437a} consecutive scenes (${maxSeedStart437a}–${maxSeedStart437a + maxSeedRun437a - 1}) each plant at least one new clue — a rapid-fire burst of thread-laying. When questions arrive in back-to-back-to-back scenes without pause, individual threads compete for attention and each one lands with reduced weight: the audience is filling an inbox rather than holding a single thread in suspense. Seeds planted in isolation, separated by scenes where no new question is introduced, are far more memorable than seeds delivered in bursts.`,
          suggestedFix: `Break the seed cluster at Scenes ${maxSeedStart437a}–${maxSeedStart437a + maxSeedRun437a - 1}: move one or two of the clue plants to a later scene, creating at least one non-seeding scene between consecutive seeds. The gap between seeds is part of their effect — the audience needs a scene to carry a question before they receive the next one. Spread the thread-laying so each clue gets its own moment of arrival.`,
        });
      }
    }
  }

  // PROACTIVE_ZONE_IMBALANCE (minor, n≥10, ≥4 proactive scenes): Divides the story into four
  // equal-length structural zones (Act 1: 0–25%, Act 2a: 25–50%, Act 2b: 50–75%, Act 3: 75–100%).
  // At least one zone has zero proactive acts while another zone contains ≥50% of all proactive
  // acts — initiative is simultaneously absent from one zone and bloated in another. The story's
  // agency engine is concentrated in one quarter while another quarter goes entirely without. This
  // is not merely a zone void (which PROACTIVE_ACT2A_VOID and PROACTIVE_ACT2B_VOID check for
  // specific zones) nor a hemispheric imbalance (which PROACTIVE_BACKLOADED and PROACTIVE_FRONTLOADED
  // check) — it requires the co-presence of a full void AND a proportional bloat in the same story.
  // Underweight/bloat mode × initiative distribution. Distinct from PROACTIVE_ACT2A_VOID (Wave 272:
  // Act 2a specifically empty without requiring a bloat), PROACTIVE_ACT2B_VOID (Wave 381: Act 2b
  // specifically empty), PROACTIVE_BACKLOADED (Wave 367: >70% in second half — two-zone partition),
  // PROACTIVE_FRONTLOADED (Wave 381: >70% in first half), PROACTIVE_LATE_SURGE (Wave 272: passive
  // first half with burst second half — a temporal pattern, not a zone-level audit). This is the
  // first check to audit imbalance across all four structural zones simultaneously.
  if (n >= 10) {
    const proactiveZoneCounts437b = [0, 0, 0, 0];
    for (let i = 0; i < n; i++) {
      if (isProactive258((records as any[])[i])) {
        const zoneIdx = Math.min(3, Math.floor((i / n) * 4));
        proactiveZoneCounts437b[zoneIdx]++;
      }
    }
    const totalProactive437b = proactiveZoneCounts437b.reduce((a, b) => a + b, 0);
    if (totalProactive437b >= 4) {
      const maxZoneCount437b = Math.max(...proactiveZoneCounts437b);
      const hasEmptyZone437b = proactiveZoneCounts437b.some(c => c === 0);
      if (hasEmptyZone437b && maxZoneCount437b / totalProactive437b >= 0.50) {
        const emptyZoneNames437b = ['Act 1 (0–25%)', 'Act 2a (25–50%)', 'Act 2b (50–75%)', 'Act 3 (75–100%)'];
        const bloatZone437b = proactiveZoneCounts437b.indexOf(maxZoneCount437b);
        const emptyZones437b = proactiveZoneCounts437b
          .map((c, i) => c === 0 ? emptyZoneNames437b[i] : null)
          .filter(Boolean)
          .join(', ');
        issues.push({
          location: `${emptyZones437b} empty; ${emptyZoneNames437b[bloatZone437b]} has ${maxZoneCount437b}/${totalProactive437b} proactive acts`,
          rule: 'PROACTIVE_ZONE_IMBALANCE',
          severity: 'minor',
          description: `The story's ${totalProactive437b} proactive acts are unevenly distributed across its four structural zones: ${emptyZoneNames437b[bloatZone437b]} contains ${maxZoneCount437b} of them (${Math.round((maxZoneCount437b / totalProactive437b) * 100)}%) while ${emptyZones437b} contains none. Initiative simultaneously bloats in one zone and vanishes from another: the audience receives concentrated agency in one structural quarter while another quarter passes without the protagonist driving a single event. The structural zones where initiative is absent will feel like the protagonist is adrift, while the bloated zone will feel like the protagonist is compulsively busy.`,
          suggestedFix: `Redistribute initiative: move at least one proactive act from ${emptyZoneNames437b[bloatZone437b]} into the empty zone(s) — ${emptyZones437b} — so every structural quarter of the story has some evidence of the protagonist driving events. The goal is not perfect uniformity, but that no zone is completely initiative-free while another is carrying more than half the total load.`,
        });
      }
    }
  }

  // SEED_CLOCKLESS (minor, n≥8, ≥3 seed scenes): Every clue-seeding scene has no clock
  // pressure (clockRaised = false, clockDelta ≤ 0) — threads are always planted in moments
  // of calm, never under urgency. When a clue is planted while a clock is running, it carries
  // double charge: the audience receives a new thread AND feels time pressure on the very
  // question they are asked to hold. A seed planted under urgency tells the audience that
  // this particular question matters NOW — it has a deadline. Seeds planted exclusively in
  // low-urgency, clockless moments signal that the information is supplementary material
  // delivered during a lull rather than story-critical intelligence introduced at a
  // consequential moment. Co-occurrence/decoupling × seed × clock. Distinct from SEED_DRAMA_
  // DECOUPLED (Wave 423: seeds never coincide with dramatic turns — a pivot quality signal,
  // not an urgency check), SEEDING_CURIOSITY_FLAT (Wave 300: seed scenes have low curiosityDelta
  // — an information-quality signal, not an urgency-channel check), and CURIOSITY_WITHOUT_AGENCY
  // (Wave 300: curiosity spikes without protagonist initiative — neither seed-specific nor
  // clock-specific). This is the first check to audit the co-occurrence of seed scenes with
  // clock pressure.
  if (n >= 8) {
    const seedRecs437c = (records as any[]).filter(r => ((r.seededClueIds ?? []) as string[]).length > 0);
    if (seedRecs437c.length >= 3) {
      const allClockless437c = seedRecs437c.every(r =>
        r.clockRaised !== true && (r.clockDelta ?? 0) <= 0,
      );
      if (allClockless437c) {
        issues.push({
          location: `All ${seedRecs437c.length} seed scene(s) — no clock pressure`,
          rule: 'SEED_CLOCKLESS',
          severity: 'minor',
          description: `All ${seedRecs437c.length} clue-seeding scenes are planted without any clock pressure (clockRaised = false, clockDelta ≤ 0 in every case) — threads are always introduced in moments of calm. A seed planted while a clock is running signals to the audience that this information is urgent: a question introduced under time pressure carries a built-in deadline, and the audience holds it with more tension than a question introduced in a quiet moment. When every clue arrives during a lull, the seeding engine and the urgency engine are entirely decoupled — threads feel like background texture rather than strategically timed intelligence.`,
          suggestedFix: 'Let at least one clue be planted in a scene where a clock is running or time pressure is elevated: a seed planted as a deadline looms, during an escalating confrontation, or at a moment when the protagonist is under pressure to act quickly. The urgency does not need to be explicitly about the clue — it simply needs to co-exist with the new question, so the audience receives the thread in a heightened state rather than a relaxed one.',
        });
      }
    }
  }

  // ── Wave 451: PROACTIVE_RELATIONSHIP_AFTERMATH_ABSENT, SEED_EMOTIONAL_DECOUPLED, SEED_CAUSE_VOID ──

  // PROACTIVE_RELATIONSHIP_AFTERMATH_ABSENT (minor, n≥8, ≥3 proactive acts): Every proactive act
  // (clock raised or clue planted) is followed by 2 scenes where no relationship shift occurs —
  // the protagonist's initiative never moves any bond in the scenes that follow it. Proactive
  // agency that generates no relational consequence teaches the audience that the protagonist's
  // actions exist in a social vacuum: pressing forward achieves plot goals while leaving the cast's
  // bonds untouched. Sequence/aftermath mode × relationship channel × proactive axis. Completes
  // the proactive-aftermath family alongside PROACTIVE_EMOTIONAL_RECOIL_ABSENT (Wave 395: emotional
  // aftermath), PROACTIVE_SUSPENSE_AFTERMATH_ABSENT (Wave 409: suspense aftermath), and PROACTIVE_
  // AFTERMATH_CURIOSITY_ABSENT (Wave 423: curiosity aftermath) — this adds the relationship channel,
  // the fourth and final member of the set. Distinct from PROACTIVE_RELATIONSHIP_VOID (Wave 339:
  // proactive scenes themselves carry no relationship shift — audits the act itself; this audits
  // the 2 scenes after) and AGENCY_WITHOUT_CONSEQUENCE (Wave 216: broad inertia over suspense/
  // relationship/revelation combined — not relationship-channel specific).
  if (n >= 8) {
    const proactiveRecs451a = (records as any[]).filter(r =>
      r.clockRaised === true || ((r.seededClueIds ?? []) as string[]).length > 0,
    );
    if (proactiveRecs451a.length >= 3) {
      const allRelSilent451a = proactiveRecs451a.every((r: any) => {
        const idx = (records as any[]).indexOf(r);
        for (let off = 1; off <= 2; off++) {
          if (idx + off >= n) continue;
          if (((records as any[])[idx + off].relationshipShifts ?? []).length > 0) return false;
        }
        return true;
      });
      if (allRelSilent451a) {
        issues.push({
          location: 'All proactive aftermath scenes — relationships silent',
          rule: 'PROACTIVE_RELATIONSHIP_AFTERMATH_ABSENT',
          severity: 'minor',
          description: `All ${proactiveRecs451a.length} proactive acts (clocks raised or clues planted) are each followed by 2 scenes with no relationship shift — the protagonist's initiative never moves any bond in the scenes that follow it. Proactive agency without relational downstream consequence teaches the audience that the protagonist's actions exist in a social vacuum: pressing forward achieves plot goals while leaving the cast's relationships untouched by each choice. Initiative that changes the world but doesn't move the people in it lands as logistics rather than drama.`,
          suggestedFix: "Let at least one proactive act ripple into a relationship: the scene or two after a protagonist's decisive move should show a bond reacting — a new trust formed, an alliance strained, a partnership altered by what the protagonist just did. When a character's initiative changes a relationship, the audience feels the full weight of agency: not just that the protagonist did something, but that doing it cost or earned something between people.",
        });
      }
    }
  }

  // SEED_EMOTIONAL_DECOUPLED (minor, n≥8, ≥3 seed scenes): Every scene that plants a clue
  // (seededClueIds non-empty) carries a neutral emotional shift — no seed scene is a moment of
  // heightened feeling. Threads planted in emotionally inert scenes arrive as information delivered
  // at room temperature: the audience receives the new question without any emotional activation
  // to make it stick. A seed planted in a scene that also carries a positive or negative emotional
  // charge imprints the question on the audience with the feeling attached — they hold the thread
  // harder because of the emotional context. Seeds delivered exclusively in neutral scenes feel like
  // background exposition. Co-occurrence mode × seed channel × emotional channel. Distinct from
  // SEEDING_CURIOSITY_FLAT (Wave 300: avg curiosityDelta ≤ 0 in seed scenes — curiosity channel,
  // not emotion; continuous delta not categorical valence), SEED_DRAMA_DECOUPLED (Wave 423: no
  // dramatic turn in seed scenes — turn channel), and SEED_CLOCKLESS (Wave 437: no clock in seed
  // scenes — urgency channel): this is the first check to audit the emotional channel in seed scenes.
  if (n >= 8) {
    const seedRecs451b = (records as any[]).filter(r =>
      ((r.seededClueIds ?? []) as string[]).length > 0,
    );
    if (seedRecs451b.length >= 3 && seedRecs451b.every(r => (r as any).emotionalShift === 'neutral')) {
      issues.push({
        location: `All ${seedRecs451b.length} seed scene(s) — emotionally neutral`,
        rule: 'SEED_EMOTIONAL_DECOUPLED',
        severity: 'minor',
        description: `All ${seedRecs451b.length} clue-seeding scenes carry a neutral emotional shift — every new thread is planted in a moment of flat feeling. A question introduced while a character is in emotional turmoil or elation is imprinted with that feeling and held harder; a question introduced in a neutral scene arrives as room-temperature information. When every seed is delivered in a calm, emotionally inert moment, the threads feel like background exposition rather than charged foreshadowing — the audience catalogs the question without feeling why it matters.`,
        suggestedFix: "Plant at least one clue in a scene that also carries an emotional charge: a seed delivered during a moment of grief, triumph, or fear carries the feeling with it, making the thread harder to forget. The emotional activation attaches to the question — the audience holds it not just intellectually but physically. Move one seed into a scene where a character (and the audience) is already feeling something.",
      });
    }
  }

  // SEED_CAUSE_VOID (minor, n≥8, ≥3 seed scenes): Every clue-seeding scene has no dramatic
  // upstream trigger in itself or the scene immediately before it — no revelation surfacing, no
  // dramatic turn (≠ 'nothing'), no curiosity spike (curiosityDelta > 0), no emotional activation
  // (≠ 'neutral'). Every thread is planted in a vacuum: no heightened attention primes the
  // audience to receive the new question. Seeds planted during dramatic peaks are noticed and
  // retained; seeds delivered exclusively in calm, undramatic moments are background information
  // the audience catalogs without registering as significant. Backward-cause mode × seed channel.
  // Distinct from SEED_DRAMA_DECOUPLED (Wave 423: no dramatic turn IN the seed scene itself —
  // single-signal in-scene co-occurrence; this looks at the prior scene too, backward-cause mode,
  // and combines multiple upstream triggers), SEEDING_CURIOSITY_FLAT (Wave 300: curiosity generated
  // BY seeds downstream; this audits what triggers seeds upstream — opposite direction), SEED_
  // CLOCKLESS (Wave 437: clock signal, co-occurrence mode; this is backward-cause across revelation/
  // turn/curiosity/emotion). First backward-cause check for the seed channel.
  if (n >= 8) {
    const seedRecs451c = (records as any[]).filter(r =>
      ((r.seededClueIds ?? []) as string[]).length > 0,
    );
    if (seedRecs451c.length >= 3) {
      const isUpstreamTrigger451c = (r: any): boolean =>
        r.revelation !== null ||
        (r.dramaticTurn ?? 'nothing') !== 'nothing' ||
        (r.curiosityDelta ?? 0) > 0 ||
        r.emotionalShift !== 'neutral';
      const allUncaused451c = seedRecs451c.every((r: any) => {
        const idx = (records as any[]).indexOf(r);
        return !isUpstreamTrigger451c(r) && (idx === 0 || !isUpstreamTrigger451c((records as any[])[idx - 1]));
      });
      if (allUncaused451c) {
        issues.push({
          location: `All ${seedRecs451c.length} seed scene(s) — no upstream trigger`,
          rule: 'SEED_CAUSE_VOID',
          severity: 'minor',
          description: `Every clue-seeding scene (seededClueIds non-empty) has no upstream dramatic trigger in itself or the immediately preceding scene — no revelation, no dramatic turn, no curiosity spike, and no emotional activation. Every thread arrives in a dramatic vacuum: there is no heightened alertness to anchor the seed in memory. Seeds planted adjacent to revelations, turns, emotional beats, or curiosity spikes land when the audience is maximally attentive and embed more deeply; seeds planted exclusively in calm, undramatic moments are background information the audience catalogs without registering as significant.`,
          suggestedFix: "Attach at least one seed to a dramatic event: plant a clue in (or immediately after) a scene with a revelation, a dramatic turn, a moment of high curiosity, or an emotional peak. The surrounding drama primes the audience to notice the new thread — they are already leaning forward and alert when the question arrives. A seed planted in a dramatic vacuum may technically be in the story without ever entering the audience's awareness.",
        });
      }
    }
  }

  // ── Wave 465: PROACTIVE_CLOCK_AFTERMATH_ABSENT, PAYOFF_DRAMA_DECOUPLED, REVELATION_FRONTLOADED ──

  // PROACTIVE_CLOCK_AFTERMATH_ABSENT (minor, n≥8, ≥3 proactive scenes): No proactive act is
  // followed in the next 2 scenes by a clock event (clockRaised = true or clockDelta > 0) —
  // the protagonist takes initiative but their action never escalates a deadline in the scenes
  // that follow. Initiative that never tightens the urgency engine downstream teaches the
  // audience that what the protagonist does and how time-pressured the story feels are separate
  // circuits; the protagonist's moves never trigger the ticking that makes the audience lean
  // forward. Sequence/aftermath mode × clock channel. Completes the proactive-aftermath family
  // alongside PROACTIVE_EMOTIONAL_RECOIL_ABSENT (Wave 395: emotional aftermath), PROACTIVE_
  // SUSPENSE_AFTERMATH_ABSENT (Wave 409: suspense aftermath), PROACTIVE_AFTERMATH_CURIOSITY_
  // ABSENT (Wave 423: curiosity aftermath), and PROACTIVE_RELATIONSHIP_AFTERMATH_ABSENT (Wave
  // 451: relationship aftermath) — this adds the clock channel as the fifth and final member.
  // Distinct from PROACTIVE_SUSPENSE_AFTERMATH_ABSENT (suspense delta signal, not clock events),
  // STAKES_NEVER_PERSONAL (clock co-occurrence with emotion in the same scene — not aftermath),
  // and INTENTION_CONVERGENCE_ABSENT (seed + clock same scene — co-occurrence, not aftermath).
  if (n >= 8) {
    const proactiveIdxs465a: number[] = [];
    for (let i = 0; i < n; i++) {
      if (isProactive258((records as any[])[i])) proactiveIdxs465a.push(i);
    }
    if (proactiveIdxs465a.length >= 3) {
      const anyClockAftermath465a = proactiveIdxs465a.some(idx => {
        const window465a = (records as any[]).slice(idx + 1, idx + 3);
        return window465a.some((a: any) => a.clockRaised === true || (a.clockDelta ?? 0) > 0);
      });
      if (!anyClockAftermath465a) {
        issues.push({
          location: 'Proactive scenes — clock aftermath absent',
          rule: 'PROACTIVE_CLOCK_AFTERMATH_ABSENT',
          severity: 'minor',
          description: `None of the protagonist's ${proactiveIdxs465a.length} proactive acts is followed by a clock event (clockRaised or clockDelta > 0) in the next two scenes — initiative never escalates a deadline downstream. Proactive agency that never raises urgency in the scenes that follow teaches the audience that what the protagonist does and how time-pressured the story feels are separate systems; the protagonist's moves never trigger the ticking that makes the audience lean forward.`,
          suggestedFix: 'Let at least one proactive act raise a deadline in its wake: the protagonist plants a clue and the antagonist responds by setting a ticking clock, or the clock they raise triggers a countdown escalation in the following scene. When initiative consistently escalates urgency, the audience learns that the protagonist\'s agency moves the story toward its inevitable collision with time.',
        });
      }
    }
  }

  // PAYOFF_DRAMA_DECOUPLED (minor, n≥8, ≥2 payoff scenes, ≥2 turn scenes): No scene that
  // resolves a setup (payoffSetupIds non-empty) coincides with a dramatic turn — every story
  // callback lands in a quiet, non-pivotal moment while the story's turning points deliver no
  // narrative payoff. A payoff at a dramatic turn is doubly charged: the audience collects on
  // a planted promise exactly as the story shifts direction, and the accumulated investment
  // amplifies the pivot's impact. When the two engines are entirely decoupled, callbacks arrive
  // as low-key closures (the thread closes without ceremony) and turns arrive as surprise events
  // with no accumulated investment to detonate. Co-occurrence/decoupling mode × payoff × dramatic
  // turn. Distinct from SEED_DRAMA_DECOUPLED (Wave 423: no seed scene has a dramatic turn — the
  // seeding side of the same coin; this audits payoff scenes, not seed scenes), PROACTIVE_PAYOFF_
  // COINCIDENCE_ABSENT (Wave 367: no scene is both proactive and a payoff — the agency × payoff
  // pairing, different axis), and TURNS_UNDRIVEN (Wave 300: turns not preceded by protagonist
  // initiative — the agency × turn pairing, not payoff × turn).
  if (n >= 8) {
    const payoffRecs465b = (records as any[]).filter(r => ((r.payoffSetupIds ?? []) as string[]).length > 0);
    const turnRecs465b = (records as any[]).filter(r => (r.dramaticTurn ?? 'nothing') !== 'nothing');
    if (payoffRecs465b.length >= 2 && turnRecs465b.length >= 2) {
      const anyCoincide465b = payoffRecs465b.some((r: any) => (r.dramaticTurn ?? 'nothing') !== 'nothing');
      if (!anyCoincide465b) {
        issues.push({
          location: `${payoffRecs465b.length} payoff scene(s) and ${turnRecs465b.length} turn scene(s) — never coincide`,
          rule: 'PAYOFF_DRAMA_DECOUPLED',
          severity: 'minor',
          description: `None of the story's ${payoffRecs465b.length} payoff scenes coincides with a dramatic turn — every callback lands in a quiet, non-pivotal moment while the story's ${turnRecs465b.length} pivots deliver no narrative payoff. A payoff at a dramatic turn is doubly charged: the audience collects on a planted promise exactly as the story reverses or escalates, and the accumulated investment amplifies the pivot's impact. When the two engines are entirely decoupled, payoffs land as quiet closures with no dramatic charge, and turns arrive as pure surprise without the resonance of anything previously promised.`,
          suggestedFix: "Let at least one payoff fire at a dramatic turn: time a planted thread's resolution to coincide with a reversal, revelation, or pivot. The audience holding a half-forgotten thread will feel the payoff with double intensity when it arrives at a moment of story-level change — the convergence of 'I knew it' and 'everything just changed' is one of narrative's most satisfying beats.",
        });
      }
    }
  }

  // REVELATION_FRONTLOADED (distribution/timing × revelation channel, n≥10, ≥4 revelations,
  // >70% in the first half): More than 70% of all revelation scenes fall in the first half of
  // the story — the narrative front-loads its disclosures. When discoveries concentrate in the
  // setup and early conflict, the protagonist enters Act 2b and Act 3 with most truths already
  // known: the back half operates on established fact rather than discovery, and the climax
  // becomes execution rather than revelation. An audience that already knows what the protagonist
  // is dealing with loses the forward pull of wondering what is still hidden. Distribution/timing
  // mode × revelation channel. Completes a parallel distribution family alongside SEED_FRONTLOADED
  // (Wave 409: all seeds in the first half) and PROACTIVE_FRONTLOADED (Wave 381: all proactive
  // acts in the first half): this adds the revelation channel. Distinct from INTENTION_DISCOVERY_
  // ABSENT (Wave 244: no revelation in Act 3 WITH ≥3 proactive acts — requires initiative and
  // audits only Act 3; this audits the first-half share across the whole story without requiring
  // proactive acts), REVELATION_WITHOUT_PROACTIVE (Wave 258: revelations not preceded by
  // initiative — backward-cause, not distribution), and PROACTIVE_REVELATION_COINCIDENCE_ABSENT
  // (Wave 381: same-scene proactive × revelation co-occurrence — not a timing distribution).
  if (n >= 10) {
    const half465c = Math.floor(n * 0.5);
    const revRecs465c = (records as any[]).filter(r =>
      r.revelation !== null && r.revelation !== undefined && r.revelation !== '',
    );
    if (revRecs465c.length >= 4) {
      const firstHalfRevs465c = revRecs465c.filter(r => {
        const idx = (records as any[]).indexOf(r);
        return idx < half465c;
      }).length;
      if (firstHalfRevs465c / revRecs465c.length > 0.70) {
        issues.push({
          location: `Revelations — ${firstHalfRevs465c}/${revRecs465c.length} in the front half (Scenes 0–${half465c - 1})`,
          rule: 'REVELATION_FRONTLOADED',
          severity: 'minor',
          description: `${firstHalfRevs465c} of the story's ${revRecs465c.length} revelations (${Math.round(firstHalfRevs465c / revRecs465c.length * 100)}%) fall in the first half — discoveries are front-loaded. When the narrative hands out most of its truths in the setup and early conflict, the protagonist enters Act 2b and Act 3 with the full picture already assembled: the back half runs on established fact rather than discovery, and the climax becomes a matter of execution rather than revelation. An audience that already knows what the protagonist is dealing with loses the forward pull of wondering what is still true.`,
          suggestedFix: 'Hold back at least one or two major truths for the back half: a revelation that recontextualizes everything should arrive in Act 2b or Act 3, not Act 1, so the protagonist (and audience) is still learning something significant as the stakes peak. A discovery near the climax reframes the entire story and makes the ending feel earned by surprise rather than by the mechanical execution of a known plan.',
        });
      }
    }
  }

  // ── Wave 479: REVELATION_RUN, PAYOFF_FINAL_ZONE_VOID, REVELATION_CURIOSITY_FLAT ──
  const n479 = records.length;

  // REVELATION_RUN (run-based × revelation channel, n≥8, ≥3 consecutive revelation scenes):
  // Three or more scenes in an unbroken row each contain a revelation — the story delivers
  // information in a rapid dump rather than spacing discoveries to build layered suspense.
  // Each disclosure needs space around it: a scene of reaction, a shift in strategy, an
  // emotional beat before the next truth lands. When revelations stack consecutively the
  // audience's processing time is crowded out, each disclosure dilutes the impact of the
  // last, and the cumulative effect is numbness rather than mounting wonder or dread.
  // Run-based mode × revelation channel. Distinctness rationale: SEED_RUN_ISOLATED (Wave 437)
  // checks consecutive seeding scenes (planting), not disclosure scenes (revealing). This is
  // the third run-based check, completing the family alongside PROACTIVE_DESERT_RUN (Wave 258:
  // consecutive passive scenes) and SEED_RUN_ISOLATED (Wave 437: consecutive seed scenes).
  if (n479 >= 8) {
    let maxRevRun479a = 0;
    let curRevRun479a = 0;
    let maxRevRunStart479a = 0;
    let curRevRunStart479a = 0;
    for (let i479a = 0; i479a < n479; i479a++) {
      const r479a = (records as any[])[i479a];
      const hasRev479a = r479a.revelation !== null && r479a.revelation !== undefined && r479a.revelation !== '';
      if (hasRev479a) {
        if (curRevRun479a === 0) curRevRunStart479a = i479a;
        curRevRun479a++;
        if (curRevRun479a > maxRevRun479a) {
          maxRevRun479a = curRevRun479a;
          maxRevRunStart479a = curRevRunStart479a;
        }
      } else {
        curRevRun479a = 0;
      }
    }
    if (maxRevRun479a >= 3) {
      issues.push({
        location: `Revelation run — Scenes ${maxRevRunStart479a}–${maxRevRunStart479a + maxRevRun479a - 1} (${maxRevRun479a} consecutive)`,
        rule: 'REVELATION_RUN',
        severity: 'minor',
        description: `${maxRevRun479a} scenes in a row each contain a revelation — the story delivers information in an unbroken dump rather than distributing discoveries to build layered suspense. A rapid-fire succession of revelations crowds out the audience's processing time: each disclosure needs space around it to land with weight, raise questions, and shift allegiances before the next truth arrives. When revelations stack back-to-back, each one dilutes the impact of the previous; the cumulative effect is numbness rather than mounting dread or wonder.`,
        suggestedFix: 'Separate revelations with scenes of reaction, consequence, and escalation. Let each truth breathe: after a disclosure, show the protagonist absorbing the new reality — a decision made under shifted information, an emotional fallout, a strategy pivot — before the next layer peels back. A revelation followed by two scenes of aftermath lands harder than three revelations stacked in quick succession.',
      });
    }
  }

  // PAYOFF_FINAL_ZONE_VOID (zone presence/absence × payoff × Act 3, n≥10, ≥4 payoff scenes,
  // none in final 25%): The story has four or more payoff scenes but not one falls in the
  // final quarter — Act 3 resolves no planted threads, and the climax carries its weight on
  // new invention rather than on accumulated promises fulfilled. An ending that resolves nothing
  // previously seeded feels narratively lightweight: the audience entered Act 3 still holding
  // threads and exits holding them still. Payoffs at the climax transform setup into destiny —
  // the audience's long-held anticipation becomes the very fuel that makes the ending feel
  // earned rather than imposed. Zone presence/absence mode × payoff channel × Act 3.
  // Distinctness rationale: REVELATION_FRONTLOADED (Wave 465) checks the ratio of revelations
  // in the first half — a distribution check, not a zone-void check. PAYOFF_WITHOUT_EFFORT
  // (Wave 272) checks that payoffs are preceded by protagonist action — a backward-cause check.
  // PROACTIVE_ACT_2B_VOID (Wave 381) checks the 50–75% zone — this is a separate zone. This
  // extends the zone family to the payoff channel and the Act 3 zone.
  if (n479 >= 10) {
    const finalZoneStart479b = Math.floor(n479 * 0.75);
    const allPayoffRecs479b = (records as any[]).filter(r => ((r.payoffSetupIds ?? []) as string[]).length > 0);
    if (allPayoffRecs479b.length >= 4) {
      const finalZonePayoffs479b = allPayoffRecs479b.filter(r => {
        const pos479b = (records as any[]).indexOf(r);
        return pos479b >= finalZoneStart479b;
      });
      if (finalZonePayoffs479b.length === 0) {
        issues.push({
          location: `Payoffs — none in final zone (Scenes ${finalZoneStart479b}–${n479 - 1})`,
          rule: 'PAYOFF_FINAL_ZONE_VOID',
          severity: 'minor',
          description: `The story has ${allPayoffRecs479b.length} payoff scenes — every thread resolution fires before the final 25% of the story. Act 3 operates without a single planted-thread callback, leaving the climax to carry its weight on new invention rather than on accumulated promises fulfilled. An ending that resolves nothing previously seeded feels narratively lightweight: the audience entered Act 3 still holding threads and exits holding them still. Payoffs at the climax transform setup into destiny — the audience's long-held anticipation becomes the fuel that makes the ending feel earned rather than imposed.`,
          suggestedFix: `Move at least one payoff into Act 3 (Scene ${finalZoneStart479b} onward) — ideally the highest-stakes planted thread. A seeded thread that resolves at the climax reframes everything that came before: the audience realises the story was leading here all along. Multiple Act 3 payoffs converging at once — threads planted in Act 1 snapping shut simultaneously — is the structural engine behind most satisfying endings.`,
        });
      }
    }
  }

  // REVELATION_CURIOSITY_FLAT (average/aggregate × revelation × curiosity, n≥8, ≥3 revelation
  // scenes, avg curiosityDelta across all revelation scenes ≤ 0): Averaged across all revelation
  // scenes, curiosity does not rise — disclosures collectively generate no forward momentum.
  // A revelation should do double work: close one question and open another. When the average
  // curiosityDelta at revelation scenes is flat or negative, the story transitions from suspense
  // to closure mode with each disclosure, depleting the audience's forward pull rather than
  // layering it. The ideal revelation shifts "what's happening?" into "but wait — then what
  // about X?" so each truth accelerates the need to see the next scene.
  // Average/aggregate mode × revelation channel × curiosity. Distinctness rationale:
  // PROACTIVE_CURIOSITY_DECOUPLED (Wave 353) checks the average curiosityDelta of proactive
  // scenes — this checks revelation scenes specifically. REVELATION_FRONTLOADED (Wave 465)
  // checks when revelations occur, not what curiosity they produce. PROACTIVE_AFTERMATH_
  // CURIOSITY_ABSENT (Wave 423) checks whether proactive acts are followed by curiosity rises
  // in subsequent scenes — this checks the revelation scenes themselves, not their aftermath.
  if (n479 >= 8) {
    const revRecs479c = (records as any[]).filter(r =>
      r.revelation !== null && r.revelation !== undefined && r.revelation !== '',
    );
    if (revRecs479c.length >= 3) {
      const avgRevCuriosity479c = revRecs479c.reduce((sum: number, r: any) => sum + (r.curiosityDelta ?? 0), 0) / revRecs479c.length;
      if (avgRevCuriosity479c <= 0) {
        issues.push({
          location: `Revelation scenes — avg curiosityDelta ${avgRevCuriosity479c.toFixed(2)} (≤ 0)`,
          rule: 'REVELATION_CURIOSITY_FLAT',
          severity: 'minor',
          description: `Across all ${revRecs479c.length} revelation scenes the average curiosityDelta is ${avgRevCuriosity479c.toFixed(2)} — disclosures collectively generate no forward curiosity. A revelation should do double work: close one question and open another. When truths land without raising new mystery, the story transitions to closure mode scene by scene, depleting the audience's forward pull. The ideal revelation shifts "what's happening?" into "but wait — then what about X?" so the disclosure accelerates the audience's need to see the next scene.`,
          suggestedFix: "Reframe revelations to plant new questions even as they answer old ones: 'the killer is revealed — but why did they bury the evidence?' opens a deeper layer. Let each revelation shift the protagonist's goal rather than merely confirm a suspicion; a truth that resets the chase generates curiosity, while a truth that merely confirms a guess does not.",
        });
      }
    }
  }

  // ── Wave 493: PAYOFF_CURIOSITY_FLAT, SEED_ACT1_VOID, PAYOFF_RUN ──

  // PAYOFF_CURIOSITY_FLAT (average/aggregate × payoff × curiosity, n≥8, ≥3 payoff scenes,
  // avg curiosityDelta ≤ 0): Across all payoff scenes the average curiosityDelta is ≤ 0 —
  // callbacks close planted questions but open none. Each payoff should do double duty: resolve
  // the setup the audience was tracking while also opening a deeper layer of mystery. When every
  // thread-closure lands in flat or negative curiosity terrain, the story transitions scene by
  // scene from "what happens next?" to "well, that's settled," depleting forward momentum at
  // the exact moments that should feel most dynamically satisfying. Distinctness: REVELATION_
  // CURIOSITY_FLAT (Wave 479) audits revelation scenes — this audits payoff scenes, a different
  // structural channel. PROACTIVE_CURIOSITY_DECOUPLED (Wave 353) checks proactive scenes, not
  // payoff scenes. PAYOFF_DRAMA_DECOUPLED (Wave 465) checks co-occurrence with turns, not the
  // average curiosity generated.
  {
    const n493a = records.length;
    if (n493a >= 8) {
      const payoffRecs493a = (records as any[]).filter(r =>
        ((r.payoffSetupIds ?? []) as string[]).length > 0,
      );
      if (payoffRecs493a.length >= 3) {
        const avgPayoffCuriosity493a =
          payoffRecs493a.reduce((s: number, r: any) => s + (r.curiosityDelta ?? 0), 0) /
          payoffRecs493a.length;
        if (avgPayoffCuriosity493a <= 0) {
          issues.push({
            location: `Payoff scenes — avg curiosityDelta ${avgPayoffCuriosity493a.toFixed(2)} (≤ 0)`,
            rule: 'PAYOFF_CURIOSITY_FLAT',
            severity: 'minor',
            description: `Across all ${payoffRecs493a.length} payoff scenes the average curiosityDelta is ${avgPayoffCuriosity493a.toFixed(2)} — callbacks close planted questions but open none. Each payoff should do double duty: resolve the thread the audience was tracking while also opening a deeper layer of mystery. When every closure lands without raising curiosity, the story transitions from "what happens next?" to "well, that's settled" with each callback, depleting forward pull at exactly the moments that should feel most dynamically satisfying. The best payoffs reframe the question: answering one mystery shifts the audience's attention to the next unresolved layer, so the act of resolution itself generates momentum rather than consuming it.`,
            suggestedFix: `Reframe each payoff to open a new question even as it closes the old one: the thread that resolves reveals a deeper truth ("the letter was delivered — but it said something that recontextualises the sender's motives"), the callback that answers "how?" simultaneously raises "but why?" or "and now what?". Let at least one payoff scene carry a curiosityDelta above zero to signal that the story is still accelerating, not winding down.`,
          });
        }
      }
    }
  }

  // SEED_ACT1_VOID (zone presence/absence × seed × opening quarter, n≥10, ≥2 seeds total,
  // none in first 25%): The first quarter of the story plants no clue while seeds exist later —
  // the audience enters Act 2 carrying no planted threads. Act 1 is the natural home for early
  // thread-seeding: these are the narrative promises the story makes while the audience is still
  // learning the world, the plants that will pay off at maximum distance from their origin. When
  // no seed appears in the opening, the first act is pure exposition without forward hooks;
  // the audience's curiosity must be sustained entirely by scene-to-scene engagement rather
  // than by the pull of planted questions whose answers are still out of reach. Distinctness:
  // SEED_MIDPOINT_VOID (Wave 423) targets the 40%–60% zone; this targets the first 25%.
  // SEED_FRONTLOADED (Wave 409) fires when >70% of ALL seeds cluster in the first half —
  // a distribution ratio; this fires when the first quarter is entirely empty regardless of
  // where the seeds are distributed later. SEED_BACKLOADED (Wave 395) fires when all seeds
  // are in the second half — a different zone. No existing check is a zone-void for the
  // opening quarter of the seed channel.
  {
    const n493b = records.length;
    if (n493b >= 10) {
      const act1End493b = Math.floor(n493b * 0.25);
      const allSeeds493b = (records as any[]).filter(r =>
        ((r.seededClueIds ?? []) as string[]).length > 0,
      );
      if (allSeeds493b.length >= 2) {
        const act1Seeds493b = allSeeds493b.filter(r => {
          const pos = (records as any[]).indexOf(r);
          return pos < act1End493b;
        });
        if (act1Seeds493b.length === 0) {
          issues.push({
            location: `Seed layer — Act 1 (scenes 0–${act1End493b - 1}) contains no planted clue`,
            rule: 'SEED_ACT1_VOID',
            severity: 'minor',
            description: `The story's first quarter (scenes 0–${act1End493b - 1}) plants no clue while ${allSeeds493b.length} seed(s) exist later in the script. Act 1 is the natural home for early thread-seeding: plants placed in the opening act pay off at the maximum possible distance from their origin, giving the audience the longest possible time to wonder and anticipate. When the first act is seed-free, it becomes pure exposition and scene-to-scene engagement rather than a set of narrative promises — the audience receives no forward hooks in the window when they are most primed to receive them. The earlier a question is planted, the more meaningful its eventual resolution becomes.`,
            suggestedFix: `Plant at least one clue in the opening act (scenes 0–${act1End493b - 1}): an unexplained object, an overheard half-sentence, a behavior that doesn't quite fit. The audience should enter Act 2 carrying at least one unresolved question from Act 1, so the later revelation lands with the weight of accumulated anticipation rather than arriving as a new piece of information in the moment it's needed.`,
          });
        }
      }
    }
  }

  // PAYOFF_RUN (run-based × payoff channel, n≥8, ≥3 consecutive payoff scenes):
  // Three or more scenes in an unbroken row each resolve a planted setup — thread-closures
  // dump in a rapid burst rather than distributing resolutions to give each its weight. Each
  // payoff needs space to land: a scene of reaction and consequence, the audience absorbing
  // that a long-held anticipation has been fulfilled, before the next callback fires. When
  // payoffs stack consecutively, each resolution dilutes the one before; the cumulative effect
  // is mechanical satisfaction rather than emotional culmination. Payoffs are the structural
  // rewards the audience has been saving up for — releasing them in a burst spends all that
  // capital at once without leaving time for the full weight of each to register.
  // Run-based mode × payoff channel. Distinctness: SEED_RUN_ISOLATED (Wave 437) checks
  // consecutive seeding scenes (planting); REVELATION_RUN (Wave 479) checks consecutive
  // revelation scenes (disclosing); this checks consecutive payoff scenes (resolving) —
  // three distinct structural channels in the same run-based mode. PAYOFF_FINAL_ZONE_VOID
  // (Wave 479) checks distribution; PAYOFF_DRAMA_DECOUPLED (Wave 465) checks co-occurrence.
  {
    const n493c = records.length;
    if (n493c >= 8) {
      let maxPayoffRun493c = 0;
      let curPayoffRun493c = 0;
      let maxPayoffRunStart493c = 0;
      let curPayoffRunStart493c = 0;
      for (let i493c = 0; i493c < n493c; i493c++) {
        const hasPayoff493c = ((records as any[])[i493c].payoffSetupIds ?? []).length > 0;
        if (hasPayoff493c) {
          if (curPayoffRun493c === 0) curPayoffRunStart493c = i493c;
          curPayoffRun493c++;
          if (curPayoffRun493c > maxPayoffRun493c) {
            maxPayoffRun493c = curPayoffRun493c;
            maxPayoffRunStart493c = curPayoffRunStart493c;
          }
        } else {
          curPayoffRun493c = 0;
        }
      }
      if (maxPayoffRun493c >= 3) {
        issues.push({
          location: `Payoff run — Scenes ${maxPayoffRunStart493c}–${maxPayoffRunStart493c + maxPayoffRun493c - 1} (${maxPayoffRun493c} consecutive)`,
          rule: 'PAYOFF_RUN',
          severity: 'minor',
          description: `${maxPayoffRun493c} scenes in a row each resolve a planted setup — the story closes threads in a rapid burst rather than distributing resolutions to give each its full weight. Each payoff needs space to land: a scene of reaction and consequence, the audience absorbing that a long-held anticipation has been fulfilled, before the next callback fires. When payoffs stack consecutively, each resolution dilutes the one before; the cumulative effect is mechanical satisfaction rather than emotional culmination. Payoffs are the structural rewards the audience has been accumulating — spending them all at once leaves no time for the full weight of each to register, and the audience exits the burst having processed the information without feeling the full satisfaction each individual payoff warranted.`,
          suggestedFix: `Break the payoff cluster with at least one non-payoff scene between consecutive resolutions — a scene of reaction (a character absorbing what just resolved), a consequence beat (the practical impact of the closure), or an escalation (the resolution raising a new problem). Spreading payoffs across the second half rather than clustering them in a burst maintains the sense that the story is continuously delivering on its promises rather than paying its narrative debts all at once.`,
        });
      }
    }
  }

  // ── Wave 507 checks ──────────────────────────────────────────────────────────

  // PAYOFF_SUSPENSE_AFTERMATH_VOID — Average/aggregate × payoff → suspense aftermath.
  // n≥8, ≥3 payoff scenes (payoffSetupIds.length > 0) not at last position. Average suspenseDelta
  // of the scene immediately following each payoff ≤ 0 → fire. When a planted thread resolves,
  // the next scene should carry some forward tension: the relief is uneasy, the resolution has
  // raised new stakes, or the closure has tightened the story's grip. When payoffs consistently
  // generate zero or negative suspense in their wake, they terminate narrative threads without
  // any forward momentum — each callback closes a loop and the story relaxes rather than propelling.
  // Distinct from: PAYOFF_CURIOSITY_FLAT (Wave 493: checks the payoff scene's OWN curiosityDelta —
  // a different channel and different time slot), PROACTIVE_SUSPENSE_AFTERMATH_ABSENT (Wave 409:
  // initiative trigger, not payoff trigger), CONFLICT_RUPTURE_SUSPENSE_VOID in conflict.ts (rupture
  // trigger, not payoff). First average/aggregate check pairing payoff with suspense aftermath.
  {
    const n507a = records.length;
    if (n507a >= 8) {
      const payoffAndNext507a = (records as any[])
        .map((r, pos) => ({ pos, hasPayoff: ((r.payoffSetupIds ?? []) as any[]).length > 0 }))
        .filter(x => x.hasPayoff && x.pos < n507a - 1);
      if (payoffAndNext507a.length >= 3) {
        const totalSusp507a = payoffAndNext507a.reduce(
          (sum, x) => sum + (((records as any[])[x.pos + 1] as any).suspenseDelta ?? 0),
          0,
        );
        const avgSusp507a = totalSusp507a / payoffAndNext507a.length;
        if (avgSusp507a <= 0) {
          issues.push({
            location: `${payoffAndNext507a.length} payoff scenes — avg next-scene suspenseDelta ${avgSusp507a.toFixed(2)}`,
            rule: 'PAYOFF_SUSPENSE_AFTERMATH_VOID',
            severity: 'minor',
            description: `Across ${payoffAndNext507a.length} payoff scenes, the scene immediately following each averages a suspenseDelta of ${avgSusp507a.toFixed(2)} (≤ 0). When a planted thread resolves, the scene that follows should carry forward tension: an uneasy relief, a newly raised stake, or a consequence that tightens the story's grip. When payoffs consistently generate zero or negative suspense in their aftermath, each callback closes a loop and the story relaxes — the audience is satisfied but not propelled into the next beat. The scene after a payoff is among the most important in the story for sustaining momentum.`,
            suggestedFix: `After at least one payoff scene, ensure the immediately following scene raises some suspense — a character who is unsettled by what just resolved, a consequence that creates a new problem, or a ripple from the resolution that tightens rather than loosens the situation. Payoffs that lead to even slightly elevated tension sustain forward momentum; payoffs that lead to calm signal that the story is winding down.`,
          });
        }
      }
    }
  }

  // REVELATION_CLOSING_VOID — Zone presence/absence × revelation × closing third.
  // n≥9, ≥3 revelations. None in the final structural third → fire. The resolution zone contains
  // no disclosure. The protagonist crosses into the climax having already received all the story's
  // truths — the closing act can rely only on previously revealed information without any new
  // discovery reshaping the audience's understanding at the last moment. A revelation in the final
  // third is the classic engine of dramatic climax: the audience's existing understanding is
  // overturned precisely as the story peaks. When the closing third is revelation-free, the
  // climax must generate its weight from action alone, without the epistemic reversal that gives
  // the final act its deepest impact.
  // Distinct from: REVELATION_FRONTLOADED (Wave 465: checks whether >70% of revelations fall in
  // the first half — a distribution ratio check, not a zone-void check), REVELATION_TEMPORAL_CLUSTER
  // in belief.ts (>75% in one third — over-concentration, not absence; different pass), REVELATION_RUN
  // (Wave 479: consecutive run-based, not zone-based), REVELATION_LATE_CLUSTER in character-arc.ts
  // (>60% in final 25% — over-concentration in final zone, the opposite problem; different pass).
  {
    const n507b = records.length;
    if (n507b >= 9) {
      const revRecs507b = (records as any[]).filter(
        r => r.revelation !== null && r.revelation !== '' && r.revelation !== undefined,
      );
      if (revRecs507b.length >= 3) {
        const third507b = Math.floor(n507b / 3);
        const anyRevInFinal507b = revRecs507b.some(r => {
          const pos = (records as any[]).indexOf(r);
          return pos >= 2 * third507b;
        });
        if (!anyRevInFinal507b) {
          issues.push({
            location: `${revRecs507b.length} revelation(s) — none in final third (scenes ${2 * third507b}–${n507b - 1})`,
            rule: 'REVELATION_CLOSING_VOID',
            severity: 'minor',
            description: `The story has ${revRecs507b.length} revelations but none falls in the final structural third (scenes ${2 * third507b}–${n507b - 1}). The resolution zone contains no disclosure: the protagonist enters the climax having already received all the story's truths. A revelation in the final third is the classic engine of dramatic climax — the audience's existing understanding is overturned precisely as the story peaks, giving the ending the deepest possible sense of consequence and surprise. When the closing third is revelation-free, the climax must carry its weight on action alone, without the epistemic reversal that gives the final act its most powerful charge.`,
            suggestedFix: `Move at least one revelation into the final third, or introduce a new disclosure that can only happen once all the prior truths have been established. The most effective closing-act revelation recontextualizes everything the audience thought they knew — the identity of the real antagonist, the true cost of the protagonist's goal, or the secret that explains why the story was heading here all along.`,
          });
        }
      }
    }
  }

  // PAYOFF_SEED_DECOUPLED — Co-occurrence/decoupling × payoff × seed.
  // n≥8, ≥2 payoff scenes (payoffSetupIds.length > 0), ≥2 seed scenes (seededClueIds.length > 0).
  // No scene has both → fire. Thread resolutions never simultaneously plant new threads. The most
  // structurally efficient scenes close a loop while opening another: the payoff of an old setup
  // raises a new question, or the resolution of a mystery seeds a fresh thread that the audience
  // can carry forward. When payoffs and seeds never coincide, closures are purely terminal — they
  // end threads without restocking the story's forward momentum. The audience experiences each
  // payoff as a narrative dead end rather than as a pivot to the next layer of the story.
  // Distinct from: PAYOFF_DRAMA_DECOUPLED (Wave 465: co-occurrence × payoff × dramatic turn —
  // different paired channel), SEED_DRAMA_DECOUPLED (Wave 423: co-occurrence × seed × dramatic
  // turn — seed trigger and turn channel), REVELATION_SEED_DECOUPLED in belief.ts (Wave 502:
  // co-occurrence × revelation × seed — different trigger channel and different pass file), this
  // is the first co-occurrence check in this pass pairing the payoff channel with the seed channel.
  {
    const n507c = records.length;
    if (n507c >= 8) {
      const payoffRecs507c = (records as any[]).filter(
        r => ((r.payoffSetupIds ?? []) as any[]).length > 0,
      );
      const seedRecs507c = (records as any[]).filter(
        r => ((r.seededClueIds ?? []) as any[]).length > 0,
      );
      if (payoffRecs507c.length >= 2 && seedRecs507c.length >= 2) {
        const seedSceneIdxs507c = new Set(seedRecs507c.map((r: any) => r.sceneIdx));
        const anyPayoffSeed507c = payoffRecs507c.some((r: any) => seedSceneIdxs507c.has(r.sceneIdx));
        if (!anyPayoffSeed507c) {
          issues.push({
            location: `${payoffRecs507c.length} payoff scenes and ${seedRecs507c.length} seed scenes — zero overlap`,
            rule: 'PAYOFF_SEED_DECOUPLED',
            severity: 'minor',
            description: `The story has ${payoffRecs507c.length} payoff scenes and ${seedRecs507c.length} clue-seeding scenes, but none overlap — resolutions and new threads are always in separate scenes. The most structurally efficient beats close a loop while opening another: a payoff that simultaneously plants a new question carries double momentum. When payoffs and seeds are fully decoupled, closures are purely terminal — each thread resolution is a dead end rather than a pivot to the next layer of the story's mystery. The audience experiences each payoff as a finality rather than as a discovery that changes what they are waiting for next.`,
            suggestedFix: `Let at least one payoff scene also seed a new thread: a resolved mystery that reveals a deeper one, a delivered promise that simultaneously hints at an unfulfilled one, or a callback that closes one question and opens another. The payoff-plus-seed pattern is the most efficient structural beat in any mystery-bearing screenplay: it satisfies the audience's forward anticipation while immediately replenishing it.`,
          });
        }
      }
    }
  }

  // ── Wave 521 checks ──────────────────────────────────────────────────────
  {
    // SEED_PEAK_UNCAUSED — backward-cause × single-peak × seed.
    // The single scene planting the most clues (highest seededClueIds.length) has no
    // revelation, dramatic turn, suspense rise, or clockRaise in either of the 2 preceding
    // scenes. The story's densest foreshadowing moment arrives without narrative preparation:
    // the seeds land in a causal vacuum, which makes the planting feel like arbitrary
    // distribution rather than a moment earned by story momentum.
    // Distinct from: PROACTIVE_PAYOFF_PEAK_DECOUPLED (single-peak × payoff peak × proactive
    // initiative — different channel and different paired signal), PROACTIVE_SUSPENSE_PEAK_
    // DECOUPLED (single-peak × suspense × proactive), and all co-occurrence/zone/run-based
    // seed checks. First backward-cause check in this pass.
    const n521a = records.length;
    if (n521a >= 8) {
      const seedCounts521a = (records as any[]).map((r, i) => ({
        i, count: ((r.seededClueIds ?? []) as any[]).length,
      }));
      const maxSeedCount521a = Math.max(...seedCounts521a.map(x => x.count));
      if (maxSeedCount521a > 0) {
        const peakSeedIdx521a = seedCounts521a.find(x => x.count === maxSeedCount521a)!.i;
        const totalSeeds521a = seedCounts521a.filter(x => x.count > 0).length;
        if (totalSeeds521a >= 2) {
          const hasCause521a = [1, 2].some(off => {
            const prev = peakSeedIdx521a - off;
            if (prev < 0) return false;
            const r = (records as any[])[prev];
            return (
              (r.revelation !== null && r.revelation !== undefined && r.revelation !== '') ||
              (r.dramaticTurn && r.dramaticTurn !== 'nothing' && r.dramaticTurn !== '') ||
              (r.suspenseDelta ?? 0) > 0 ||
              r.clockRaised === true
            );
          });
          if (!hasCause521a) {
            issues.push({
              location: `scene ${peakSeedIdx521a}: densest foreshadowing (${maxSeedCount521a} seed(s)) — no cause in preceding 2 scenes`,
              rule: 'SEED_PEAK_UNCAUSED',
              severity: 'minor',
              description: `The single scene planting the most clues (scene ${peakSeedIdx521a}, ${maxSeedCount521a} seed(s)) has no revelation, dramatic turn, suspense rise, or raised deadline in either of the two preceding scenes. The story's peak foreshadowing moment arrives in a causal vacuum — the audience has not just been given any event of sufficient weight to make the planting feel earned. Clue-planting lands hardest when it follows a moment that heightens attention: a revelation that triggers the protagonist to place a contingency, a dramatic turn that forces them to prepare for what's coming, or a suspense rise that motivates covering a vulnerability. When the densest planting has no such anchor in the scene fabric, it reads as authorial distribution rather than character action.`,
              suggestedFix: `In the 1–2 scenes preceding scene ${peakSeedIdx521a}, introduce at least one narrative event that motivates the clue-planting to follow: a revelation that raises stakes, a dramatic turn that pivots the protagonist's agenda, a suspense peak that makes them act preemptively, or a clock that starts counting down. This causal anchor transforms foreshadowing from distribution into consequence.`,
            });
          }
        }
      }
    }
  }

  {
    // SEED_FRONTLOADED — distribution/timing × seed × first half.
    // n≥8, ≥4 seed scenes (seededClueIds non-empty). >70% fall in the first half while
    // the back half carries ≥1 → fire. Foreshadowing planted overwhelmingly in the first
    // half leaves the story's second movement without new threads to pull the audience
    // forward — the planted clues age through the back half without anything restocking
    // the sense of live anticipation.
    // Distinct from: REVELATION_FRONTLOADED (distribution × revelation × first half —
    // different channel), SEED_MIDPOINT_VOID (zone × midpoint — checks only the midpoint
    // zone, not the global halves distribution), SEED_RUN_ISOLATED (run-based — consecutive
    // burst, not temporal distribution). First distribution/timing check on the seed channel.
    const n521b = records.length;
    const half521b = Math.floor(n521b / 2);
    const seedScenes521b = (records as any[]).map((r, i) => ({
      i, isSeed: ((r.seededClueIds ?? []) as any[]).length > 0,
    })).filter(x => x.isSeed);
    if (n521b >= 8 && seedScenes521b.length >= 4) {
      const frontSeeds521b = seedScenes521b.filter(x => x.i < half521b).length;
      const backSeeds521b = seedScenes521b.length - frontSeeds521b;
      const ratio521b = frontSeeds521b / seedScenes521b.length;
      if (ratio521b > 0.70 && backSeeds521b >= 1) {
        issues.push({
          location: `seed distribution: ${frontSeeds521b} front / ${backSeeds521b} back`,
          rule: 'SEED_FRONTLOADED',
          severity: 'minor',
          description: `${Math.round(ratio521b * 100)}% of the script's clue-planting scenes (${frontSeeds521b} of ${seedScenes521b.length}) fall in the first half, leaving the second half with only ${backSeeds521b}. A story that front-loads its foreshadowing exhausts the planted-thread supply before the climax: the audience carries all the open questions through a back half where nothing new is being planted to refresh the sense of live anticipation. By the climax, the planted threads have aged without reinforcement, and the payoffs — when they arrive — feel like the resolution of concerns the audience may have set aside rather than live suspense they've been tracking.`,
          suggestedFix: `Introduce at least one clue-planting scene in the second half — a new contingency prepared, a fresh thread planted, or an earlier seed revisited with new significance. This restocks the audience's sense that the story is still concealing things worth discovering and ensures that second-half payoffs feel like answers to live questions rather than reminders of forgotten ones.`,
        });
      }
    }
  }

  {
    // PAYOFF_EMOTION_DECOUPLED — co-occurrence × payoff × emotionalShift.
    // n≥8, ≥3 payoff scenes (payoffSetupIds non-empty), ≥2 emotional scenes (non-neutral
    // emotionalShift). No payoff scene is emotionally charged → fire. Thread resolutions
    // feel procedural: the story cashes its planted promises in emotionally neutral scenes
    // while emotional beats happen separately, and the two never coincide. A payoff lands
    // hardest when the protagonist simultaneously feels the weight of the delivery.
    // Distinct from: PAYOFF_CURIOSITY_FLAT (average × payoff × curiosityDelta — different
    // mode and channel), PAYOFF_SUSPENSE_FLAT (average × payoff × suspenseDelta — different
    // mode and channel), PAYOFF_DRAMA_DECOUPLED / PAYOFF_REVELATION_DECOUPLED / PAYOFF_SEED_
    // DECOUPLED (co-occurrence mode but paired with dramatic turn / revelation / seed channels,
    // not emotionalShift). First check pairing payoff with the emotionalShift channel.
    const n521c = records.length;
    if (n521c >= 8) {
      const payoffRecs521c = (records as any[]).filter(
        r => ((r.payoffSetupIds ?? []) as any[]).length > 0,
      );
      const emotionalScenes521c = (records as any[]).filter(
        r => (r.emotionalShift ?? 'neutral') !== 'neutral',
      );
      if (payoffRecs521c.length >= 3 && emotionalScenes521c.length >= 2) {
        const anyPayoffEmotional521c = payoffRecs521c.some(
          r => (r.emotionalShift ?? 'neutral') !== 'neutral',
        );
        if (!anyPayoffEmotional521c) {
          issues.push({
            location: `${payoffRecs521c.length} payoff scenes — all emotionally neutral`,
            rule: 'PAYOFF_EMOTION_DECOUPLED',
            severity: 'minor',
            description: `The story has ${payoffRecs521c.length} payoff scenes (planted promises delivered) and ${emotionalScenes521c.length} emotionally charged scenes, but they never overlap — every thread resolution happens in an emotionally neutral scene while emotional beats occur separately. Payoffs that land in affectively flat scenes feel procedural: the audience receives the delivery as information rather than as an event that costs the protagonist something felt. The double-impact of a payoff coinciding with an emotional beat — the revelation that also breaks the protagonist's heart, the resolution that also provides a moment of joy or grief — is one of the highest-yield structural opportunities in screenwriting.`,
            suggestedFix: `Fuse at least one payoff scene with an emotional charge: a promise resolved at the moment the protagonist feels the weight of what it cost, a secret disclosed in a scene of joy or grief, or a thread tied off in the same moment the character registers its significance emotionally. A payoff that registers both as closure and as feeling lands on two simultaneous registers and is far harder to forget.`,
          });
        }
      }
    }
  }

  // ── Wave 535: PAYOFF_CLOCK_DECOUPLED, PAYOFF_PEAK_UNCAUSED, PAYOFF_BACK_LOADED ──────────────────

  // PAYOFF_CLOCK_DECOUPLED — Co-occurrence/decoupling × payoff × clockRaised.
  // n≥8, ≥3 payoff scenes (payoffSetupIds non-empty), ≥2 clockRaised scenes. No payoff scene
  // also has clockRaised=true → fire. Thread resolutions and deadline urgency never co-occur:
  // the moments when planted promises are delivered are always structurally separate from the
  // moments when the clock is ticking. A payoff that lands while the clock is running carries
  // compressed dramatic weight — the promise is fulfilled precisely as the deadline looms, fusing
  // the satisfaction of resolution with the urgency of consequence. When clock and payoff are
  // always decoupled, the story keeps its resolution energy and its urgency energy in separate
  // structural compartments, never letting them compound each other.
  // Distinct from: PAYOFF_DRAMA_DECOUPLED (co-occurrence × payoff × dramatic turn), PAYOFF_
  // REVELATION_DECOUPLED (co-occurrence × payoff × revelation), PAYOFF_SEED_DECOUPLED
  // (co-occurrence × payoff × seed), PAYOFF_EMOTION_DECOUPLED (Wave 521: co-occurrence × payoff
  // × emotionalShift). This completes the payoff co-occurrence family by adding the clock channel.
  // PAYOFF_SUSPENSE_FLAT uses average mode on suspenseDelta — different analytical mode.
  {
    const n535a = records.length;
    if (n535a >= 8) {
      const payoffScenes535a = (records as any[]).filter(
        r => ((r.payoffSetupIds ?? []) as any[]).length > 0,
      );
      const clockScenes535a = (records as any[]).filter(r => r.clockRaised === true);
      if (payoffScenes535a.length >= 3 && clockScenes535a.length >= 2) {
        const anyOverlap535a = payoffScenes535a.some(r => r.clockRaised === true);
        if (!anyOverlap535a) {
          issues.push({
            location: `${payoffScenes535a.length} payoff scene(s) and ${clockScenes535a.length} clock-raised scene(s) — no overlap`,
            rule: 'PAYOFF_CLOCK_DECOUPLED',
            severity: 'minor',
            description: `The script has ${payoffScenes535a.length} thread-resolution scene(s) and ${clockScenes535a.length} deadline-establishing scene(s), but they never co-occur. Every planted promise is delivered in a scene without a ticking clock, while every deadline is raised in a scene without a resolution landing. A payoff that fires while the clock is running creates the most dramatically compressed version of each event: the promise is fulfilled precisely as the urgency peaks, fusing the satisfaction of closure with the pressure of consequence. When clock and payoff are always decoupled, the story keeps its resolution energy and its urgency energy in separate structural compartments and never lets them compound each other.`,
            suggestedFix: `Fuse at least one payoff with a clockRaised moment: the scene where a planted thread is resolved should also be a scene where a deadline is established or re-established. Even a small clock — a decision window closing, a constraint tightening — changes the emotional register of the payoff from mere satisfaction to satisfaction-under-pressure, which is harder to forget.`,
          });
        }
      }
    }
  }

  // PAYOFF_PEAK_UNCAUSED — Backward-cause × single-peak × payoff.
  // n≥8, ≥2 payoff scenes (payoffSetupIds non-empty) with at least one at pos≥2. Find the scene
  // with the most payoffSetupIds (the heaviest resolution moment in the story). If it is at pos≥2
  // and neither of the 2 preceding scenes has a revelation, dramatic turn, suspense rise, or clock
  // raise → fire. The story's densest convergence of resolved setups arrives without a structural
  // build — the richest payoff lands in a causal vacuum with no escalation, revelation, or urgency
  // shift preparing the audience for the maximum density of delivered promises.
  // Distinct from: SEED_PEAK_UNCAUSED (Wave 521: same analytical mode × seed channel — this is
  // the payoff-peak complement), PROACTIVE_PAYOFF_PEAK_DECOUPLED (co-occurrence × proactive × payoff
  // peak — same peak signal but checks whether the scene coincides with initiative, not backward-cause),
  // PAYOFF_DRAMA_DECOUPLED / PAYOFF_REVELATION_DECOUPLED (co-occurrence mode, not backward-cause).
  // First backward-cause check with payoff density as the peak signal in this pass.
  {
    const n535b = records.length;
    if (n535b >= 8) {
      const payoffCounts535b = (records as any[]).map(r =>
        ((r.payoffSetupIds ?? []) as any[]).length,
      );
      const maxPayoff535b = Math.max(...payoffCounts535b);
      if (maxPayoff535b > 0) {
        const peakPos535b = payoffCounts535b.indexOf(maxPayoff535b);
        const qualifyingPayoffs535b = payoffCounts535b.filter(c => c > 0).length;
        if (qualifyingPayoffs535b >= 2 && peakPos535b >= 2) {
          const prior1_535b = (records as any[])[peakPos535b - 1];
          const prior2_535b = (records as any[])[peakPos535b - 2];
          const hasCause535b = [prior1_535b, prior2_535b].some(r =>
            r !== undefined && (
              (r.revelation !== null && r.revelation !== '' && r.revelation !== undefined) ||
              (r.dramaticTurn !== undefined && r.dramaticTurn !== 'nothing' && r.dramaticTurn !== '') ||
              (r.suspenseDelta ?? 0) > 0 ||
              r.clockRaised === true
            ),
          );
          if (!hasCause535b) {
            const peakRec535b = (records as any[])[peakPos535b];
            issues.push({
              location: `Scene ${peakRec535b.sceneIdx} (${peakRec535b.slug}) — peak payoff density (${maxPayoff535b} resolved setups) without prior causal driver`,
              rule: 'PAYOFF_PEAK_UNCAUSED',
              severity: 'minor',
              description: `The scene with the story's highest payoff density (${maxPayoff535b} planted promise(s) resolved at scene ${peakRec535b.sceneIdx}) has no structural driver in the two preceding scenes — no revelation, dramatic turn, suspense rise, or clock raise in the scenes immediately before the densest convergence of resolutions. The story's richest payoff moment arrives without a causal build: the maximum density of delivered promises lands in a structural vacuum rather than at the crest of an escalating wave. A payoff peak lands hardest when it follows a moment of heightened urgency or revelation that makes the audience feel the resolutions are arriving at exactly the right moment.`,
              suggestedFix: `Give scene ${peakRec535b.sceneIdx - 1} or ${peakRec535b.sceneIdx - 2} a structural driver that motivates the dense payoff peak: a revelation that makes the resolutions feel inevitable, a dramatic turn that brings them to the surface, or a surge in suspense that makes the payoff both timely and necessary. The densest resolution moment in the story should feel earned through escalation, not arbitrary.`,
            });
          }
        }
      }
    }
  }

  // PAYOFF_BACK_LOADED — Distribution/timing × payoff × second half.
  // n≥8, ≥4 payoff scenes (payoffSetupIds non-empty). >70% fall in the second half while the first
  // half has ≥1 → fire. All thread resolutions are deferred to the back half: the audience spends
  // the first half accumulating planted promises without receiving any meaningful evidence that the
  // story keeps what it plants. When >70% of payoffs occur in the second half, the story's first
  // half is structurally payoff-free — the planted threads age without any intermediate resolution
  // that would prove the foreshadowing is active and alive.
  // Distinct from: SEED_FRONTLOADED (Wave 521: distribution × seed × first half — seed channel,
  // opposite concentration direction), PAYOFF_EMOTION_DECOUPLED (Wave 521: co-occurrence — different
  // mode), PAYOFF_SUSPENSE_AFTERMATH_VOID (Wave 507: aftermath mode — different mode and channel).
  // First distribution/timing check on the payoff channel in this pass. Completes the front/back
  // distribution pair for the seed-payoff system: seeds front-loaded + payoffs back-loaded = the
  // most extreme version of delayed gratification architecture.
  {
    const n535c = records.length;
    const half535c = Math.floor(n535c / 2);
    const payoffIdxs535c = (records as any[]).map((r, i) => ({
      i, isPayoff: ((r.payoffSetupIds ?? []) as any[]).length > 0,
    })).filter(x => x.isPayoff);
    if (n535c >= 8 && payoffIdxs535c.length >= 4) {
      const backPayoffs535c = payoffIdxs535c.filter(x => x.i >= half535c).length;
      const frontPayoffs535c = payoffIdxs535c.length - backPayoffs535c;
      const backRatio535c = backPayoffs535c / payoffIdxs535c.length;
      if (backRatio535c > 0.70 && frontPayoffs535c >= 1) {
        issues.push({
          location: `payoff distribution: ${frontPayoffs535c} front-half / ${backPayoffs535c} back-half`,
          rule: 'PAYOFF_BACK_LOADED',
          severity: 'minor',
          description: `${Math.round(backRatio535c * 100)}% of the script's thread-resolution scenes (${backPayoffs535c} of ${payoffIdxs535c.length}) fall in the second half, leaving the first half with only ${frontPayoffs535c}. The story defers nearly all its payoffs to the final movements: the audience spends the first half accumulating planted promises without receiving any meaningful evidence that the story keeps what it plants. A completely back-loaded payoff architecture trains the audience to expect nothing to resolve until the end — reducing the structural satisfaction that intermediate resolutions provide, and making the first half feel like pure accumulation without any delivered promise to confirm the foreshadowing is still live.`,
          suggestedFix: `Distribute at least one or two payoff scenes into the first half — a minor thread resolved early, an early confirmation that the story delivers on what it plants, or a partial payoff that renews audience faith in the planted material. The most satisfying payoff architectures prove the story's contract in the first half with minor resolutions, while reserving the major payoffs for the climactic zone.`,
        });
      }
    }
  }

  // ── Wave 549: REVELATION_SUSPENSE_FLAT, REVELATION_EMOTION_DECOUPLED, REVELATION_CAUSE_VOID ──

  // REVELATION_SUSPENSE_FLAT — average/aggregate × revelation × suspenseDelta.
  // n≥8, ≥3 revelation scenes (revelation non-null/non-empty). Avg suspenseDelta across all
  // revelation scenes ≤ 0 → fire. Disclosures collectively fail to raise atmospheric tension — the
  // moments when the audience learns something important are never the moments when the stakes feel
  // most dangerous. A revelation should do double work in both the epistemic and affective dimensions:
  // it should disclose a truth AND tighten the situation around the characters. When averaged across
  // all revelation scenes, a suspenseDelta ≤ 0 means that disclosures drain tension on net rather
  // than feeding it. The audience is told more as the story goes on, but feels less urgency with each
  // new disclosure — revelation and tension operate in separate registers.
  // Distinct from: REVELATION_CURIOSITY_FLAT (Wave 479: average × revelation × curiosityDelta — same
  // mode and trigger, different output channel; this is the suspense-channel sibling), CONFLICT_
  // SUSPENSE_DECOUPLED (conflict.ts: average × conflict scenes × suspenseDelta — different pass and
  // different trigger channel; this audits revelation scenes not relationship-rupture scenes), PAYOFF_
  // SUSPENSE_AFTERMATH_VOID (Wave 507: aftermath × payoff → suspense in next scene — different mode,
  // different trigger channel, and aftermath not same-scene). Second average/aggregate check on the
  // revelation channel, completing the "revelation generates no [X]" average family alongside
  // REVELATION_CURIOSITY_FLAT.
  {
    const n549a = records.length;
    if (n549a >= 8) {
      const revRecs549a = (records as any[]).filter(
        r => r.revelation !== null && r.revelation !== undefined && r.revelation !== '',
      );
      if (revRecs549a.length >= 3) {
        const avgRevSuspense549a = revRecs549a.reduce(
          (sum: number, r: any) => sum + (r.suspenseDelta ?? 0), 0,
        ) / revRecs549a.length;
        if (avgRevSuspense549a <= 0) {
          issues.push({
            location: `Revelation scenes — avg suspenseDelta ${avgRevSuspense549a.toFixed(2)} (≤ 0)`,
            rule: 'REVELATION_SUSPENSE_FLAT',
            severity: 'minor',
            description: `Across all ${revRecs549a.length} revelation scenes the average suspenseDelta is ${avgRevSuspense549a.toFixed(2)} — disclosures collectively fail to raise atmospheric tension. A revelation should do double work: it should tell the audience something important AND tighten the danger around the characters. When truth-telling scenes average zero or negative suspense, the story treats knowledge and danger as separate concerns — the audience learns more as the story goes on but feels less urgency with each new disclosure. Revelation and tension decouple, and disclosures become information deliveries rather than escalation events.`,
            suggestedFix: 'Stage revelations inside moments of danger or rising stakes: a truth disclosed as the clock ticks, an answer arriving at the moment of maximum vulnerability. Each disclosure should leave the protagonist in a worse or more uncertain position than before — a revelation that tightens the vise is twice as powerful as one that merely fills in a gap. Even partial revelations that create new threats work better than complete disclosures in moments of safety.',
          });
        }
      }
    }
  }

  // REVELATION_EMOTION_DECOUPLED — co-occurrence × revelation × emotionalShift.
  // n≥8, ≥3 revelation scenes (revelation non-null/non-empty), ≥2 emotionally charged scenes
  // (emotionalShift ≠ 'neutral'). No revelation scene also carries a non-neutral emotional shift
  // → fire. Truths always surface in emotionally flat scenes while emotional beats happen separately.
  // Revelations and emotional reactions are decoupled: the audience receives a disclosure in one
  // scene and feels an emotion in a different scene, never simultaneously. The highest-impact version
  // of a revelation is one that also produces an immediate emotional charge in the same scene — the
  // character learns something and the audience watches them feel the weight of it in real time.
  // When the two always occupy separate scenes, the story asks the audience to make the emotional
  // connection themselves rather than giving them the combined impact in one compressed beat.
  // Distinct from: PAYOFF_EMOTION_DECOUPLED (Wave 521: co-occurrence × payoff × emotion — payoff
  // channel not revelation channel), SEED_EMOTIONAL_DECOUPLED (Wave 451: co-occurrence × seed ×
  // emotion — seed channel not revelation channel), REVELATION_CURIOSITY_FLAT (average mode not
  // co-occurrence, and curiosity not emotion), PROACTIVE_EMOTION_DECOUPLED (Wave 339: co-occurrence
  // × proactive × emotion — proactive trigger not revelation trigger). First co-occurrence check in
  // this pass pairing revelation with the emotionalShift channel.
  {
    const n549b = records.length;
    if (n549b >= 8) {
      const revRecs549b = (records as any[]).filter(
        r => r.revelation !== null && r.revelation !== undefined && r.revelation !== '',
      );
      const emotionalScenes549b = (records as any[]).filter(
        r => (r.emotionalShift ?? 'neutral') !== 'neutral',
      );
      if (revRecs549b.length >= 3 && emotionalScenes549b.length >= 2) {
        const anyRevEmotional549b = revRecs549b.some(
          r => (r.emotionalShift ?? 'neutral') !== 'neutral',
        );
        if (!anyRevEmotional549b) {
          issues.push({
            location: `${revRecs549b.length} revelation scene(s) — all emotionally neutral`,
            rule: 'REVELATION_EMOTION_DECOUPLED',
            severity: 'minor',
            description: `The story has ${revRecs549b.length} revelation scene(s) and ${emotionalScenes549b.length} emotionally charged scene(s), but they never overlap — every disclosure happens in a scene with a neutral emotional shift while emotional activation occurs separately. The highest-impact revelation is one where the character simultaneously learns something and the audience watches them register the emotional cost of the knowledge. When revelation and emotional reaction always live in separate scenes, the story makes the audience connect the dots between truth and feeling themselves rather than giving them the combined impact in a single compressed beat. Decoupled revelations feel procedural; emotional reactions that follow in the next scene feel reported rather than witnessed.`,
            suggestedFix: `Fuse at least one revelation with an emotional charge: the scene where a character learns a crucial truth should also be the scene where they are visibly moved by it — grief at a betrayal revealed, elation at an identity confirmed, dread at a threat disclosed. The double-impact of receiving truth and registering its emotional weight in real time, in the same scene, is one of the most powerful beats available in screenwriting.`,
          });
        }
      }
    }
  }

  // REVELATION_CAUSE_VOID — backward-cause × revelation as effect.
  // n≥8, ≥3 revelation scenes (revelation non-null/non-empty). Every revelation scene has no
  // proactive act (isProactive258), dramatic turn (≠ 'nothing'), or suspense rise (suspenseDelta > 0)
  // in itself OR in the immediately preceding scene. All disclosures arrive in a causal vacuum —
  // the story never earns its revelations through prior protagonist initiative, a story pivot, or
  // a tension escalation. Revelations that arrive without narrative preparation feel like authorial
  // gifts rather than consequences of story mechanics: the truth surfaces because the writer decided
  // it should, not because the story's causal machinery produced it. An earned revelation follows
  // from something: a protagonist who acted and uncovered a truth, a dramatic turn whose consequences
  // forced a disclosure, or a suspense escalation that made concealment impossible.
  // Distinct from: SEED_CAUSE_VOID (Wave 451: backward-cause × seed channel — same analytical mode,
  // same causal trigger set, but seed/clue planting as the effect rather than revelation; this is the
  // revelation-channel parallel), PAYOFF_PEAK_UNCAUSED (Wave 535: backward-cause × peak payoff —
  // same mode but payoff-channel single-peak, not revelation aggregate), PROACTIVE_REVELATION_ABSENT
  // (Wave 339: aftermath mode, proactive → revelation in NEXT 2 scenes — forward-cause not backward;
  // this checks what precedes revelation scenes, that checks what follows proactive scenes),
  // REVELATION_WITHOUT_PROACTIVE (Wave 258: co-occurrence mode — checks whether revelation scenes
  // coincide with proactive acts, not backward-cause from prior scene). First backward-cause check
  // targeting revelation as the effect in this pass.
  {
    const n549c = records.length;
    if (n549c >= 8) {
      const revRecs549c = (records as any[]).filter(
        r => r.revelation !== null && r.revelation !== undefined && r.revelation !== '',
      );
      if (revRecs549c.length >= 3) {
        const isUpstreamTrigger549c = (r: any): boolean =>
          isProactive258(r) ||
          ((r.dramaticTurn ?? 'nothing') !== 'nothing' && r.dramaticTurn !== '') ||
          (r.suspenseDelta ?? 0) > 0;
        const allRevUncaused549c = revRecs549c.every((r: any) => {
          const idx = (records as any[]).indexOf(r);
          return (
            !isUpstreamTrigger549c(r) &&
            (idx === 0 || !isUpstreamTrigger549c((records as any[])[idx - 1]))
          );
        });
        if (allRevUncaused549c) {
          issues.push({
            location: `All ${revRecs549c.length} revelation scene(s) — no upstream trigger`,
            rule: 'REVELATION_CAUSE_VOID',
            severity: 'minor',
            description: `Every revelation scene in the story (${revRecs549c.length} scene(s)) has no upstream dramatic trigger in itself or the immediately preceding scene — no proactive protagonist act, no dramatic turn, and no suspense escalation. All disclosures arrive in a causal vacuum: the audience receives truth without any story-mechanical event that explains or motivated the disclosure. Revelations that are causally unanchored feel like authorial gifts rather than consequences of story mechanics — the character learns something because the writer decided they should, not because they acted, because a pivot forced the truth into the open, or because escalating stakes made concealment impossible. An earned revelation is a result: of something the protagonist did, something the story turned, or something the pressure made unavoidable.`,
            suggestedFix: `Attach each revelation to a prior causal event: a protagonist action that uncovered the truth (isProactive, seeds a clue, raises a clock), a dramatic turn whose consequences forced disclosure, or a suspense escalation that made further concealment impossible. Even a partial trigger — the protagonist asking the right question at the right moment — transforms a revelation from a scriptwriter's intervention into a dramatic consequence. A revelation the audience saw coming because the story earned it lands harder than a revelation that simply arrives.`,
          });
        }
      }
    }
  }

  // ── Wave 563: REVELATION_DROUGHT_RUN, REVELATION_ZONE_CLUSTER,
  //              REVELATION_CLOCK_AFTERMATH_VOID ──────────────────────────────────────────────────

  // REVELATION_DROUGHT_RUN — run-based × revelation absence.
  // n≥10, ≥2 revelation scenes (revelation non-null/non-empty), longest consecutive run of
  // non-revelation scenes is ≥6 → fire. The story's disclosure engine goes dark for an extended
  // consecutive stretch: six or more scenes pass in a row with no new truth surfacing, even though
  // revelations exist elsewhere. A run-based revelation drought is distinct from a distribution skew
  // — the revelations may be balanced front-to-back across the script and still leave a long
  // uninterrupted span where the audience learns nothing new. When disclosure flatlines for a sixth
  // of the runtime or more, the epistemic engine stalls: the audience spends a long stretch with no
  // forward progress in their understanding, and the momentum that earlier disclosures built
  // dissipates before the next revelation can recover it. A story sustains intellectual engagement by
  // feeding new information at a steady cadence; an extended revelation drought lets the audience's
  // sense of forward discovery go slack.
  // Distinct from: REVELATION_RUN (Wave 479: run-based × ≥3 CONSECUTIVE revelation scenes — the
  // PRESENCE run, this is the ABSENCE run; the two are complements on the same channel), REVELATION_
  // FRONTLOADED (Wave 465: distribution/timing × 70% first-half ratio — a global skew, not a local
  // consecutive run), REVELATION_CLOSING_VOID (zone presence/absence × final third — a fixed-zone
  // check, not a sliding run anywhere in the script). First run-based ABSENCE check on the revelation
  // channel in this pass, paralleling PROACTIVE_DESERT_RUN on the proactive channel.
  {
    const n563a = records.length;
    if (n563a >= 10) {
      const revCount563a = (records as any[]).filter(
        r => r.revelation !== null && r.revelation !== undefined && r.revelation !== '',
      ).length;
      if (revCount563a >= 2) {
        let longestRun563a = 0;
        let currentRun563a = 0;
        for (const r of records as any[]) {
          const isRev563a = r.revelation !== null && r.revelation !== undefined && r.revelation !== '';
          if (!isRev563a) {
            currentRun563a++;
            if (currentRun563a > longestRun563a) longestRun563a = currentRun563a;
          } else {
            currentRun563a = 0;
          }
        }
        if (longestRun563a >= 6) {
          issues.push({
            location: `longest revelation drought: ${longestRun563a} consecutive scenes with no disclosure`,
            rule: 'REVELATION_DROUGHT_RUN',
            severity: 'minor',
            description: `The story contains a run of ${longestRun563a} consecutive scenes with no revelation — an extended disclosure drought — even though ${revCount563a} revelation scene(s) exist across the script. Unlike a front-to-back distribution skew, this is a local dead zone: a sixth of the runtime or more passes in an unbroken stretch where the audience learns nothing new. The epistemic engine stalls — the audience spends a long uninterrupted span with no forward progress in their understanding, and the momentum that earlier disclosures built dissipates before the next revelation can recover it. New information that is technically present in the script but absent for a long consecutive run leaves an extended stretch where the audience's sense of forward discovery goes slack.`,
            suggestedFix: `Break up the ${longestRun563a}-scene revelation drought by seeding at least one disclosure into the middle of the run: a partial truth surfaced, a detail reframed, a secret half-exposed, or a new piece of the puzzle revealed. The drought doesn't need a major plot reversal — it needs enough new information to keep the audience's sense of forward discovery alive across an extended stretch. A story sustains intellectual engagement by feeding new understanding at a steady cadence, not by withholding all disclosure for a long span between its larger reveals.`,
          });
        }
      }
    }
  }

  // REVELATION_ZONE_CLUSTER — distribution/timing × revelation × structural thirds.
  // n≥9, ≥3 revelation scenes (revelation non-null/non-empty), >75% of them fall in a single
  // structural third → fire. The story's disclosures are ghettoized into one structural zone — the
  // opening, middle, or closing third carries the overwhelming majority of all revelations while
  // the other two-thirds disclose almost nothing. A thirds-based cluster is a finer-grained
  // distribution check than the binary half-partition: a script can split its revelations evenly
  // across the two halves and still concentrate three-quarters of them into, say, the middle third,
  // leaving both the opening and the climax informationally inert. When revelations cluster in one
  // zone, the epistemic arc reads as a single burst of disclosure surrounded by long stretches where
  // the audience's understanding does not advance, rather than a steady accumulation of truth that
  // builds toward the climax.
  // Distinct from: REVELATION_FRONTLOADED (Wave 465: binary half-partition — >70% in the first half;
  // this uses three zones and can fire on a middle-third cluster that the half-check would miss),
  // REVELATION_CLOSING_VOID (Wave 465: zone presence/absence — final third has none; this fires on
  // OVER-concentration in any single third, not absence from the closing one), REVELATION_DROUGHT_RUN
  // (Wave 563 sibling: run-based local stretch, not a global zone concentration), REVELATION_RUN
  // (run-based presence). First thirds-based distribution check on the revelation channel in this pass.
  {
    const n563b = records.length;
    if (n563b >= 9) {
      const revPositions563b = (records as any[])
        .map((r, pos) => ({ r, pos }))
        .filter(({ r }) => r.revelation !== null && r.revelation !== undefined && r.revelation !== '')
        .map(({ pos }) => pos);
      if (revPositions563b.length >= 3) {
        const third563b = Math.floor(n563b / 3);
        const firstZone563b = revPositions563b.filter(p => p < third563b).length;
        const lastZone563b = revPositions563b.filter(p => p >= 2 * third563b).length;
        const midZone563b = revPositions563b.length - firstZone563b - lastZone563b;
        const maxZone563b = Math.max(firstZone563b, midZone563b, lastZone563b);
        if (maxZone563b / revPositions563b.length > 0.75) {
          const zoneName563b =
            maxZone563b === firstZone563b ? 'opening' : maxZone563b === lastZone563b ? 'closing' : 'middle';
          issues.push({
            location: `revelation distribution: ${firstZone563b} opening / ${midZone563b} middle / ${lastZone563b} closing third — ${Math.round((maxZone563b / revPositions563b.length) * 100)}% in the ${zoneName563b} third`,
            rule: 'REVELATION_ZONE_CLUSTER',
            severity: 'minor',
            description: `${Math.round((maxZone563b / revPositions563b.length) * 100)}% of the story's ${revPositions563b.length} revelation scenes are concentrated in the ${zoneName563b} structural third, leaving the other two-thirds disclosing almost nothing. Unlike a front-vs-back skew, this is a single-zone cluster: the truths surface almost entirely within one third of the runtime while the rest of the story does not advance the audience's understanding. When revelations are ghettoized into one zone, the epistemic arc reads as a single burst of disclosure surrounded by long informationally inert stretches, rather than a steady accumulation of truth that builds toward the climax. The most engaging mysteries dole out their disclosures across all three structural zones so the audience's understanding deepens continuously from setup to resolution.`,
            suggestedFix: `Redistribute some of the ${zoneName563b} third's revelations into the other two zones so that disclosure advances across the full arc rather than bursting in one stretch. Each structural third can carry its own revelation: an early disclosure that reframes the setup, a middle disclosure that complicates the situation, and a late disclosure that recontextualizes the climax. Spreading revelations across the thirds turns a single burst of truth into a continuous epistemic thread the audience can follow throughout.`,
          });
        }
      }
    }
  }

  // REVELATION_CLOCK_AFTERMATH_VOID — sequence/aftermath × revelation → clock aftermath.
  // n≥8, ≥2 revelation scenes (revelation non-null/non-empty) not at the final position, ≥2
  // clockRaised scenes globally (proving the story uses clocks), every revelation followed by 2
  // scenes with no clock raised → fire. Disclosure never tightens the deadline in its wake: every
  // time a truth surfaces, the scenes that follow add no time pressure. A revelation is a natural
  // trigger for new urgency — learning a threat is closer than believed, discovering a deadline was
  // moved up, realizing the window to act is narrower than assumed. When revelation aftermaths are
  // uniformly clock-free while the story raises clocks elsewhere, the disclosure engine and the
  // urgency engine never feed each other: truths surface in one part of the story and deadlines
  // tighten in another, and the escalating pressure a revelation could generate is left untapped.
  // Distinct from: REVELATION_CAUSE_VOID (Wave 549: backward-cause × what PRECEDES revelation — this
  // checks what FOLLOWS it, the opposite temporal direction), PAYOFF_CLOCK_DECOUPLED (Wave 535:
  // co-occurrence × payoff × clock in the SAME scene — different trigger channel and same-scene not
  // aftermath), SEED_CLOCKLESS (co-occurrence × seed × clock — seed trigger, same-scene), PROACTIVE_
  // CLOCK_AFTERMATH_ABSENT (Wave 465: aftermath × PROACTIVE → clock — same aftermath mode and output
  // channel but the proactive trigger; this is the revelation-trigger sibling). First aftermath check
  // pairing the revelation trigger with the clock output channel in this pass.
  {
    const n563c = records.length;
    if (n563c >= 8) {
      const clockCount563c = (records as any[]).filter(r => r.clockRaised === true).length;
      const revRecs563c = (records as any[])
        .map((r, i) => ({ r, i }))
        .filter(
          ({ r, i }) =>
            i < n563c - 1 && r.revelation !== null && r.revelation !== undefined && r.revelation !== '',
        );
      if (clockCount563c >= 2 && revRecs563c.length >= 2) {
        const allClockVoid563c = revRecs563c.every(({ i }) => {
          for (let off = 1; off <= 2; off++) {
            const next = (records as any[])[i + off];
            if (next && next.clockRaised === true) return false;
          }
          return true;
        });
        if (allClockVoid563c) {
          issues.push({
            location: `${revRecs563c.length} revelation scene(s) — none followed by a clock raise within 2 scenes`,
            rule: 'REVELATION_CLOCK_AFTERMATH_VOID',
            severity: 'minor',
            description: `Every one of the story's ${revRecs563c.length} revelation scenes is followed by two scenes in which no clock is raised, even though the story raises a clock in ${clockCount563c} scene(s) elsewhere. A revelation is a natural trigger for new urgency — the audience learns a threat is closer than believed, discovers a deadline was moved up, or realizes the window to act is narrower than assumed. When every disclosure's aftermath is clock-free, the disclosure engine and the urgency engine never feed each other: truths surface in one part of the story and deadlines tighten in another, and the escalating pressure a revelation could generate is left untapped. The story discloses and pressures in entirely separate moments, so the audience never feels a truth immediately raise the stakes.`,
            suggestedFix: `After at least one revelation, let the next scene or two raise a clock that the disclosure makes urgent: the truth surfaced reveals the deadline is closer, the discovery exposes a new time-limited threat, or the answer makes clear that the protagonist must act before a window closes. A revelation that immediately tightens the clock does double work — it advances understanding AND escalates pressure — where a disclosure that lands without any urgency in its wake lets the story's tension dissipate at the moment the audience is most engaged.`,
          });
        }
      }
    }
  }

  // ── Wave 577: SEED_ZONE_CLUSTER, CLOCK_REVELATION_AFTERMATH_VOID,
  //              SEED_CURIOSITY_DECOUPLED ────────────────────────────────────────────────────────
  {
    // SEED_ZONE_CLUSTER (distribution/timing × seed × structural thirds, n≥9, ≥3 seed scenes
    // [seededClueIds non-empty], >75% of them fall in a single structural third): The story's
    // clue-planting is concentrated in one structural zone — foreshadowing is not woven through
    // the story's full arc but deposited almost entirely in one section while the other two-thirds
    // are nearly promise-free. A thirds-based seed cluster is finer-grained than the binary
    // SEED_FRONT_LOADED check: a script can distribute seeds evenly across the two halves and
    // still concentrate three-quarters in, say, the opening third, leaving the middle and closing
    // sections without new planted threads. When seeds cluster, the story invests in its future
    // in one concentrated burst and then coasts on that investment — the audience's sense of
    // forward-looking tension (built from planted clues awaiting payoff) peaks early and then
    // fades rather than refreshing across the arc. Distribution/timing mode × seed channel ×
    // structural thirds. Distinct from SEED_FRONT_LOADED (Wave 521: >70% in first HALF — binary
    // partition, not thirds; can miss a middle-third cluster), SEED_MIDPOINT_VOID (zone × specific
    // midpoint zone — absence not concentration), SEED_PEAK_UNCAUSED (backward-cause × seed peak).
    if (records.length >= 9) {
      const seedPos577a = (records as any[])
        .map((r, pos) => ({ r, pos }))
        .filter(({ r }) => ((r.seededClueIds ?? []) as string[]).length > 0)
        .map(({ pos }) => pos);
      if (seedPos577a.length >= 3) {
        const third577a = Math.floor(records.length / 3);
        const z1Seed577a = seedPos577a.filter(p => p < third577a).length;
        const z3Seed577a = seedPos577a.filter(p => p >= 2 * third577a).length;
        const z2Seed577a = seedPos577a.length - z1Seed577a - z3Seed577a;
        const maxZSeed577a = Math.max(z1Seed577a, z2Seed577a, z3Seed577a);
        if (maxZSeed577a / seedPos577a.length > 0.75) {
          const zoneName577a = z1Seed577a === maxZSeed577a ? 'opening' : z3Seed577a === maxZSeed577a ? 'closing' : 'middle';
          issues.push({
            location: `seed scenes: ${z1Seed577a} opening / ${z2Seed577a} middle / ${z3Seed577a} closing third — ${Math.round(maxZSeed577a / seedPos577a.length * 100)}% in the ${zoneName577a} third`,
            rule: 'SEED_ZONE_CLUSTER',
            severity: 'minor',
            description: `${Math.round(maxZSeed577a / seedPos577a.length * 100)}% of the story's ${seedPos577a.length} seed scenes are concentrated in the ${zoneName577a} structural third, leaving the other two-thirds nearly clue-free. Foreshadowing is not woven across the story's arc but deposited in one zone and then left unreplaced. When seeds cluster, the story makes its promises in a concentrated burst — establishing the threads that will later pay off — and then plants no new promises across the other sections. The audience's sense of forward-looking tension (built from planted clues awaiting resolution) peaks in the ${zoneName577a} third and fades as the story moves into sections where no new threads are being laid. A well-seeded story refreshes its forward-tension regularly, ensuring the audience always has recently planted promises still outstanding.`,
            suggestedFix: `Redistribute some of the ${zoneName577a} third's seed scenes into the other two structural zones so that new clues are planted across the full arc. Each zone can carry its own foreshadowing: an early seed that establishes the thread, a middle seed that deepens it or adds a new layer, and a late seed that opens one final promise before the resolution closes the loop. Spreading foreshadowing across the thirds ensures the audience always has recently planted promises — and the forward momentum they generate — available regardless of where in the story they are.`,
          });
        }
      }
    }

    // CLOCK_REVELATION_AFTERMATH_VOID (sequence/aftermath × clock trigger → revelation aftermath,
    // n≥8, ≥2 qualifying clockRaised scenes [not at last position], ≥2 revelation scenes globally,
    // none of the qualifying clock scenes is followed by a revelation scene within 2 scenes): The
    // story's deadline escalations never surface hidden truths in their immediate wake — every moment
    // a clock is raised passes into a revelation-free aftermath. Deadlines are most productive when
    // they generate pressure that forces disclosures: the protagonist under time constraint is pushed
    // into confrontations that expose what was hidden, is forced to make decisions that require
    // revealing what they know, or encounters others who disclose in the urgency of the countdown.
    // When every clock raise is followed by a revelation-free stretch, urgency and disclosure operate
    // as separate systems: time pressures are created in one part of the story, hidden truths surface
    // in another, and the two never feed each other. This is the clock-trigger complement of
    // REVELATION_CLOCK_AFTERMATH_VOID (Wave 563: revelation → clock; this checks clock → revelation).
    // Sequence/aftermath mode × clock trigger × revelation aftermath. Distinct from REVELATION_CLOCK_
    // AFTERMATH_VOID (Wave 563: revelation trigger → clock aftermath — reverse causal direction),
    // PROACTIVE_CLOCK_AFTERMATH_ABSENT (different aftermath output), REVELATION_CAUSE_VOID (backward-
    // cause × revelation cause — looks at what PRECEDES revelation, not what FOLLOWS a clock).
    if (records.length >= 8) {
      const qualClocks577b = (records as any[])
        .map((r, pos) => ({ r, pos }))
        .filter(({ r, pos }) => r.clockRaised === true && pos < records.length - 1);
      const revealScenes577b = (records as any[]).filter(
        r => r.revelation !== null && r.revelation !== undefined && r.revelation !== '',
      );
      if (qualClocks577b.length >= 2 && revealScenes577b.length >= 2) {
        const anyClockFollowedByReveal577b = qualClocks577b.some(({ pos }) => {
          for (let off = 1; off <= 2; off++) {
            const next = (records as any[])[pos + off];
            if (!next) continue;
            if (next.revelation !== null && next.revelation !== undefined && next.revelation !== '') return true;
          }
          return false;
        });
        if (!anyClockFollowedByReveal577b) {
          issues.push({
            location: `${qualClocks577b.length} clock-raise scene(s) — none followed by a revelation within 2 scenes`,
            rule: 'CLOCK_REVELATION_AFTERMATH_VOID',
            severity: 'minor',
            description: `None of the story's ${qualClocks577b.length} clock-raise scenes is followed by a revelation within the next two scenes, even though ${revealScenes577b.length} disclosure moments exist elsewhere. Deadlines are most productive when they generate pressure that forces hidden truths into the open: the protagonist under time constraint is pushed into confrontations that expose what was concealed, forced to make decisions that require disclosing what they know, or encounters others who speak in the urgency of the countdown. When every clock raise passes into a revelation-free aftermath, urgency and disclosure operate as separate systems — time pressure is created in one part of the story, hidden truths surface in another, and the two never feed each other. The deadline mechanism never forces the epistemic layer to move.`,
            suggestedFix: `After at least one clock raise, let the next scene or two carry a revelation that the deadline pressure forces into the open — the urgency of the countdown exposing what had been hidden, the time constraint forcing the protagonist into a confrontation where the truth must surface, or the pressure of the clock pushing another character to disclose. A deadline that forces disclosure does double work: it escalates pressure AND advances the audience's understanding, where a deadline that only drives action without generating any new knowledge leaves the story's informational layer decoupled from its urgency layer.`,
          });
        }
      }
    }

    // SEED_CURIOSITY_DECOUPLED (co-occurrence/decoupling × seed × curiosity, n≥8, ≥2 seed scenes
    // [seededClueIds non-empty], ≥2 curiosity-positive scenes [curiosityDelta > 0], zero overlap):
    // Every scene that plants a clue is simultaneously curiosity-flat, while the story raises
    // curiosity in scenes where no clue is being planted. Seeds and wonder operate as separate
    // channels that never meet: foreshadowing is embedded without the scene generating any felt
    // mystery, and the questions the audience experiences are never rooted in a planted clue.
    // A seed that also raises curiosity is the ideal combination: the planted detail generates
    // its own wonder in the moment (the audience feels something strange or significant without
    // knowing what), and that curiosity sustains their investment in the future payoff. When the
    // seed channel and the curiosity channel are fully decoupled in the same scene, seeds are
    // procedurally embedded without any felt mystery, and wonder comes from non-seed sources that
    // don't have a planted thread behind them. Co-occurrence/decoupling mode × seed channel ×
    // curiosityDelta. Distinct from REVELATION_CURIOSITY_DECOUPLED (different trigger channel —
    // revelation not seed), PAYOFF_EMOTION_DECOUPLED (Wave 521: payoff not seed, emotion not
    // curiosity), SEED_ZONE_CLUSTER (distribution mode — not co-occurrence within the same scene),
    // SEED_PEAK_UNCAUSED (backward-cause × seed peak — different mode and window).
    if (records.length >= 8) {
      const seedRecs577c = (records as any[]).filter(
        r => ((r.seededClueIds ?? []) as string[]).length > 0,
      );
      const curiScenes577c = (records as any[]).filter(r => (r.curiosityDelta ?? 0) > 0);
      if (seedRecs577c.length >= 2 && curiScenes577c.length >= 2) {
        const anySeedWithCuri577c = seedRecs577c.some(r => (r.curiosityDelta ?? 0) > 0);
        if (!anySeedWithCuri577c) {
          issues.push({
            location: `${seedRecs577c.length} seed scene(s) — none with a positive curiosityDelta`,
            rule: 'SEED_CURIOSITY_DECOUPLED',
            severity: 'minor',
            description: `Every one of the story's ${seedRecs577c.length} seed scenes has a curiosityDelta ≤ 0, while the story raises curiosity in ${curiScenes577c.length} scene(s) where no clue is being planted. Seeds and wonder operate as completely separate channels: foreshadowing is embedded without the scene generating any felt mystery, and the questions the audience experiences are never rooted in a planted clue. A seed that also raises curiosity is the ideal combination — the planted detail generates its own wonder in the moment, and that curiosity sustains the audience's investment in the eventual payoff. When clue-planting and curiosity are fully decoupled, seeds are procedurally embedded without generating felt mystery in the same scene, and wonder comes from non-seed sources that don't have a planted thread behind them.`,
            suggestedFix: `In at least one seed scene, let the planted clue also raise a question (positive curiosityDelta) — the detail is embedded in a way that makes the audience feel something strange or significant without understanding why. A clue-plant that generates its own mystery is most effective: the audience notices something and wonders about it, which primes them to be interested in the eventual payoff even before they know what's coming. A seed that feels mysterious in the moment creates the double value of a planted thread AND an active question.`,
          });
        }
      }
    }
  }

  // ── Wave 591: PAYOFF_RELATIONSHIP_DECOUPLED, REVELATION_RELATIONSHIP_DECOUPLED,
  //              PAYOFF_ZONE_IMBALANCE ──────────────────────────────────────────────────────

  // PAYOFF_RELATIONSHIP_DECOUPLED — Co-occurrence/decoupling × payoff × relationshipShifts.
  // n≥8, ≥3 payoff scenes (payoffSetupIds non-empty), ≥2 relational-shift scenes globally.
  // No payoff scene has any relationshipShifts → fire. Resolutions never coincide with a bond
  // moving — the scene that closes a planted thread is always relationally inert, even though
  // relational shifts happen elsewhere in the story. The most resonant payoffs land on a
  // relationship at the same time they resolve a plot thread — the return of an object, the
  // fulfillment of a promise, or the answer to a question also changes how two characters stand
  // with each other. When every payoff is relationally flat, thread-closure and relationship
  // movement are fully decoupled channels.
  // Distinct from: PAYOFF_EMOTION_DECOUPLED (Wave 521: payoff × emotionalShift — a categorical
  // valence signal, not relational structure between characters), PAYOFF_DRAMA_DECOUPLED (Wave
  // 465: payoff × dramatic turn), PAYOFF_SEED_DECOUPLED (Wave 507: payoff × seed), PAYOFF_CLOCK_
  // DECOUPLED (Wave 535: payoff × clockRaised — this completes the payoff co-occurrence family by
  // adding the one signal, relationshipShifts, none of the existing payoff co-occurrence checks
  // use), PROACTIVE_RELATIONSHIP_AFTERMATH_ABSENT (Wave 451: sequence/aftermath mode — checks the
  // 2 scenes FOLLOWING a proactive act, not same-scene payoff co-occurrence).
  if (n >= 8) {
    const payoffRecs591a = (records as any[]).filter(r => ((r.payoffSetupIds ?? []) as string[]).length > 0);
    const relRecs591a = (records as any[]).filter(r => ((r.relationshipShifts ?? []) as any[]).length > 0);
    if (payoffRecs591a.length >= 3 && relRecs591a.length >= 2) {
      const anyPayoffWithRel591a = payoffRecs591a.some(r => ((r.relationshipShifts ?? []) as any[]).length > 0);
      if (!anyPayoffWithRel591a) {
        issues.push({
          location: `${payoffRecs591a.length} payoff scene(s) — none with a relationship shift`,
          rule: 'PAYOFF_RELATIONSHIP_DECOUPLED',
          severity: 'minor',
          description: `Every one of the story's ${payoffRecs591a.length} payoff scenes has zero relationship shifts, while ${relRecs591a.length} scene(s) elsewhere carry a relational shift with no payoff attached. Thread-closure and relational movement are entirely decoupled: resolving a planted setup never coincides with a bond changing. The most resonant payoffs do double duty — resolving a plot thread while also shifting how two characters stand with each other, so the audience feels the closure both narratively and relationally. When every payoff is relationally inert, resolutions read as mechanical bookkeeping rather than moments that also move the story's human relationships.`,
          suggestedFix: `Let at least one payoff scene also carry a relationship shift — the returned object also repairs (or further damages) a bond, the answered question also changes how two characters see each other, or the resolved thread coincides with a reconciliation or rupture. A payoff that lands on a relationship at the same moment it closes a plot thread is doing more dramatic work per beat than one that only closes the thread.`,
        });
      }
    }
  }

  // REVELATION_RELATIONSHIP_DECOUPLED — Co-occurrence/decoupling × revelation × relationshipShifts.
  // n≥8, ≥3 revelation scenes (revelation not null/empty), ≥2 relational-shift scenes globally.
  // No revelation scene has any relationshipShifts → fire. Disclosures never coincide with a bond
  // moving — truths surface without ever shifting how two characters stand with each other, even
  // though relational shifts happen elsewhere. Revelations are the single most natural catalyst for
  // relational change: learning a hidden truth can repair a misunderstanding, confirm a betrayal, or
  // transform an ally into an adversary. When disclosure and relational movement never coincide, the
  // story's truths land in a social vacuum.
  // Distinct from: REVELATION_EMOTION_DECOUPLED (Wave 549: revelation × emotionalShift — a
  // categorical valence signal, not relational structure), REVELATION_CAUSE_VOID (Wave 549:
  // backward-cause — what precedes a revelation, not what co-occurs with it), REVELATION_CLOCK_
  // AFTERMATH_VOID / CLOCK_REVELATION_AFTERMATH_VOID (Wave 563/577: sequence/aftermath mode on the
  // clock channel, checking the 2 scenes following, not same-scene relational co-occurrence), SEED_
  // EMOTIONAL_DECOUPLED (Wave 451: seed channel, not revelation). First check in this pass pairing
  // the revelation channel with relationshipShifts in co-occurrence mode.
  if (n >= 8) {
    const revRecs591b = (records as any[]).filter(
      r => r.revelation !== null && r.revelation !== '' && r.revelation !== undefined,
    );
    const relRecs591b = (records as any[]).filter(r => ((r.relationshipShifts ?? []) as any[]).length > 0);
    if (revRecs591b.length >= 3 && relRecs591b.length >= 2) {
      const anyRevWithRel591b = revRecs591b.some(r => ((r.relationshipShifts ?? []) as any[]).length > 0);
      if (!anyRevWithRel591b) {
        issues.push({
          location: `${revRecs591b.length} revelation scene(s) — none with a relationship shift`,
          rule: 'REVELATION_RELATIONSHIP_DECOUPLED',
          severity: 'minor',
          description: `Every one of the story's ${revRecs591b.length} revelation scenes has zero relationship shifts, while ${relRecs591b.length} scene(s) elsewhere carry a relational shift with no disclosure attached. Truths surface without ever moving a bond: disclosure and relational change are entirely separate channels. A revelation is the most natural catalyst for relational movement — a hidden truth can dissolve a misunderstanding, confirm a betrayal, or turn an ally into an adversary in the same beat it comes to light. When every disclosure lands in relationally flat scenes, the story's truths land in a social vacuum: information changes but no relationship does.`,
          suggestedFix: `Let at least one revelation scene also carry a relationship shift — the truth that comes to light also repairs, ruptures, or realigns a bond between two characters in the same scene. Revelation-plus-relational-shift scenes are among the most efficient structural beats available: the audience receives new information and feels its relational consequence at the same moment.`,
        });
      }
    }
  }

  // PAYOFF_ZONE_IMBALANCE — Underweight/bloat × payoff × four structural zones.
  // n≥10, ≥4 payoff scenes (payoffSetupIds non-empty) total. Divides the story into four
  // equal-length zones (Act 1: 0–25%, Act 2a: 25–50%, Act 2b: 50–75%, Act 3: 75–100%). At least
  // one zone has zero payoffs while another zone holds ≥50% of the total → fire. Thread-closure is
  // simultaneously absent from one structural quarter and concentrated in another — the payoff
  // engine runs in bursts rather than distributing resolution weight across the story's structure.
  // Mirrors PROACTIVE_ZONE_IMBALANCE's exact void+bloat co-presence test, applied here to the
  // payoff channel for the first time.
  // Distinct from: PAYOFF_BACK_LOADED (Wave 535: binary front/back half ratio >70% — a two-zone
  // hemispheric partition, not a four-zone void+bloat co-presence test), PAYOFF_FINAL_ZONE_VOID
  // (Wave 479: audits only whether the fixed final quarter is empty — no bloat requirement and no
  // audit of the other three zones), PAYOFF_RUN (Wave 493: run-based — consecutive payoff scenes,
  // not a structural-zone distribution), PROACTIVE_ZONE_IMBALANCE (Wave 437: the same underweight/
  // bloat test on the initiative channel, not payoff). First four-zone void+bloat audit on the
  // payoff channel.
  if (n >= 10) {
    const payoffZoneCounts591c = [0, 0, 0, 0];
    for (let i = 0; i < n; i++) {
      if (((records as any[])[i].payoffSetupIds ?? []).length > 0) {
        const zoneIdx = Math.min(3, Math.floor((i / n) * 4));
        payoffZoneCounts591c[zoneIdx]++;
      }
    }
    const totalPayoff591c = payoffZoneCounts591c.reduce((a, b) => a + b, 0);
    if (totalPayoff591c >= 4) {
      const maxZoneCount591c = Math.max(...payoffZoneCounts591c);
      const hasEmptyZone591c = payoffZoneCounts591c.some(c => c === 0);
      if (hasEmptyZone591c && maxZoneCount591c / totalPayoff591c >= 0.50) {
        const zoneNames591c = ['Act 1 (0–25%)', 'Act 2a (25–50%)', 'Act 2b (50–75%)', 'Act 3 (75–100%)'];
        const bloatZone591c = payoffZoneCounts591c.indexOf(maxZoneCount591c);
        const emptyZones591c = payoffZoneCounts591c
          .map((c, i) => c === 0 ? zoneNames591c[i] : null)
          .filter(Boolean)
          .join(', ');
        issues.push({
          location: `${emptyZones591c} empty; ${zoneNames591c[bloatZone591c]} has ${maxZoneCount591c}/${totalPayoff591c} payoffs`,
          rule: 'PAYOFF_ZONE_IMBALANCE',
          severity: 'minor',
          description: `The story's ${totalPayoff591c} payoffs are unevenly distributed across its four structural zones: ${zoneNames591c[bloatZone591c]} contains ${maxZoneCount591c} of them (${Math.round((maxZoneCount591c / totalPayoff591c) * 100)}%) while ${emptyZones591c} contains none. Thread-closure simultaneously bloats in one zone and vanishes from another: the audience receives a concentrated burst of resolutions in one structural quarter while another quarter passes with no planted thread paying off at all. The zone(s) with no payoffs will feel structurally unresolved in isolation, while the bloated zone will feel like a resolution dump.`,
          suggestedFix: `Redistribute payoffs: move at least one resolution from ${zoneNames591c[bloatZone591c]} into the empty zone(s) — ${emptyZones591c} — so every structural quarter carries some evidence of a planted thread paying off. The goal is not perfect uniformity, but that no zone is completely payoff-free while another carries more than half the total load.`,
        });
      }
    }
  }

  // ── Wave 605: OPEN_THREAD_REVELATION_DECOUPLED, PHYSICAL_STAGING_ZONE_IMBALANCE,
  //              OPEN_THREAD_PAYOFF_AFTERMATH_VOID ──────────────────────────────────────────

  // OPEN_THREAD_REVELATION_DECOUPLED — Co-occurrence/decoupling × unresolvedClues × revelation.
  // Built on checkCoOccurrenceDecoupled from the shared checks library. n≥8, ≥2 scenes carrying
  // outstanding clue-debt, ≥2 revelation scenes. Zero overlap → fire. Scenes where the story is
  // carrying open, unpaid setups never coincide with scenes where a hidden truth surfaces —
  // disclosure and debt run on entirely separate tracks, so a revelation never lands while the
  // audience is actively holding an open question, and no open question ever gets its moment
  // in the same beat as a truth coming to light. First use of the unresolvedClues field anywhere
  // in this 99-rule pass, despite its central concern with the seed/payoff economy. Distinct from
  // PAYOFF_REVELATION_DECOUPLED (pairs the payoff channel — resolved setups — with revelation;
  // this pairs the carried-debt channel — setups NOT yet resolved — with revelation instead) and
  // REVELATION_RELATIONSHIP_DECOUPLED (Wave 591: revelation × relationshipShifts, a different
  // second channel entirely).
  {
    const r605a = checkCoOccurrenceDecoupled({
      records, minRecords: 8, minACount: 2, minBCount: 2,
      isA: r => (r.unresolvedClues ?? []).length > 0,
      isB: r => r.revelation != null,
    });
    if (r605a.fires) {
      issues.push({
        location: `${r605a.aCount} open-thread scene(s), ${r605a.bCount} revelation scene(s) — zero overlap`,
        rule: 'OPEN_THREAD_REVELATION_DECOUPLED',
        severity: 'minor',
        description: `The ${r605a.aCount} scenes carrying outstanding, unpaid clue-debt never coincide with the ${r605a.bCount} scenes where a hidden truth is revealed — the story's open questions and its moments of disclosure run on entirely separate tracks. A revelation lands most powerfully when it intersects with what the audience is actively still wondering about; when the two channels never touch, disclosures arrive into scenes where nothing is currently hanging open, and the accumulated debt is never the occasion for an answer.`,
        suggestedFix: `Let at least one revelation land in a scene that is also carrying open clue-debt — a truth surfacing precisely because a thread the audience has been tracking finally connects to it. Tying disclosure to active unresolved tension gives the revelation a question to answer instead of arriving into a quiet moment.`,
      });
    }
  }

  // PHYSICAL_STAGING_ZONE_IMBALANCE — Underweight/bloat × visualBeats × four structural zones.
  // Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 scenes with substantial
  // physical staging (visualBeats.length≥2), divided into four equal structural zones. Fires only
  // when one zone has zero visually dense scenes while another holds ≥50% of the total. First use
  // of the visualBeats field anywhere in this pass — every existing check in this file audits the
  // seed/payoff/revelation economy through non-visual record channels; this is the first to audit
  // how the story's physical staging — as opposed to its promise-and-payment machinery — is spread
  // across the four structural quarters. A story whose physical staging clusters in one act and
  // vanishes from another shifts abruptly between staged and unstaged storytelling rather than
  // sustaining physical presence throughout the setup/payoff arc.
  {
    const r605b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r605b.fires) {
      const emptyNames605b = r605b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName605b = FOUR_ZONE_NAMES[r605b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames605b} empty; ${bloatName605b} has ${r605b.counts[r605b.bloatZoneIdx]}/${r605b.totalCount} visually dense scenes`,
        rule: 'PHYSICAL_STAGING_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r605b.totalCount} physically staged scenes are unevenly distributed across its four structural zones: ${bloatName605b} contains ${r605b.counts[r605b.bloatZoneIdx]} of them (${Math.round((r605b.counts[r605b.bloatZoneIdx] / r605b.totalCount) * 100)}%) while ${emptyNames605b} contains none. Physical staging bloats in one structural quarter and vanishes from another, giving the story's balance between staged and unstaged scenes an uneven rhythm relative to its setup/payoff economy.`,
        suggestedFix: `Redistribute physical staging: bring at least one heavily staged scene into ${emptyNames605b}, or thin out ${bloatName605b}'s concentration by letting one of its visually dense scenes lean more on dialogue or interiority instead. A more even spread keeps physical presence active throughout the story's promise-and-payment arc.`,
      });
    }
  }

  // OPEN_THREAD_PAYOFF_AFTERMATH_VOID — Sequence/aftermath × heavy unresolved-clue-debt trigger
  // → payoff absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying trigger scenes (unresolvedClues.length≥3 — heavy carried debt), ≥3 scenes anywhere
  // with a payoff (payoffSetupIds non-empty), a 2-scene lookahead window. Fires when every
  // heavy-debt scene's two-scene aftermath contains no payoff, while payoffs do occur elsewhere
  // in the story. The story's heaviest concentrations of open debt never lead into a nearby
  // resolution — the pressure of stacked unpaid setups mounts without any relief in its immediate
  // wake. Distinct from PAYOFF_SUSPENSE_AFTERMATH_VOID (Wave 507: payoff is the TRIGGER there,
  // suspense the aftermath signal — the reverse direction and reverse channel of this check) and
  // OPEN_THREAD_REVELATION_DECOUPLED above (same debt field, but that check is same-scene
  // co-occurrence with no positional/windowed component and checks revelation, not payoff).
  {
    const r605c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 3, window: 2,
      isTrigger: r => (r.unresolvedClues ?? []).length >= 3,
      isAftermath: r => (r.payoffSetupIds ?? []).length > 0,
    });
    if (r605c.fires) {
      issues.push({
        location: `${r605c.triggerCount} heavy clue-debt scene(s) — no payoff within 2 scenes after any of them`,
        rule: 'OPEN_THREAD_PAYOFF_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every scene carrying heavy unresolved clue-debt (${r605c.triggerCount} instances, each with 3 or more open threads at once) is followed by two full scenes with no payoff, even though ${r605c.aftermathCount} payoffs occur elsewhere in the story. The heaviest concentrations of open debt never lead into a nearby resolution — the pressure of stacked unanswered setups is never relieved in its immediate aftermath.`,
        suggestedFix: `In the two scenes following at least one heavy clue-debt moment, resolve at least one of the outstanding threads — let the accumulated pressure of unpaid setups find release nearby rather than compounding indefinitely before any payoff arrives.`,
      });
    }
  }

  // ── Wave 619: PAYOFF_PHYSICAL_STAGING_DECOUPLED, SEED_STAGING_AFTERMATH_VOID,
  //              PHYSICAL_STAGING_PEAK_UNCAUSED ─────────────────────────────────────────────
  // visualBeats has only ever been used standalone (Wave 605's zone-imbalance check) — never
  // paired with any other signal in this 102-rule pass. All three checks below pair it for the
  // first time, with the seed/payoff channels and with the backward-cause analytical lens.

  // PAYOFF_PHYSICAL_STAGING_DECOUPLED — Co-occurrence/decoupling × payoffSetupIds × visualBeats.
  // Built on checkCoOccurrenceDecoupled from the shared checks library. n≥6, ≥2 payoff scenes, ≥2
  // visually-staged scenes (visualBeats.length≥2). Zero overlap → fire. A resolved setup and a
  // scene rich in physical staging never happen together — every payoff lands through dialogue or
  // interiority alone.
  {
    const r619a = checkCoOccurrenceDecoupled({
      records, minRecords: 6, minACount: 2, minBCount: 2,
      isA: r => (r.payoffSetupIds ?? []).length > 0,
      isB: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r619a.fires) {
      issues.push({
        location: `${r619a.aCount} payoff scene(s), ${r619a.bCount} visually-staged scene(s) — zero overlap`,
        rule: 'PAYOFF_PHYSICAL_STAGING_DECOUPLED',
        severity: 'minor',
        description: `The ${r619a.aCount} scenes where a planted setup resolves never coincide with the ${r619a.bCount} scenes leaning heavily on physical staging — resolution and physical presence run on separate tracks. A payoff often lands with more weight when a character's physical action embodies what the resolution means, rather than the moment being carried entirely through dialogue.`,
        suggestedFix: `Let at least one payoff scene also lean on physical staging — an object a character handles, or an action they take, that embodies what the resolved setup means now that it has paid off.`,
      });
    }
  }

  // SEED_STAGING_AFTERMATH_VOID — Sequence/aftermath × seededClueIds trigger → visualBeats
  // absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2 qualifying seed
  // scenes (pos<n-2), ≥3 scenes anywhere with substantial physical staging, a 2-scene lookahead
  // window. Fires when every seed's two-scene aftermath contains no visually dense scene, while
  // such scenes do occur elsewhere. Seeds are the story's long-horizon deposits; when their
  // immediate aftermath is never physically staged, the planted material gets no visible presence
  // in the world nearby — it exists only as dialogue or narration until its eventual payoff.
  {
    const r619b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 3, window: 2,
      isTrigger: r => (r.seededClueIds ?? []).length > 0,
      isAftermath: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r619b.fires) {
      issues.push({
        location: `${r619b.triggerCount} seed scene(s) — no visually dense scene within 2 scenes of any`,
        rule: 'SEED_STAGING_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r619b.triggerCount} clue-planting scenes is followed by two scenes with no substantial physical staging, even though ${r619b.aftermathCount} such scenes exist elsewhere in the script. Seeds gain texture when the world around them briefly holds physical attention — an object lingered on, a space explored — but that opportunity consistently passes unstaged in the scenes immediately following every seed.`,
        suggestedFix: `After at least one seed, let one of the following two scenes carry substantial physical staging — the planted material or its surroundings given some visible, tactile presence before the story moves on.`,
      });
    }
  }

  // PHYSICAL_STAGING_PEAK_UNCAUSED — Backward-cause × visualBeats-density peak ×
  // revelation/dramaticTurn cause. Built on checkPeakUncaused from the shared checks library.
  // n≥8, ≥2 scenes with visualBeats present, a 2-scene lookback. Finds the single scene with the
  // most physical staging beats and fires when neither that scene nor either of the 2 scenes
  // before it contains a revelation or a dramatic turn. The story's single most visually dense
  // scene should be motivated by something the narrative is dramatizing — a disclosed truth or a
  // pivot — not simply appear as unmotivated staging.
  {
    const r619c = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.visualBeats ?? []).length,
      hasCause: r => r.revelation != null || (r.dramaticTurn ?? 'nothing') !== 'nothing',
    });
    if (r619c.fires) {
      issues.push({
        location: `Scene at position ${r619c.peakIdx + 1} — peak physical staging (${r619c.peakMagnitude} beats) with no revelation or dramatic turn nearby`,
        rule: 'PHYSICAL_STAGING_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The scene with the story's single densest physical staging (${r619c.peakMagnitude} visual beats, out of ${r619c.qualifyingCount} scenes with any staging at all) has no revelation and no dramatic turn in itself or in either of the 2 scenes before it. The moment the story invests most heavily in physical description arrives with no disclosure or pivot explaining why — the staging is dense but unmotivated by anything the plot is doing.`,
        suggestedFix: `Add a revelation or a dramatic turn in the scene with the densest physical staging, or in one of the two scenes before it, so the audience understands why this particular moment earns such heavy physical attention.`,
      });
    }
  }

  // ── Wave 633: INTENTION_HIGHLIGHT_OPEN_THREAD_DECOUPLED, INTENTION_CLOCK_STAGING_AFTERMATH_
  //              VOID, INTENTION_OPEN_THREAD_ZONE_IMBALANCE ─────────────────────────────────

  // INTENTION_HIGHLIGHT_OPEN_THREAD_DECOUPLED — Co-occurrence/decoupling × dialogueHighlights ×
  // unresolvedClues. Built on checkCoOccurrenceDecoupled from the shared checks library. n≥6, ≥2
  // scenes carrying a dialogue highlight, ≥2 scenes carrying outstanding clue-debt. Zero overlap
  // → fire. First pairing of these two fields in this 105-rule pass. A line the story flags as
  // memorable never lands while a setup sits unresolved — the memorable-dialogue channel and the
  // seed/payoff economy's open-debt channel never intersect.
  {
    const r633a = checkCoOccurrenceDecoupled({
      records, minRecords: 6, minACount: 2, minBCount: 2,
      isA: r => (r.dialogueHighlights ?? []).length > 0,
      isB: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r633a.fires) {
      issues.push({
        location: `${r633a.aCount} dialogue-highlight scene(s), ${r633a.bCount} open-thread scene(s) — zero overlap`,
        rule: 'INTENTION_HIGHLIGHT_OPEN_THREAD_DECOUPLED',
        severity: 'minor',
        description: `The ${r633a.aCount} scenes flagged as containing a standout line of dialogue never coincide with the ${r633a.bCount} scenes carrying outstanding clue-debt — the story's most memorable dialogue and its open setups run on separate tracks. A revealing line often lands hardest when a character is actively holding an unresolved question.`,
        suggestedFix: `Let at least one standout line of dialogue land in a scene that is also carrying open clue-debt — a character voicing suspicion or naming what's still unresolved, tying the story's most memorable dialogue to its live setups.`,
      });
    }
  }

  // INTENTION_CLOCK_STAGING_AFTERMATH_VOID — Sequence/aftermath × clockRaised trigger →
  // visualBeats absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying clockRaised scenes (pos<n-2), ≥3 scenes anywhere with substantial physical staging,
  // a 2-scene lookahead window. Fires when every clock-raising scene's two-scene aftermath
  // contains no visually dense scene, while such scenes do occur elsewhere. First pairing of
  // clockRaised with visualBeats in this pass — a tightening deadline should register physically
  // somewhere nearby, not only as narrated urgency.
  {
    const r633b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 3, window: 2,
      isTrigger: r => r.clockRaised === true,
      isAftermath: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r633b.fires) {
      issues.push({
        location: `${r633b.triggerCount} clock-raising scene(s) — no visually dense scene within 2 scenes of any`,
        rule: 'INTENTION_CLOCK_STAGING_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r633b.triggerCount} clock-raising scenes is followed by two scenes with no substantial physical staging, even though ${r633b.aftermathCount} such scenes exist elsewhere in the script. A tightening deadline often shows up physically — hurried movement, a glance at the time — and when that aftermath consistently stays unstaged, the mounting time pressure is only ever mentioned.`,
        suggestedFix: `After at least one clock-raising scene, let one of the following two scenes carry substantial physical staging — the deadline's pressure made visible through a character's rushed action rather than only through dialogue about time.`,
      });
    }
  }

  // INTENTION_OPEN_THREAD_ZONE_IMBALANCE — Underweight/bloat × unresolvedClues × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 debt-carrying
  // scenes total, divided across four equal structural zones. Fires only when one zone has zero
  // such scenes while another holds ≥50% of the total. Wave 605 applied this template to
  // visualBeats only; unresolvedClues itself has never been zone-audited in this file, despite
  // being the file's most natural complement to the seed/payoff economy.
  {
    const r633c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r633c.fires) {
      const emptyNames633c = r633c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName633c = FOUR_ZONE_NAMES[r633c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames633c} empty; ${bloatName633c} has ${r633c.counts[r633c.bloatZoneIdx]}/${r633c.totalCount} debt-carrying scenes`,
        rule: 'INTENTION_OPEN_THREAD_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r633c.totalCount} scenes carrying outstanding clue-debt are unevenly distributed across its four structural zones: ${bloatName633c} contains ${r633c.counts[r633c.bloatZoneIdx]} of them (${Math.round((r633c.counts[r633c.bloatZoneIdx] / r633c.totalCount) * 100)}%) while ${emptyNames633c} contains none. Outstanding narrative debt bloats in one structural quarter and vanishes from another, giving the story's sense of active mystery an uneven structural rhythm.`,
        suggestedFix: `Redistribute open threads: let at least one clue remain unresolved into the empty zone(s) — ${emptyNames633c} — so every structural quarter carries some sense of active, unanswered setup.`,
      });
    }
  }

  const { revised, usedLLM } = await rewritePass({ fountain, issues, passName: 'intention', approvedSpans, storyContext: input.storyContext, priorPassResults: input.priorPassResults });
  const changed = revised !== fountain;

  return {
    pass: 'intention',
    issues,
    revisedFountain: revised,
    changed,
    summary: issues.length === 0
      ? 'Intention pass: character intentions are legible'
      : `Intention pass: ${issues.length} issue(s) — ${usedLLM ? 'rewritten' : 'flagged (stub mode)'}`,
  };
}
