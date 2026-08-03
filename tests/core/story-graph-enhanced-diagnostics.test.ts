// Story Graph Enhanced Diagnostics Tests — Phase 2
//
// Tests severity classification, suggestion generation, and strength detection
// for the Phase 2 enhanced diagnostics system (server/nvm/analyze/story-graph.ts),
// which ScriptDoctorPanel.tsx renders directly to writers.
//
// 2026-08-03 audit fix: every fixture below is chosen so the claimed behavior
// ACTUALLY fires against the real runScriptDoctor pipeline (verified empirically,
// not asserted past an `if` guard that may never execute), and where the
// underlying logic branches, a paired fixture proves the NO-fire path too. Two
// structural facts about story-graph.ts / fountain-analyzer.ts drove several
// fixture designs and are worth stating once, here, rather than re-deriving at
// each call site:
//
//   1. isolated-scene detection only treats 'causal' and 'character-arc' edges
//      as "connected" (buildStoryGraph's isolatedScenes loop). A 'causal' edge
//      only ever links a promise-setup node to a promise-payoff node — it
//      never touches a scene node — so the ONLY way a real fountain script
//      keeps a scene out of isolatedScenes is a repeated character
//      relationship (detectRelationshipShifts) producing a 'character-arc'
//      edge into or out of that scene. connectedDialogue() below exploits
//      that: repeating it in every scene chains character-arc edges
//      scene-to-scene so no scene in a fixture is isolated, isolating that
//      fixture's other signals from isolated-scene noise.
//   2. A promise can only be marked "paid" by detectClueLifecycle when its
//      last occurrence is >= 2 scenes after its first
//      (fountain-analyzer.ts's applyClueLifecycle) — so every paid promise
//      the analyzer can ever produce has seedIdx strictly less than
//      payoffIdx. graph.forwardEdgeRatio is therefore always exactly 1.0
//      whenever any promise is paid, and exactly 0.5 (the "no paid
//      promises" default) otherwise: there is no fountain input that
//      produces a genuinely PARTIAL forward ratio. The 'classifies backward
//      causality > 40% as critical' test documents this rather than
//      asserting a percentage threshold that can't actually be hit — see
//      that test's comment for what it proves instead.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runScriptDoctor } from '../../server/nvm/analyze/doctor.ts';

// ── Shared fixture builders ──────────────────────────────────────────────────

/** ALEX/JORDAN exchange enough POSITIVE_VALENCE_WORDS hits (fountain-
 *  analyzer.ts) to clear RELATIONSHIP_SHIFT_THRESHOLD every time it appears,
 *  registering a same-pair relationship shift in whichever scene it's placed.
 *  See file header note (1). */
function connectedDialogue(): string {
  return [
    'ALEX',
    "I love you and trust you completely, grateful for your kindness.",
    '',
    'JORDAN',
    "I trust you too, my friend, so happy and full of hope.",
  ].join('\n');
}

/** `count` plain scenes, no clue tokens, no dialogue — every scene isolated,
 *  positions falling on a clean idx/(count-1) grid so classifySeverity's
 *  key-position windows (opening/act-breaks/midpoint/climax) land exactly on
 *  scene indices instead of between them. */
function buildIsolatedGrid(count: number): string {
  const scenes: string[] = [];
  for (let i = 0; i < count; i++) {
    scenes.push(`INT. S${i} - DAY\n\nSomething happens in scene ${i}.`);
  }
  return scenes.join('\n\n');
}

/** 12 scenes seeding one never-repeated clue token in each act (Act 1
 *  sceneIdx 0, Act 2 sceneIdx 5, Act 3 sceneIdx 9 — act1End=3, act2End=9 for
 *  sceneCount=12), so all three severities and both the Act-position-based
 *  severity AND suggestion branches fire in one fixture. No character
 *  dialogue, so it also produces isolated-scene and backward-arc findings —
 *  expected side effects, not bugs; tests using this fixture filter by
 *  `type` for the signal they care about. */
