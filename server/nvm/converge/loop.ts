// Convergence Loop (G1) — AlphaZero-for-drama.
// generate → prove → value → quality → mutate → repeat until:
//   (a) all Tier 1 proofs pass,
//   (b) tension valuation ≥ target.tensionTarget, AND
//   (c) quality score ≥ target.qualityTarget (default 60)
// Rejected candidates go to the Ghost Ledger (A2) with specific reasons.
// Budget limits total LLM calls.
//
// Composite score = 0.5 * normalizedTension + 0.5 * qualityScore (0–100 each).
// The convergence criterion is all three gates simultaneously.

import type { NarrativeTransitionIR } from '../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../state/NarrativeState.ts';
import type { ProofResult } from '../proof/contract.ts';
import type { TensionLedger } from '../valuation/futures.ts';
import type { QualityReport } from '../quality/index.ts';
import type { MutationOperator } from './operators.ts';
import type { CandidateGenerator, SceneTarget } from '../generate/proof-spec.ts';
import type { GhostReason } from '../repro/ghost-ledger.ts';
import type { WritersRoomResult } from '../room/room.ts';
import { runTier1, tier1Passes } from '../proof/kernel.ts';
import { deriveTensionLedger } from '../valuation/futures.ts';
import { runQualityEngine } from '../quality/index.ts';
import { runWritersRoom } from '../room/room.ts';
import { buildGenerationSpec } from '../generate/proof-spec.ts';
import { applyOperator, ALL_OPERATORS } from './operators.ts';
import { makePrng, randInt } from '../repro/seed.ts';

export interface ConvergeStep {
  iteration: number;
  candidateId: string;
  tier1Results: ProofResult[];
  passed: boolean;
  tensionLedger: TensionLedger;
  valuationScore: number;
  qualityScore: number;
  compositeScore: number;
  operator?: MutationOperator;
  ghostReason?: GhostReason;
  /** Abridged writers' room transcript for this candidate. */
  writersRoomSummary?: string;
}

export interface ConvergeResult {
  ir: NarrativeTransitionIR;
  history: ConvergeStep[];
  iterations: number;
  converged: boolean;
  finalValuation: number;
  finalQuality: number;
  finalComposite: number;
  ghosts: Array<{ ir: NarrativeTransitionIR; reason: GhostReason }>;
}

export interface ConvergeBudget {
  maxIterations: number;
  candidatesPerIteration: number;
}

const DEFAULT_BUDGET: ConvergeBudget = { maxIterations: 8, candidatesPerIteration: 3 };

// Normalize tension to 0-100 using the target as the reference ceiling.
// At tensionTarget → 100; above tensionTarget → capped at 100.
function normalizeTension(tension: number, tensionTarget: number): number {
  if (tensionTarget <= 0) return 100;
  return Math.min(100, (tension / tensionTarget) * 100);
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
  let bestComposite = -1;
  let currentFailures: ProofResult[] = [];
  let lastCandidates: NarrativeTransitionIR[] = [];

  for (let iter = 0; iter < budget.maxIterations; iter++) {
    const spec = buildGenerationSpec(state, target, currentFailures);

    let candidates: NarrativeTransitionIR[];
    // G2→G1: Writers' Room drives mutation operator selection after iteration 0.
    let roomResult: WritersRoomResult | null = null;
    if (best && iter > 0) {
      roomResult = runWritersRoom(best, state);
      const op: MutationOperator = roomResult.suggestedOperator ?? ALL_OPERATORS[randInt(prng, ALL_OPERATORS.length)];
      const mutation = applyOperator(op, best, state, seed + iter);
      const fresh = await generate(spec, 1);
      candidates = [mutation.ir, ...fresh];
    } else {
      candidates = await generate(spec, budget.candidatesPerIteration);
    }
    lastCandidates = candidates;

    for (const candidate of candidates) {
      const tier1Results = runTier1(candidate, state);
      const passed = tier1Passes(tier1Results);
      const ledger = deriveTensionLedger(state, target.sceneIdx);
      const valuationScore = ledger.totalTension;

      // Quality gate — run on all candidates (even failed proofs) so the
      // quality score informs mutation operator selection.
      const qualityReport: QualityReport = runQualityEngine(candidate, state);
      const qualityScore = qualityReport.score;

      const tensionNorm = normalizeTension(valuationScore, target.tensionTarget);
      const compositeScore = 0.5 * tensionNorm + 0.5 * qualityScore;

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
        candidateId: candidate.transitionId,
        tier1Results,
        passed,
        tensionLedger: ledger,
        valuationScore,
        qualityScore,
        compositeScore,
        ghostReason,
        writersRoomSummary: roomResult
          ? `dominant=${roomResult.dominantCritic} op=${roomResult.suggestedOperator ?? 'none'} consensus=${roomResult.consensus}`
          : undefined,
      };
      history.push(step);

      // Converged: passes proofs + both targets met
      if (passed && tensionMet && qualityMet) {
        return {
          ir: candidate,
          history,
          iterations: iter + 1,
          converged: true,
          finalValuation: valuationScore,
          finalQuality: qualityScore,
          finalComposite: compositeScore,
          ghosts,
        };
      }

      // Track best composite (for mutation and fallback)
      if (compositeScore > bestComposite) {
        best = candidate;
        bestComposite = compositeScore;
      }

      // Ghost if it failed any gate significantly
      if (ghostReason) {
        ghosts.push({ ir: candidate, reason: ghostReason });
      }
    }

    if (best) {
      currentFailures = runTier1(best, state).filter(r => !r.pass);
    }
  }

  // Budget exhausted — return best we found
  const finalIR = best ?? lastCandidates[lastCandidates.length - 1] ??
    (await generate(buildGenerationSpec(state, target), 1))[0];
  const finalLedger = deriveTensionLedger(state, target.sceneIdx);
  const finalQReport = runQualityEngine(finalIR, state);

  return {
    ir: finalIR,
    history,
    iterations: budget.maxIterations,
    converged: false,
    finalValuation: finalLedger.totalTension,
    finalQuality: finalQReport.score,
    finalComposite: bestComposite,
    ghosts,
  };
}
