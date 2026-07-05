// Convergence Loop (G1) — AlphaZero-for-drama.
// generate → prove → value → quality → mutate → repeat until:
//   (a) all Tier 1 proofs pass,
//   (b) tension valuation ≥ target.tensionTarget, AND
//   (c) quality score ≥ target.qualityTarget (default 60)
// Rejected candidates go to the Ghost Ledger (A2) with specific reasons.
// Budget limits total LLM calls.
//
// Composite score = 0.6 * normalizedTension + 0.4 * qualityScore (0–100 each).
// Dramatic tension is the primary goal; craft quality is the secondary gate.
// The convergence criterion is all three gates simultaneously.

import type { NarrativeTransitionIR } from '../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../state/NarrativeState.ts';
import type { ProofResult } from '../proof/contract.ts';
import type { TensionLedger } from '../valuation/futures.ts';
import type { QualityReport } from '../quality/index.ts';
import type { MutationOperator } from './operators.ts';
import type { CandidateGenerator, SceneTarget } from '../generate/proof-spec.ts';
import type { GhostReason } from '../repro/ghost-ledger.ts';
import type { WritersRoomResult, Critique } from '../room/room.ts';
import type { DirectorPolicy } from '../selfplay/mine.ts';
import { runTier1, tier1Passes, runTier2, runTier3, tier3Rank, failedProofs } from '../proof/kernel.ts';
import { deriveTensionLedger } from '../valuation/futures.ts';
import { runQualityEngine } from '../quality/index.ts';
import { runWritersRoom } from '../room/room.ts';
import { buildGenerationSpec, buildSystemPreamble } from '../generate/proof-spec.ts';
import { buildQualityAwareConstraints } from '../generate/quality-spec.ts';
import { proppMorphology } from '../quality/index.ts';
import { applyOperator, ALL_OPERATORS } from './operators.ts';
import { applyStoryOps } from '../ops/dispatcher.ts';
import { queryPolicy } from '../selfplay/mine.ts';
import { computeTopology } from '../valuation/topology.ts';
import { makePrng, randInt } from '../repro/seed.ts';

// Pick an operator not yet tried in this convergence session; if all have been tried, pick randomly.
function pickUntried(
  ops: readonly MutationOperator[],
  tried: Set<MutationOperator>,
  prng: () => number,
): MutationOperator {
  const untried = ops.filter(o => !tried.has(o));
  const pool = untried.length > 0 ? untried : [...ops];
  return pool[randInt(prng, pool.length)];
}

export interface ConvergeStep {
  iteration: number;
  candidateId: string;
  tier1Results: ProofResult[];
  passed: boolean;
  tensionLedger: TensionLedger;
  valuationScore: number;
  qualityScore: number;
  compositeScore: number;
  /** Tier 3 ranking score (0–100): originality + non-genericness. */
  tier3Rank: number;
  operator?: MutationOperator;
  ghostReason?: GhostReason;
  /** Abridged writers' room transcript for this candidate. */
  writersRoomSummary?: string;
}

// Deliverable 1 (close the generate→audit→select loop): previously every
// candidate's composite/tension/quality scores and Tier1/Tier2 findings were
// computed solely to pick `best`, then discarded — a caller had no way to see
// why a candidate lost, inspect a non-winner, or commit anything other than the
// loop's own argmax. ConvergeCandidateRecord is that missing per-candidate audit
// trail; `winner` below is what makes the argmax's pick actually committable.
export type CandidateSource = 'llm' | 'mutation' | 'seed';
export type CandidateStatus = 'winner' | 'pass' | 'ghost';

