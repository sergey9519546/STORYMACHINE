import { CharacterContext } from '../state/ncpSchema';

/**
 * The Defense Mechanism Cascade models how a character reacts under pressure.
 * As the Menace Gauge (tension) increases, characters escalate from low-level
 * defenses (e.g., humor, denial) to high-level defenses (e.g., aggression, dissociation).
 */
export class DefenseCascade {
  /**
   * Evaluates the current tension and returns the active defense mechanism
   * for a given character.
   */
  public getActiveDefense(character: CharacterContext, currentTension: number): string {
    const defenses = character.defenseMechanisms;
    
    // If the character has no defined defenses, default to a generic response.
    if (!defenses || defenses.length === 0) {
      return "flight or freeze";
    }

    // Sort defenses by severity (assuming the array is ordered from mild to severe).
    // If not ordered, we can map them to a severity scale in a more complex implementation.
    // For now, we assume the array index represents the escalation level.
    const escalationLevel = Math.floor((currentTension / 100) * defenses.length);
    
    // Cap the index to the array bounds
    const activeIndex = Math.min(escalationLevel, defenses.length - 1);
    
    return defenses[activeIndex];
  }

  /**
   * Generates a prompt instruction for the LLM based on the active defense mechanism.
   */
  public getDefenseInstruction(character: CharacterContext, currentTension: number): string {
    const activeDefense = this.getActiveDefense(character, currentTension);
    
    return `Under the current pressure (Tension: ${Math.round(currentTension)}/100), ${character.name} relies on their primary defense mechanism: ${activeDefense}. Their dialogue and actions MUST reflect this psychological state.`;
  }
}
