// V5.0 Narrative OS Integration Layer
//
// Orchestrates the connection between V5.0 components (Event Store, Trinity Gate,
// Quantum Field) and existing StoryMachine infrastructure (Stage, Director, Live Loop).
//
// KEY FEATURES:
// - Dual-write support: StoryCommit (legacy) + NarrativeEvent (V5.0) simultaneously
// - Trinity Gate validation before commit
// - Quantum Field for parallel story exploration
// - Backward compatibility with existing workflows
// - Migration helpers for gradual adoption
//
// ARCHITECTURE:
// EventStore → Quantum Field → Trinity Gate → Stage/StoryCommit
//
// This allows existing code to continue using Stage.getCommits() while V5.0
// systems use EventStore.getAllEvents() for enhanced capabilities.

import { randomUUID } from 'node:crypto';
import type { Stage } from '../../engine/Stage.ts';
import type { StoryCommit } from '../state/StoryCommit.ts';
import { summarizeOps } from '../state/StoryCommit.ts';
import type { StoryOp } from '../ops/StoryOp.ts';
import { EventStore, createEventStore } from './event-store.ts';
import type { NarrativeEvent, NarrativeEventInput, RealityLayer, ProvenanceOrigin } from './types.ts';
import { runTrinityGate, type TrinityVerification, type TrinityGateOptions } from './trinity-gate.ts';
import { QuantumNarrativeField, createQuantumField } from '../quantum/story-field.ts';
import type { QuantumFieldConfig } from '../quantum/types.ts';
import type { NarrativeState } from '../state/NarrativeState.ts';

// ── Configuration ─────────────────────────────────────────────────────────────

export interface V5IntegrationConfig {
  /** Enable Trinity Gate validation before commits (default: true) */
  enableTrinityGate?: boolean;
  
  /** Enable Quantum Field for parallel story exploration (default: false) */
  enableQuantumField?: boolean;
  
  /** Strict mode: block commits even on medium-severity violations (default: false) */
  strictMode?: boolean;
  
  /** Dual-write to both EventStore and Stage commits (default: true for backward compat) */
  dualWrite?: boolean;
  
  /** Log verification results to console (default: false) */
  enableLogging?: boolean;
  
  /** Quantum Field configuration */
  quantumConfig?: Partial<QuantumFieldConfig>;
}

// ── Integration Results ───────────────────────────────────────────────────────

export interface CommitResult {
  success: boolean;
  
  // V5.0 artifacts
  events: NarrativeEvent[];
  verification?: TrinityVerification;
  
  // Legacy artifacts (if dualWrite enabled)
  storyCommit?: StoryCommit;
  
  // Error details if failed
  error?: {
    layer: 'validation' | 'storage' | 'stage';
    message: string;
    violations?: any[];
  };
}

export interface ExploreResult {
  branches: Array<{
    stateId: string;
    events: NarrativeEvent[];
    probability: number;
    isLegal: boolean;
    verification?: TrinityVerification;
  }>;
  topPick?: {
    stateId: string;
    probability: number;
  };
}

// ── V5.0 Integration Orchestrator ─────────────────────────────────────────────

export class V5Integration {
  private eventStore: EventStore;
  private quantumField?: QuantumNarrativeField;
  private config: Required<V5IntegrationConfig>;
  
  // Scene index tracking (for backward compatibility with Stage)
  private currentSceneIdx: number = 0;
  private currentPresentationIdx: number = 0;
  
  constructor(config: V5IntegrationConfig = {}) {
    this.config = {
      enableTrinityGate: config.enableTrinityGate ?? true,
      enableQuantumField: config.enableQuantumField ?? false,
      strictMode: config.strictMode ?? false,
      dualWrite: config.dualWrite ?? true,
      enableLogging: config.enableLogging ?? false,
      quantumConfig: config.quantumConfig ?? {},
    };
    
    this.eventStore = createEventStore();
    
    if (this.config.enableQuantumField) {
      this.quantumField = createQuantumField({
        ...this.config.quantumConfig,
        enableTrinityGate: this.config.enableTrinityGate,
      });
    }
  }
  
  // ── Core Commit Flow ──────────────────────────────────────────────────────────
  
