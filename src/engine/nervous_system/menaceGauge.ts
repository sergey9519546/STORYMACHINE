import { NarrativeStructure } from '../state/narrativeState';

/**
 * The Menace Gauge tracks and modulates the narrative tension of the story.
 * It ensures the story follows a satisfying emotional arc (e.g., rising action,
 * climax, falling action) rather than flatlining or exhausting the audience.
 */
export class MenaceGauge {
  private currentTension: number; // 0.0 to 100.0

  constructor(initialTension: number = 10) {
    this.currentTension = Math.max(0, Math.min(100, initialTension));
  }

  public getTension(): number {
    return this.currentTension;
  }

  /**
   * Increases tension based on narrative events (e.g., conflict, ticking clocks, loss).
   */
  public escalate(amount: number): void {
    this.currentTension = Math.min(100, this.currentTension + amount);
  }

  /**
   * Decreases tension after catharsis, resolution, or comedic relief.
   */
  public relieve(amount: number): void {
    this.currentTension = Math.max(0, this.currentTension - amount);
  }

  /**
   * Calculates the "ideal" tension level based on the current structural position.
   * This allows the Director agent to know if the story is currently too boring
   * or too exhausting, and adjust the next scene accordingly.
   */
  public getTargetTension(structure: NarrativeStructure): number {
    // Simplified tension curve based on standard 3-Act structure
    // Act 1: 10 -> 40 (Inciting Incident spikes it)
    // Act 2: 40 -> 80 (Midpoint spike, All Is Lost spike)
    // Act 3: 80 -> 100 (Climax) -> 10 (Resolution)
    
    const progress = structure.completionPercentage; // 0 to 100

    if (progress < 25) {
      // Act 1: Gradual rise, spike at Plot Point 1 (25%)
      return 10 + (progress / 25) * 30; 
    } else if (progress < 50) {
      // Act 2A: Rising action to Midpoint
      return 40 + ((progress - 25) / 25) * 20;
    } else if (progress < 75) {
      // Act 2B: Rising action to All Is Lost
      return 60 + ((progress - 50) / 25) * 25;
    } else if (progress < 90) {
      // Act 3: Climax
      return 85 + ((progress - 75) / 15) * 15;
    } else {
      // Resolution: Rapid drop
      return 100 - ((progress - 90) / 10) * 90;
    }
  }

  /**
   * Returns the difference between current tension and target tension.
   * Positive means we need to escalate; negative means we need to relieve.
   */
  public getTensionDelta(structure: NarrativeStructure): number {
    return this.getTargetTension(structure) - this.currentTension;
  }
}