export interface ConvergeCandidateRecord {
  /**
   * Deterministic — `c<iteration>-<index within that iteration's batch>`.
   * Unlike `ConvergeStep.candidateId` (which now reuses this same id) this never
   * depends on Date.now() or the generator's own transitionId, so a streamed
   * step, a ghosted candidate, and the final `winner` can all be correlated by
   * the exact same identifier.
   */
  candidateId: string;
  iteration: number;
  /**
   * 'seed' = part of iteration 0's initial population (no `best` exists yet);
   * 'mutation' = operator-mutated from `best` via applyOperator() (iter > 0,
   * always index 0 of that iteration's batch); 'llm' = a fresh same-iteration
   * generation alongside the mutation (iter > 0, index ≥ 1).
   */
  source: CandidateSource;
  status: CandidateStatus;
  ghostReason?: GhostReason;
  composite: number;
  tension: number;
  quality: number;
  tier1Failures: string[];
  tier2Flags: string[];
  ir: NarrativeTransitionIR;
}

export interface ConvergeWinner {
  candidateId: string;
  ir: NarrativeTransitionIR;
  composite: number;
  tension: number;
  quality: number;
}

export interface ConvergeResult {
  ir: NarrativeTransitionIR;
  history: ConvergeStep[];
  iterations: number;
  converged: boolean;
  finalValuation: number;
  finalQuality: number;
  finalComposite: number;
  ghosts: Array<{
    ir: NarrativeTransitionIR;
    reason: GhostReason;
    /**
     * Populated at ghosting time (below) so a rejected candidate's scores
     * survive into the persisted Ghost Ledger (server/nvm/repro/ghost-ledger.ts)
     * without the caller having to re-run the proof/quality/valuation engines.
     * Optional — strictly additive alongside the pre-existing {ir, reason} shape,
     * so ghosts written before this change (and any code that only reads
     * ir/reason) remain valid.
     */
    composite?: number;
    tension?: number;
    quality?: number;
  }>;
  /** Every candidate this run evaluated, winner included — see ConvergeCandidateRecord. */
  candidates: ConvergeCandidateRecord[];
  /**
   * The LAST writers'-room's full critique transcript — one entry per critic
   * objection (criticId, severity, objection text, attentionBid, suggested
   * operator) — kept in full alongside the pre-existing abridged
   * `writersRoomSummary` on each ConvergeStep. Undefined when the room never ran
   * (e.g. a 1-iteration budget, or no `best` ever existed to critique).
   */
  roomTranscript?: Critique[];
  /**
   * Whichever candidate the pre-existing composite-argmax actually picked — null
   * only when no candidate this run ever passed Tier 1 (nothing is safe to
   * commit). server/routes/nvm.ts's POST /api/nvm/converge/commit takes exactly
   * this candidate's ops and re-proves them against current session state.
   */
  winner: ConvergeWinner | null;
}

export interface ConvergeBudget {
  maxIterations: number;
  candidatesPerIteration: number;
  /**
   * H6: Hard cap on the total number of LLM `generate()` calls across all
   * iterations. When exceeded the loop stops early and returns the best
   * candidate found so far.  Defaults to maxIterations × candidatesPerIteration
   * (same behaviour as before — set explicitly to reduce cost).
   */
  maxLLMCalls?: number;
  /** When present, biases operator selection via corpus-learned Director Policy (G13→G1). */
  directorPolicy?: DirectorPolicy;
  /**
   * Wave 69: Live Story Bible summary text (built from Stage by caller).
   * Prepended to every GenerationSpec systemPreamble so the LLM candidate
   * generator has full story context — characters, arcs, clocks, theme.
   */
  bibleSummary?: string;
  /**
   * Wave 77: Open arc-completion promises from analyzeArcCompletion().
   * Overdue/due-soon promises are forwarded to buildQualityAwareConstraints
   * so the LLM is explicitly told which unresolved promises need closing.
   * Previously hardcoded as [] — now thread from the caller via server.ts.
   */
  openPromises?: import('../quality/arc-tracker.ts').OpenPromise[];
  /**
   * Wave 85 (H8): Per-step streaming callback. Called synchronously after each
   * candidate is evaluated so callers (e.g. the SSE endpoint) can stream
   * progress to the client without waiting for the full loop to finish.
   */
  onStep?: (step: ConvergeStep) => void;
}

