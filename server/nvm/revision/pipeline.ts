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
import type { PassResult, ApprovedSpan, StoryContext } from './passes/types.ts';
import { logger } from '../../lib/logger.ts';

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
 * H8: Progress event emitted after each pass completes.
 * Used by the SSE streaming endpoint to stream pass results to the UI.
 */
export interface RevisionProgressEvent {
  type: 'pass_complete';
  passIndex: number;
  totalPasses: number;
  passResult: PassResult;
}

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
 * @param onProgress    H8: Optional callback — called after each pass with progress info
 */
export async function runRevisionPipeline(
  compiled: CompiledScreenplay,
  records: ScreenplaySceneRecord[],
  structure: StructureState,
  approvedSpans: ApprovedSpan[] = [],
  onProgress?: (event: RevisionProgressEvent) => void,
  storyContext?: StoryContext,
): Promise<RevisionResult> {
  const originalFountain = compiled.fountain;
  const annotations = compiled.annotations ?? [];

  // Guard: empty fountain means there's nothing to revise. Return early rather than
  // running 12 passes on an empty string and silently reporting 0 issues found.
  if (!originalFountain?.trim()) {
    return {
      passResults: [], finalFountain: originalFountain ?? '',
      originalFountain: originalFountain ?? '',
      totalIssuesFound: 0, passesWithChanges: 0,
      completedAt: Date.now(),
    };
  }

  // The passes run sequentially; each receives the output of the prior pass.
  const passes: Array<{ name: import('./passes/types.ts').PassName; fn: import('./passes/types.ts').RevisionPass }> = [
    { name: 'structure',     fn: structurePass },
    { name: 'causality',     fn: causalityPass },
    { name: 'intention',     fn: intentionPass },
    { name: 'belief',        fn: beliefPass },
    { name: 'conflict',      fn: conflictPass },
    { name: 'character-arc', fn: characterArcPass },
    { name: 'dialogue',      fn: dialoguePass },
    { name: 'rhythm',        fn: rhythmPass },
    { name: 'pacing',        fn: pacingPass },
    { name: 'originality',   fn: originalityPass },
    { name: 'payoff',        fn: payoffPass },
    { name: 'voice',         fn: voicePass },
  ];

  const passResults: PassResult[] = [];
  let currentFountain = originalFountain;

  for (let i = 0; i < passes.length; i++) {
    const { name, fn } = passes[i];
    try {
      let result = await fn({
        fountain: currentFountain,
        original: originalFountain,
        annotations,
        structure,
        records,
        approvedSpans,
        storyContext,
        priorPassResults: passResults.length > 0 ? [...passResults] : undefined,
      });
      // Guard: if a pass returns empty fountain, keep prior pass output so empty
      // results don't cascade through the remaining 11 passes.
      if (result.revisedFountain?.trim()) {
        currentFountain = result.revisedFountain;
      } else if (result.revisedFountain !== undefined) {
        logger.error('revision_pass_empty_fountain', { passName: name, passIndex: i });
        result = { ...result, revisedFountain: currentFountain, changed: false };
      }
      passResults.push(result);
      onProgress?.({ type: 'pass_complete', passIndex: i, totalPasses: passes.length, passResult: result });
    } catch (err) {
      logger.error('revision_pass_failed', { passIndex: i, passName: name, error: (err as Error).message });
      const noopResult: PassResult = { pass: name, issues: [], revisedFountain: currentFountain, changed: false, summary: `Pass skipped due to error` };
      passResults.push(noopResult);
      onProgress?.({ type: 'pass_complete', passIndex: i, totalPasses: passes.length, passResult: noopResult });
    }
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
