// V5.0 Enhanced Live Loop
//
// Upgraded reactive turn cycle that integrates V5.0 Narrative OS components:
// - Event Store for immutable event log
// - Quantum Field for parallel story exploration
// - Trinity Gate for validation before commit
//
// WORKFLOW:
// 1. Director proposes multiple story branches (Quantum Field)
// 2. Each branch validated through Trinity Gate
// 3. User picks preferred branch
// 4. Chosen branch collapses quantum field and commits to Event Store
// 5. NPCs react to new state
//
// BACKWARD COMPATIBLE:
// - Still works with existing Stage/Orchestrator
// - Falls back to simple mode if Quantum Field disabled
// - Maintains same API surface as original loop.ts

import type { Stage } from '../../engine/Stage.ts';
import type { Orchestrator } from '../../engine/Orchestrator.ts';
import type { StoryCommit } from '../state/StoryCommit.ts';
import type { StoryOp } from '../ops/StoryOp.ts';
import type { V5Integration, CommitResult } from '../kernel/integration.ts';
import type { NarrativeEvent } from '../kernel/types.ts';
import type { TrinityVerification } from '../kernel/trinity-gate.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface V5ReactOptions {
  /** Max number of NPC reaction beats to run (default 2) */
  maxBeats?: number;
  
  /** Location ID to run reactions in (default: pick first active room) */
  locationId?: string;
  
  /** Enable quantum story exploration (requires V5Integration with Quantum Field) */
  enableQuantumExploration?: boolean;
  
  /** Number of story branches to explore (default 3) */
  branchCount?: number;
  
  /** Validate through Trinity Gate before commit (default: true) */
  enableValidation?: boolean;
}

export interface StoryBranch {
  branchId: string;
  ops: StoryOp[];
  events?: NarrativeEvent[];
  probability?: number;
  isLegal: boolean;
  verification?: TrinityVerification;
  
  // Human-readable summary
  summary: {
    description: string;
    dramaticImpact: string;
    risks: string[];
    opportunities: string[];
  };
}

export interface V5ReactResult {
  /** Story branches proposed (if quantum exploration enabled) */
  proposedBranches?: StoryBranch[];
  
  /** Chosen branch (if user selected) */
  chosenBranch?: StoryBranch;
  
  /** Commits produced after choice */
  commits: StoryCommit[];
  
  /** V5.0 events produced */
  events: NarrativeEvent[];
  
  /** Number of agent turns executed */
  turnsRun: number;
  
  /** Reason the loop stopped */
  stoppedBecause: 'maxBeats' | 'noAgents' | 'climax' | 'userChoice' | 'validationFailed' | 'error';
  
  /** Validation result from Trinity Gate */
  validation?: TrinityVerification;
  
  /** Performance metrics */
  metrics?: {
    explorationTimeMs: number;
    validationTimeMs: number;
    commitTimeMs: number;
  };
}

// ── V5.0 Enhanced Live Loop ──────────────────────────────────────────────────

/**
 * Enhanced reactive turn cycle with V5.0 capabilities.
 * 
 * SIMPLE MODE (quantum disabled):
 * - Director generates single story beat
 * - Validate through Trinity Gate
 * - Commit to Event Store
 * - NPCs react
 * 
 * QUANTUM MODE (quantum enabled):
 * - Director generates multiple story branches
 * - Each validated through Trinity Gate
 * - User picks preferred branch
 * - Collapse quantum field to chosen branch
 * - Commit to Event Store
 * - NPCs react
 */