const DEFAULT_BUDGET: ConvergeBudget = { maxIterations: 8, candidatesPerIteration: 3 };

// Normalize tension to 0-100 using the target as the reference ceiling.
// At tensionTarget → 100; above tensionTarget → capped at 100.
function normalizeTension(tension: number, tensionTarget: number): number {
  if (!isFinite(tension) || !isFinite(tensionTarget) || tensionTarget <= 0) return 0;
  return Math.max(0, Math.min(100, (tension / tensionTarget) * 100));
}

export async function convergeScene(
  state: NarrativeState,
  target: SceneTarget,
  generate: CandidateGenerator,
  budget: ConvergeBudget = DEFAULT_BUDGET,
  seed: number = Date.now(),
): Promise<ConvergeResult> {
  const history: ConvergeStep[] = [];
  const ghosts: ConvergeResult['ghosts'] = [];
  const prng = makePrng(seed);
  const effectiveQualityTarget = target.qualityTarget ?? 60;

  let best: NarrativeTransitionIR | null = null;
  let bestComposite = -Infinity;
  let currentFailures: ProofResult[] = [];
  let currentQualityWarnings: import('../quality/index.ts').QualityWarning[] = [];
  let lastCandidates: NarrativeTransitionIR[] = [];
  // H6: Track cumulative LLM calls; stop when budget.maxLLMCalls is reached.
  const llmCallLimit = budget.maxLLMCalls ?? budget.maxIterations * budget.candidatesPerIteration;
  let llmCallCount = 0;
  // Operator rotation: prefer untried operators before repeating; reset after full cycle.
  const triedOperators = new Set<MutationOperator>();

  // Deliverable 1 accumulators. `candidateRecords` spans ALL iterations — the
  // function can return mid-loop from the Tier-3-ranked convergedThisIter branch
  // below, so it's declared once, outside the iteration loop, not per-iteration.
  const candidateRecords: ConvergeCandidateRecord[] = [];
  let lastRoomResult: WritersRoomResult | null = null;
  // Mirrors `best`/`bestComposite` below but also remembers which candidateId and
  // raw tension/quality produced that composite, so the budget-exhausted return
  // path can populate `winner` without recomputing anything.
  let bestCandidateId: string | null = null;
  let bestValuation = 0;
  // Named distinctly from the pre-existing local `bestQuality` (a QualityReport,
  // assigned further below inside `if (best) {...}`) to avoid shadowing it.
  let bestQualityScore = 0;

  for (let iter = 0; iter < budget.maxIterations; iter++) {
    if (llmCallCount >= llmCallLimit) break;
    // Quality-aware spec (Wave 27): quality warnings + Propp gaps feed back as constraints.
    const baseSpec = buildGenerationSpec(state, target, currentFailures);
    let specConstraints = baseSpec.constraints;
    if (iter > 0 && (currentQualityWarnings.length > 0 || best)) {
      const proppGaps = best ? proppMorphology(best) : { present: [], absent: [], coverage: 0 };
      specConstraints = buildQualityAwareConstraints(
        baseSpec.constraints,
        currentQualityWarnings,
        budget.openPromises ?? [],
        proppGaps,
      );
    }
    // Wave 69: prepend the live Story Bible to the system preamble so the LLM
    // candidate generator knows the full story context — characters, arcs, clocks.
    const basePreamble = buildSystemPreamble(specConstraints, state);
    const systemPreamble = budget.bibleSummary
      ? `${budget.bibleSummary}\n\n${basePreamble}`
      : basePreamble;
    const spec = {
      ...baseSpec,
      constraints: specConstraints,
      systemPreamble,
    };

    let candidates: NarrativeTransitionIR[];
    // G2→G1: Writers' Room drives mutation operator selection after iteration 0.
    // G13→G1: Director Policy (from corpus) biases operator when room has no consensus.
    let roomResult: WritersRoomResult | null = null;
    let iterOperator: MutationOperator | undefined;
    if (best && iter > 0) {
      roomResult = runWritersRoom(best, state);
      let op: MutationOperator;
      if (roomResult.suggestedOperator) {
        op = roomResult.suggestedOperator;
      } else if (budget.directorPolicy) {
        const stateAfterBest = applyStoryOps(state, best.ops);
        const arcLedger = deriveTensionLedger(stateAfterBest, target.sceneIdx);
        const topology = computeTopology([arcLedger]);
        const policyOps = queryPolicy(budget.directorPolicy, topology.dominantArc ?? 'unknown');
        const candidateOp = policyOps[0] as MutationOperator | undefined;
        // Validate against known operators — a stale corpus string could crash applyOperator.
        op = (candidateOp && (ALL_OPERATORS as readonly string[]).includes(candidateOp))
          ? candidateOp
          : pickUntried(ALL_OPERATORS, triedOperators, prng);
      } else {
        op = pickUntried(ALL_OPERATORS, triedOperators, prng);
      }
      iterOperator = op;
      triedOperators.add(op);
      if (triedOperators.size >= ALL_OPERATORS.length) triedOperators.clear(); // reset after full cycle
      const mutation = applyOperator(op, best, state, seed + iter);
      const fresh = await generate(spec, 1);
      llmCallCount += 1;
      candidates = [mutation.ir, ...fresh];
    } else {
      candidates = await generate(spec, budget.candidatesPerIteration);
      llmCallCount += budget.candidatesPerIteration;
    }
    lastCandidates = candidates;
    if (roomResult) lastRoomResult = roomResult;

    // Parallel to `candidates`: which generation path produced each entry, for
    // ConvergeCandidateRecord.source. Iteration 0 has no `best` yet, so its whole
    // batch is the initial 'seed' population; iter>0 batches are [mutation, ...llm]
    // (mirrors the exact branch condition above that assembled `candidates`).
    const candidateSources: CandidateSource[] = (best && iter > 0)
      ? ['mutation' as const, ...candidates.slice(1).map(() => 'llm' as const)]
      : candidates.map(() => 'seed' as const);

    // Buffer of fully-converged candidates this iteration (for Tier 3 ranking)
    const convergedThisIter: Array<{
      ir: NarrativeTransitionIR; candidateId: string; valuation: number; quality: number; composite: number; t3: number;
    }> = [];

    for (let ci = 0; ci < candidates.length; ci++) {
      const candidate = candidates[ci];
      const candidateId = `c${iter}-${ci}`;
      const tier1Results = runTier1(candidate, state);
      const passed = tier1Passes(tier1Results);
      // Apply candidate ops to get post-transition state before valuing — otherwise
      // every candidate in an iteration gets the identical pre-transition tension score,
      // making the tension reward signal and convergence gate completely inert.
      const postState = applyStoryOps(state, candidate.ops);
      const ledger = deriveTensionLedger(postState, target.sceneIdx);
      const valuationScore = ledger.totalTension;

      // Quality gate — run on all candidates (even failed proofs) so the
      // quality score informs mutation operator selection.
      const qualityReport: QualityReport = runQualityEngine(candidate, state);
      const qualityScore = qualityReport.score;

      // Tier 3 ranking — non-blocking; influences candidate preference.
      const t3Results = runTier3(candidate, state);
      const t3 = tier3Rank(t3Results);

      // Tier 2 quality-gate proofs, evaluated per-candidate (not just for `best`,
      // as the post-iteration feedback step below already does) so
      // ConvergeCandidateRecord.tier2Flags reflects THIS candidate's own findings.
      const tier2Results = runTier2(candidate, state);

      const tensionNorm = normalizeTension(valuationScore, target.tensionTarget);
      // Guard the composite at its source so a single non-finite signal can't
      // propagate into bestComposite tracking, the convergedThisIter winner sort,
      // or finalComposite on either the converged or budget-exhausted return path.
      // 60/40 weighting: dramatic tension is the primary objective; quality is craft gate.
      const rawComposite = 0.6 * tensionNorm + 0.4 * qualityScore;
      const compositeScore = isFinite(rawComposite) ? rawComposite : 0;

      const tensionMet = valuationScore >= target.tensionTarget;
      const qualityMet = qualityScore >= effectiveQualityTarget;

      // Determine ghost reason for this candidate
      let ghostReason: GhostReason | undefined;
      if (!passed) {
        ghostReason = 'proof_fail';
      } else if (!tensionMet) {
        ghostReason = 'valuation_too_low';
      } else if (!qualityMet) {
        ghostReason = 'quality_low';
      }

      const step: ConvergeStep = {
        iteration: iter,
        // Wave: was `candidate.transitionId` (Date.now()-suffixed for LLM/stub
        // IRs, so non-deterministic and unrelated to the id ConvergeCandidateRecord
        // uses below). Switched to the same deterministic id so a streamed step,
        // a ghosted candidate, and the final winner all correlate by one identifier.
        // The field's type (string) — the "exact shape" callers depend on — is unchanged.
        candidateId,
        tier1Results,
        passed,
        tensionLedger: ledger,
        valuationScore,
        qualityScore,
        compositeScore,
        tier3Rank: t3,
        operator: iterOperator,
        ghostReason,
        writersRoomSummary: roomResult
          ? `dominant=${roomResult.dominantCritic} op=${roomResult.suggestedOperator ?? 'none'} consensus=${roomResult.consensus}`
          : undefined,
      };
      history.push(step);
      budget.onStep?.(step);

      // Deliverable 1: keep every candidate's full record, not just the ones that
      // shaped `best` or got ghosted. Status starts as pass/ghost; whichever
      // candidate the argmax ultimately settles on (immediately below, or at the
      // budget-exhausted return path) gets flipped to 'winner' in place afterward.
      candidateRecords.push({
        candidateId,
        iteration: iter,
        source: candidateSources[ci] ?? 'llm',
        status: ghostReason ? 'ghost' : 'pass',
        ghostReason,
        composite: compositeScore,
        tension: valuationScore,
        quality: qualityScore,
        tier1Failures: failedProofs(tier1Results).map(r => r.proof),
        tier2Flags: failedProofs(tier2Results).map(r => r.proof),
        ir: candidate,
      });

      // Buffer fully-converged candidates for Tier 3 ranking
      if (passed && tensionMet && qualityMet) {
        convergedThisIter.push({ ir: candidate, candidateId, valuation: valuationScore, quality: qualityScore, composite: compositeScore, t3 });
      }

      // Track best composite — only among Tier-1-passing candidates, so mutations
      // are never seeded from an IR that fails hard blocks and the fallback path
      // never returns an illegal transition.
      if (passed && compositeScore > bestComposite) {
        best = candidate;
        bestComposite = compositeScore;
        bestCandidateId = candidateId;
        bestValuation = valuationScore;
        bestQualityScore = qualityScore;
      }

      // Ghost if it failed any gate significantly — carry its scores along so the
      // Ghost Ledger can display a rejected candidate's numbers without re-running
      // the proof/quality/valuation engines against it later.
      if (ghostReason) {
        ghosts.push({ ir: candidate, reason: ghostReason, composite: compositeScore, tension: valuationScore, quality: qualityScore });
      }
    }

    // Tier 3 ranking: if any candidates converged this iteration, pick the
    // most original/non-generic one (highest tier3Rank, then composite).
    if (convergedThisIter.length > 0) {
      convergedThisIter.sort((a, b) => b.t3 - a.t3 || b.composite - a.composite);
      const winner = convergedThisIter[0];
      // Flip the winning candidate's own record to 'winner' in place — it was
      // pushed as 'pass' above (convergedThisIter only ever holds candidates that
      // passed Tier 1 and met both the tension and quality targets).
      const winnerRecord = candidateRecords.find(r => r.candidateId === winner.candidateId);
      if (winnerRecord) winnerRecord.status = 'winner';
      return {
        ir: winner.ir,
        history,
        iterations: iter + 1,
        converged: true,
        finalValuation: winner.valuation,
        finalQuality: winner.quality,
        finalComposite: winner.composite,
        ghosts,
        candidates: candidateRecords,
        roomTranscript: lastRoomResult?.critiques,
        winner: {
          candidateId: winner.candidateId,
          ir: winner.ir,
          composite: winner.composite,
          tension: winner.valuation,
          quality: winner.quality,
        },
      };
    }

    if (best) {
      // Merge Tier 1 + Tier 2 failures so the next GenerationSpec includes
      // both hard-block fixes and quality-gate guidance.
      const t1Failures = failedProofs(runTier1(best, state));
      const t2Failures = failedProofs(runTier2(best, state));
      currentFailures = [...t1Failures, ...t2Failures];
      // Quality-aware (Wave 27): capture quality warnings from best candidate
      // so they feed back as constraints in the next iteration.
      const bestQuality = runQualityEngine(best, state);
      currentQualityWarnings = bestQuality.warnings;
    }
  }

  // Budget exhausted — return best Tier-1-passing candidate found.
  // Prefer the highest-composite Tier-1-passing candidate; if that candidate also
  // passes the quality gate we call it a "soft converge". Log quality gate miss so
  // callers can detect low-craft fallbacks.
  // lastCandidates[-1] would be undefined when the array is empty, so guard the index.
  let finalIR = best ?? (lastCandidates.length > 0 ? lastCandidates[lastCandidates.length - 1] : null);
  if (!finalIR && llmCallCount <= llmCallLimit) {
    llmCallCount++;
    const fallback = await generate(buildGenerationSpec(state, target), 1);
    finalIR = fallback[0] ?? null;
  }
  // Last-resort: synthesise a pass-through IR. Copy target.activeMechanisms so
  // the MechanismProof doesn't immediately fail the fallback (empty list would fail).
  if (!finalIR) {
    finalIR = lastCandidates[0] ?? {
      transitionId: 'fallback',
      sceneIdx: target.sceneIdx,
      sceneFunction: target.sceneFunction ?? 'establish_world',
      activeMechanisms: target.activeMechanisms?.length ? target.activeMechanisms : ['core_mechanism'],
      beforeStateHash: '',
      ops: [],
      preconditions: [],
      postconditions: [],
      provenance: { origin: 'model_generated', createdAt: Date.now() },
    } as unknown as NarrativeTransitionIR;
  }
  const finalLedger = deriveTensionLedger(applyStoryOps(state, finalIR.ops), target.sceneIdx);
  const finalQReport = runQualityEngine(finalIR, state);
  const safeBestComposite = (!isFinite(bestComposite) || isNaN(bestComposite)) ? 0 : bestComposite;

  // Deliverable 1: the budget-exhausted path's "winner" is exactly the argmax the
  // loop already computed via `best`/`bestComposite` above — null only when
  // nothing this run ever passed Tier 1 (bestCandidateId stays null in that case,
  // since it's set in lockstep with `best` inside the per-candidate loop).
  if (bestCandidateId) {
    const winnerRecord = candidateRecords.find(r => r.candidateId === bestCandidateId);
    if (winnerRecord) winnerRecord.status = 'winner';
  }

  return {
    ir: finalIR,
    history,
    iterations: budget.maxIterations,
    converged: false,
    finalValuation: finalLedger.totalTension,
    finalQuality: finalQReport.score,
    finalComposite: safeBestComposite,
    ghosts,
    candidates: candidateRecords,
    roomTranscript: lastRoomResult?.critiques,
    winner: (bestCandidateId && best)
      ? { candidateId: bestCandidateId, ir: best, composite: safeBestComposite, tension: bestValuation, quality: bestQualityScore }
      : null,
  };
}
