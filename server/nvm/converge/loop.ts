// Convergence Loop (G1) — AlphaZero-for-drama.
// generate → prove → value → mutate → repeat until:
//   (a) all Tier 1 proofs pass, AND
//   (b) tension valuation ≥ target.tensionTarget
// Rejected candidates go to the Ghost Ledger (A2).
// Budget limits total LLM calls.

import type { NarrativeTransitionIR } from '../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../state/NarrativeState.ts';
import type { ProofResult } from '../proof/contract.ts';
import type { TensionLedger } from '../valuation/futures.ts';
import type { MutationOperator } from './operators.ts';
import type { CandidateGenerator, SceneTarget } from '../generate/proof-spec.ts';
import type { GhostReason } from '../repro/ghost-ledger.ts';
import { runTier1, tier1Passes } from '../proof/kernel.ts';
import { deriveTensionLedger } from '../valuation/futures.ts';
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
  operator?: MutationOperator;
  ghostReason?: GhostReason;
}

export interface ConvergeResult {
  ir: NarrativeTransitionIR;
  history: ConvergeStep[];
  iterations: number;
  converged: boolean;
  finalValuation: number;
  ghosts: Array<{ ir: NarrativeTransitionIR; reason: GhostReason }>;
}

export interface ConvergeBudget {
  maxIterations: number;
  candidatesPerIteration: number;  // how many the generator produces per call
}

const DEFAULT_BUDGET: ConvergeBudget = { maxIterations: 8, candidatesPerIteration: 3 };

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

  let best: NarrativeTransitionIR | null = null;
  let bestScore = -1;
  let currentFailures: ProofResult[] = [];

  for (let iter = 0; iter < budget.maxIterations; iter++) {
    // G9: build spec from current failures + target
    const spec = buildGenerationSpec(state, target, currentFailures);

    // Generate N candidates (or mutate the best so far)
    let candidates: NarrativeTransitionIR[];
    if (best && iter > 0) {
      // After first iteration: mutate the best candidate with a randomly chosen operator
      const op = ALL_OPERATORS[randInt(prng, ALL_OPERATORS.length)];
      const mutation = applyOperator(op, best, state, seed + iter);
      candidates = [mutation.ir];
      // Also generate a fresh one to avoid local optima
      const fresh = await generate(spec, 1);
      candidates = [...candidates, ...fresh];
    } else {
      candidates = await generate(spec, budget.candidatesPerIteration);
    }

    // Evaluate each candidate
    for (const candidate of candidates) {
      const tier1Results = runTier1(candidate, state);
      const passed = tier1Passes(tier1Results);
      const ledger = deriveTensionLedger(state, target.sceneIdx);
      const valuationScore = ledger.totalTension;

      const step: ConvergeStep = {
        iteration: iter,
        candidateId: candidate.transitionId,
        tier1Results,
        passed,
        tensionLedger: ledger,
        valuationScore,
      };
      history.push(step);

      if (passed && valuationScore >= target.tensionTarget) {
        // Converged
        return {
          ir: candidate,
          history,
          iterations: iter + 1,
          converged: true,
          finalValuation: valuationScore,
          ghosts,
        };
      }

      // Track best valid candidate
      if (passed && valuationScore > bestScore) {
        best = candidate;
        bestScore = valuationScore;
      }

      // Ghost the candidate if it failed proofs
      const ghostReason: GhostReason = !passed ? 'proof_fail' : 'valuation_too_low';
      if (!passed || valuationScore < target.tensionTarget * 0.5) {
        ghosts.push({ ir: candidate, reason: ghostReason });
      }
    }

    // Update failures from the best candidate seen so far (for next iteration's spec)
    if (best) {
      currentFailures = runTier1(best, state).filter(r => !r.pass);
    }
  }

  // Budget exhausted — return best we found (may not be fully converged)
  const finalIR = best ?? (candidates => candidates[candidates.length - 1])(
    (await generate(buildGenerationSpec(state, target), 1))
  );
  const finalLedger = deriveTensionLedger(state, target.sceneIdx);

  return {
    ir: finalIR,
    history,
    iterations: budget.maxIterations,
    converged: false,
    finalValuation: finalLedger.totalTension,
    ghosts,
  };
}
