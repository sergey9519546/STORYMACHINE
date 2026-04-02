import { CharacterContext } from '../state/ncpSchema';
import { SymbolicState } from '../state/narrativeState';

/**
 * The Trinity Framework represents the core psychological modeling of a character.
 * It divides decision-making into three distinct agents:
 * 1. Id: Primal urges, immediate gratification, survival instincts.
 * 2. Ego: Conscious desires, rational planning, navigating reality.
 * 3. Superego: Moral compass, societal expectations, unconscious needs.
 */
export interface TrinityDecision {
  agent: "Id" | "Ego" | "Superego";
  proposedAction: string;
  justification: string;
  weight: number; // 0.0 to 1.0
}

export class TrinityAgent {
  private character: CharacterContext;

  constructor(character: CharacterContext) {
    this.character = character;
  }

  /**
   * Simulates the internal conflict of a character when faced with a situation.
   * Returns the proposed actions from the Id, Ego, and Superego.
   */
  public evaluateSituation(situationDescription: string, state: SymbolicState): TrinityDecision[] {
    // In a full implementation, this would call the LLMAdapter to generate
    // these responses based on the character's profile and the current state.
    // For the core engine, we define the structure and the weighting logic.

    const idWeight = this.calculateIdWeight(state);
    const egoWeight = this.calculateEgoWeight(state);
    const superegoWeight = this.calculateSuperegoWeight(state);

    return [
      {
        agent: "Id",
        proposedAction: `[Id Action based on survival/gratification]`,
        justification: `Driven by primal instinct in response to: ${situationDescription}`,
        weight: idWeight,
      },
      {
        agent: "Ego",
        proposedAction: `[Ego Action based on conscious want: ${this.character.consciousWant}]`,
        justification: `Rational attempt to achieve goal while managing reality.`,
        weight: egoWeight,
      },
      {
        agent: "Superego",
        proposedAction: `[Superego Action based on unconscious need: ${this.character.unconsciousNeed}]`,
        justification: `Moral or psychological imperative overriding immediate desires.`,
        weight: superegoWeight,
      }
    ];
  }

  /**
   * Synthesizes the conflicting desires into a final chosen action.
   * The highest weighted agent "wins", but the others influence the *how*.
   */
  public synthesizeDecision(decisions: TrinityDecision[]): string {
    // Sort by weight descending
    const sorted = [...decisions].sort((a, b) => b.weight - a.weight);
    const primary = sorted[0];
    const secondary = sorted[1];

    // The primary agent dictates the action, the secondary colors the execution.
    return `The character acts primarily on their ${primary.agent} (${primary.proposedAction}), but it is colored by their ${secondary.agent} (${secondary.justification}).`;
  }

  // --- Weighting Algorithms ---

  private calculateIdWeight(state: SymbolicState): number {
    // Id spikes when physical danger is high or resources are low.
    // Placeholder logic:
    let weight = 0.3;
    // if (state.fabula.dangerLevel > 80) weight += 0.5;
    return Math.min(1.0, weight);
  }

  private calculateEgoWeight(state: SymbolicState): number {
    // Ego is the default driver, especially when the conscious goal is near.
    let weight = 0.6;
    // if (state.syuzhet.activeDissonance.epistemic < 30) weight += 0.2; // Clear path
    return Math.min(1.0, weight);
  }

  private calculateSuperegoWeight(state: SymbolicState): number {
    // Superego spikes during moral dilemmas or when the unconscious need is triggered.
    let weight = 0.4;
    // if (state.syuzhet.activeDissonance.thematic > 70) weight += 0.4; // High thematic tension
    return Math.min(1.0, weight);
  }
}
