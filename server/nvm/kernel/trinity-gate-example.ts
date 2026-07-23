// Trinity Gate — Example Usage and Integration
//
// Demonstrates how to use the Trinity Verification Gate in production scenarios:
// 1. Single event verification before commit
// 2. Batch event verification
// 3. Integration with EventStore
// 4. Error handling and repair suggestions
// 5. Logging and monitoring

import { createEventStore } from './event-store.ts';
import { runTrinityGate, quickVerify, verifyEventSequence, formatVerificationReport, type TrinityVerification } from './trinity-gate.ts';
import type { NarrativeEvent, NarrativeEventInput } from './types.ts';
import type { NarrativeState } from '../state/NarrativeState.ts';
import { emptyState } from '../state/NarrativeState.ts';

// ── Example 1: Single Event Verification ──────────────────────────────────────

/**
 * Basic usage: Verify a single event before committing to EventStore.
 */
export async function example1_singleEventVerification() {
  console.log('\n=== Example 1: Single Event Verification ===\n');
  
  // Create event store and state
  const store = createEventStore();
  const state = emptyState();
  
  // Create a proposed event
  const eventInput: NarrativeEventInput = {
    op: {
      op: 'ADD_FACT',
      fact: {
        factId: 'fact_001',
        subject: 'CHAR_Alice',
        predicate: 'located_at',
        object: 'LOC_Kitchen',
        addedAtTurn: 1,
        validFrom: 0,
        validTo: null,
      },
    },
    assertions: [],
    derivedFrom: [],
    createdBy: 'user_authored',
    realityLayer: 'diegetic',
    sceneIdx: 0,
    storyTime: 0,
    presentationIndex: 0,
    parentHash: null,
  };
  
  // Append to get full event with hash
  const event = store.append(eventInput);
  
  // Run Trinity Gate verification
  const verification = await runTrinityGate(event, state, store.getAllEvents(), {
    enableLogging: true,
  });
  
  if (verification.pass) {
    console.log('✓ Event PASSED all three verification layers');
    console.log(`  Overall Health: ${verification.overallHealth}/100`);
  } else {
    console.log('✗ Event FAILED verification');
    console.log(formatVerificationReport(verification));
  }
}

// ── Example 2: Quick Verification ─────────────────────────────────────────────

/**
 * Fast verification: Only check pass/fail and critical violations.
 */
export async function example2_quickVerification() {
  console.log('\n=== Example 2: Quick Verification ===\n');
  
  const store = createEventStore();
  const state = emptyState();
  
  const eventInput: NarrativeEventInput = {
    op: {
      op: 'PAYOFF_SETUP',
      setupId: 'clue_mysterious_key',  // Not seeded yet - should fail
      payoffEventId: 'event_001',
    },
    assertions: [],
    derivedFrom: [],
    createdBy: 'director_proposed',
    realityLayer: 'diegetic',
    sceneIdx: 1,
    storyTime: 10,
    presentationIndex: 1,
    parentHash: null,
  };
  
  const event = store.append(eventInput);
  
  // Quick verify - only get critical violations
  const { pass, criticalViolations } = await quickVerify(event, state, store.getAllEvents());
  
  if (!pass) {
    console.log('Critical violations detected:');
    for (const v of criticalViolations) {
      console.log(`  [${v.layer}] ${v.message}`);
      console.log(`    Repair: ${v.repairSuggestions[0]}`);
    }
  }
}

// ── Example 3: Batch Verification ─────────────────────────────────────────────

/**
 * Verify a sequence of events (stops on first failure).
 */
export async function example3_batchVerification() {
  console.log('\n=== Example 3: Batch Verification ===\n');
  
  const store = createEventStore();
  const state = emptyState();
  
  // Create a sequence of events
  const events: NarrativeEvent[] = [
    store.append({
      op: { op: 'ADD_FACT', fact: { factId: 'f1', subject: 'CHAR_Bob', predicate: 'exists', object: 'true', addedAtTurn: 1, validFrom: 0, validTo: null } },
      assertions: [],
      derivedFrom: [],
      createdBy: 'user_authored',
      realityLayer: 'diegetic',
      sceneIdx: 0,
      storyTime: 0,
      presentationIndex: 0,
      parentHash: null,
    }),
    store.append({
      op: { op: 'SEED_CLUE', clueId: 'clue_001', carrier: 'object' },
      assertions: [],
      derivedFrom: [],
      createdBy: 'director_proposed',
      realityLayer: 'diegetic',
      sceneIdx: 1,
      storyTime: 5,
      presentationIndex: 1,
      parentHash: null,
    }),
    store.append({
      op: { op: 'PAYOFF_SETUP', setupId: 'clue_001', payoffEventId: 'event_payoff' },
      assertions: [],
      derivedFrom: [],
      createdBy: 'screenwriter_generated',
      realityLayer: 'diegetic',
      sceneIdx: 5,
      storyTime: 25,
      presentationIndex: 5,
      parentHash: null,
    }),
  ];
  
  // Verify sequence
  const results = await verifyEventSequence(events, state, []);
  
  console.log(`Verified ${results.length} events:`);
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    console.log(`  Event ${i + 1}: ${result.pass ? '✓ PASS' : '✗ FAIL'} (health: ${result.overallHealth}/100)`);
    if (!result.pass) {
      console.log(`    Stopped at event ${i + 1} due to violations`);
      break;
    }
  }
}

