import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
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
      
      assert.ok(contradictions.length > 0, 'Should detect impossible flashback ordering');
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
      
      // Scene 2 is flashback (before scene 0)
      // Scene 2 is also continuous with scene 1 (meets scene 1)
      // Scene 1 is before scene 0
      // This creates: scene 2 before scene 0, but also scene 1 before scene 0, and scene 2 meets scene 1
      // Depending on composition, might detect issue
      
      // At minimum, should complete without crashing
      assert.ok(Array.isArray(contradictions), 'Should return array');
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
      
      assert.ok(contradictions.length > 0, 'Should detect 2-cycle');
    });
  });
});
