import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditTemporalConsistency,
  extractTemporalConstraints,
  detectTemporalContradictions,
  formatTemporalReport,
  type TemporalInterval,
  type TemporalConstraint,
  type AllenRelation,
} from './temporal-consistency.ts';
import type { ScreenplaySceneRecord } from '../screenplay/memory.ts';
import { analyzeFountainText } from './fountain-analyzer.ts';

// Test fixture factory: builds a minimal valid ScreenplaySceneRecord from
// just a slugline + free text. The real record type carries no raw scene
// prose (see temporal-consistency.ts's extractTemporalConstraints), so the
// text goes into dramaticTurn — the field that function's `sceneText`
// concatenation reads for keyword matching (FLASHBACK/CONTINUOUS/MEANWHILE/
// etc.), keeping these fixtures' original heading+text intent working.
function scene(heading: string, text: string): ScreenplaySceneRecord {
  return {
    commitId: 'test',
    sceneIdx: 0,
    slug: heading,
    purpose: 'establish_world',
    dramaticTurn: text,
    revelation: null,
    emotionalShift: 'neutral',
    visualBeats: [],
    dialogueHighlights: [],
    unresolvedClues: [],
    seededClueIds: [],
    payoffSetupIds: [],
    clockRaised: false,
    clockDelta: 0,
    suspenseDelta: 0,
    curiosityDelta: 0,
    createdAt: 0,
  };
}

