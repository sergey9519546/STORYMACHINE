/**
 * TRACE §13 Integration with Doctor
 * 
 * Hooks temporal-consistency detectors into the Script Doctor analysis pipeline.
 * Produces findings that show up in coverage reports.
 */

import type { ScreenplaySceneRecord } from '../screenplay/memory.ts';
import { auditTemporalConsistency, formatTemporalReport } from './temporal-consistency.ts';
import type { TemporalContradiction, TemporalConstraint } from './temporal-consistency.ts';

/** Shape of a temporal-audit finding, formatted to slot alongside the Script
 *  Doctor pipeline's own per-rule issues. No such export ever existed on
 *  doctor.ts (this module's original `import type { DoctorIssue } from
 *  './doctor.ts'` never resolved) — defined locally from the fields this
 *  module actually produces below, since nothing else in the codebase
 *  consumes this shape. */
export interface DoctorIssue {
  ruleId: string;
  ruleName: string;
  sceneIndex: number;
  weight: number;
  message: string;
  template: string;
  category: string;
  pass: string;
  metadata: {
    contradictionType: TemporalContradiction['type'];
    severity: TemporalContradiction['severity'];
    intervals: TemporalContradiction['intervals'];
    affectedScenes: TemporalContradiction['affectedScenes'];
    constraintCount: number;
    evidence: Array<{
      intervalA: TemporalConstraint['intervalA'];
      intervalB: TemporalConstraint['intervalB'];
      relation: TemporalConstraint['relation'];
      confidence: TemporalConstraint['confidence'];
      source: TemporalConstraint['evidence'];
    }>;
  };
}

/**
 * Convert TRACE temporal contradictions to Doctor issues.
 * 
 * This makes temporal problems show up in the Script Doctor report
 * alongside other structural findings.
 */
export function temporalConsistencyToDoctorIssues(
  scenes: ScreenplaySceneRecord[]
): DoctorIssue[] {
  const contradictions = auditTemporalConsistency(scenes);
  const issues: DoctorIssue[] = [];
  
  contradictions.forEach((c, idx) => {
    // Map severity to doctor weight
    const weight = c.severity === 'blocker' ? 4.0 : c.severity === 'major' ? 2.0 : 1.0;
    
    // Map type to rule ID
    const ruleId = `TEMPORAL_${c.type.toUpperCase()}`;
    
    // Determine which scenes to attach the issue to
    const sceneIndices = c.affectedScenes.map(s => parseInt(s, 10)).filter(n => !isNaN(n));
    const primaryScene = sceneIndices[0] ?? 0;
    
    issues.push({
      ruleId,
      ruleName: `Temporal Consistency: ${c.type.replace(/_/g, ' ')}`,
      sceneIndex: primaryScene,
      weight,
      message: c.explanation,
      template: 'temporal',
      category: 'structure',
      pass: 'temporal-audit',
      
      // TRACE §13 diagnostic metadata
      metadata: {
        contradictionType: c.type,
        severity: c.severity,
        intervals: c.intervals,
        affectedScenes: c.affectedScenes,
        constraintCount: c.constraints.length,
        evidence: c.constraints.map(con => ({
          intervalA: con.intervalA,
          intervalB: con.intervalB,
          relation: con.relation,
          confidence: con.confidence,
          source: con.evidence,
        })),
      },
    });
  });
  
  return issues;
}

/**
 * Generate standalone temporal audit report (for debugging/analysis).
 */
export function generateTemporalReport(scenes: ScreenplaySceneRecord[]): string {
  const contradictions = auditTemporalConsistency(scenes);
  const report = formatTemporalReport(contradictions);
  
  return `
# TRACE §13 Temporal Consistency Audit

**Screenplay Scenes:** ${scenes.length}
**Contradictions Found:** ${contradictions.length}

${report}

---

## Detection Method

This audit uses Allen's Interval Algebra (13 mutually-exclusive temporal relations)
with O(n³) constraint propagation to detect transitive temporal contradictions.

Verified implementation per RESEARCH_INTEGRATION_2026-07-11.md §13.2
`.trim();
}
