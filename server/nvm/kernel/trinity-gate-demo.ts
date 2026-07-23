// Trinity Gate Demo — Real-World Screenplay Verification
//
// Demonstrates how Trinity Gate catches plot holes that traditional story
// structure analysis misses. Shows all three layers working together to
// prevent narrative inconsistencies.
//
// Run with: npx tsx server/nvm/kernel/trinity-gate-demo.ts

import { runTrinityGate, formatVerificationReport } from './trinity-gate.ts';
import type { NarrativeEvent } from './types.ts';
import type { NarrativeState } from '../state/NarrativeState.ts';
import { emptyState } from '../state/NarrativeState.ts';

// ── Demo Helper Functions ─────────────────────────────────────────────────────

function createEvent(
  sceneIdx: number,
  storyTime: number,
  presentationIndex: number,
  op: any,
  description: string
): NarrativeEvent & { description: string } {
  return {
    eventId: `evt_${sceneIdx}_${presentationIndex}`,
    eventHash: 'hash',
    parentHash: null,
    storyTime,
    presentationIndex,
    op,
    assertions: [],
    derivedFrom: [],
    createdBy: 'user_authored',
    realityLayer: 'diegetic',
    sceneIdx,
    createdAt: Date.now(),
    description,
  };
}

// ── Demo Scenario: Murder Mystery Plot Hole ──────────────────────────────────

