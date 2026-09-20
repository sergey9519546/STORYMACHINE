// Wave 134 — The 14-Pass Revision Pipeline
// Runs the compiled Fountain screenplay through 14 sequential revision passes.
// Each pass diagnoses a layer, marks weak spots, and rewrites (LLM or stub).
// Each pass diagnoses THE DOCUMENT IT IS HANDED: when a pass changes the draft,
// the records/structure/annotations the next pass reads are re-derived from the
// changed draft, and every approved span is re-pointed at its own text in it.
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
// 13. theme            — theme resonance gaps, unresolved theme in Act 3
// 14. relationship-arc — static/monotone relationships, idle emotional engine

import type { CompiledScreenplay, SceneAnnotation } from '../screenplay/compile-types.ts';
import type { StructureState } from '../screenplay/structure.ts';
import type { ScreenplaySceneRecord } from '../screenplay/memory.ts';
import type { PassResult, ApprovedSpan, StoryContext, PassName, RevisionPass, PassInput } from './passes/types.ts';
import { logger } from '../../lib/logger.ts';
import { isDiagnoseOnly } from './rewrite.ts';
import { relocateApprovedSpans } from './approved-spans.ts';
import { analyzeFountainText } from '../analyze/fountain-analyzer.ts';

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
import { themePass }        from './passes/theme.ts';
import { relationshipArcPass } from './passes/relationship-arc.ts';

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
  /** P0.3: passes that threw and were skipped. When non-empty, the caller
   *  must treat the report as incomplete — health/verdict/percentiles should
   *  be withheld because the issue count may be artificially low. */
  failedPasses: PassName[];
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
 * Run a single pass inside the diagnose-only parallel fast path (see the
 * isDiagnoseOnly() branch in runRevisionPipeline below for the full safety
 * argument for why this is provably equivalent to the sequential path in
 * that mode). Writes into resultsByIndex[index] rather than returning a
 * value, so the final passResults order is pinned to pipeline order by
 * array index regardless of which pass's promise settles first, and emits
 * onProgress as soon as THIS pass's own result is ready — not gated on any
 * other pass finishing first — while still tagging the event with this
 * pass's fixed pipeline passIndex, exactly as the sequential loop does.
 */
async function runDiagnosePass(
  entry: { name: PassName; fn: RevisionPass },
  index: number,
  totalPasses: number,
  input: PassInput,
  resultsByIndex: PassResult[],
  failedPasses: PassName[],
  onProgress?: (event: RevisionProgressEvent) => void,
): Promise<void> {
  const { name, fn } = entry;
  let result: PassResult;
  try {
    result = await fn(input);
    // Guard mirrors the sequential loop's below: a pass returning an empty
    // string is still logged as an anomaly, even though diagnose-only mode
    // never threads revisedFountain into a shared currentFountain.
    if (!result.revisedFountain?.trim() && result.revisedFountain !== undefined) {
      logger.error('revision_pass_empty_fountain', { passName: name, passIndex: index });
      result = { ...result, revisedFountain: input.fountain, changed: false };
    }
  } catch (err) {
    logger.error('revision_pass_failed', { passIndex: index, passName: name, error: (err as Error).message });
    result = { pass: name, issues: [], revisedFountain: input.fountain, changed: false, summary: `Pass skipped due to error` };
    failedPasses.push(name);
  }
  resultsByIndex[index] = result;
  onProgress?.({ type: 'pass_complete', passIndex: index, totalPasses, passResult: result });
}

/**
 * Run all 14 revision passes over a compiled screenplay.
 *
 * Each pass receives the fountain text as modified by all prior passes, AND
 * the diagnostics of that text. `records`/`structure`/`annotations` describe
 * the draft as it was compiled; the moment a pass changes the draft, the next
 * pass gets a fresh set derived from the changed draft by
 * analyzeFountainText() instead of the compiled originals. Before 2026-09-20
 * the originals were handed to all 14 passes while the text moved underneath
 * them, so passes 2..14 diagnosed the pre-revision document — they could flag
 * a scene a prior pass had already deleted, and miss one it had introduced.
 * A pass that changes nothing costs nothing: the re-derivation is skipped
 * whenever the draft is byte-equal to the one already diagnosed, which is
 * every pass of every diagnose-only run (see the isDiagnoseOnly() branch
 * below, where `revisedFountain` provably never changes).
 *
 * `records`/`structure` as PASSED IN are still the caller's — a route builds
 * them from the StoryCommit ledger (server/routes/nvm/revision.ts), which
 * carries signal no text reconstruction can — and pass 1 reads exactly those.
 * Only the re-derivation, for a draft the caller never saw, comes from the
 * text.
 *
 * Approved spans follow the text: a span is a line range into ONE document, so
 * when a pass changes the draft each span is re-located by its own excerpt
 * (./approved-spans.ts) and its line numbers rewritten. Preservation itself is
 * enforced at the rewrite seam (./rewrite-llm.ts's approvedSpansSurvive
 * rejects any rewrite that drops a locked excerpt); in stub mode nothing
 * changes anyway.
 *
 * The RESULT's `originalFountain` is untouched by all of this: it is the draft
 * as submitted, and remains the baseline a caller diffs against.
 *
 * @param compiled      Output of compileScreenplay()
 * @param records       Screenplay memory records from buildScreenplayMemory()
 * @param structure     Current structural state from analyzeStructure()
 * @param approvedSpans Spans the author has locked — re-pointed, never dropped
 * @param onProgress    H8: Optional callback — called after each pass with progress info
 */