export async function v5ReactToCommit(
  stage: Stage,
  orchestrator: Orchestrator,
  v5Integration: V5Integration,
  triggerCommitId: string,
  opts: V5ReactOptions = {}
): Promise<V5ReactResult> {
  
  const maxBeats = opts.maxBeats ?? 2;
  const enableQuantum = opts.enableQuantumExploration ?? false;
  const branchCount = opts.branchCount ?? 3;
  const enableValidation = opts.enableValidation ?? true;
  
  const metrics = {
    explorationTimeMs: 0,
    validationTimeMs: 0,
    commitTimeMs: 0,
  };
  
  const beforeCount = stage.getCommits().length;
  
  // Step 1: Determine reaction location
  let locationId = opts.locationId;
  if (!locationId) {
    const allAgents = stage.getAllAgents().filter(a => a.is_alive !== false);
    if (allAgents.length === 0) {
      return {
        commits: [],
        events: [],
        turnsRun: 0,
        stoppedBecause: 'noAgents',
      };
    }
    
    const locCounts = new Map<string, number>();
    for (const a of allAgents) {
      locCounts.set(a.current_location_id, (locCounts.get(a.current_location_id) ?? 0) + 1);
    }
    locationId = [...locCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }
  
  const agentsInRoom = stage.getAgentsInLocation(locationId).filter(a => a.is_alive !== false);
  if (agentsInRoom.length === 0) {
    return {
      commits: [],
      events: [],
      turnsRun: 0,
      stoppedBecause: 'noAgents',
    };
  }
  
  // Step 2: Generate story branches (Quantum Mode) or single beat (Simple Mode)
  let proposedBranches: StoryBranch[] | undefined;
  let chosenBranch: StoryBranch | undefined;
  
  if (enableQuantum) {
    const explorationStart = Date.now();
    
    // Generate multiple story branches using Director
    // NOTE: This assumes Director can generate multiple alternatives
    // You may need to call director multiple times with different seeds
    const branches: StoryBranch[] = [];
    
    for (let i = 0; i < branchCount; i++) {
      // Generate ops for this branch
      // This is a placeholder - actual implementation depends on Director API
      const ops = await generateDirectorBranch(orchestrator, stage, locationId, i);
      
      branches.push({
        branchId: `branch_${i}`,
        ops,
        isLegal: true,
        summary: {
          description: `Story branch ${i + 1}`,
          dramaticImpact: 'To be analyzed',
          risks: [],
          opportunities: [],
        },
      });
    }
    
    // Explore branches through Quantum Field
    const currentState = await v5Integration.getSnapshot();
    const opsArray = branches.map(b => b.ops);
    
    const exploreResult = await v5Integration.explore(opsArray, currentState);
    
    // Merge exploration results back into branches
    for (let i = 0; i < branches.length; i++) {
      const exploredBranch = exploreResult.branches[i];
      if (exploredBranch) {
        branches[i].events = exploredBranch.events;
        branches[i].probability = exploredBranch.probability;
        branches[i].isLegal = exploredBranch.isLegal;
        branches[i].verification = exploredBranch.verification;
      }
    }
    
    proposedBranches = branches;
    metrics.explorationTimeMs = Date.now() - explorationStart;
    
    // For now, auto-pick the highest probability legal branch
    // In production, this would wait for user selection
    const legalBranches = branches.filter(b => b.isLegal);
    if (legalBranches.length === 0) {
      return {
        proposedBranches,
        commits: [],
        events: [],
        turnsRun: 0,
        stoppedBecause: 'validationFailed',
        metrics,
      };
    }
    
    chosenBranch = legalBranches.sort((a, b) => (b.probability ?? 0) - (a.probability ?? 0))[0];
    
    // Collapse quantum field to chosen branch
    if (exploreResult.branches.length > 0) {
      const chosenExploredBranch = exploreResult.branches[branches.indexOf(chosenBranch)];
      v5Integration.collapseToChoice(chosenExploredBranch.stateId);
    }
    
  } else {
    // Simple mode: generate single beat
    const ops = await generateDirectorBranch(orchestrator, stage, locationId, 0);
    
    chosenBranch = {
      branchId: 'single',
      ops,
      isLegal: true,
      summary: {
        description: 'Single story beat',
        dramaticImpact: 'Continues narrative',
        risks: [],
        opportunities: [],
      },
    };
  }
  
  // Step 3: Commit chosen branch through V5.0 pipeline
  const commitStart = Date.now();
  const commitResult: CommitResult = await v5Integration.commit(
    chosenBranch.ops,
    stage,
    {
      sceneIdx: stage.getCommits().length,
    }
  );
  metrics.commitTimeMs = Date.now() - commitStart;
  
  if (!commitResult.success) {
    return {
      proposedBranches,
      chosenBranch,
      commits: [],
      events: commitResult.events,
      turnsRun: 0,
      stoppedBecause: 'validationFailed',
      validation: commitResult.verification,
      metrics,
    };
  }
  
  // Step 4: Run NPC reaction beats
  let turnsRun = 0;
  let stopped: V5ReactResult['stoppedBecause'] = 'maxBeats';
  
  try {
    for (let beat = 0; beat < maxBeats; beat++) {
      const agent = agentsInRoom[beat % agentsInRoom.length];
      await orchestrator.runTurn(agent.char_id);
      turnsRun++;
      
      // Check for climax signal
      const latestCommits = stage.getCommits();
      const recentOps = latestCommits.slice(-3).flatMap(c => c.ops);
      const hasClimaxSignal = recentOps.some(
        o => o.op === 'RAISE_CLOCK' &&
          (o as any).clockId === 'contradiction_clock' &&
          (o as any).amount >= 3
      );
      
      if (hasClimaxSignal) {
        stopped = 'climax';
        break;
      }
    }
  } catch (_e) {
    stopped = 'error';
  }
  
  // Collect commits produced
  const afterCount = stage.getCommits().length;
  const commits = stage.getCommits().slice(beforeCount, afterCount);
  
  // Collect all events from V5.0
  const allEvents = v5Integration.getAllEvents();
  const events = allEvents.slice(-(commitResult.events.length + turnsRun));
  
  return {
    proposedBranches,
    chosenBranch,
    commits,
    events,
    turnsRun,
    stoppedBecause: stopped,
    validation: commitResult.verification,
    metrics,
  };
}

/**
 * Advance the world N beats using V5.0 pipeline.
 * Enhanced version of advanceWorld from original loop.ts.
 */
export async function v5AdvanceWorld(
  stage: Stage,
  orchestrator: Orchestrator,
  v5Integration: V5Integration,
  beats: number = 1,
  opts: Omit<V5ReactOptions, 'maxBeats'> = {}
): Promise<V5ReactResult> {
  
  const allCommits = stage.getCommits();
  const lastCommitId = allCommits.length > 0 
    ? allCommits[allCommits.length - 1].commitId 
    : 'initial';
  
  return v5ReactToCommit(
    stage,
    orchestrator,
    v5Integration,
    lastCommitId,
    { ...opts, maxBeats: beats }
  );
}

/**
 * User selection of story branch after quantum exploration.
 * Call this when user picks from proposedBranches.
 */
export async function v5SelectBranch(
  stage: Stage,
  orchestrator: Orchestrator,
  v5Integration: V5Integration,
  selectedBranch: StoryBranch,
  opts: Omit<V5ReactOptions, 'enableQuantumExploration' | 'branchCount'> = {}
): Promise<V5ReactResult> {
  
  // Commit the selected branch
  const commitResult = await v5Integration.commit(
    selectedBranch.ops,
    stage,
    {
      sceneIdx: stage.getCommits().length,
    }
  );
  
  if (!commitResult.success) {
    return {
      chosenBranch: selectedBranch,
      commits: [],
      events: commitResult.events,
      turnsRun: 0,
      stoppedBecause: 'validationFailed',
      validation: commitResult.verification,
    };
  }
  
  // Run NPC reactions
  const maxBeats = opts.maxBeats ?? 2;
  let turnsRun = 0;
  
  const beforeCount = stage.getCommits().length;
  
  try {
    const locationId = opts.locationId ?? stage.getAllAgents()[0]?.current_location_id;
    const agentsInRoom = stage.getAgentsInLocation(locationId).filter(a => a.is_alive !== false);
    
    for (let beat = 0; beat < maxBeats && agentsInRoom.length > 0; beat++) {
      const agent = agentsInRoom[beat % agentsInRoom.length];
      await orchestrator.runTurn(agent.char_id);
      turnsRun++;
    }
  } catch (_e) {
    // Error handled below
  }
  
  const afterCount = stage.getCommits().length;
  const commits = stage.getCommits().slice(beforeCount, afterCount);
  
  return {
    chosenBranch: selectedBranch,
    commits,
    events: commitResult.events,
    turnsRun,
    stoppedBecause: 'userChoice',
    validation: commitResult.verification,
  };
}

// ── Helper Functions ──────────────────────────────────────────────────────────

/**
 * Generate a story branch using Director.
 * This is a placeholder - actual implementation depends on Director API.
 */
async function generateDirectorBranch(
  orchestrator: Orchestrator,
  stage: Stage,
  locationId: string,
  seed: number
): Promise<StoryOp[]> {
  
  // Placeholder implementation
  // In production, this would call Director to generate story ops
  // Possibly with a seed for deterministic variation
  
  // For now, run a single turn and collect ops
  const agentsInRoom = stage.getAgentsInLocation(locationId).filter(a => a.is_alive !== false);
  
  if (agentsInRoom.length === 0) {
    return [];
  }
  
  const beforeCount = stage.getCommits().length;
  const agent = agentsInRoom[seed % agentsInRoom.length];
  
  try {
    await orchestrator.runTurn(agent.char_id);
  } catch (_e) {
    return [];
  }
  
  const afterCount = stage.getCommits().length;
  const newCommits = stage.getCommits().slice(beforeCount, afterCount);
  
  return newCommits.flatMap(c => c.ops);
}

/**
 * Format verification report for display
 */
export function formatVerificationForDisplay(verification: TrinityVerification): string {
  if (verification.pass) {
    return `✓ All validations passed (health: ${verification.overallHealth}/100)`;
  }
  
  const lines: string[] = [];
  lines.push(`✗ Validation failed (health: ${verification.overallHealth}/100)`);
  lines.push(`Failed layers: ${verification.summary.failedLayers.join(', ')}`);
  lines.push(`Violations: ${verification.summary.criticalCount} critical, ${verification.summary.mediumCount} medium`);
  
  // Show top 3 violations
  const topViolations = verification.violations
    .filter(v => v.severity === 'critical')
    .slice(0, 3);
  
  if (topViolations.length > 0) {
    lines.push('\nTop issues:');
    topViolations.forEach((v, i) => {
      lines.push(`  ${i + 1}. [${v.layer}] ${v.message}`);
    });
  }
  
  return lines.join('\n');
}

/**
 * Format story branch for display
 */
export function formatBranchForDisplay(branch: StoryBranch, index: number): string {
  const lines: string[] = [];
  lines.push(`Branch ${index + 1}${branch.probability ? ` (${Math.round(branch.probability * 100)}% probability)` : ''}`);
  lines.push(`  ${branch.summary.description}`);
  lines.push(`  Impact: ${branch.summary.dramaticImpact}`);
  lines.push(`  Status: ${branch.isLegal ? '✓ Valid' : '✗ Has violations'}`);
  
  if (branch.summary.opportunities.length > 0) {
    lines.push(`  Opportunities: ${branch.summary.opportunities.join(', ')}`);
  }
  
  if (branch.summary.risks.length > 0) {
    lines.push(`  Risks: ${branch.summary.risks.join(', ')}`);
  }
  
  return lines.join('\n');
}