async function demoMurderMystery() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  TRINITY GATE DEMO: Murder Mystery Plot Hole Detection');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Scene 1: Detective enters mansion
  const event1 = createEvent(
    1, 10, 0,
    {
      op: 'ADD_FACT',
      fact: {
        factId: 'fact_detective_enters',
        subject: 'CHAR_Detective_Mills',
        predicate: 'located_at',
        object: 'LOC_Mansion_Entrance',
        addedAtTurn: 1,
        validFrom: 10,
        validTo: null,
      },
    },
    'Detective Mills enters the mansion'
  );

  // Scene 2: Victim found dead in library (Detective not present)
  const event2 = createEvent(
    2, 20, 1,
    {
      op: 'ADD_FACT',
      fact: {
        factId: 'fact_victim_dead',
        subject: 'CHAR_Victim',
        predicate: 'state',
        object: 'dead_in_library',
        addedAtTurn: 2,
        validFrom: 20,
        validTo: null,
      },
    },
    'Victim found dead in library by butler'
  );

  // Scene 3: Detective believes victim was poisoned
  const event3 = createEvent(
    3, 30, 2,
    {
      op: 'UPDATE_BELIEF',
      charId: 'CHAR_Detective_Mills',
      belief: {
        id: 'belief_poison',
        proposition: 'victim was poisoned with arsenic',
        confidence: 0.95,
        source: 'inferred',
        acquired_at: 3,
      },
    },
    'Detective concludes victim was poisoned (without examining body)'
  );

  // Scene 4: Detective finds the murder weapon in study
  const event4 = createEvent(
    4, 40, 3,
    {
      op: 'ADD_FACT',
      fact: {
        factId: 'fact_find_weapon',
        subject: 'CHAR_Detective_Mills',
        predicate: 'finds',
        object: 'OBJ_Poison_Bottle',
        addedAtTurn: 4,
        validFrom: 40,
        validTo: null,
      },
    },
    'Detective finds poison bottle in study'
  );

  // Build state progressively
  let state: NarrativeState = {
    ...emptyState(),
    objectiveReality: [
      {
        factId: 'fact_detective_enters',
        subject: 'CHAR_Detective_Mills',
        predicate: 'located_at',
        object: 'LOC_Mansion_Entrance',
        addedAtTurn: 1,
        validFrom: 10,
        validTo: null,
      },
      {
        factId: 'fact_victim_dead',
        subject: 'CHAR_Victim',
        predicate: 'state',
        object: 'dead_in_library',
        addedAtTurn: 2,
        validFrom: 20,
        validTo: null,
      },
    ],
    characterBeliefs: {
      CHAR_Detective_Mills: [], // No beliefs yet about poison
    },
    characterEmotions: {
      CHAR_Detective_Mills: {
        joy: 0,
        distress: 30,
        anger: 0,
        fear: 0,
        pride: 0,
        shame: 0,
        dominant: 'distress',
        intensity: 30,
        last_updated_at: 2,
      },
    },
  };

  console.log('📖 Story Events:');
  console.log(`  1. ${event1.description}`);
  console.log(`  2. ${event2.description}`);
  console.log(`  3. ${event3.description}`);
  console.log(`  4. ${event4.description}`);
  console.log();

  // Verify Event 3 (Detective forms belief without evidence)
  console.log('🔍 Verifying Event 3: Detective believes victim was poisoned\n');
  
  const result3 = await runTrinityGate(event3, state, [event1, event2], { enableLogging: true });
  
  console.log(formatVerificationReport(result3));
  
  if (!result3.pass) {
    console.log('🚫 PLOT HOLE DETECTED!');
    console.log('\nWhy this is a problem:');
    console.log('  • Detective forms high-confidence belief without observing the body');
    console.log('  • No knowledge path from objective reality to detective\'s belief');
    console.log('  • Audience would notice detective knows information they shouldn\'t');
    console.log('\n💡 Suggested fixes:');
    for (let i = 0; i < Math.min(3, result3.violations[0]?.repairSuggestions.length || 0); i++) {
      console.log(`  ${i + 1}. ${result3.violations[0].repairSuggestions[i]}`);
    }
  }

  console.log('\n' + '─'.repeat(65) + '\n');

  // Now test corrected version
  console.log('✅ CORRECTED VERSION: Detective examines body first\n');

  const event2b = createEvent(
    2, 25, 2,
    {
      op: 'ADD_FACT',
      fact: {
        factId: 'fact_examine_body',
        subject: 'CHAR_Detective_Mills',
        predicate: 'examines',
        object: 'CHAR_Victim',
        addedAtTurn: 2,
        validFrom: 25,
        validTo: null,
      },
    },
    'Detective examines victim\'s body'
  );

  // Update state with belief based on observation
  state.characterBeliefs.CHAR_Detective_Mills = [
    {
      id: 'belief_poison_observed',
      proposition: 'victim shows signs of poisoning',
      confidence: 0.8,
      source: 'witnessed',
      acquired_at: 2,
    },
  ];

  const event3b = createEvent(
    3, 30, 3,
    {
      op: 'UPDATE_BELIEF',
      charId: 'CHAR_Detective_Mills',
      belief: {
        id: 'belief_poison',
        proposition: 'victim was poisoned with arsenic',
        confidence: 0.75,
        source: 'inferred',
        acquired_at: 3,
      },
    },
    'Detective infers arsenic poisoning from observed symptoms'
  );

  const result3b = await runTrinityGate(event3b, state, [event1, event2, event2b]);

  console.log(formatVerificationReport(result3b));

  if (result3b.pass) {
    console.log('✅ NO PLOT HOLES! Story logic is sound.');
    console.log('\nWhy this works:');
    console.log('  • Detective observed the body (witnessed evidence)');
    console.log('  • Belief confidence is appropriately lower (0.75 vs 0.95)');
    console.log('  • Clear knowledge path: observation → inference → belief');
  }
}

// ── Demo Scenario: Heist Movie Possession Error ──────────────────────────────