const THREE_ACT_UNPAID = [
  'INT. OPENING - DAY\n\nSarah notices a strange BRASS KEY glinting under the mat.',
  'INT. FILLER1 - DAY\n\nSarah goes about an ordinary errand 1.',
  'INT. FILLER2 - DAY\n\nSarah goes about an ordinary errand 2.',
  'INT. FILLER3 - DAY\n\nSarah goes about an ordinary errand 3.',
  'INT. FILLER4 - DAY\n\nSarah goes about an ordinary errand 4.',
  'INT. MIDACT - DAY\n\nAcross town, a courier drops off a sealed IRON BOX at the office.',
  'INT. FILLER6 - DAY\n\nSarah goes about an ordinary errand 6.',
  'INT. FILLER7 - DAY\n\nSarah goes about an ordinary errand 7.',
  'INT. FILLER8 - DAY\n\nSarah goes about an ordinary errand 8.',
  'INT. LATEACT - DAY\n\nA stranger mentions a hidden SILVER LOCKET in passing.',
  'INT. PENULT - DAY\n\nSarah packs her bags for the trip.',
  'INT. END - DAY\n\nStory concludes; none of the objects were ever mentioned again.',
].join('\n\n');

/** Zero distinctive tokens (no quotes, no inline CAPS) anywhere — totalPromises
 *  is 0, so graph.forwardEdgeRatio takes its "no paid promises" default of
 *  0.5, which is < 0.6 and fires 'backward-arc' at 'critical'. See file
 *  header note (2): this is the only way the real pipeline reaches
 *  forwardEdgeRatio < 0.6, not a genuine reversed-edge detection. */
const NO_CLUES_PLAIN = Array.from({ length: 6 }, (_, i) =>
  `INT. LOCATION ${i} - DAY\n\nA person walks through a room and thinks quietly about ordinary things.`
).join('\n\n');

/** One clue, seeded then paid 3 scenes later — per file header note (2) this
 *  makes forwardEdgeRatio exactly 1.0, the paired NO-fire case for
 *  NO_CLUES_PLAIN's backward-arc finding. */
const ONE_PAID_PROMISE = [
  'INT. SETUP - DAY\n\nSarah notices a strange BRASS KEY under the mat.',
  'INT. MIDDLE1 - DAY\n\nSarah goes to work and argues with her boss.',
  'INT. MIDDLE2 - DAY\n\nSarah eats lunch alone.',
  'INT. PAYOFF - DAY\n\nSarah finally uses the BRASS KEY to open the door.',
].join('\n\n');

/** 5 distinct clue tokens, 4 paid off (>=2-scene gap) and 1 never repeated —
 *  promisePaymentRatio lands >= 0.8 with unpaidPromises.length > 0, firing
 *  detectStrengths' 'high-closure' branch. */
const HIGH_CLOSURE = [
  'INT. SETUP1 - DAY\n\nA WOODEN CRATE sits in the corner, dusty and forgotten.',
  'INT. SETUP2 - DAY\n\nMarla eyes a COPPER WIRE dangling from the ceiling.',
  'INT. SETUP3 - DAY\n\nA folded NOTEBOOK PAGE is tucked behind the mirror.',
  'INT. SETUP4 - DAY\n\nSomeone left a GOLDEN WHISTLE on the windowsill.',
  'INT. SETUP5 - DAY\n\nA cracked PORCELAIN VASE teeters on the shelf.',
  'INT. FILLER1 - DAY\n\nAn ordinary quiet moment passes.',
  'INT. PAYOFF1 - DAY\n\nMarla finally opens the WOODEN CRATE.',
  'INT. PAYOFF2 - DAY\n\nThe COPPER WIRE sparks to life at last.',
  'INT. PAYOFF3 - DAY\n\nSomeone reads the NOTEBOOK PAGE aloud.',
  'INT. PAYOFF4 - DAY\n\nMarla blows the GOLDEN WHISTLE triumphantly.',
  'INT. END - DAY\n\nThe story ends; the vase was never mentioned again.',
].join('\n\n');

/** One clue, paid off — 100% closure, but detectStrengths' 'high-closure'
 *  branch requires `unpaidPromises.length > 0` as well as ratio >= 0.8, so a
 *  script with EVERY promise paid off gets zero high-closure credit. Genuine
 *  gotcha in the source (see report), and the deliberate NO-fire pair for
 *  HIGH_CLOSURE. */
const FULL_CLOSURE = [
  'INT. SETUP1 - DAY\n\nA WOODEN CRATE sits in the corner, dusty and forgotten.',
  'INT. FILLER1 - DAY\n\nAn ordinary quiet moment passes.',
  'INT. PAYOFF1 - DAY\n\nMarla finally opens the WOODEN CRATE.',
].join('\n\n');

/** 9 scenes, suspenseDelta rising act-over-act (calm -> mild danger -> heavy
 *  danger), landing escalationMonotonicity at exactly 1.0 (both act
 *  boundaries increase) and firing detectStrengths' 'strong-escalation'. */