describe('TRACE §13 Temporal-Consistency Detectors', () => {
  
  // ──────────────────────────────────────────────────────────────────────────
  // Extraction Tests
  // ──────────────────────────────────────────────────────────────────────────
  
  describe('extractTemporalConstraints', () => {
    it('creates sequential before constraints for normal scene progression', () => {
      const scenes: ScreenplaySceneRecord[] = [
        scene('INT. KITCHEN - DAY', 'John makes breakfast.'),
        scene('INT. OFFICE - DAY', 'John arrives at work.'),
        scene('INT. BAR - NIGHT', 'John drinks alone.'),
      ];
      
      const { intervals, constraints } = extractTemporalConstraints(scenes);
      
      assert.equal(intervals.length, 3, 'Should create one interval per scene');
      assert.equal(constraints.length, 2, 'Should create n-1 sequential constraints');
      
      assert.equal(constraints[0].intervalA, 'scene_0');
      assert.equal(constraints[0].intervalB, 'scene_1');
      assert.equal(constraints[0].relation, 'before');
      
      assert.equal(constraints[1].intervalA, 'scene_1');
      assert.equal(constraints[1].intervalB, 'scene_2');
      assert.equal(constraints[1].relation, 'before');
    });
    
    it('detects CONTINUOUS marker and creates meets constraint', () => {
      const scenes: ScreenplaySceneRecord[] = [
        scene('INT. HALLWAY - DAY', 'Mary runs.'),
        scene('EXT. STREET - CONTINUOUS', 'Mary keeps running.'),
      ];
      
      const { constraints } = extractTemporalConstraints(scenes);
      
      const continuous = constraints.find(c => c.confidence > 0.9);
      assert.ok(continuous, 'Should have high-confidence continuous constraint');
      assert.equal(continuous!.relation, 'meets', 'CONTINUOUS should create meets relation');
      assert.match(continuous!.evidence, /continuous/i);
    });
    
    it('detects FLASHBACK marker and creates before constraint to present', () => {
      const scenes: ScreenplaySceneRecord[] = [
        scene('INT. OFFICE - DAY', 'Present day.'),
        scene('INT. SCHOOL - DAY - FLASHBACK', "Young John's memory."),
      ];
      
      const { constraints } = extractTemporalConstraints(scenes);
      
      const flashback = constraints.find(c => c.evidence.includes('Flashback'));
      assert.ok(flashback, 'Should detect flashback');
      assert.equal(flashback!.intervalA, 'scene_1', 'Flashback scene should be before');
      assert.equal(flashback!.intervalB, 'scene_0', 'Flashback before present timeline');
      assert.equal(flashback!.relation, 'before');
      assert.ok(flashback!.confidence > 0.8, 'Flashback should be high confidence');
    });
    
    it('detects MEANWHILE marker and creates overlaps constraint', () => {
      const scenes: ScreenplaySceneRecord[] = [
        scene('INT. BANK - DAY', 'Heist in progress.'),
        scene('EXT. POLICE STATION - DAY', 'MEANWHILE, cops plan their response.'),
      ];
      
      const { constraints } = extractTemporalConstraints(scenes);
      
      const meanwhile = constraints.find(c => c.evidence.includes('Meanwhile'));
      assert.ok(meanwhile, 'Should detect meanwhile');
      assert.equal(meanwhile!.relation, 'overlaps', 'MEANWHILE should create overlaps relation');
    });
    
    it('detects age mentions and creates age intervals', () => {
      const scenes: ScreenplaySceneRecord[] = [
        scene('INT. HOUSE - DAY', 'SARAH, now 45, looks tired.'),
        scene('INT. SCHOOL - DAY (FLASHBACK)', 'SARAH, 12, laughs with friends.'),
      ];
      
      const { intervals } = extractTemporalConstraints(scenes);
      
      const ageIntervals = intervals.filter(i => i.id.includes('age'));
      assert.ok(ageIntervals.length >= 2, 'Should extract age intervals');
      assert.ok(ageIntervals.some(i => i.label.includes('45')));
      assert.ok(ageIntervals.some(i => i.label.includes('12')));
    });
    
    it('detects LATER markers and upgrades confidence', () => {
      const scenes: ScreenplaySceneRecord[] = [
        scene('INT. APARTMENT - DAY', 'Morning.'),
        scene('INT. APARTMENT - DAY - THREE YEARS LATER', 'Same place, older.'),
      ];
      
      const { constraints } = extractTemporalConstraints(scenes);
      
      const later = constraints.find(c => c.evidence.includes('YEARS LATER'));
      assert.ok(later, 'Should detect LATER marker');
      assert.ok(later!.confidence > 0.7, 'LATER should upgrade confidence');
    });
  });
  
  // ──────────────────────────────────────────────────────────────────────────
  // Contradiction Detection Tests
  // ──────────────────────────────────────────────────────────────────────────
  
  describe('detectTemporalContradictions', () => {
    it('detects simple transitive contradiction (A before B, B before C, C before A)', () => {
      const intervals: TemporalInterval[] = [
        { id: 'A', label: 'Event A', sceneIds: ['1'], evidence: [] },
        { id: 'B', label: 'Event B', sceneIds: ['2'], evidence: [] },
        { id: 'C', label: 'Event C', sceneIds: ['3'], evidence: [] },
      ];
      
      const constraints: TemporalConstraint[] = [
        { intervalA: 'A', intervalB: 'B', relation: 'before', confidence: 1.0, sourceSceneId: '1', evidence: 'Explicit' },
        { intervalA: 'B', intervalB: 'C', relation: 'before', confidence: 1.0, sourceSceneId: '2', evidence: 'Explicit' },
        { intervalA: 'C', intervalB: 'A', relation: 'before', confidence: 1.0, sourceSceneId: '3', evidence: 'Explicit' },
      ];
      
      const contradictions = detectTemporalContradictions(intervals, constraints);
      
      assert.ok(contradictions.length > 0, 'Should detect cyclic contradiction');
      assert.ok(contradictions.some(c => c.type === 'transitive_violation'), 'Should flag as transitive violation');
    });
    
    it('detects explicit conflict (A before B AND A after B)', () => {
      const intervals: TemporalInterval[] = [
        { id: 'A', label: 'Event A', sceneIds: ['1'], evidence: [] },
        { id: 'B', label: 'Event B', sceneIds: ['2'], evidence: [] },
      ];
      
      const constraints: TemporalConstraint[] = [
        { intervalA: 'A', intervalB: 'B', relation: 'before', confidence: 1.0, sourceSceneId: '1', evidence: 'First claim' },
        { intervalA: 'A', intervalB: 'B', relation: 'after', confidence: 1.0, sourceSceneId: '2', evidence: 'Second claim' },
      ];
      
      const contradictions = detectTemporalContradictions(intervals, constraints);
      
      assert.ok(contradictions.length > 0, 'Should detect explicit conflict');
      assert.equal(contradictions[0].type, 'explicit_conflict');
      assert.equal(contradictions[0].severity, 'blocker');
    });
    
    it('allows consistent constraints to propagate', () => {
      const intervals: TemporalInterval[] = [
        { id: 'A', label: 'Event A', sceneIds: ['1'], evidence: [] },
        { id: 'B', label: 'Event B', sceneIds: ['2'], evidence: [] },
        { id: 'C', label: 'Event C', sceneIds: ['3'], evidence: [] },
      ];
      
      const constraints: TemporalConstraint[] = [
        { intervalA: 'A', intervalB: 'B', relation: 'before', confidence: 1.0, sourceSceneId: '1', evidence: 'A before B' },
        { intervalA: 'B', intervalB: 'C', relation: 'before', confidence: 1.0, sourceSceneId: '2', evidence: 'B before C' },
        // No constraint on A→C, should be inferred
      ];
      
      const contradictions = detectTemporalContradictions(intervals, constraints);
      
      assert.equal(contradictions.length, 0, 'Consistent constraints should not produce contradictions');
    });
    
    it('detects impossible flashback ordering', () => {
      const intervals: TemporalInterval[] = [
        { id: 'present', label: 'Present Day', sceneIds: ['1'], evidence: [] },
        { id: 'flashback', label: 'Flashback', sceneIds: ['2'], evidence: [] },
      ];
      
      const constraints: TemporalConstraint[] = [
        { intervalA: 'present', intervalB: 'flashback', relation: 'before', confidence: 0.9, sourceSceneId: '1', evidence: 'Sequential' },
        { intervalA: 'flashback', intervalB: 'present', relation: 'before', confidence: 0.95, sourceSceneId: '2', evidence: 'Flashback marker' },
      ];
      
      const contradictions = detectTemporalContradictions(intervals, constraints);

      // BEHAVIOURAL (2026-09-02 vacuous-test sweep): `length > 0` fires for a
      // contradiction about ANY pair of intervals — including one the module
      // invented. Pin what it points AT: the two intervals actually in
      // conflict, the scene the losing constraint came from, and a blocking
      // severity. A detector that reported a contradiction between the wrong
      // pair would have passed the old assertion.
      assert.equal(contradictions.length, 1, 'exactly one conflict: present↔flashback');
      const flashbackConflict = contradictions[0]!;
      assert.deepEqual(
        [...flashbackConflict.intervals].sort(),
        ['flashback', 'present'],
        'the contradiction must name the two intervals that actually conflict',
      );
      assert.equal(flashbackConflict.type, 'explicit_conflict');
      assert.equal(flashbackConflict.severity, 'blocker');
      assert.deepEqual(flashbackConflict.affectedScenes, ['2'],
        'the writer is pointed at scene 2 — the flashback marker that contradicts the established order');

      // Negative half: drop the contradicting second constraint and the same
      // intervals produce nothing. Without this, the assertions above could be
      // satisfied by a detector that flags every pair it is given.
      const consistentOnly = detectTemporalContradictions(intervals, [constraints[0]!]);
      assert.equal(consistentOnly.length, 0,
        'a single non-contradictory ordering constraint must produce no contradiction');
    });
  });
  
  // ──────────────────────────────────────────────────────────────────────────
  // Integration Tests
  // ──────────────────────────────────────────────────────────────────────────
  
  describe('auditTemporalConsistency (end-to-end)', () => {
    it('passes clean linear timeline', () => {
      const scenes: ScreenplaySceneRecord[] = [
        scene('INT. HOUSE - MORNING', 'Wake up.'),
        scene('INT. OFFICE - DAY', 'Work.'),
        scene('INT. BAR - NIGHT', 'Drinks.'),
      ];
      
      const contradictions = auditTemporalConsistency(scenes);
      
      assert.equal(contradictions.length, 0, 'Clean timeline should have no contradictions');
    });
    
    it('detects flashback paradox in real screenplay context', () => {
      const scenes: ScreenplaySceneRecord[] = [
        scene('INT. COURTROOM - DAY', 'Trial is underway. Judge presiding.'),
        scene('EXT. CRIME SCENE - NIGHT - FLASHBACK', 'The murder happens.'),
        scene('INT. COURTROOM - DAY - CONTINUOUS', 'Back in court, immediately.'),
      ];
      
      const contradictions = auditTemporalConsistency(scenes);

      // Scene 1 is FLASHBACK (before scene 0); scene 2 is CONTINUOUS with
      // scene 1 (meets scene 1). This is an entirely ordinary screenplay
      // technique (a courtroom-frames-a-flashback structure), not a craft
      // error, and should read as consistent -- 2026-08-03 audit: this used
      // to be asserted only as "returns an array" because the FLASHBACK
      // branch left the default sequential chain standing through the
      // flashback scene, which transitively contradicted the flashback
      // constraint and fired 2 BLOCKER contradictions on exactly this
      // fixture. Fixed (see temporal-consistency.ts's FLASHBACK branch and
      // its 2026-08-03 header note) by splicing out the weak default edges
      // touching the flashback scene, mirroring what CONTINUOUS/MEANWHILE
      // already did. Now asserts the real invariant instead of hedging.
      assert.equal(contradictions.length, 0, 'an ordinary flashback-then-continuous structure is not a timeline error');
    });
    
    it('handles CONTINUOUS correctly (no contradiction)', () => {
      const scenes: ScreenplaySceneRecord[] = [
        scene('INT. HALLWAY - DAY', 'Running.'),
        scene('EXT. STREET - CONTINUOUS', 'Still running.'),
        scene('INT. BUILDING - DAY', 'Arrives.'),
      ];
      
      const contradictions = auditTemporalConsistency(scenes);
      
      assert.equal(contradictions.length, 0, 'CONTINUOUS should not create contradiction');
    });
    
    it('handles MEANWHILE correctly (parallel timelines)', () => {
      const scenes: ScreenplaySceneRecord[] = [
        scene('INT. BANK - DAY', 'Robbery starts.'),
        scene('INT. POLICE STATION - DAY', 'MEANWHILE, cops get the call.'),
        scene('EXT. BANK - DAY', 'Cops arrive.'),
      ];
      
      const contradictions = auditTemporalConsistency(scenes);
      
      // Scene 0 overlaps scene 1 (parallel)
      // Scene 1 before scene 2
      // Scene 0 before scene 2
      // Should compose consistently
      assert.equal(contradictions.length, 0, 'MEANWHILE overlaps should be consistent');
    });

    it('an ordinary single flashback in a longer script does not cascade into contradictions on unrelated scene pairs (regression, 2026-08-03)', () => {
      // Realistic shape: 10 plain scenes, exactly one FLASHBACK in the
      // middle, nothing else unusual -- about as common as screenplay
      // structure gets. Before the FLASHBACK-branch fix (see this file's
      // 2026-08-03 header note), this fixture produced 10 BLOCKER
      // contradictions, including between scene pairs with zero
      // relationship to the flashback (e.g. scene_0/scene_1).
      const scenes: ScreenplaySceneRecord[] = [
        scene('INT. HOUSE - DAY', 'Wake up.'),
        scene('INT. KITCHEN - DAY', 'Breakfast.'),
        scene('INT. CAR - DAY', 'Drive to work.'),
        scene('INT. OFFICE - DAY', 'Meeting.'),
        scene('INT. OFFICE - DAY - FLASHBACK', 'Remembers childhood.'),
        scene('INT. OFFICE - DAY', 'Back to work.'),
        scene('INT. BAR - NIGHT', 'Drinks with coworkers.'),
        scene('EXT. STREET - NIGHT', 'Walks home.'),
        scene('INT. APARTMENT - NIGHT', 'Reflects.'),
        scene('INT. BEDROOM - NIGHT', 'Sleeps.'),
      ];

      const contradictions = auditTemporalConsistency(scenes);

      assert.equal(contradictions.length, 0, 'one ordinary flashback should not manufacture contradictions elsewhere in the script');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Order-sensitivity (2026-08-03 audit finding)
  //
  // Nearly every other signal in server/nvm/analyze/ is a pure function of
  // scene CONTENT and is therefore provably invariant under SCENE_SHUFFLE
  // (see doctor.ts's own comments: rule-channel AUC ~0.076, "with scene
  // count held constant the doctor cannot detect reordering at all"). This
  // module's constraint extraction is instead a direct function of scene
  // ARRAY POSITION (idx) — reordering the SAME scenes can change the
  // verdict, which is the property the P1 structural gap is missing. This
  // is a qualitative proof the mechanism CAN separate orderings, not a
  // measured AUC (see the file header for the broader seeded-shuffle probe
  // and what would be needed to promote this to a scored signal).
  // ──────────────────────────────────────────────────────────────────────────
  describe('order-sensitivity', () => {
    it('reordering the same three scenes changes the contradiction count', () => {
      const courtroom = scene('INT. COURTROOM - DAY', 'Trial is underway. Judge presiding.');
      const flashback = scene('EXT. CRIME SCENE - NIGHT - FLASHBACK', 'The murder happens.');
      const continuous = scene('INT. COURTROOM - DAY - CONTINUOUS', 'Back in court, immediately.');

      // Discourse order matching how a writer would actually lay this out:
      // present -> flashback -> back to present. Consistent.
      const asWritten = auditTemporalConsistency([courtroom, flashback, continuous]);
      assert.equal(asWritten.length, 0, 'the intended discourse order is a consistent timeline');

      // The SAME three scenes, reordered so the flashback-marked scene
      // lands at position 0: its "before scene_0" constraint is now
      // self-referential (scene_0 before scene_0), an explicit conflict.
      // Same content, same scenes, different order -> different verdict.
      const reordered = auditTemporalConsistency([flashback, courtroom, continuous]);
      assert.equal(reordered.length, 1, 'moving the flashback scene to position 0 makes the same content report a contradiction');
      assert.equal(reordered[0].type, 'explicit_conflict');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // CONTINUOUS/MOMENTS LATER/SAME TIME chain false positives (regression,
  // 2026-08-03)
  //
  // BUG: a run of consecutive scene headings carrying CONTINUOUS/MOMENTS
  // LATER/SAME TIME -- ordinary, correct screenwriting (a character moving
  // through connected spaces in unbroken time) -- used to produce spurious
  // "transitive_violation" contradictions at severity BLOCKER, one per
  // additional scene past the first in the run (run length - 1: 0, 1, 2 for
  // run lengths 1, 2, 3). Measured impact: 5 of 30 real scripts (16.7%)
  // flagged at least one contradiction on unmodified, correct text, entirely
  // from this bug (docs/p1-benchmark/TEMPORAL_ORDER_SENSITIVITY_2026-08-03.md).
  //
  // ROOT CAUSE (two layered defects, both required for the fix; see doc
  // comments on narrowPairRelations and COMPOSITION_TABLE above for the
  // full mechanism):
  //   1. detectTemporalContradictions' constraint matrix only ever wrote the
  //      FORWARD cell of a pair (A->B) on every narrowing -- explicit
  //      constraint application and the Floyd-Warshall-style composition
  //      loop alike -- and never kept the BACKWARD cell (B->A) in sync as
  //      its true inverse, breaking the standard Allen-algebra path-
  //      consistency invariant that N(i,j) = inverse(N(j,i)) must hold after
  //      every update. The backward cell for a consecutive-meets pair then
  //      drifted to whatever unrelated composition paths happened to touch
  //      it, and the pairwise mirror-consistency check (added to catch
  //      genuine direct 2-cycles) flagged the resulting divergence as a
  //      contradiction even though the timeline was never actually broken.
  //   2. Separately, COMPOSITION_TABLE itself was wrong on 81 of 169 entries
  //      (48%) -- e.g. before∘met-by was hardcoded to just ['before'] when
  //      it is actually {before, during, meets, overlaps, starts} -- so once
  //      the matrix was made symmetric (fix #1), a 2-edge 'meets' chain
  //      (exactly what two consecutive CONTINUOUS scenes produce) composed
  //      'before' against the newly-synced backward 'met-by' cell, hit the
  //      too-narrow table entry, and found 'meets' excluded even though the
  //      direct CONTINUOUS assertion on that same pair held it. Fixing only
  //      #1 or only #2 would have left a false positive on this exact
  //      fixture; both were required.
  //
  // Allen composition of meets∘meets is 'before', which was and remains
  // algebraically correct and consistent on its own -- the defect was
  // structural (an unmaintained invariant) plus a second, independent data
  // error in the table, not an error in that specific composition.
  // ──────────────────────────────────────────────────────────────────────────
  describe('CONTINUOUS/MOMENTS LATER/SAME TIME chains (regression, 2026-08-03)', () => {
    it('a single CONTINUOUS scene produces no contradiction', () => {
      const scenes: ScreenplaySceneRecord[] = [
        scene('INT. KITCHEN - DAY', 'Cooking.'),
        scene('INT. PANTRY - CONTINUOUS', 'Grabs flour.'),
      ];
      assert.equal(auditTemporalConsistency(scenes).length, 0, '1 CONTINUOUS scene: 0 contradictions expected');
    });

    it('two consecutive CONTINUOUS scenes produce no contradiction (was 1 false positive before the fix)', () => {
      const scenes: ScreenplaySceneRecord[] = [
        scene('INT. KITCHEN - DAY', 'Cooking.'),
        scene('INT. PANTRY - CONTINUOUS', 'Grabs flour.'),
        scene('INT. HALL - CONTINUOUS', 'Carries it through.'),
      ];
      assert.equal(auditTemporalConsistency(scenes).length, 0, '2 consecutive CONTINUOUS scenes: 0 contradictions expected (was 1)');
    });

    it('three consecutive CONTINUOUS scenes produce no contradiction (was 2 false positives before the fix)', () => {
      const scenes: ScreenplaySceneRecord[] = [
        scene('INT. KITCHEN - DAY', 'Cooking.'),
        scene('INT. PANTRY - CONTINUOUS', 'Grabs flour.'),
        scene('INT. HALL - CONTINUOUS', 'Carries it through.'),
        scene('INT. STAIRS - CONTINUOUS', 'Heads upstairs.'),
      ];
      assert.equal(auditTemporalConsistency(scenes).length, 0, '3 consecutive CONTINUOUS scenes: 0 contradictions expected (was 2)');
    });

    it('CONTINUOUS followed by a DAYS LATER jump produces no contradiction', () => {
      const scenes: ScreenplaySceneRecord[] = [
        scene('INT. KITCHEN - DAY', 'Cooking.'),
        scene('INT. PANTRY - CONTINUOUS', 'Grabs flour.'),
        scene('INT. HALL - DAY - THREE DAYS LATER', 'Different day entirely.'),
      ];
      assert.equal(auditTemporalConsistency(scenes).length, 0, 'CONTINUOUS then DAYS LATER: 0 contradictions expected');
    });

    it('a longer run (five consecutive CONTINUOUS scenes) still produces no contradiction', () => {
      // Not part of the reported repro table, but proves the fix holds as
      // the chain grows rather than merely covering the specific lengths
      // that were manually measured.
      const scenes: ScreenplaySceneRecord[] = [
        scene('INT. KITCHEN - DAY', 'Cooking.'),
        scene('INT. PANTRY - CONTINUOUS', 'A.'),
        scene('INT. HALL - CONTINUOUS', 'B.'),
        scene('INT. STAIRS - CONTINUOUS', 'C.'),
        scene('INT. LANDING - CONTINUOUS', 'D.'),
        scene('INT. BEDROOM - CONTINUOUS', 'E.'),
      ];
      assert.equal(auditTemporalConsistency(scenes).length, 0, '5 consecutive CONTINUOUS scenes: 0 contradictions expected');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Genuine contradictions must still fire (2026-08-03 fix must not have
  // silenced real detection -- a fix that merely makes the module quiet
  // would pass the false-positive tests above while destroying its purpose)
  // ──────────────────────────────────────────────────────────────────────────
  describe('genuine contradictions still fire after the 2026-08-03 fix', () => {
    it('detects a real impossible meets-cycle (A meets B, B meets C, C meets A)', () => {
      // Three scenes each claiming to immediately abut the next, wrapping
      // back around, is genuinely impossible -- unlike the CONTINUOUS-chain
      // shape above (a simple LINEAR run), this is a true cycle and must
      // still be flagged.
      const intervals: TemporalInterval[] = [
        { id: 'A', label: 'Scene A', sceneIds: ['0'], evidence: [] },
        { id: 'B', label: 'Scene B', sceneIds: ['1'], evidence: [] },
        { id: 'C', label: 'Scene C', sceneIds: ['2'], evidence: [] },
      ];
      const constraints: TemporalConstraint[] = [
        { intervalA: 'A', intervalB: 'B', relation: 'meets', confidence: 1.0, sourceSceneId: '0', evidence: 'A meets B' },
        { intervalA: 'B', intervalB: 'C', relation: 'meets', confidence: 1.0, sourceSceneId: '1', evidence: 'B meets C' },
        { intervalA: 'C', intervalB: 'A', relation: 'meets', confidence: 1.0, sourceSceneId: '2', evidence: 'C meets A' },
      ];

      const contradictions = detectTemporalContradictions(intervals, constraints);

      // BEHAVIOURAL (2026-09-02 vacuous-test sweep): the point of this test is
      // that the 2026-08-03 false-positive fix did not silence REAL cycles, and
      // `length > 0` cannot tell a real cycle report from an unrelated one. Pin
      // the cycle's membership and the scenes the writer is sent to.
      assert.ok(contradictions.length > 0,
        'a genuine cyclic meets-chain must still be flagged, not silenced by the false-positive fix');
      const cycle = contradictions[0]!;
      assert.deepEqual([...cycle.intervals].sort(), ['A', 'B', 'C'],
        'the flagged contradiction must span all three intervals in the cycle');
      assert.equal(cycle.severity, 'blocker');
      assert.ok(cycle.affectedScenes.length > 0 && cycle.affectedScenes.every((id) => ['0', '1', '2'].includes(id)),
        `affected scenes must come from the cycle, got ${JSON.stringify(cycle.affectedScenes)}`);
      assert.ok(/impossible ordering/i.test(cycle.explanation),
        `explanation should say why it is impossible, got: ${cycle.explanation}`);

      // Negative half: break the cycle (C meets A → A meets C is dropped) and
      // the same three intervals are consistent. A LINEAR meets-chain is the
      // exact shape the 2026-08-03 fix stopped flagging.
      const linear = detectTemporalContradictions(intervals, constraints.slice(0, 2));
      assert.equal(linear.length, 0,
        'a linear A-meets-B-meets-C chain is consistent — flagging it is the regression the fix removed');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Report Formatting Tests
  // ──────────────────────────────────────────────────────────────────────────
  
  describe('formatTemporalReport', () => {
    it('returns success message for no contradictions', () => {
      const report = formatTemporalReport([]);
      
      assert.match(report, /no temporal contradictions/i);
      assert.match(report, /consistent/i);
    });
    
    it('formats contradictions with severity and explanation', () => {
      const contradictions = [{
        type: 'transitive_violation' as const,
        severity: 'blocker' as const,
        intervals: ['A', 'B', 'C'],
        constraints: [],
        explanation: 'Test contradiction',
        affectedScenes: ['1', '2'],
      }];
      
      const report = formatTemporalReport(contradictions);
      
      assert.match(report, /1 temporal contradiction/i);
      assert.match(report, /BLOCKER/);
      assert.match(report, /transitive violation/);
      assert.match(report, /Test contradiction/);
      assert.match(report, /Affected scenes: 1, 2/);
    });
    
    it('pluralizes correctly for multiple contradictions', () => {
      const contradictions = [
        {
          type: 'explicit_conflict' as const,
          severity: 'blocker' as const,
          intervals: ['A', 'B'],
          constraints: [],
          explanation: 'First',
          affectedScenes: ['1'],
        },
        {
          type: 'cyclic_dependency' as const,
          severity: 'major' as const,
          intervals: ['C'],
          constraints: [],
          explanation: 'Second',
          affectedScenes: ['2'],
        },
      ];
      
      const report = formatTemporalReport(contradictions);
      
      assert.match(report, /2 temporal contradictions/);
      assert.match(report, /1\. \[BLOCKER\]/);
      assert.match(report, /2\. \[MAJOR\]/);
    });
  });
  
  // ──────────────────────────────────────────────────────────────────────────
  // Allen Algebra Core Tests
  // ──────────────────────────────────────────────────────────────────────────
  
  describe('Allen Interval Algebra properties', () => {
    it('verifies all 13 relations are mutually exclusive', () => {
      const allRelations: AllenRelation[] = [
        'before', 'meets', 'overlaps', 'starts', 'during', 'finishes', 'equals',
        'after', 'met-by', 'overlapped-by', 'started-by', 'contains', 'finished-by'
      ];
      
      assert.equal(allRelations.length, 13, 'Allen Algebra has exactly 13 relations');
      assert.equal(new Set(allRelations).size, 13, 'All relations are unique');
    });
    
    it('handles identity correctly (interval equals itself)', () => {
      const intervals: TemporalInterval[] = [
        { id: 'A', label: 'Event A', sceneIds: ['1'], evidence: [] },
      ];
      
      const contradictions = detectTemporalContradictions(intervals, []);
      
      assert.equal(contradictions.length, 0, 'Single interval should be consistent with itself');
    });
    
    it('detects minimum cycle (2 intervals)', () => {
      const intervals: TemporalInterval[] = [
        { id: 'A', label: 'Event A', sceneIds: ['1'], evidence: [] },
        { id: 'B', label: 'Event B', sceneIds: ['2'], evidence: [] },
      ];
      
      const constraints: TemporalConstraint[] = [
        { intervalA: 'A', intervalB: 'B', relation: 'before', confidence: 1.0, sourceSceneId: '1', evidence: 'A before B' },
        { intervalA: 'B', intervalB: 'A', relation: 'before', confidence: 1.0, sourceSceneId: '2', evidence: 'B before A' },
      ];
      
      const contradictions = detectTemporalContradictions(intervals, constraints);

      // BEHAVIOURAL (2026-09-02 vacuous-test sweep): assert the 2-cycle is
      // reported against A and B specifically, and that reversing only one of
      // the two constraints removes it — so the test distinguishes "detects the
      // cycle" from "reports something".
      assert.equal(contradictions.length, 1, 'the minimum cycle produces exactly one contradiction');
      assert.deepEqual([...contradictions[0]!.intervals].sort(), ['A', 'B']);
      assert.equal(contradictions[0]!.severity, 'blocker');

      const acyclic = detectTemporalContradictions(intervals, [constraints[0]!]);
      assert.equal(acyclic.length, 0, 'A before B alone is not a cycle');
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Non-linear-timeline fixture audits (2026-08-03 addendum)
//
// GAP THIS CLOSES: docs/p1-benchmark/TEMPORAL_ORDER_SENSITIVITY_2026-08-03.md
// measured this module against 30 real/calibration scripts and found ZERO of
// them used FLASHBACK or MEANWHILE in any scene heading -- so the module's
// stated semantic purpose (detecting a violated non-linear timeline) was
// never exercised by that probe at all. tests/fixtures/nonlinear-timeline/
// supplies 6 short, competently-written Fountain screenplays that DO use
// those markers (2 flashback-framed, 2 parallel-action, 2 mixed
// flashback+LATER), each built ONLY from markers extractTemporalConstraints()
// actually reads (heading-only FLASHBACK / CONTINUOUS|MOMENTS LATER|SAME
// TIME; MEANWHILE|SIMULTANEOUSLY|AT THE SAME TIME and a quantified LATER
// pattern checked against heading + extracted narrative fields).
//
// These assertions lock in the false-positive property (0 contradictions on
// unmodified text) on material that finally uses the markers -- they do NOT
// establish order-sensitivity or recall on real corpus writing; see
// scripts/probe-temporal-nonlinear.mjs and this suite's own honesty-bar
// framing in TEMPORAL_ORDER_SENSITIVITY_2026-08-03.md's addendum for what
// this evidence is and is not.
// ────────────────────────────────────────────────────────────────────────────
describe('nonlinear-timeline fixtures audit clean (2026-08-03 addendum)', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const FIXTURES_DIR = path.resolve(__dirname, '..', '..', '..', 'tests', 'fixtures', 'nonlinear-timeline');
  const fixtureFiles = fs.readdirSync(FIXTURES_DIR).filter(f => f.endsWith('.fountain')).sort();

  // Guard against a silently-empty fixture directory making this whole
  // describe block a no-op pass -- the six fixtures are the point.
  it('finds all 6 expected fixture files', () => {
    assert.equal(fixtureFiles.length, 6, `expected 6 .fountain fixtures in ${FIXTURES_DIR}, found ${fixtureFiles.length}: ${fixtureFiles.join(', ')}`);
  });

  for (const file of fixtureFiles) {
    it(`${file}: audits to 0 temporal contradictions on unmodified text`, () => {
      const fountainText = fs.readFileSync(path.join(FIXTURES_DIR, file), 'utf-8');
      const analysis = analyzeFountainText(fountainText);
      assert.ok(analysis.records.length >= 10 && analysis.records.length <= 16,
        `${file}: expected 10-16 scenes per the task's fixture spec, got ${analysis.records.length}`);

      const contradictions = auditTemporalConsistency(analysis.records);
      const explanations = contradictions.map(c => `[${c.severity}] ${c.type}: ${c.explanation}`).join('\n  ');
      assert.equal(contradictions.length, 0,
        `${file}: expected 0 contradictions on this temporally-coherent fixture, got ${contradictions.length}:\n  ${explanations}`);
    });
  }
});