async function demoHeistMovie() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  TRINITY GATE DEMO: Heist Movie Possession Tracking');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Scene 1: Thief steals diamond
  const event1 = createEvent(
    1, 10, 0,
    {
      op: 'ADD_FACT',
      fact: {
        factId: 'fact_steal',
        subject: 'OBJ_Diamond',
        predicate: 'possessed_by',
        object: 'CHAR_Thief_Alex',
        addedAtTurn: 1,
        validFrom: 10,
        validTo: null,
      },
    },
    'Alex steals the diamond from museum'
  );

  // Scene 5: Partner uses diamond (without transfer shown)
  const event2 = createEvent(
    5, 50, 1,
    {
      op: 'ADD_FACT',
      fact: {
        factId: 'fact_use',
        subject: 'CHAR_Partner_Blake',
        predicate: 'uses',
        object: 'OBJ_Diamond',
        addedAtTurn: 5,
        validFrom: 50,
        validTo: null,
      },
    },
    'Blake uses diamond as leverage (without getting it from Alex)'
  );

  const state: NarrativeState = {
    ...emptyState(),
    objectiveReality: [
      {
        factId: 'fact_steal',
        subject: 'OBJ_Diamond',
        predicate: 'possessed_by',
        object: 'CHAR_Thief_Alex',
        addedAtTurn: 1,
        validFrom: 10,
        validTo: null,
      },
    ],
  };

  console.log('📖 Story Events:');
  console.log(`  1. ${event1.description}`);
  console.log('  2-4. (various scenes)');
  console.log(`  5. ${event2.description}`);
  console.log();

  console.log('🔍 Verifying Event 5: Blake uses diamond\n');
  
  const result = await runTrinityGate(event2, state, [event1]);
  
  console.log(formatVerificationReport(result));

  if (!result.pass) {
    console.log('🚫 PLOT HOLE DETECTED!');
    console.log('\nWhy this is a problem:');
    console.log('  • Blake uses diamond but Alex still possesses it');
    console.log('  • No transfer event showing Blake acquiring the diamond');
    console.log('  • Object custody chain is broken');
    console.log('\n💡 Fix: Add scene showing Alex giving diamond to Blake');
  }
}

// ── Demo Scenario: Thriller Promise/Payoff Error ─────────────────────────────

async function demoThrillerPromise() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  TRINITY GATE DEMO: Thriller Setup/Payoff Validation');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Scene 8: Climactic payoff without setup
  const event = createEvent(
    8, 80, 0,
    {
      op: 'PAYOFF_SETUP',
      setupId: 'setup_hidden_gun',
      payoffEventId: 'evt_8_0',
    },
    'Hero reveals hidden gun at climax'
  );

  const state = emptyState();

  console.log('📖 Story Event:');
  console.log(`  Scene 8: ${event.description}`);
  console.log('  (No previous setup shown)');
  console.log();

  console.log('🔍 Verifying payoff event\n');
  
  const result = await runTrinityGate(event, state, []);
  
  console.log(formatVerificationReport(result));

  if (!result.pass) {
    console.log('🚫 PLOT HOLE DETECTED!');
    console.log('\nWhy this is a problem:');
    console.log('  • Payoff without corresponding setup (deus ex machina)');
    console.log('  • Audience feels cheated - gun appears from nowhere');
    console.log('  • Violates promise/payoff integrity principle');
    console.log('\n💡 Fix: Plant gun in earlier scene (Act 1), show hero acquiring it');
  }
}

// ── Main Demo Runner ──────────────────────────────────────────────────────────

async function main() {
  console.clear();
  console.log('\n🎬 TRINITY GATE VERIFICATION SYSTEM DEMO');
  console.log('   Catching Plot Holes Through Three-Layer Analysis\n');

  try {
    // Demo 1: Epistemic consistency
    await demoMurderMystery();
    
    // Demo 2: Possession tracking
    await demoHeistMovie();
    
    // Demo 3: Promise/payoff logic
    await demoThrillerPromise();

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  DEMO COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('Key Takeaways:');
    console.log('  1. Trinity Gate catches plot holes traditional analysis misses');
    console.log('  2. Three layers work together: Structure + World + Knowledge');
    console.log('  3. Provides actionable repair suggestions for writers');
    console.log('  4. Verifies in < 100ms for real-time screenplay editing');
    console.log();
    
  } catch (error) {
    console.error('Demo error:', error);
    process.exit(1);
  }
}

// Run demo if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { demoMurderMystery, demoHeistMovie, demoThrillerPromise };