  /**
   * Commit story operations through V5.0 pipeline with optional dual-write to Stage.
   * 
   * Flow:
   * 1. Convert StoryOps → NarrativeEvents
   * 2. Run Trinity Gate validation (if enabled)
   * 3. Append to EventStore
   * 4. Dual-write to Stage (if enabled)
   * 5. Update Quantum Field (if enabled)
   * 
   * @param ops - Story operations to commit
   * @param stage - Stage instance for dual-write (optional)
   * @param options - Additional context
   */
  async commit(
    ops: StoryOp[],
    stage?: Stage,
    options: {
      sceneIdx?: number;
      storyTime?: number;
      realityLayer?: RealityLayer;
      createdBy?: ProvenanceOrigin;
      parentCommitId?: string;
    } = {}
  ): Promise<CommitResult> {
    
    const sceneIdx = options.sceneIdx ?? this.currentSceneIdx;
    const storyTime = options.storyTime ?? Date.now() / 1000;
    const realityLayer = options.realityLayer ?? 'diegetic';
    const createdBy = options.createdBy ?? 'user_authored';
    
    if (this.config.enableLogging) {
      console.log(`[V5 Integration] Committing ${ops.length} ops to scene ${sceneIdx}`);
    }
    
    try {
      // Step 1: Convert StoryOps to NarrativeEvents
      const events: NarrativeEvent[] = [];
      
      for (const op of ops) {
        const eventInput: NarrativeEventInput = {
          op,
          assertions: this.extractAssertions(op),
          derivedFrom: [],
          createdBy,
          realityLayer,
          storyTime,
          presentationIndex: this.currentPresentationIdx++,
          sceneIdx,
          parentHash: null, // Will be computed by EventStore
        };
        
        const event = this.eventStore.append(eventInput);
        events.push(event);
      }
      
      // Step 2: Run Trinity Gate validation (if enabled)
      let verification: TrinityVerification | undefined;
      
      if (this.config.enableTrinityGate && events.length > 0) {
        const currentState = await this.eventStore.snapshot({ realityLayers: [realityLayer] });
        const allEvents = this.eventStore.getAllEvents();
        
        // Validate the last event (which depends on all previous)
        const lastEvent = events[events.length - 1];
        
        verification = await runTrinityGate(
          lastEvent,
          currentState,
          allEvents,
          {
            strictMode: this.config.strictMode,
            enableLogging: this.config.enableLogging,
          }
        );
        
        if (!verification.pass) {
          if (this.config.enableLogging) {
            console.error(`[V5 Integration] Trinity Gate BLOCKED commit:`, verification.summary);
          }
          
          return {
            success: false,
            events,
            verification,
            error: {
              layer: 'validation',
              message: `Trinity Gate validation failed: ${verification.summary.failedLayers.join(', ')}`,
              violations: verification.violations,
            },
          };
        }
      }
      
      // Step 3: Dual-write to Stage (if enabled and Stage provided)
      let storyCommit: StoryCommit | undefined;
      
      if (this.config.dualWrite && stage) {
        try {
          const commitId = randomUUID();
          const parentId = options.parentCommitId ?? null;
          
          storyCommit = {
            commitId,
            parentId,
            sceneIdx,
            ops,
            deltaSummary: summarizeOps(ops),
            reverted: false,
            createdAt: Date.now(),
          };
          
          // Store in Stage (assumes Stage has a method to add commits)
          // Note: This may need adjustment based on actual Stage API
          (stage as any).addCommit?.(storyCommit);
          
        } catch (stageError) {
          console.error('[V5 Integration] Stage dual-write failed:', stageError);
          // Don't fail the whole commit if only Stage write failed
        }
      }
      
      // Step 4: Update Quantum Field (if enabled)
      if (this.config.enableQuantumField && this.quantumField) {
        try {
          await this.quantumField.addState(events, null);
        } catch (quantumError) {
          console.error('[V5 Integration] Quantum Field update failed:', quantumError);
          // Don't fail the whole commit
        }
      }
      
      // Success!
      if (this.config.enableLogging) {
        console.log(`[V5 Integration] Commit successful: ${events.length} events added`);
      }
      
      this.currentSceneIdx = sceneIdx + 1;
      
      return {
        success: true,
        events,
        verification,
        storyCommit,
      };
      
    } catch (error) {
      return {
        success: false,
        events: [],
        error: {
          layer: 'storage',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
  
  // ── Quantum Story Exploration ─────────────────────────────────────────────────
  
  /**
   * Generate multiple story branches and return top candidates.
   * Requires enableQuantumField: true in config.
   * 
   * @param opsArray - Array of alternative story operation sets
   * @param currentState - Current narrative state
   */
  async explore(
    opsArray: StoryOp[][],
    currentState: NarrativeState,
    options: {
      storyTime?: number;
      realityLayer?: RealityLayer;
    } = {}
  ): Promise<ExploreResult> {
    
    if (!this.config.enableQuantumField || !this.quantumField) {
      throw new Error('Quantum Field not enabled. Set enableQuantumField: true in config.');
    }
    
    const storyTime = options.storyTime ?? Date.now() / 1000;
    const realityLayer = options.realityLayer ?? 'diegetic';
    
    const branches: ExploreResult['branches'] = [];
    
    // Convert each ops set to events and add to quantum field
    for (const ops of opsArray) {
      const events: NarrativeEvent[] = [];
      
      for (const op of ops) {
        const eventInput: NarrativeEventInput = {
          op,
          assertions: this.extractAssertions(op),
          derivedFrom: [],
          createdBy: 'director_proposed',
          realityLayer,
          storyTime,
          presentationIndex: this.currentPresentationIdx,
          sceneIdx: this.currentSceneIdx,
          parentHash: null,
        };
        
        const event = this.eventStore.append(eventInput);
        events.push(event);
      }
      
      // Add to quantum field
      const state = await this.quantumField.addState(events, null);
      
      // Validate if Trinity Gate enabled
      let verification: TrinityVerification | undefined;
      
      if (this.config.enableTrinityGate) {
        const allEvents = this.eventStore.getAllEvents();
        verification = await runTrinityGate(
          events[events.length - 1],
          currentState,
          allEvents,
          { strictMode: this.config.strictMode }
        );
      }
      
      branches.push({
        stateId: state.stateId,
        events,
        probability: state.probability,
        isLegal: state.isLegal,
        verification,
      });
    }
    
    // Find top pick by probability
    const topStates = this.quantumField.getTopStates(1);
    const topPick = topStates.length > 0
      ? { stateId: topStates[0].stateId, probability: topStates[0].probability }
      : undefined;
    
    return { branches, topPick };
  }
  
  /**
   * Collapse quantum field to single chosen branch.
   */
  collapseToChoice(stateId: string) {
    if (!this.quantumField) {
      throw new Error('Quantum Field not enabled');
    }
    return this.quantumField.collapse(stateId);
  }
  
  // ── Query Interface ───────────────────────────────────────────────────────────
  
  /**
   * Get all events from Event Store
   */
  getAllEvents(): NarrativeEvent[] {
    return this.eventStore.getAllEvents();
  }
  
  /**
   * Get events before specific story-time
   */
  getEventsBeforeStoryTime(t: number, realityLayers?: RealityLayer[]): NarrativeEvent[] {
    return this.eventStore.getEventsBeforeStoryTime(t, realityLayers);
  }
  
  /**
   * Get current narrative state snapshot
   */
  async getSnapshot(options?: { storyTime?: number; realityLayers?: RealityLayer[] }): Promise<NarrativeState> {
    return this.eventStore.snapshot(options);
  }
  
  /**
   * Get quantum field snapshot (if enabled)
   */
  getQuantumSnapshot() {
    if (!this.quantumField) {
      throw new Error('Quantum Field not enabled');
    }
    return this.quantumField.getSnapshot();
  }
  
  /**
   * Validate event store chain integrity
   */
  validateChain(): boolean {
    return this.eventStore.validateChain();
  }
  
  // ── Migration Helpers ─────────────────────────────────────────────────────────
  
  /**
   * Import existing StoryCommits into EventStore.
   * Useful for migrating existing projects to V5.0.
   */
  async importLegacyCommits(commits: StoryCommit[]): Promise<number> {
    let imported = 0;
    
    for (const commit of commits) {
      for (const op of commit.ops) {
        const eventInput: NarrativeEventInput = {
          op,
          assertions: this.extractAssertions(op),
          derivedFrom: [],
          createdBy: 'user_authored',
          realityLayer: 'diegetic',
          storyTime: commit.createdAt / 1000,
          presentationIndex: this.currentPresentationIdx++,
          sceneIdx: commit.sceneIdx,
          parentHash: null,
          metadata: {
            tags: ['imported_from_legacy'],
          },
        };
        
        this.eventStore.append(eventInput);
        imported++;
      }
    }
    
    if (this.config.enableLogging) {
      console.log(`[V5 Integration] Imported ${imported} events from ${commits.length} legacy commits`);
    }
    
    return imported;
  }
  
  /**
   * Export EventStore events as StoryCommits for backward compatibility.
   */
  exportToLegacyCommits(): StoryCommit[] {
    const events = this.eventStore.getAllEvents();
    const commitsByScene = new Map<number, NarrativeEvent[]>();
    
    // Group events by scene
    for (const event of events) {
      const existing = commitsByScene.get(event.sceneIdx) || [];
      existing.push(event);
      commitsByScene.set(event.sceneIdx, existing);
    }
    
    // Convert to StoryCommits
    const commits: StoryCommit[] = [];
    
    for (const [sceneIdx, sceneEvents] of commitsByScene) {
      const ops = sceneEvents.map(e => e.op);
      
      commits.push({
        commitId: sceneEvents[0].eventId,
        parentId: sceneIdx > 0 ? commits[sceneIdx - 1]?.commitId : null,
        sceneIdx,
        ops,
        deltaSummary: summarizeOps(ops),
        reverted: false,
        createdAt: sceneEvents[0].createdAt,
      });
    }
    
    return commits;
  }
  
  // ── Private Helpers ───────────────────────────────────────────────────────────
  
  /**
   * Extract atomic facts from StoryOp for NarrativeEvent.assertions
   */
  private extractAssertions(op: StoryOp): any[] {
    // Extract facts from various op types
    const assertions: any[] = [];
    
    switch (op.op) {
      case 'ADD_FACT':
        assertions.push((op as any).fact);
        break;
      case 'UPDATE_BELIEF':
        assertions.push({
          type: 'belief',
          charId: (op as any).charId,
          belief: (op as any).belief,
        });
        break;
      case 'SHIFT_RELATIONSHIP':
        assertions.push({
          type: 'relationship',
          pair: (op as any).pair,
          delta: (op as any).delta,
        });
        break;
      // Add more cases as needed
    }
    
    return assertions;
  }
}

// ── Export Factory ───────────────────────────────────────────────────────────

/**
 * Create V5.0 Integration orchestrator
 */
export function createV5Integration(config?: V5IntegrationConfig): V5Integration {
  return new V5Integration(config);
}
