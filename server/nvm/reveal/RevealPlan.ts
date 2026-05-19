// RevealPlan — a commitment that a story beat cannot fire until its evidence
// trail has been laid (CLEVER_MOVES §12, Earned-Reveal principle).
// A RevealPlan is embedded in the NarrativeTransitionIR that contains the
// PAYOFF_SETUP op; the EarnedRevealProof checks the plan against state.clues.

export interface RevealPlan {
  revealId: string;
  description: string;
  requiredClueIds: string[];   // all must be in NarrativeState.clues before reveal fires
  payoffSetupId: string;       // the setupId of the PAYOFF_SETUP op this plan governs
}