const ASCENDING_TENSION = [
  'INT. CALM1 - DAY\n\nThe house is calm and peaceful. Everyone rests quietly.',
  'INT. CALM2 - DAY\n\nA peaceful morning. Birds settle in the calm garden.',
  'INT. MILD1 - DAY\n\nA shadow moves. Someone mentions danger nearby.',
  'INT. MILD2 - DAY\n\nA figure runs past the window, then is gone.',
  'INT. MILD3 - DAY\n\nThey hear a distant scream from the dark street.',
  'INT. MILD4 - DAY\n\nA chase begins as footsteps pound the pavement.',
  'INT. HIGH1 - DAY\n\nGunfire erupts! Blood spatters the wall as they scream and run!',
  'INT. HIGH2 - DAY\n\nA knife flashes! He is stabbed, bleeding, trapped, and panicked!',
  'INT. HIGH3 - DAY\n\nThe explosion kills two guards. Fire! Danger! Attack! Run!',
].join('\n\n');

/** Same 9 scenes as ASCENDING_TENSION, reverse order — tension falls
 *  act-over-act, landing escalationMonotonicity at exactly 0 (no increases).
 *  Deliberate NO-fire pair for ASCENDING_TENSION's 'strong-escalation'. */
const DESCENDING_TENSION = [
  'INT. HIGH1 - DAY\n\nGunfire erupts! Blood spatters the wall as they scream and run!',
  'INT. HIGH2 - DAY\n\nA knife flashes! He is stabbed, bleeding, trapped, and panicked!',
  'INT. MILD1 - DAY\n\nA shadow moves. Someone mentions danger nearby.',
  'INT. MILD2 - DAY\n\nA figure runs past the window, then is gone.',
  'INT. MILD3 - DAY\n\nThey hear a distant scream from the dark street.',
  'INT. MILD4 - DAY\n\nA chase begins as footsteps pound the pavement.',
  'INT. CALM1 - DAY\n\nThe house is calm and peaceful. Everyone rests quietly.',
  'INT. CALM2 - DAY\n\nA peaceful morning. Birds settle in the calm garden.',
  'INT. CALM3 - DAY\n\nQuiet stillness. They exhale, relieved and safe at last.',
].join('\n\n');

/** 6 scenes, connectedDialogue() in every scene (zero isolated scenes, per
 *  file header note (1)), 4 of 5 clue tokens paid off (high-closure) and
 *  rising tension (strong-escalation) — 0 critical issues, >=2 strengths.
 *  Empirically: criticalCount 0, strengthCount 3, overallAssessment 'strong'. */
const STRONG_SCRIPT = [
  `INT. OPENING - DAY\n\nAlex and Jordan sit calmly, at peace. A BRASS KEY and an IRON BOX rest on the table.\n\n${connectedDialogue()}`,
  `INT. SCENE2 - DAY\n\nA COPPER WIRE and a GOLDEN WHISTLE sit in a drawer. A SILVER LOCKET glints, unnoticed.\n\n${connectedDialogue()}`,
  `INT. SCENE3 - DAY\n\nA shadow moves outside; someone mentions danger.\n\n${connectedDialogue()}`,
  `INT. SCENE4 - DAY\n\nA figure runs and a distant scream is heard.\n\n${connectedDialogue()}`,
  `INT. SCENE5 - DAY\n\nGunfire erupts! Alex grabs the BRASS KEY and unlocks the IRON BOX at last!\n\n${connectedDialogue()}`,
  `INT. END - DAY\n\nA knife flashes! Jordan splices the COPPER WIRE and blows the GOLDEN WHISTLE, stabbed but victorious!\n\n${connectedDialogue()}`,
].join('\n\n');

/** 8 scenes, connectedDialogue() in every scene, both clue tokens paid off,
 *  flat tension — 0 issues at all. Empirically: totalIssues 0, strengthCount
 *  0, overallAssessment 'good' (0 critical but < 2 strengths keeps it out of
 *  'strong'). */
