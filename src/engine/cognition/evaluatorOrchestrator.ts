import { SymbolicState, NarrativeStructure } from '../state/narrativeState';

/**
 * The 5-Evaluator Scoring Algorithm.
 * These agents evaluate a generated scene or proposed action against the
 * core pillars of the narrative engine.
 */
export interface EvaluationScore {
  agent: "Storymind" | "Narrator" | "Ego" | "Superego" | "Director";
  score: number; // 0.0 to 1.0
  feedback: string;
  isVeto: boolean; // If true, the scene is rejected entirely.
}

export class EvaluatorOrchestrator {
  /**
   * Evaluates a proposed scene against the 5 core agents.
   * Returns an array of scores and a final decision (accept/reject/rewrite).
   */
  public evaluateScene(
    sceneText: string,
    state: SymbolicState,
    structure: NarrativeStructure
  ): {
    scores: EvaluationScore[];
    finalDecision: "accept" | "reject" | "rewrite";
    averageScore: number;
  } {
    const scores: EvaluationScore[] = [
      this.evaluateStorymind(sceneText, state, structure),
      this.evaluateNarrator(sceneText, state),
      this.evaluateEgo(sceneText, state),
      this.evaluateSuperego(sceneText, state),
      this.evaluateDirector(sceneText, state)
    ];

    // Check for any absolute vetos (e.g., breaking a diegetic rule)
    const hasVeto = scores.some(s => s.isVeto);
    if (hasVeto) {
      return { scores, finalDecision: "reject", averageScore: 0 };
    }

    // Calculate the Act-weighted average score
    const averageScore = this.calculateActWeightedScore(scores, structure.currentAct);

    // Thresholds for acceptance
    let finalDecision: "accept" | "reject" | "rewrite" = "accept";
    if (averageScore < 0.6) {
      finalDecision = "reject";
    } else if (averageScore < 0.8) {
      finalDecision = "rewrite";
    }

    return { scores, finalDecision, averageScore };
  }

  // --- The 5 Evaluators ---

  /**
   * 1. Storymind: Evaluates structural integrity, causality, and progression
   * toward the next bottleneck beat.
   */
  private evaluateStorymind(sceneText: string, state: SymbolicState, structure: NarrativeStructure): EvaluationScore {
    // Logic: Does this scene logically follow the previous causal links?
    // Does it move the plot closer to the current structural node?
    let score = 0.8; // Placeholder
    let feedback = "Causality is maintained. Progression is clear.";
    let isVeto = false;

    // Example Veto: The scene contradicts established ground truth (Fabula).
    // if (violatesGroundTruth(sceneText, state.fabula)) {
    //   score = 0;
    //   feedback = "VETO: Scene contradicts established physical reality.";
    //   isVeto = true;
    // }

    return { agent: "Storymind", score, feedback, isVeto };
  }

  /**
   * 2. Narrator: Evaluates the presentation (Syuzhet), information asymmetry,
   * and the handling of the unreliable narrator score.
   */
  private evaluateNarrator(sceneText: string, state: SymbolicState): EvaluationScore {
    // Logic: Is the information doled out correctly? Are we maintaining the
    // desired level of epistemic dissonance (audience knows more/less than character)?
    let score = 0.85; // Placeholder
    let feedback = "Information asymmetry is effectively managed.";
    
    // If the unreliable narrator score is high, the scene *should* contain
    // subjective distortions.
    if (state.syuzhet.unreliableNarratorScore > 70) {
      // if (!containsSubjectiveDistortion(sceneText)) {
      //   score -= 0.3;
      //   feedback = "Narrator is too objective given the high unreliability score.";
      // }
    }

    return { agent: "Narrator", score, feedback, isVeto: false };
  }

  /**
   * 3. Ego: Evaluates the protagonist's pursuit of their conscious Want.
   */
  private evaluateEgo(sceneText: string, state: SymbolicState): EvaluationScore {
    // Logic: Is the character actively trying to achieve their goal?
    // Are they using their established defense mechanisms?
    let score = 0.75; // Placeholder
    let feedback = "Character is actively pursuing their conscious goal.";
    return { agent: "Ego", score, feedback, isVeto: false };
  }

  /**
   * 4. Superego: Evaluates the thematic pressure and the protagonist's
   * unconscious Need.
   */
  private evaluateSuperego(sceneText: string, state: SymbolicState): EvaluationScore {
    // Logic: Is the character's flaw being exposed? Is the theme resonating?
    let score = 0.9; // Placeholder
    let feedback = "Thematic pressure is strong; the flaw is visible.";
    return { agent: "Superego", score, feedback, isVeto: false };
  }

  /**
   * 5. Director: Evaluates pacing, tension (Menace Gauge), and aesthetic constraints.
   */
  private evaluateDirector(sceneText: string, state: SymbolicState): EvaluationScore {
    // Logic: Does the scene adhere to the non-diegetic rules (e.g., "no on-the-nose dialogue")?
    // Is the tension appropriate for the current structural position?
    let score = 0.8; // Placeholder
    let feedback = "Pacing is tight. Tension matches the Menace Gauge.";
    let isVeto = false;

    // Example Veto: The scene violates a hard formatting or stylistic constraint.
    // if (violatesNonDiegeticRule(sceneText)) {
    //   score = 0;
    //   feedback = "VETO: Scene violates a core stylistic constraint.";
    //   isVeto = true;
    // }

    return { agent: "Director", score, feedback, isVeto };
  }

  // --- Act-Weighted Math ---

  /**
   * Calculates the final score by weighting the evaluators differently
   * depending on the current Act.
   * 
   * Act 1: Ego (Want) and Storymind (Setup) are weighted heavily.
   * Act 2: Director (Tension/Pacing) and Narrator (Information) take precedence.
   * Act 3: Superego (Need/Theme) and Storymind (Payoff) dominate.
   */
  private calculateActWeightedScore(scores: EvaluationScore[], currentAct: number): number {
    const weights = this.getWeightsForAct(currentAct);
    
    let totalScore = 0;
    let totalWeight = 0;

    for (const scoreObj of scores) {
      const weight = weights[scoreObj.agent] || 1.0;
      totalScore += scoreObj.score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  private getWeightsForAct(act: number): Record<string, number> {
    switch (act) {
      case 1:
        return {
          Storymind: 1.5, // Establishing the rules/world
          Ego: 1.5,       // Establishing the conscious desire
          Narrator: 1.0,
          Superego: 0.5,  // Need is hidden
          Director: 1.0
        };
      case 2:
        return {
          Storymind: 1.0,
          Ego: 1.0,
          Narrator: 1.5,  // Managing the mystery/revelations
          Superego: 1.0,
          Director: 1.5   // Managing the rising tension (Menace Gauge)
        };
      case 3:
        return {
          Storymind: 1.5, // Paying off the setups
          Ego: 0.5,       // Want is usually abandoned or achieved
          Narrator: 1.0,
          Superego: 1.5,  // Thematic realization / Need is addressed
          Director: 1.0
        };
      default:
        // Default balanced weights
        return {
          Storymind: 1.0, Ego: 1.0, Narrator: 1.0, Superego: 1.0, Director: 1.0
        };
    }
  }
}
