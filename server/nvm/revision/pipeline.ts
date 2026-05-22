// Wave 39 — The 12-Pass Revision Pipeline
// Runs the compiled Fountain screenplay through 12 sequential revision passes.
// Each pass diagnoses a layer, marks weak spots, and rewrites (LLM or stub).
// Approved spans are threaded through every pass unchanged.
//
// Passes (in order):
//  1. structure        — act balance, midpoint pressure, reversal density
//  2. causality        — causal logic breaks, emotional monotony
//  3. intention        — character goal legibility, climactic choice
//  4. belief           — deception setup, exposition dumps
//  5. conflict         — escalation, clock detonation
//  6. character-arc    — transformation cause, revelation presence
//  7. dialogue         — on-the-nose, as-you-know-Bob, monologue
//  8. rhythm           — sentence length variety, run-ons, staccato
//  9. pacing           — scene length balance, act-level proportion
// 10. originality      — clichés, generic descriptors
// 11. payoff           — orphan clues, payoff timing
// 12. voice            — tonal consistency, register mismatch

import type { CompiledScreenplay, SceneAnnotation } from '../screenplay/compile.ts';
import type { StructureState } from '../screenplay/structure.ts';
import type { ScreenplaySceneRecord } from '../screenplay/memory.ts';
import type { PassResult, ApprovedSpan } from './passes/types.ts';

import { structurePass }    from './passes/structure.ts';
import { causalityPass }    from './passes/causality.ts';
import { intentionPass }    from './passes/intention.ts';
import { beliefPass }       from './passes/belief.ts';
import { conflictPass }     from './passes/conflict.ts';
import { characterArcPass } from './passes/character-arc.ts';
import { dialoguePass }     from './passes/dialogue.ts';
import { rhythmPass }       from './passes/rhythm.ts';
import { pacingPass }       from './passes/pacing.ts';
import { originalityPass }  from './passes/originality.ts';
import { payoffPass }       from './passes/payoff.ts';
import { voicePass }        from './passes/voice.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RevisionResult {
  /** Results from every pass in order */
  passResults: PassResult[];
  /** Final fountain text after all 12 passes */
  finalFountain: string;
  /** The original compiled fountain (before any revision) */
  originalFountain: string;
  /** Total issues found across all passes */
  totalIssuesFound: number;
  /** How many passes actually changed the text */
  passesWithChanges: number;
  /** ISO timestamp */
  completedAt: number;
}

// ── Pipeline ──────────────────────────────────────────────────────────────────

/**
 * Run all 12 revision passes over a compiled screenplay.
 *
 * Each pass receives the fountain text as modified by all prior passes.
 * Approved spans are guaranteed-preserved (the LLM rewriter is instructed
 * to leave them unchanged; in stub mode nothing changes anyway).
 *
 * @param compiled      Output of compileScreenplay()
 * @param records       Screenplay memory records from buildScreenplayMemory()
 * @param structure     Current structural state from analyzeStructure()
 * @param approvedSpans Spans the author has locked — never changed by any pass
 */
export async function runRevisionPipeline(
  compiled: CompiledScreenplay,
  records: ScreenplaySceneRecord[],
  structure: StructureState,
  approvedSpans: ApprovedSpan[] = [],
): Promise<RevisionResult> {
  const originalFountain = compiled.fountain;
  const { annotations } = compiled;

  // The passes run sequentially; each receives the output of the prior pass.
  const passes = [
    structurePass,
    causalityPass,
    intentionPass,
    beliefPass,
    conflictPass,
    characterArcPass,
    dialoguePass,
    rhythmPass,
    pacingPass,
    originalityPass,
    payoffPass,
    voicePass,
  ];

  const passResults: PassResult[] = [];
  let currentFountain = originalFountain;

  for (const pass of passes) {
    const result = await pass({
      fountain: currentFountain,
      original: originalFountain,
      annotations,
      structure,
      records,
      approvedSpans,
    });
    passResults.push(result);
    currentFountain = result.revisedFountain;
  }

  const totalIssuesFound = passResults.reduce((s, r) => s + r.issues.length, 0);
  const passesWithChanges = passResults.filter(r => r.changed).length;

  return {
    passResults,
    finalFountain: currentFountain,
    originalFountain,
    totalIssuesFound,
    passesWithChanges,
    completedAt: Date.now(),
  };
}