const GOOD_SCRIPT = [
  `INT. S0 - DAY\n\nA figure grips a torn MAP FRAGMENT tightly.\n\n${connectedDialogue()}`,
  `INT. S1 - DAY\n\nA quiet BLUE LANTERN sits on the shelf.\n\n${connectedDialogue()}`,
  `INT. S2 - DAY\n\nAn ordinary moment passes.\n\n${connectedDialogue()}`,
  `INT. S3 - DAY\n\nJordan studies the MAP FRAGMENT again, tracing its edges.\n\n${connectedDialogue()}`,
  `INT. S4 - DAY\n\nJordan finally lights the BLUE LANTERN.\n\n${connectedDialogue()}`,
  `INT. S5 - DAY\n\nAn ordinary moment passes.\n\n${connectedDialogue()}`,
  `INT. S6 - DAY\n\nAn ordinary moment passes.\n\n${connectedDialogue()}`,
  `INT. S7 - DAY\n\nThe story ends quietly.\n\n${connectedDialogue()}`,
].join('\n\n');

/** Identical to GOOD_SCRIPT except the Act 1 clue (MAP FRAGMENT) is never
 *  paid off. Empirically: criticalCount 1, totalIssues 1, overallAssessment
 *  'needs-work' (1 critical issue keeps it out of both 'strong' and 'good',
 *  but critical <= 2 and totalIssues <= 10 keep it out of 'weak'). */
const NEEDS_WORK_SCRIPT = [
  `INT. S0 - DAY\n\nA figure grips a torn MAP FRAGMENT tightly.\n\n${connectedDialogue()}`,
  `INT. S1 - DAY\n\nA quiet BLUE LANTERN sits on the shelf.\n\n${connectedDialogue()}`,
  `INT. S2 - DAY\n\nAn ordinary moment passes.\n\n${connectedDialogue()}`,
  `INT. S3 - DAY\n\nAn ordinary moment passes.\n\n${connectedDialogue()}`,
  `INT. S4 - DAY\n\nJordan finally lights the BLUE LANTERN.\n\n${connectedDialogue()}`,
  `INT. S5 - DAY\n\nAn ordinary moment passes.\n\n${connectedDialogue()}`,
  `INT. S6 - DAY\n\nAn ordinary moment passes.\n\n${connectedDialogue()}`,
  `INT. S7 - DAY\n\nThe story ends quietly; the map fragment is never mentioned again.\n\n${connectedDialogue()}`,
].join('\n\n');

/** 9 plain scenes (no connecting dialogue, per file header note (1)), two
 *  Act-1 clues that are never paid off. Empirically: criticalCount 8 (2
 *  unpaid-promise + 5 isolated-scene-at-key-position + 1 backward-arc),
 *  totalIssues 13, overallAssessment 'weak'. */
const WEAK_SCRIPT = [
  'INT. S0 - DAY\n\nA stranger clutches a torn MAP FRAGMENT.',
  'INT. S1 - DAY\n\nA courier hides a sealed WOODEN CRATE nearby.',
  'INT. S2 - DAY\n\nSomething ordinary happens.',
  'INT. S3 - DAY\n\nSomething ordinary happens.',
  'INT. S4 - DAY\n\nSomething ordinary happens.',
  'INT. S5 - DAY\n\nSomething ordinary happens.',
  'INT. S6 - DAY\n\nSomething ordinary happens.',
  'INT. S7 - DAY\n\nSomething ordinary happens.',
  'INT. S8 - DAY\n\nThe story ends; nothing from before was ever mentioned again.',
].join('\n\n');

