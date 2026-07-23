// ── APDL Validator ───────────────────────────────────────────────────────────
// Validates that emotional preconditions are satisfied and plans are coherent.

import type {
  APDLAction,
  APDLPlan,
  APDLWorldState,
  EmotionalPrecondition,
  EmotionalState,
} from './apdl';

import {
  isEmotionalPreconditionSatisfied,
  getEmotionIntensity,
  calculateTrajectory,
} from './apdl';

// ── Validation Results ───────────────────────────────────────────────────────

/**
 * Result of validating emotional preconditions.
 */
export interface PreconditionValidationResult {
  valid: boolean;
  violations: string[];
}

/**
 * Issue found during coherence validation.
 */
export interface CoherenceIssue {
  scene: number;
  problem: 'unearned' | 'rushed' | 'flat' | 'incoherent' | 'missing_buildup';
  description: string;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Result of validating emotional coherence.
 */
export interface CoherenceValidationResult {
  coherent: boolean;
  issues: CoherenceIssue[];
  score: number;  // 0-1, higher is better
}

// ── Precondition Validation ──────────────────────────────────────────────────

/**
 * Validate that all emotional preconditions for an action are satisfied.
 */
export function validateEmotionalPreconditions(
  action: APDLAction,
  state: APDLWorldState
): PreconditionValidationResult {
  const violations: string[] = [];
  
  for (const precond of action.emotional_preconditions) {
    if (!isEmotionalPreconditionSatisfied(precond, state)) {
      const emotionalState = state.emotional_state.get(precond.character);
      const actualIntensity = emotionalState 
        ? getEmotionIntensity(emotionalState, precond.emotion)
        : 0;
      
      let violation = `Character ${precond.character} must feel ${precond.emotion} ` +
        `at intensity ${precond.min_intensity.toFixed(2)}`;
      
      if (precond.max_intensity !== undefined) {
        violation += `-${precond.max_intensity.toFixed(2)}`;
      }
      
      violation += `, but current intensity is ${actualIntensity.toFixed(2)}`;
      
      if (precond.reason) {
        violation += ` (${precond.reason})`;
      }
      
      violations.push(violation);
    }
  }
  
  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Validate emotional preconditions for all actions in a plan.
 */
export function validatePlanPreconditions(
  plan: APDLPlan,
  actions: APDLAction[]
): PreconditionValidationResult {
  const violations: string[] = [];
  let state = plan.initial_state;
  
  for (let i = 0; i < plan.actions.length; i++) {
    const action = plan.actions[i];
    const result = validateEmotionalPreconditions(action, state);
    
    if (!result.valid) {
      violations.push(`Scene ${i + 1} (${action.name}):`);
      violations.push(...result.violations.map(v => `  ${v}`));
    }
    
    // Advance state (simplified - in real implementation would use proper state evolution)
    state = { ...state, timestamp: state.timestamp + 1 };
  }
  
  return {
    valid: violations.length === 0,
    violations,
  };
}

// ── Coherence Validation ─────────────────────────────────────────────────────

/**
 * Validate that a plan has emotional coherence.
 * Checks for:
 * - Unearned emotions (emotions without sufficient buildup)
 * - Rushed emotional arcs (too fast changes)
 * - Flat emotional trajectory (no interesting variation)
 * - Incoherent emotional sequences (illogical emotion transitions)
 */
export function validateEmotionalCoherence(plan: APDLPlan): CoherenceValidationResult {
  const issues: CoherenceIssue[] = [];
  
  // Check for flat trajectory
  const flatnessIssues = checkForFlatness(plan);
  issues.push(...flatnessIssues);
  
  // Check for unearned emotions
  const unearnedIssues = checkForUnearnedEmotions(plan);
  issues.push(...unearnedIssues);
  
  // Check for rushed arcs
  const rushedIssues = checkForRushedArcs(plan);
  issues.push(...rushedIssues);
  
  // Check for incoherent transitions
  const incoherentIssues = checkForIncoherentTransitions(plan);
  issues.push(...incoherentIssues);
  
  // Calculate coherence score
  const score = calculateCoherenceScore(issues, plan);
  
  return {
    coherent: issues.filter(i => i.severity === 'high').length === 0,
    issues,
    score,
  };
}

/**
 * Check if the emotional trajectory is too flat.
 */
function checkForFlatness(plan: APDLPlan): CoherenceIssue[] {
  const issues: CoherenceIssue[] = [];
  const trajectory = plan.emotional_trajectory;
  
  // Count flat scenes
  const flatScenes = trajectory.filter(t => t === 'flat').length;
  const totalScenes = trajectory.length;
  
  if (totalScenes > 0 && flatScenes / totalScenes > 0.7) {
    issues.push({
      scene: 0,
      problem: 'flat',
      description: `Story is emotionally flat: ${flatScenes}/${totalScenes} scenes have flat emotional trajectory`,
      severity: 'high',
    });
  } else if (totalScenes > 0 && flatScenes / totalScenes > 0.5) {
    issues.push({
      scene: 0,
      problem: 'flat',
      description: `Story has too many flat scenes: ${flatScenes}/${totalScenes}`,
      severity: 'medium',
    });
  }
  
  return issues;
}

/**
 * Check for emotions that appear without sufficient buildup.
 */
function checkForUnearnedEmotions(plan: APDLPlan): CoherenceIssue[] {
  const issues: CoherenceIssue[] = [];
  
  // Track emotional buildup for each character
  const emotionalHistory = new Map<string, Map<string, number[]>>();
  
  // Simulate plan to track emotions
  let state = plan.initial_state;
  for (let i = 0; i < plan.actions.length; i++) {
    const action = plan.actions[i];
    
    // Check effects for large jumps
    for (const effect of action.emotional_effects) {
      if (effect.delta > 0.6) {
        // Large positive emotional change - check if earned
        const charId = effect.character;
        if (charId === 'all' || charId === 'both') continue;  // Skip multi-target for now
        
        const emotionalState = state.emotional_state.get(charId);
        const currentIntensity = emotionalState 
          ? getEmotionIntensity(emotionalState, effect.emotion)
          : 0;
        
        // If emotion jumps from near-zero to high, it might be unearned
        if (currentIntensity < 0.2 && effect.delta > 0.7) {
          issues.push({
            scene: i,
            problem: 'unearned',
            description: `Character ${charId} experiences strong ${effect.emotion} (${effect.delta.toFixed(2)}) without buildup`,
            severity: 'high',
          });
        }
      }
    }
    
    state = { ...state, timestamp: state.timestamp + 1 };
  }
  
  return issues;
}

/**
 * Check for emotional arcs that change too quickly.
 */
function checkForRushedArcs(plan: APDLPlan): CoherenceIssue[] {
  const issues: CoherenceIssue[] = [];
  
  // Check for rapid trajectory changes
  for (let i = 1; i < plan.emotional_trajectory.length; i++) {
    const prev = plan.emotional_trajectory[i - 1];
    const curr = plan.emotional_trajectory[i];
    
    // Check for rapid oscillation (rising -> falling or vice versa in one step)
    if ((prev === 'rising' && curr === 'falling') || (prev === 'falling' && curr === 'rising')) {
      issues.push({
        scene: i,
        problem: 'rushed',
        description: `Emotional arc changes too quickly from ${prev} to ${curr}`,
        severity: 'medium',
      });
    }
  }
  
  // Check action sequences for rushed beats
  for (let i = 0; i < plan.actions.length - 1; i++) {
    const action = plan.actions[i];
    const nextAction = plan.actions[i + 1];
    
    // Check for conflicting high-weight actions in sequence
    const weight1 = action.dramatic_weight || 0;
    const weight2 = nextAction.dramatic_weight || 0;
    
    if (weight1 >= 8 && weight2 >= 8) {
      issues.push({
        scene: i + 1,
        problem: 'rushed',
        description: `Two major dramatic beats (weight ${weight1}, ${weight2}) occur back-to-back without breathing room`,
        severity: 'medium',
      });
    }
  }
  
  return issues;
}

/**
 * Check for emotionally incoherent transitions.
 */
function checkForIncoherentTransitions(plan: APDLPlan): CoherenceIssue[] {
  const issues: CoherenceIssue[] = [];
  
  // Define incompatible emotion pairs (can't transition directly)
  const incompatiblePairs: Array<[string, string]> = [
    ['joy', 'distress'],
    ['pride', 'shame'],
    ['love', 'contempt'],
    ['trust', 'betrayed'],
  ];
  
  // Simulate and check transitions
  let state = plan.initial_state;
  for (let i = 0; i < plan.actions.length; i++) {
    const action = plan.actions[i];
    
    // Check each character's emotional transitions
    for (const [charId, emotionalState] of state.emotional_state) {
      const dominant = emotionalState.dominant;
      if (!dominant) continue;
      
      // Check action effects on this character
      for (const effect of action.emotional_effects) {
        if (effect.character !== charId && effect.character !== 'all' && effect.character !== 'both') {
          continue;
        }
        
        // Check if transition is incompatible
        for (const [from, to] of incompatiblePairs) {
          if (dominant === from && effect.emotion === to && effect.delta > 0.5) {
            issues.push({
              scene: i,
              problem: 'incoherent',
              description: `Character ${charId} transitions abruptly from ${from} to ${to} without intermediate emotional states`,
              severity: 'medium',
            });
          }
        }
      }
    }
    
    state = { ...state, timestamp: state.timestamp + 1 };
  }
  
  return issues;
}

/**
 * Calculate overall coherence score based on issues found.
 */
function calculateCoherenceScore(issues: CoherenceIssue[], plan: APDLPlan): number {
  let score = 1.0;
  
  // Deduct for each issue based on severity
  for (const issue of issues) {
    switch (issue.severity) {
      case 'high':
        score -= 0.2;
        break;
      case 'medium':
        score -= 0.1;
        break;
      case 'low':
        score -= 0.05;
        break;
    }
  }
  
  // Bonus for catharsis points
  score += plan.catharsis_points.length * 0.05;
  
  // Bonus for emotional variance
  if (plan.emotional_trajectory.filter(t => t !== 'flat').length > plan.emotional_trajectory.length * 0.5) {
    score += 0.1;
  }
  
  return Math.max(0, Math.min(1, score));
}

// ── Action-Level Validation ──────────────────────────────────────────────────

/**
 * Validate a single action in context.
 */
export function validateAction(
  action: APDLAction,
  state: APDLWorldState,
  previousActions: APDLAction[]
): {
  valid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Check emotional preconditions
  const precondResult = validateEmotionalPreconditions(action, state);
  if (!precondResult.valid) {
    errors.push(...precondResult.violations);
  }
  
  // Check for too many high-weight actions in a row
  const recentHighWeight = previousActions
    .slice(-2)
    .filter(a => (a.dramatic_weight || 0) >= 8)
    .length;
  
  if (recentHighWeight >= 2 && (action.dramatic_weight || 0) >= 8) {
    warnings.push('Three major dramatic beats in a row may feel rushed');
  }
  
  // Check for emotional coherence with previous action
  if (previousActions.length > 0) {
    const prevAction = previousActions[previousActions.length - 1];
    const coherenceIssue = checkActionCoherence(prevAction, action, state);
    if (coherenceIssue) {
      warnings.push(coherenceIssue);
    }
  }
  
  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * Check if two consecutive actions are emotionally coherent.
 */
function checkActionCoherence(
  prevAction: APDLAction,
  currAction: APDLAction,
  state: APDLWorldState
): string | null {
  // Check for contradictory emotional effects
  // E.g., "betray" followed immediately by "reconcile"
  
  const contradictoryPairs: Array<[string, string]> = [
    ['betray', 'reconcile'],
    ['threaten', 'offer_support'],
    ['confront', 'de_escalate'],
  ];
  
  for (const [first, second] of contradictoryPairs) {
    if (prevAction.name === first && currAction.name === second) {
      return `Action sequence ${first} → ${second} may be too abrupt without intermediate beats`;
    }
  }
  
  return null;
}

// ── Plan Summary ─────────────────────────────────────────────────────────────

/**
 * Generate a human-readable summary of plan validation.
 */
export function generateValidationSummary(
  precondResult: PreconditionValidationResult,
  coherenceResult: CoherenceValidationResult
): string {
  const lines: string[] = [];
  
  lines.push('=== APDL Plan Validation Summary ===\n');
  
  // Preconditions
  lines.push('Emotional Preconditions:');
  if (precondResult.valid) {
    lines.push('  ✓ All emotional preconditions satisfied');
  } else {
    lines.push(`  ✗ ${precondResult.violations.length} violation(s):`);
    precondResult.violations.forEach(v => lines.push(`    - ${v}`));
  }
  lines.push('');
  
  // Coherence
  lines.push('Emotional Coherence:');
  lines.push(`  Score: ${(coherenceResult.score * 100).toFixed(1)}%`);
  
  if (coherenceResult.coherent) {
    lines.push('  ✓ Plan is emotionally coherent');
  } else {
    lines.push('  ✗ Plan has coherence issues');
  }
  
  if (coherenceResult.issues.length > 0) {
    lines.push(`  Issues found: ${coherenceResult.issues.length}`);
    
    const highSeverity = coherenceResult.issues.filter(i => i.severity === 'high');
    const mediumSeverity = coherenceResult.issues.filter(i => i.severity === 'medium');
    const lowSeverity = coherenceResult.issues.filter(i => i.severity === 'low');
    
    if (highSeverity.length > 0) {
      lines.push(`    High severity: ${highSeverity.length}`);
      highSeverity.forEach(i => lines.push(`      - Scene ${i.scene}: ${i.description}`));
    }
    
    if (mediumSeverity.length > 0) {
      lines.push(`    Medium severity: ${mediumSeverity.length}`);
      mediumSeverity.forEach(i => lines.push(`      - Scene ${i.scene}: ${i.description}`));
    }
    
    if (lowSeverity.length > 0) {
      lines.push(`    Low severity: ${lowSeverity.length}`);
    }
  } else {
    lines.push('  No issues found');
  }
  
  return lines.join('\n');
}