// ── Example 4: Integration with EventStore ───────────────────────────────────

/**
 * Production integration: Wrap EventStore.append with Trinity Gate verification.
 */
export class VerifiedEventStore {
  private store = createEventStore();
  private state: NarrativeState = emptyState();
  
  /**
   * Append event with automatic verification.
   * Throws error if verification fails.
   */
  async appendVerified(input: NarrativeEventInput): Promise<NarrativeEvent> {
    // Create temporary event for verification
    const tempEvent = this.store.append(input);
    
    // Remove it (we'll add back if verified)
    // Note: In production, EventStore should support dry-run mode
    
    // Verify before commit
    const verification = await runTrinityGate(
      tempEvent,
      this.state,
      this.store.getAllEvents()
    );
    
    if (!verification.pass) {
      throw new VerificationError(
        'Trinity Gate verification failed',
        verification
      );
    }
    
    // Passed - commit the event
    const event = this.store.append(input);
    
    // Update state
    await this.updateState();
    
    return event;
  }
  
  /**
   * Get current state snapshot.
   */
  async getState(): Promise<NarrativeState> {
    return this.store.snapshot();
  }
  
  private async updateState(): Promise<void> {
    this.state = await this.store.snapshot();
  }
}

export class VerificationError extends Error {
  constructor(
    message: string,
    public verification: TrinityVerification
  ) {
    super(message);
    this.name = 'VerificationError';
  }
}

// ── Example 5: Error Handling and Repair ──────────────────────────────────────

/**
 * Handle verification failures with repair suggestions.
 */
export async function example5_errorHandlingAndRepair() {
  console.log('\n=== Example 5: Error Handling and Repair ===\n');
  
  const verifiedStore = new VerifiedEventStore();
  
  try {
    // Try to add a payoff without setup (should fail)
    await verifiedStore.appendVerified({
      op: {
        op: 'PAYOFF_SETUP',
        setupId: 'clue_nonexistent',
        payoffEventId: 'event_002',
      },
      assertions: [],
      derivedFrom: [],
      createdBy: 'director_proposed',
      realityLayer: 'diegetic',
      sceneIdx: 2,
      storyTime: 20,
      presentationIndex: 2,
      parentHash: null,
    });
    
    console.log('Event committed successfully');
  } catch (error) {
    if (error instanceof VerificationError) {
      console.log('Verification failed. Details:');
      console.log(formatVerificationReport(error.verification));
      
      // Attempt repair
      console.log('\nAttempting automated repair...');
      const repairs = error.verification.violations
        .filter(v => v.severity === 'critical')
        .flatMap(v => v.repairSuggestions);
      
      console.log('Suggested repairs:');
      repairs.forEach((r, i) => console.log(`  ${i + 1}. ${r}`));
    } else {
      throw error;
    }
  }
}

// ── Example 6: Monitoring and Metrics ─────────────────────────────────────────

/**
 * Track verification metrics over time.
 */
export class TrinityGateMonitor {
  private verifications: TrinityVerification[] = [];
  
  async verify(
    event: NarrativeEvent,
    state: NarrativeState,
    allEvents: NarrativeEvent[]
  ): Promise<TrinityVerification> {
    const verification = await runTrinityGate(event, state, allEvents);
    this.verifications.push(verification);
    return verification;
  }
  
  getMetrics() {
    const total = this.verifications.length;
    const passed = this.verifications.filter(v => v.pass).length;
    const failed = total - passed;
    
    const avgHealth = this.verifications.reduce((sum, v) => sum + v.overallHealth, 0) / total || 0;
    
    const violationsByLayer = {
      'story-graph': 0,
      'owne': 0,
      'preflight': 0,
    };
    
    for (const v of this.verifications) {
      for (const violation of v.violations) {
        violationsByLayer[violation.layer]++;
      }
    }
    
    return {
      total,
      passed,
      failed,
      passRate: (passed / total) * 100,
      avgHealth,
      violationsByLayer,
    };
  }
  
  printReport() {
    const metrics = this.getMetrics();
    
    console.log('\n=== Trinity Gate Metrics ===');
    console.log(`Total Verifications: ${metrics.total}`);
    console.log(`Passed: ${metrics.passed} (${metrics.passRate.toFixed(1)}%)`);
    console.log(`Failed: ${metrics.failed}`);
    console.log(`Average Health: ${metrics.avgHealth.toFixed(1)}/100`);
    console.log('\nViolations by Layer:');
    console.log(`  Story Graph: ${metrics.violationsByLayer['story-graph']}`);
    console.log(`  OWNE:        ${metrics.violationsByLayer['owne']}`);
    console.log(`  Pre-Flight:  ${metrics.violationsByLayer['preflight']}`);
  }
}

// ── Run All Examples ──────────────────────────────────────────────────────────

export async function runAllExamples() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  TRINITY VERIFICATION GATE — EXAMPLES                    ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  
  await example1_singleEventVerification();
  await example2_quickVerification();
  await example3_batchVerification();
  await example5_errorHandlingAndRepair();
  
  console.log('\n✓ All examples completed\n');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples().catch(console.error);
}