describe('Story Graph Enhanced Diagnostics — Phase 2', () => {

  describe('Severity Classification', () => {
    it('classifies Act 1 unpaid promises as critical', async () => {
      const report = await runScriptDoctor(THREE_ACT_UNPAID);
      assert.ok(report.storyGraph);
      assert.equal(report.sceneCount, 12);

      const all = [
        ...report.storyGraph.diagnostics.critical,
        ...report.storyGraph.diagnostics.medium,
        ...report.storyGraph.diagnostics.low,
      ];
      const unpaid = all.filter(d => d.type === 'unpaid-promise');
      assert.equal(unpaid.length, 3, 'fixture seeds exactly 3 never-repeated clues');

      // Fire path: the clue seeded at sceneIdx 0 (act1End=3 for sceneCount=12,
      // so 0 < 3) must be classified critical.
      const act1 = unpaid.find(d => d.sceneIdx === 0);
      assert.ok(act1, 'brass-key (seeded scene 0) should appear as an unpaid promise');
      assert.equal(act1!.severity, 'critical');

      // No-fire path, same fixture: the clues seeded in Act 2 (sceneIdx 5)
      // and Act 3 (sceneIdx 9) must NOT be critical, proving the classifier
      // discriminates on position rather than always returning 'critical'.
      const act2 = unpaid.find(d => d.sceneIdx === 5);
      assert.ok(act2);
      assert.equal(act2!.severity, 'medium');

      const act3 = unpaid.find(d => d.sceneIdx === 9);
      assert.ok(act3);
      assert.equal(act3!.severity, 'low');
    });

    it('classifies isolated scenes at key positions as critical', async () => {
      const report = await runScriptDoctor(buildIsolatedGrid(9));
      assert.ok(report.storyGraph);
      assert.equal(report.sceneCount, 9);
      // No character dialogue anywhere -> every scene is isolated (file
      // header note (1)), so this fixture isolates classifySeverity's
      // key-position logic from whether a scene is isolated at all.
      assert.deepEqual(report.storyGraph.graph.isolatedScenes, [0, 1, 2, 3, 4, 5, 6, 7, 8]);

      const isolatedDiagnostics = [
        ...report.storyGraph.diagnostics.critical,
        ...report.storyGraph.diagnostics.medium,
      ].filter(d => d.type === 'isolated-scene');
      assert.equal(isolatedDiagnostics.length, 9);

      // Fire path: sceneIdx 4 sits at position 4/8 = 0.5, inside the
      // midpoint window (0.48, 0.52) -> critical.
      const midpoint = isolatedDiagnostics.find(d => d.sceneIdx === 4);
      assert.ok(midpoint);
      assert.equal(midpoint!.severity, 'critical');

      // No-fire path: sceneIdx 3 sits at position 3/8 = 0.375, inside none
      // of the key-position windows -> medium, not critical. Proves the
      // classifier discriminates by position rather than flagging every
      // isolated scene as critical.
      const nonKey = isolatedDiagnostics.find(d => d.sceneIdx === 3);
      assert.ok(nonKey);
      assert.equal(nonKey!.severity, 'medium');
    });

    it('classifies backward causality as critical when no promise is ever paid forward', async () => {
      // See file header note (2): the real detectClueLifecycle pipeline can
      // only ever produce forwardEdgeRatio === 1.0 (a paid promise exists,
      // and paid promises are always forward by construction) or exactly
      // 0.5 (no paid promises at all, the neutral default). There is no
      // fountain input that exercises a genuine PARTIAL backward ratio, so
      // this test documents the reachable fire/no-fire pair instead of an
      // unreachable ">40%" threshold — see this file's report for the
      // consequence (classifySeverity's 'medium' branch for 'backward-arc'
      // is dead code given analyzeStoryGraph's identical < 0.6 gate).
      const fireReport = await runScriptDoctor(NO_CLUES_PLAIN);
      assert.ok(fireReport.storyGraph);
      assert.equal(fireReport.storyGraph.graph.forwardEdgeRatio, 0.5);
      const backwardArc = fireReport.storyGraph.diagnostics.critical.find(d => d.type === 'backward-arc');
      assert.ok(backwardArc, 'zero paid promises should fire backward-arc at critical');
      assert.equal(backwardArc!.severity, 'critical');

      // No-fire path: once a promise pays off forward (the only way the
      // analyzer ever pays one off), forwardEdgeRatio is 1.0 and no
      // backward-arc diagnostic is produced at any severity.
      const noFireReport = await runScriptDoctor(ONE_PAID_PROMISE);
      assert.ok(noFireReport.storyGraph);
      assert.equal(noFireReport.storyGraph.graph.forwardEdgeRatio, 1);
      const allSeverities = [
        ...noFireReport.storyGraph.diagnostics.critical,
        ...noFireReport.storyGraph.diagnostics.medium,
        ...noFireReport.storyGraph.diagnostics.low,
      ];
      assert.ok(!allSeverities.some(d => d.type === 'backward-arc'));
    });
  });

  describe('Suggestion Generation', () => {
    it('provides actionable suggestions for unpaid promises', async () => {
      const report = await runScriptDoctor(THREE_ACT_UNPAID);
      assert.ok(report.storyGraph);

      const allDiagnostics = [
        ...report.storyGraph.diagnostics.critical,
        ...report.storyGraph.diagnostics.medium,
        ...report.storyGraph.diagnostics.low,
      ];
      const unpaidDiagnostics = allDiagnostics.filter(d => d.type === 'unpaid-promise');
      // Fixture deterministically seeds 3 never-repeated clues -- assert
      // directly rather than behind an `if` that may never run.
      assert.equal(unpaidDiagnostics.length, 3);

      for (const diagnostic of unpaidDiagnostics) {
        assert.ok(Array.isArray(diagnostic.suggestions), 'Should have suggestions array');
        assert.ok(diagnostic.suggestions.length > 0, 'Should have at least one suggestion');
        assert.ok(diagnostic.impact, 'Should have impact explanation');
        assert.ok(diagnostic.impact.length > 10, 'Impact should be meaningful');
      }
    });

    it('provides context-aware suggestions based on act position', async () => {
      const report = await runScriptDoctor(THREE_ACT_UNPAID);
      assert.ok(report.storyGraph);

      const all = [
        ...report.storyGraph.diagnostics.critical,
        ...report.storyGraph.diagnostics.medium,
        ...report.storyGraph.diagnostics.low,
      ];
      const unpaid = all.filter(d => d.type === 'unpaid-promise');
      const act1 = unpaid.find(d => d.sceneIdx === 0)!;
      const act2 = unpaid.find(d => d.sceneIdx === 5)!;
      const act3 = unpaid.find(d => d.sceneIdx === 9)!;
      assert.ok(act1 && act2 && act3);

      // generateSuggestions' three branches (inAct1 / inAct2 / else) return
      // genuinely different text keyed to story position -- assert the
      // act-specific phrase each branch is documented to produce, proving
      // the suggestions are actually context-aware rather than identical
      // generic advice repeated for every unpaid promise.
      assert.ok(act1.suggestions.some(s => s.includes('Act 2 or 3')), 'Act 1 setup should point to Act 2/3');
      assert.ok(act2.suggestions.some(s => s.includes('Act 3 before the climax')), 'Act 2 setup should point to Act 3');
      assert.ok(act3.suggestions.some(s => s.includes('brief payoff in the resolution')), 'Act 3 setup should point to the resolution');

      // And the three suggestion sets must differ from each other -- if a
      // regression made every branch return the same array, this would fail
      // even though each individually still had non-empty suggestions.
      assert.notDeepEqual(act1.suggestions, act2.suggestions);
      assert.notDeepEqual(act2.suggestions, act3.suggestions);
    });

    it('provides suggestions for isolated scenes', async () => {
      const report = await runScriptDoctor(THREE_ACT_UNPAID);
      assert.ok(report.storyGraph);

      const isolatedDiagnostics = [
        ...report.storyGraph.diagnostics.critical,
        ...report.storyGraph.diagnostics.medium,
      ].filter(d => d.type === 'isolated-scene');
      // No connecting dialogue in this fixture -> isolated scenes are
      // guaranteed to exist (file header note (1)).
      assert.ok(isolatedDiagnostics.length > 0, 'fixture has no character dialogue, so scenes should be isolated');

      for (const diagnostic of isolatedDiagnostics) {
        assert.ok(diagnostic.suggestions.length >= 3, 'Isolated scene should have multiple suggestions');
        assert.ok(diagnostic.suggestions.some(s => s.includes('causal')), 'Should suggest causal connection');
      }
    });
  });

  describe('Strength Detection', () => {
    it('detects high closure rate as strength', async () => {
      // Fire path: 4 of 5 clues paid off (ratio >= 0.8) with 1 left unpaid.
      const fireReport = await runScriptDoctor(HIGH_CLOSURE);
      assert.ok(fireReport.storyGraph);
      assert.ok(fireReport.storyGraph.graph.promisePaymentRatio >= 0.8);
      assert.ok(fireReport.storyGraph.graph.unpaidPromises.length > 0);
      const highClosure = fireReport.storyGraph.diagnostics.strengths.find(s => s.type === 'high-closure');
      assert.ok(highClosure, 'ratio >= 0.8 with an unpaid promise remaining should fire high-closure');
      assert.equal(highClosure!.severity, 'strength');
      assert.ok(typeof highClosure!.message === 'string' && highClosure!.message.length > 0);

      // No-fire path, and a genuine gotcha worth pinning down: 100% closure
      // (every promise paid, zero unpaid) does NOT get high-closure credit,
      // because detectStrengths additionally requires
      // unpaidPromises.length > 0. A perfect script currently scores worse
      // on this specific strength than an 83%-closure one.
      const noFireReport = await runScriptDoctor(FULL_CLOSURE);
      assert.ok(noFireReport.storyGraph);
      assert.equal(noFireReport.storyGraph.graph.promisePaymentRatio, 1);
      assert.equal(noFireReport.storyGraph.graph.unpaidPromises.length, 0);
      assert.ok(!noFireReport.storyGraph.diagnostics.strengths.some(s => s.type === 'high-closure'));
    });

    it('detects strong escalation as strength', async () => {
      // Fire path: tension rises calm -> mild -> high across the three acts,
      // landing escalationMonotonicity at exactly 1.0.
      const fireReport = await runScriptDoctor(ASCENDING_TENSION);
      assert.ok(fireReport.storyGraph);
      assert.equal(fireReport.storyGraph.graph.escalationMonotonicity, 1);
      const escalationStrengths = fireReport.storyGraph.diagnostics.strengths.filter(s => s.type === 'strong-escalation');
      assert.equal(escalationStrengths.length, 1, 'Should detect strong escalation when monotonicity = 1.0');
      assert.equal(escalationStrengths[0].confidence, 0.95);

      // No-fire path: the same scenes in reverse order (tension falling)
      // land escalationMonotonicity at exactly 0 -- no strong-escalation.
      const noFireReport = await runScriptDoctor(DESCENDING_TENSION);
      assert.ok(noFireReport.storyGraph);
      assert.equal(noFireReport.storyGraph.graph.escalationMonotonicity, 0);
      assert.ok(!noFireReport.storyGraph.diagnostics.strengths.some(s => s.type === 'strong-escalation'));
    });

    it('includes confidence scores for strengths', async () => {
      // Fire path: STRONG_SCRIPT reliably produces multiple strengths.
      const withStrengths = await runScriptDoctor(STRONG_SCRIPT);
      assert.ok(withStrengths.storyGraph);
      assert.ok(withStrengths.storyGraph.diagnostics.strengths.length > 0, 'fixture should produce strengths');
      for (const strength of withStrengths.storyGraph.diagnostics.strengths) {
        assert.ok(typeof strength.confidence === 'number', 'Strength should have confidence score');
        assert.ok(strength.confidence! >= 0 && strength.confidence! <= 1, 'Confidence should be 0-1');
      }

      // No-fire path: GOOD_SCRIPT is deliberately built to have zero
      // strengths (fully closed, flat tension) -- confirms the confidence
      // check above wasn't vacuously true because strengths always exist.
      const withoutStrengths = await runScriptDoctor(GOOD_SCRIPT);
      assert.ok(withoutStrengths.storyGraph);
      assert.equal(withoutStrengths.storyGraph.diagnostics.strengths.length, 0);
    });
  });

  describe('Overall Assessment', () => {
    it('computes overall assessment based on issue distribution', async () => {
      // Four fixtures, four distinct real issue distributions, four distinct
      // documented branches of analyzeStoryGraph's overallAssessment logic
      // -- proves the mapping actually depends on the distribution rather
      // than returning a constant regardless of input.
      const [good, needsWork, strong, weak] = await Promise.all([
        runScriptDoctor(GOOD_SCRIPT),
        runScriptDoctor(NEEDS_WORK_SCRIPT),
        runScriptDoctor(STRONG_SCRIPT),
        runScriptDoctor(WEAK_SCRIPT),
      ]);
      assert.ok(good.storyGraph && needsWork.storyGraph && strong.storyGraph && weak.storyGraph);

      assert.equal(good.storyGraph.summary.criticalCount, 0);
      assert.equal(good.storyGraph.summary.overallAssessment, 'good');

      assert.equal(needsWork.storyGraph.summary.criticalCount, 1);
      assert.equal(needsWork.storyGraph.summary.overallAssessment, 'needs-work');

      assert.equal(strong.storyGraph.summary.criticalCount, 0);
      assert.ok(strong.storyGraph.summary.strengthCount >= 2);
      assert.equal(strong.storyGraph.summary.overallAssessment, 'strong');

      assert.ok(weak.storyGraph.summary.criticalCount > 2);
      assert.ok(weak.storyGraph.summary.totalIssues > 10);
      assert.equal(weak.storyGraph.summary.overallAssessment, 'weak');

      for (const assessment of [good, needsWork, strong, weak]) {
        assert.ok(['strong', 'good', 'needs-work', 'weak'].includes(assessment.storyGraph!.summary.overallAssessment));
      }
    });

    it('marks scripts with no critical issues and multiple strengths as strong', async () => {
      const report = await runScriptDoctor(STRONG_SCRIPT);
      assert.ok(report.storyGraph);

      const summary = report.storyGraph.summary;
      assert.equal(typeof summary.totalIssues, 'number');
      assert.equal(typeof summary.criticalCount, 'number');
      assert.equal(typeof summary.strengthCount, 'number');

      // Fire path: deterministic, not guarded -- this fixture is built to
      // have exactly these properties.
      assert.equal(summary.criticalCount, 0);
      assert.ok(summary.strengthCount >= 2, `expected >= 2 strengths, got ${summary.strengthCount}`);
      assert.equal(summary.overallAssessment, 'strong');

      // No-fire contrast: NEEDS_WORK_SCRIPT has 1 critical issue and no
      // strengths, and must NOT be marked strong -- proves the assessment
      // isn't defaulting to 'strong' whenever critical is merely low.
      const notStrong = await runScriptDoctor(NEEDS_WORK_SCRIPT);
      assert.ok(notStrong.storyGraph);
      assert.notEqual(notStrong.storyGraph.summary.overallAssessment, 'strong');
    });

    it('marks scripts with many critical issues as weak', async () => {
      const report = await runScriptDoctor(WEAK_SCRIPT);
      assert.ok(report.storyGraph);

      const summary = report.storyGraph.summary;
      // Fire path: fixture is built so criticalCount > 2 and totalIssues > 10
      // both actually hold (previously measured actuals were 1 and 1, so the
      // guarded assertion this replaces had never run).
      assert.ok(summary.criticalCount > 2, `expected > 2 critical issues, got ${summary.criticalCount}`);
      assert.ok(summary.totalIssues > 10, `expected > 10 total issues, got ${summary.totalIssues}`);
      assert.equal(summary.overallAssessment, 'weak');

      // No-fire contrast: GOOD_SCRIPT has 0 critical issues and must not be
      // marked weak.
      const notWeak = await runScriptDoctor(GOOD_SCRIPT);
      assert.ok(notWeak.storyGraph);
      assert.notEqual(notWeak.storyGraph.summary.overallAssessment, 'weak');
    });
  });

  describe('Diagnostic Structure', () => {
    it('all diagnostics have required fields', async () => {
      const [withIssues, withStrengths] = await Promise.all([
        runScriptDoctor(THREE_ACT_UNPAID),
        runScriptDoctor(STRONG_SCRIPT),
      ]);
      assert.ok(withIssues.storyGraph);
      assert.ok(withStrengths.storyGraph);

      const { critical, medium, low } = withIssues.storyGraph.diagnostics;
      const { strengths } = withStrengths.storyGraph.diagnostics;

      // Confirm every bucket actually has content before checking shape --
      // otherwise the loop below would pass vacuously on an empty array.
      assert.ok(critical.length > 0, 'fixture should produce critical diagnostics');
      assert.ok(medium.length > 0, 'fixture should produce medium diagnostics');
      assert.ok(low.length > 0, 'fixture should produce low diagnostics');
      assert.ok(strengths.length > 0, 'fixture should produce strength diagnostics');

      const allDiagnostics = [...critical, ...medium, ...low, ...strengths];
      for (const diagnostic of allDiagnostics) {
        assert.ok(diagnostic.severity, 'Should have severity');
        assert.ok(['critical', 'medium', 'low', 'strength'].includes(diagnostic.severity));
        assert.ok(diagnostic.type, 'Should have type');
        assert.ok(diagnostic.message, 'Should have message');
        assert.ok(diagnostic.impact, 'Should have impact');
        assert.ok(Array.isArray(diagnostic.suggestions), 'Should have suggestions array');
      }
    });

    it('maintains backward compatibility with graphHealth', async () => {
      const report = await runScriptDoctor(STRONG_SCRIPT);
      assert.ok(report.storyGraph);

      const { graph, graphHealth } = report.storyGraph;
      assert.equal(typeof graphHealth, 'number');
      assert.ok(graphHealth >= 0);
      assert.ok(graphHealth <= 100);

      // Recompute analyzeStoryGraph's documented composite formula from this
      // SAME report's own graph fields and compare against the field the
      // panel actually renders. This proves graphHealth is still wired to
      // the graph metrics (not hardcoded, not stale, not missing a term) --
      // a hardcoded or de-wired graphHealth would fail this equality even
      // though it would still pass the bounds checks above.
      const expected = Math.round(
        graph.promisePaymentRatio * 40 +
        graph.forwardEdgeRatio * 25 +
        graph.escalationMonotonicity * 20 +
        Math.max(0, (graph.arcCoherence + 1) / 2) * 15
      );
      assert.equal(graphHealth, expected);
    });
  });
});