export async function runRevisionPipeline(
  compiled: CompiledScreenplay,
  records: ScreenplaySceneRecord[],
  structure: StructureState,
  approvedSpans: ApprovedSpan[] = [],
  onProgress?: (event: RevisionProgressEvent) => void,
  storyContext?: StoryContext,
  /** TEST-ONLY escape hatch (tests/core/pipeline-parallel.test.ts): forces
   *  the pre-existing sequential per-pass loop even when called from inside
   *  runDiagnoseOnly(), so a test can build an independent reference report
   *  from the exact same inputs and compare it against the parallel
   *  diagnose-only fast path below. No production caller passes this —
   *  runScriptDoctor (doctor.ts) never sets it, and it defaults to false. */
  forceSequentialForTest = false,
): Promise<RevisionResult> {
  const originalFountain = compiled.fountain;
  const annotations = compiled.annotations ?? [];

  // Guard: empty fountain means there's nothing to revise. Return early rather than
  // running 12 passes on an empty string and silently reporting 0 issues found.
  if (!originalFountain?.trim()) {
    return {
      passResults: [], finalFountain: originalFountain ?? '',
      originalFountain: originalFountain ?? '',
      totalIssuesFound: 0, passesWithChanges: 0, failedPasses: [],
      completedAt: Date.now(),
    };
  }

  // The passes run sequentially; each receives the output of the prior pass.
  // (Diagnose-only mode is the exception — see the isDiagnoseOnly() branch
  // below, which runs all 14 concurrently instead.)
  const passes: Array<{ name: PassName; fn: RevisionPass }> = [
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
    { name: 'theme',         fn: themePass },
    { name: 'relationship-arc', fn: relationshipArcPass },
  ];

  const passResults: PassResult[] = [];
  const failedPasses: PassName[] = [];
  let currentFountain = originalFountain;

  if (isDiagnoseOnly() && !forceSequentialForTest) {
    // ── Diagnose-only fast path: run all 14 passes concurrently ───────────
    // Safe ONLY because of two properties verified by inspection of every
    // pass file (server/nvm/revision/passes/*.ts) and of rewrite.ts:
    //
    // 1. revisedFountain never actually changes in this mode. Every pass's
    //    trailing `rewritePass(...)` call hits rewrite.ts's diagnose-only
    //    guard (`if (isDiagnoseOnly()) return { revised: fountain, usedLLM:
    //    false }`) BEFORE it ever reads its priorPassResults argument or
    //    does any prompt-building/LLM work — so `revised === fountain`
    //    always and `changed` is always false. currentFountain therefore
    //    never diverges from originalFountain in this mode even in the
    //    sequential loop below, so every pass can safely receive
    //    fountain: originalFountain directly with no thread-through.
    //    The same property is what makes this branch untouched by the
    //    2026-09-20 per-pass re-diagnosis below: that re-derivation is gated
    //    on `currentFountain !== diagnosedFountain`, and in this mode the
    //    draft never changes, so there is nothing to re-derive and nothing to
    //    re-locate. The doctor — the only caller that reaches this branch —
    //    therefore reads exactly the same records/structure/annotations it
    //    always did, which is why the change carries an output-identity
    //    receipt rather than a re-measured AUC.
    //
    // 2. No pass's DIAGNOSTIC (issue-producing) code reads priorPassResults.
    //    Every pass file has exactly one read site for it — the same
    //    trailing rewritePass(...) call from (1), whose body never runs in
    //    this mode. So passing priorPassResults: undefined to every pass
    //    changes no issue any pass reports.
    //
    // storyContext is NOT similarly inert, so it is still threaded through
    // unchanged below: originality.ts's genre-cliché check and the whole of
    // theme.ts read storyContext directly in diagnostic logic.
    //
    // records/annotations/structure/approvedSpans are read-only across all
    // 14 passes (verified: no pass mutates them — every pass collects
    // issues into its own pass-local `const issues = []`), so sharing the
    // same references across concurrent invocations is safe.
    //
    // The sequential loop's `else` branch below is UNCHANGED and still runs
    // byte-for-byte as before for rewrite mode (isDiagnoseOnly() false),
    // where currentFountain genuinely threads pass-to-pass and
    // priorPassResults genuinely coordinates the LLM rewrite prompts.
    const resultsByIndex: PassResult[] = new Array(passes.length);
    const sharedInput: PassInput = {
      fountain: originalFountain,
      original: originalFountain,
      annotations,
      structure,
      records,
      approvedSpans,
      storyContext,
      priorPassResults: undefined,
    };
    await Promise.all(
      passes.map((entry, i) => runDiagnosePass(entry, i, passes.length, sharedInput, resultsByIndex, failedPasses, onProgress)),
    );
    passResults.push(...resultsByIndex);
  } else {
    // ── Sequential rewrite path ────────────────────────────────────────────
    // Three things travel with `currentFountain` from pass to pass, and each
    // one is only meaningful relative to a PARTICULAR draft:
    //
    //   passRecords/passStructure/passAnnotations — the diagnostics a pass
    //     reads. Anchored by `diagnosedFountain`: the draft they describe.
    //   passSpans — the author's locked line ranges. Anchored by
    //     `spanAnchorFountain`: the draft their line numbers index into.
    //
    // The two anchors are tracked separately rather than as one "last draft"
    // variable so that a re-derivation that fails (analyzeFountainText
    // throwing on pathological text) does not also strand the spans: the span
    // re-location is pure string work and still runs, and the diagnostics are
    // retried against the next draft instead of being frozen forever by one
    // failure.
    let passRecords = records;
    let passStructure = structure;
    let passAnnotations = annotations;
    let passSpans = approvedSpans;
    let diagnosedFountain = originalFountain;
    let spanAnchorFountain = originalFountain;

    for (let i = 0; i < passes.length; i++) {
      const { name, fn } = passes[i];

      // Byte-equality, not a change flag: a pass that "changed" the draft back
      // to what it already was costs nothing here, and a pass that reports
      // changed: false while returning different text still gets re-diagnosed.
      if (currentFountain !== diagnosedFountain) {
        try {
          const rediagnosed = analyzeFountainText(currentFountain);
          passRecords = rediagnosed.records;
          passStructure = rediagnosed.structure;
          passAnnotations = rediagnosed.annotations;
          diagnosedFountain = currentFountain;
          logger.debug('revision_pass_rediagnosed', {
            passIndex: i, passName: name, sceneCount: rediagnosed.records.length,
          });
        } catch (err) {
          // Keep the previous diagnostics rather than handing this pass none.
          // They are stale — which is the defect this block exists to close —
          // so it is logged as an error, not swallowed.
          logger.error('revision_rediagnose_failed', {
            passIndex: i, passName: name, error: (err as Error).message,
          });
        }
      }

      if (passSpans.length > 0 && currentFountain !== spanAnchorFountain) {
        const relocation = relocateApprovedSpans(spanAnchorFountain, currentFountain, passSpans);
        if (relocation.lost.length > 0) {
          // Indices only — never the span's text or the draft's. After an
          // accepted LLM rewrite this cannot fire (rewrite-llm.ts's
          // approvedSpansSurvive rejects a rewrite that drops a locked
          // excerpt); a non-LLM editor of the draft is not bound by that.
          logger.warn('revision_locked_span_lost_between_passes', {
            passIndex: i,
            passName: name,
            lostSpanIndices: relocation.lost,
            lostSpanCount: relocation.lost.length,
            totalApprovedSpans: passSpans.length,
          });
        }
        passSpans = relocation.spans;
        spanAnchorFountain = currentFountain;
      }

      try {
        let result = await fn({
          fountain: currentFountain,
          original: originalFountain,
          annotations: passAnnotations,
          structure: passStructure,
          records: passRecords,
          approvedSpans: passSpans,
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
        failedPasses.push(name);
        onProgress?.({ type: 'pass_complete', passIndex: i, totalPasses: passes.length, passResult: noopResult });
      }
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
    failedPasses,
    completedAt: Date.now(),
  };
}
