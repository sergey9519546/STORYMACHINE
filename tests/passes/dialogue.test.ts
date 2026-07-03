// Extracted from the former monolithic test.ts (audit M2.1 — split for maintainability).
// dialoguePass revision-rule tests. Shared imports/helpers below are duplicated verbatim across every split
// file (harmless — each file is its own module scope) so no unit here depends on
// anything outside this file.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { safeJsonParse } from '../../src/lib/json.ts';
import { withTimeout, generateContent, generateContentStream, setLLMProvider, resetLLMProvider, setEmbeddingProvider, setImageProvider, setTTSProvider, getEmbeddingProvider, getImageProvider, getTTSProvider, resetAllProviders, noopImageProvider, noopTTSProvider, noopEmbeddingProvider, getModel, modelForTask } from '../../server/engine/ai.ts';
import { analyzeSubtext } from '../../server/lib/subtext-meter.ts';
import { genrePromptBlock, GENRE_MODIFIERS, GENRE_NAMES } from '../../server/lib/genre-router.ts';
import { scoreBelief, retrieveBeliefs, consolidateBeliefs, decayBeliefConfidence } from '../../server/lib/memory.ts';
import { metrics } from '../../server/lib/metrics.ts';
import { actionBiasWeights, defenseActionBias, effectiveScore, attachmentActionBias } from '../../server/lib/personality.ts';
import { AppraisalEngine } from '../../server/engine/AppraisalEngine.ts';
import { validate, InitBodySchema, TurnBodySchema, RunRoomBodySchema, ImportBodySchema, AiConfigSchema } from '../../server/lib/validation.ts';
import { geminiSchemaToJsonSchema } from '../../server/lib/ai-providers/schema.ts';
import { makeOpenAICompatLLMProvider, makeOpenAICompatEmbeddingProvider } from '../../server/lib/ai-providers/openai-compat.ts';
import { applyConfig, getPublicConfig, initFromEnv } from '../../server/lib/ai-config.ts';
import type { GenerateContentParameters, GenerateContentResponse } from '@google/genai';
import {
  describeAttachment,
  selectActiveDefense,
  describeActionBias,
  deriveSpeechPattern,
  computeDefenseLevel,
  selectPersuasionStrategy,
  getReadyGoals,
} from '../../server/engine/agent/psychology.ts';
import { validatePersona, PERSONA_LIMITS } from '../../server/personas/types.ts';
import { renderTemplate, getPrompt, hasPrompt } from '../../server/lib/prompts.ts';
import { parseRoomId, collabRoomCount } from '../../server/collab/yjs-server.ts';
import {
  listPersonas,
  getPersona,
  registerUserPersona,
  personaPromptBlock,
  _resetUserPersonas,
} from '../../server/personas/registry.ts';
import { STORY_OP_KINDS } from '../../server/nvm/ops/StoryOp.ts';
import type { StoryOp } from '../../server/nvm/ops/StoryOp.ts';
import { PROOF_TIERS, passResult, failResult } from '../../server/nvm/proof/contract.ts';
import type { ProofName } from '../../server/nvm/proof/contract.ts';
import { emptyState, stateHash, relationshipKey } from '../../server/nvm/state/NarrativeState.ts';
import type { NarrativeState } from '../../server/nvm/state/NarrativeState.ts';
import { buildEnrichedState } from '../../server/nvm/state/enrichedState.ts';
import { applyStoryOp, applyStoryOps } from '../../server/nvm/ops/dispatcher.ts';
import { loadMechanisms, loadMechanismsCached } from '../../server/nvm/mechanisms/loader.ts';
import { runTier1, tier1Passes, runTier2, tier2Score, runTier3, tier3Rank, runTier4 } from '../../server/nvm/proof/kernel.ts';
import { runM15Harness, buildNoraWarehouseIR } from '../../server/nvm/__tests__/m1.5-harness.ts';
import { whatBreaksIfRemoved } from '../../server/nvm/query/whatBreaks.ts';
import { summarizeOps } from '../../server/nvm/state/StoryCommit.ts';
import type { StoryCommit } from '../../server/nvm/state/StoryCommit.ts';
import { makePrng, randInt, shuffle, seedFromString } from '../../server/nvm/repro/seed.ts';
import { buildManifest, replayManifest } from '../../server/nvm/repro/manifest.ts';
import { appendGhost, getGhosts, branchFromGhost } from '../../server/nvm/repro/ghost-ledger.ts';
import type { GhostCommit } from '../../server/nvm/repro/ghost-ledger.ts';
import { explainAction } from '../../server/nvm/debug/inspector.ts';
import { earnedRevealProof } from '../../server/nvm/proof/tier1/earnedReveal.ts';
import { causalProof as causalProofB2 } from '../../server/nvm/proof/tier1/causal.ts';
import { intentionalProof as intentionalProofB3 } from '../../server/nvm/proof/tier1/intentional.ts';
import { repair } from '../../server/nvm/proof/repair.ts';
import { lint } from '../../server/nvm/proof/lint.ts';
import type { RevealPlan } from '../../server/nvm/reveal/RevealPlan.ts';
import {
  openPosition, markToMarket as mtm, deriveTensionLedger, tensionMonotone,
} from '../../server/nvm/valuation/futures.ts';
import { redTeamVerdict } from '../../server/nvm/valuation/audience-redteam.ts';
import { twoReaderReport } from '../../server/nvm/valuation/two-reader.ts';
import { computeTopology, onTrackForArc, computeTrajectoryMomentum } from '../../server/nvm/valuation/topology.ts';
import {
  proofsToConstraints, buildGenerationSpec, buildSystemPreamble,
  type CandidateGenerator, type SceneTarget,
} from '../../server/nvm/generate/proof-spec.ts';
import { applyOperator, ALL_OPERATORS } from '../../server/nvm/converge/operators.ts';
import { convergeScene } from '../../server/nvm/converge/loop.ts';
import { runWritersRoom } from '../../server/nvm/room/room.ts';
import { buildSCM } from '../../server/nvm/twin/scm.ts';
import { doIntervention } from '../../server/nvm/twin/counterfactual.ts';
import { project, type Canon, type ProjectionTarget } from '../../server/nvm/project/index.ts';
import { buildSidecar, captureRegressionSnapshot, checkRegression } from '../../server/nvm/project/sidecar.ts';
import { planToward, type FixedPoint } from '../../server/nvm/author/fixed-points.ts';
import { backchain, scheduleToGoalBiases } from '../../server/nvm/author/backchain.ts';
import { runSelfPlay, type SimScenario } from '../../server/nvm/selfplay/corpus.ts';
import { mineCorpus, queryPolicy } from '../../server/nvm/selfplay/mine.ts';
import { extractGenome, diffGenomes, breedGenomes } from '../../server/nvm/selfplay/genome.ts';
import { TACTIC_TYPES, isDeceptive, isEmotional, tacticIronyWeight } from '../../server/nvm/ops/tactic-types.ts';
import { buildMetaBelief, getMetaBeliefsAbout, holderBelievesThatTargetBelieves, upsertMetaBelief } from '../../server/nvm/ops/meta-belief.ts';
import { contractBelief, reviseBelief, planContraction, initCredence, updateCredence, applyCredence } from '../../server/nvm/ops/belief-revision.ts';
import {
  runQualityEngine, specificityScore, computeArcDebt, revealReady, necessityScore,
  burrowsDelta, relationshipRepairGaps, buildCausalGraph, proppMorphology,
  dialogueWarnings,
} from '../../server/nvm/quality/index.ts';
import { momentumScore } from '../../server/nvm/valuation/futures.ts';
import { makeLLMCandidateGenerator } from '../../server/nvm/generate/llm-generator.ts';

// ── Causal-Epistemic Spine — one-lie vertical slice ──────────────────────────
// Alice lies to Bob. Bob finds contradictory evidence.
// Verifies: EventCard, sourced beliefs, BeliefEdge, GoalMutation,
//           DramaticPressure, BeatTrace, and Fountain [[BEAT:...]] output.

import { Stage } from '../../server/engine/Stage.ts';
import { exportCharacter, importCharacter, isCharacterMemoryBundle, CHARACTER_BUNDLE_SCHEMA_VERSION } from '../../server/engine/character-memory.ts';
import { CausalSpine } from '../../server/engine/CausalSpine.ts';
import { Orchestrator } from '../../server/engine/Orchestrator.ts';
import { transcriptToFountain } from '../../server/lib/fountain.ts';
import { parseFountain } from '../../src/lib/fountain.ts';
import { fountainToFdx } from '../../src/lib/fdx.ts';
import { layoutScreenplay, LINES_PER_PAGE } from '../../src/lib/screenplay-layout.ts';
import { fountainToPdf } from '../../src/lib/pdf.ts';
import { buildZip } from '../../src/lib/zip.ts';
import { fountainToDocx } from '../../src/lib/docx.ts';
import type { ActionLogEntry, Belief, CharacterSheet, Location } from '../../server/engine/types.ts';
import { ACTION_TYPES } from '../../server/engine/types.ts';

function makeStage(): Stage {
  const stage = new Stage(':memory:');
  const loc: Location = {
    location_id: 'room1',
    name: 'The Study',
    description: 'A dusty room.',
    adjacent_locations: [],
  };
  stage.addLocation(loc);

  const alice: CharacterSheet = {
    char_id: 'alice',
    name: 'Alice',
    public_mask: 'Librarian',
    hidden_motive: 'Steal the ledger',
    knowledge_vector: [],
    current_location_id: 'room1',
    suspicion_score: 10,
    is_alive: true,
    goalStack: {
      terminal: { id: 'g0', description: 'Get the ledger', value: 100, achieved: false },
      instrumental: [{ id: 'g1', description: 'Keep Bob distracted', value: 70, achieved: false }],
      last_planned_at: 0,
    },
  };

  const bob: CharacterSheet = {
    char_id: 'bob',
    name: 'Bob',
    public_mask: 'Detective',
    hidden_motive: 'Expose the thief',
    knowledge_vector: [],
    current_location_id: 'room1',
    suspicion_score: 5,
    is_alive: true,
    goalStack: {
      terminal: { id: 'g2', description: 'Identify the thief', value: 100, achieved: false },
      instrumental: [{ id: 'g3', description: 'Gather evidence', value: 60, achieved: false }],
      last_planned_at: 0,
    },
  };

  stage.addAgent(alice);
  stage.addAgent(bob);
  return stage;
}

// ──────────────────────────────────────────────────────────────────────────────
// NVM Wave 1 — substrate: StoryOp vocabulary, proof contract, dispatcher
// ──────────────────────────────────────────────────────────────────────────────

const sampleBelief = (id: string) => ({
  id, proposition: `prop-${id}`, confidence: 0.8,
  source: 'witnessed' as const, acquired_at: 1,
});

const sampleEmotion = () => ({
  joy: 0, distress: 50, anger: 0, fear: 0, pride: 0, shame: 0,
  dominant: 'distress' as const, intensity: 50, last_updated_at: 1,
});

// ── Wave 2: Bundle A — Reproducible Build ──────────────────────────────────

import { getCached, putCache } from '../../server/nvm/repro/llm-cache.ts';

import { analyzeArcCompletion } from '../../server/nvm/quality/arc-tracker.ts';

import {
  qualityConstraintsFromWarnings, arcConstraintsFromTracker,
  proppConstraintsFromAnalysis, buildQualityAwareConstraints,
} from '../../server/nvm/generate/quality-spec.ts';

// ── Wave 29 — Narrative Regression Suite ─────────────────────────────────────

import { ALL_INVARIANTS } from '../../server/nvm/regression/invariants.ts';
import { runNarrativeRegression } from '../../server/nvm/regression/runner.ts';

function makeCommit(sceneIdx: number, ops: StoryOp[]): StoryCommit {
  return { commitId: `c${sceneIdx}`, parentId: null, sceneIdx, ops, deltaSummary: summarizeOps(ops), reverted: false, createdAt: 1 };
}

function baseOp(): StoryOp {
  return { op: 'ADD_FACT', fact: { factId: 'f1', subject: 'world', predicate: 'is', object: 'real', addedAtTurn: 0, validFrom: 0, validTo: null } };
}

// ── Wave 30 — Narrative Momentum Dashboard ────────────────────────────────────

function makeMomentumCommit(sceneIdx: number, ops: StoryOp[]): StoryCommit {
  return { commitId: `m${sceneIdx}`, parentId: null, sceneIdx, ops, deltaSummary: summarizeOps(ops), reverted: false, createdAt: 1 };
}

function buildIR(commit: StoryCommit): import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR {
  return {
    transitionId: commit.commitId, sceneIdx: commit.sceneIdx,
    sceneFunction: 'advance_plot', activeMechanisms: [],
    beforeStateHash: 'test', ops: commit.ops,
    preconditions: [], postconditions: [],
    provenance: { origin: 'model_generated', createdAt: commit.createdAt },
  };
}

// ── Wave 31 — Voice DNA Analyzer ─────────────────────────────────────────────

function makeBeliefOp(charId: string, proposition: string): StoryOp {
  return { op: 'UPDATE_BELIEF', charId, belief: { id: `b-${charId}-${proposition.slice(0, 4)}`, proposition, confidence: 0.7, source: 'inferred', acquired_at: 0 } };
}

// ── Wave 32: Action↔StoryOp Bridge ───────────────────────────────────────────
import {
  entryToOps,
  epistemicUpdateToOps,
  buildTurnCommit,
} from '../../server/nvm/bridge/action-to-ops.ts';
import type { BridgeInput } from '../../server/nvm/bridge/action-to-ops.ts';
import type { EpistemicUpdate, EventCard, EventProposition } from '../../server/engine/types.ts';

function makeEntry(overrides: Partial<ActionLogEntry> = {}): ActionLogEntry {
  return {
    action_id: 'act-001',
    timestamp: Date.now(),
    char_id: 'alice',
    location_id: 'loc-01',
    action_type: 'SPEAK',
    target_char_id: 'bob',
    content: 'I know nothing about the money.',
    is_audible: true,
    ...overrides,
  };
}

function makeProp(overrides: Partial<EventProposition> = {}): EventProposition {
  return {
    proposition_id: 'prop-001',
    event_id: 'act-001',
    content: 'I know nothing about the money.',
    is_lie: false,
    asserted_by: 'alice',
    perceived_truth: true,
    ...overrides,
  };
}

function makeCard(entry: ActionLogEntry, props: EventProposition[] = []): EventCard {
  return {
    event_id: entry.action_id,
    char_id: entry.char_id,
    action_type: entry.action_type,
    content: entry.content,
    location_id: entry.location_id,
    turn_index: 5,
    propositions: props,
  };
}

function makeBelief(proposition: string, source: 'told' | 'witnessed' | 'inferred' = 'inferred'): Belief {
  return {
    id: `bel-${Math.random().toString(36).slice(2, 7)}`,
    proposition,
    confidence: source === 'witnessed' ? 1.0 : source === 'told' ? 0.7 : 0.4,
    source,
    // told beliefs must have source_agent_id for EpistemicProof; witnessed need source_event_id
    source_agent_id: source === 'told' ? 'narrator' : undefined,
    source_event_id: source === 'witnessed' ? 'evt-000' : undefined,
    acquired_at: 5,
    contradicts: [],
  };
}

function makeEpistemicUpdate(charId: string, beliefs: Belief[], contradiction = false): EpistemicUpdate {
  return {
    char_id: charId,
    new_beliefs: beliefs,
    contradiction_detected: contradiction,
    contradicted_propositions: contradiction ? ['something is wrong'] : [],
    source_event_id: 'act-001',
  };
}

// ── Wave 33: Author-Presence Move Bus ─────────────────────────────────────────
import { parseAuthorMove, buildAuthorCommit } from '../../server/nvm/live/move-bus.ts';
import type { AuthorCommitInput } from '../../server/nvm/live/move-bus.ts';

// ── Wave 34: Reactive Turn Cycle ──────────────────────────────────────────────
import { reactToCommit, advanceWorld } from '../../server/nvm/live/loop.ts';

// ── Wave 35: Forward Latent Branch Field ─────────────────────────────────────
import { generateBranchField } from '../../server/nvm/branch/field.ts';
import { scoreBranch } from '../../server/nvm/branch/score.ts';

// ── Wave 36: Conflict Orchestrator + Intention Registry ───────────────────────
import { buildIntentionRegistry } from '../../server/nvm/drama/intention-registry.ts';
import { computeConflicts } from '../../server/nvm/drama/conflict-orchestrator.ts';

// ── Wave 37: Live Screenplay Memory + Structure Tracking ─────────────────────
import { annotateCommit, buildScreenplayMemory } from '../../server/nvm/screenplay/memory.ts';
import { analyzeStructure } from '../../server/nvm/screenplay/structure.ts';

function makeScreenplayCommit(sceneIdx: number, ops: StoryOp[]): StoryCommit {
  return {
    commitId: `sp-${sceneIdx}`,
    parentId: sceneIdx > 0 ? `sp-${sceneIdx - 1}` : null,
    sceneIdx,
    ops,
    deltaSummary: summarizeOps(ops),
    reverted: false,
    createdAt: Date.now(),
  };
}

// ── Wave 38: End-Condition Detector + Screenplay Compiler ─────────────────────
import { detectEndCondition } from '../../server/nvm/screenplay/end-condition.ts';
import { compileScreenplay } from '../../server/nvm/screenplay/compile.ts';

// ── Wave 39: 12-Pass Revision Pipeline ────────────────────────────────────────

import { structurePass }    from '../../server/nvm/revision/passes/structure.ts';
import { causalityPass }    from '../../server/nvm/revision/passes/causality.ts';
import { intentionPass }    from '../../server/nvm/revision/passes/intention.ts';
import { beliefPass }       from '../../server/nvm/revision/passes/belief.ts';
import { conflictPass }     from '../../server/nvm/revision/passes/conflict.ts';
import { characterArcPass } from '../../server/nvm/revision/passes/character-arc.ts';
import { dialoguePass }     from '../../server/nvm/revision/passes/dialogue.ts';
import { rhythmPass }       from '../../server/nvm/revision/passes/rhythm.ts';
import { pacingPass }       from '../../server/nvm/revision/passes/pacing.ts';
import { originalityPass }  from '../../server/nvm/revision/passes/originality.ts';
import { payoffPass }       from '../../server/nvm/revision/passes/payoff.ts';
import { voicePass }        from '../../server/nvm/revision/passes/voice.ts';
import { runRevisionPipeline } from '../../server/nvm/revision/pipeline.ts';

/** Minimal fountain text for testing */
const SAMPLE_FOUNTAIN = `Title: TEST
Author: Test

INT. THE OFFICE - DAY

Alice looks around nervously. She takes a deep breath.

ALICE
We need to talk. I feel so angry.

BOB
Yes.

INT. THE WAREHOUSE - NIGHT

Bob stares into the distance. A single tear runs down his face.

ALICE
As you know, Bob, we discussed the plan.

BOB
Absolutely.
`;

/** Make a minimal PassInput with no records/structure */
/** Minimal StructureState for Wave 39 tests */
function makeStructureForRevision(act = 'act1', revelation = 0, clues = 0, escalating = false): import('../../server/nvm/screenplay/structure.ts').StructureState {
  return {
    actPosition: act as import('../../server/nvm/screenplay/structure.ts').ActPosition,
    completionPercent: act === 'act3' ? 80 : 20,
    avgSuspensePerScene: 2,
    escalating,
    reversalCount: 1,
    reversalDensity: 1,
    approachingClimax: act === 'act3',
    openClues: clues,
    revelationCount: revelation,
    midpointPressure: 2,
    tightestScene: null,
  };
}

function makePassInput(fountain = SAMPLE_FOUNTAIN): import('../../server/nvm/revision/passes/types.ts').PassInput {
  return {
    fountain,
    original: fountain,
    annotations: [],
    structure: makeStructureForRevision('act1', 0, 0, false),
    records: [],
    approvedSpans: [],
  };
}

/** Make a PassInput with rich records for more thorough tests */
function makeRichPassInput(): import('../../server/nvm/revision/passes/types.ts').PassInput {
  const commits = Array.from({ length: 6 }, (_, i) =>
    makeScreenplayCommit(i, [
      { op: 'UPDATE_READER_STATE', delta: { suspense: i % 2 === 0 ? 2 : -1 } },
      { op: 'SEED_CLUE', clueId: `clue_${i}`, carrier: 'object' },
    ])
  );
  const records = buildScreenplayMemory(commits);
  const structure = analyzeStructure(records, commits);
  const compiled = compileScreenplay(commits, emptyState(), records, structure, 'TEST');
  return {
    fountain: compiled.fountain,
    original: compiled.fountain,
    annotations: compiled.annotations,
    structure,
    records,
    approvedSpans: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Wave 40 — CRITICAL Fixes (C1–C6)
// Tests for: prompt injection sanitization, move validation, SSE cleanup,
// epistemic serialization, fetch error reporting, semantic contradiction safety.
// ─────────────────────────────────────────────────────────────────────────────

import { sanitizeForPrompt } from '../../server/lib/prompt-utils.ts';
import { temporalProof } from '../../server/nvm/proof/tier1/temporal.ts';
import { genericnessProof } from '../../server/nvm/proof/tier3/genericness.ts';
import { biasAuditProof } from '../../server/nvm/proof/tier4/bias-audit.ts';
import { parseAuthorMove as parseAuthorMoveW41 } from '../../server/nvm/live/move-bus.ts';

// ── Wave 68: NaN hardening, arc alignment, enhanced bible ────────────────────
import { buildIntentionRegistry as buildIntentionRegistryW68 } from '../../server/nvm/drama/intention-registry.ts';
import { computeConflicts as computeConflictsW68 } from '../../server/nvm/drama/conflict-orchestrator.ts';
import { buildStoryBibleSummary } from '../../server/nvm/bible/index.ts';

// ── Wave 70: rewrite.ts story context enrichment ─────────────────────────────
import { rewritePass } from '../../server/nvm/revision/rewrite.ts';
import type { StoryContext } from '../../server/nvm/revision/passes/types.ts';

// ── Wave 71: NaN guards for LLM confidence fields in Agent + mine.ts ─────────
import type { SimResult } from '../../server/nvm/selfplay/corpus.ts';
  function makeRecord79(
    overrides: Partial<import('../../server/nvm/screenplay/memory.ts').ScreenplaySceneRecord>,
  ): import('../../server/nvm/screenplay/memory.ts').ScreenplaySceneRecord {
    return {
      commitId: 'c0', sceneIdx: 0, slug: 'INT. TEST', purpose: 'character_moment',
      dramaticTurn: '', revelation: null, emotionalShift: 'neutral',
      visualBeats: [], dialogueHighlights: [], unresolvedClues: [],
      seededClueIds: [], payoffSetupIds: [], clockRaised: false, clockDelta: 0,
      suspenseDelta: 0, curiosityDelta: 0, createdAt: 0,
      ...overrides,
    };
  }

// ── Wave 104: emotional debt tracker, quality constraint gap, originality clichés ─

import { originalityProof } from '../../server/nvm/proof/tier3/originality.ts';

// ── Wave 106: attribution phantom refs, operator rotation, showrunner new checks ─

import { showrunnerCritic } from '../../server/nvm/room/critics/showrunner.ts';
import { attributionProof } from '../../server/nvm/proof/tier4/attribution.ts';

// ── Wave 107: necessity state-awareness, dramatic irony tension ─────────────────

import { necessityProof } from '../../server/nvm/proof/tier2/necessity.ts';

// ── Wave 123 — Quality Engine + Revision Pass improvements ──────────────────

/** Build a minimal valid NarrativeTransitionIR for Wave 123 unit tests */
function makeMinimalIR(sceneIdx: number, ops: StoryOp[]): import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR {
  return {
    transitionId: `w123-ir-${sceneIdx}`,
    sceneIdx,
    sceneFunction: 'build_tension',
    activeMechanisms: [],
    beforeStateHash: '',
    ops,
    preconditions: [],
    postconditions: [],
    provenance: { origin: 'model_generated' as const, createdAt: 0 },
  };
}

// ── Wave 128 ─────────────────────────────────────────────────────────────────

import { composePromptModifiers, SYNERGY_OVERRIDES } from '../../server/lib/genre-router.ts';

// ── Wave 129 — P2: Export pipeline (FDX, DOCX, print-HTML) ──────────────────
// (parseFountain already imported at top of test file)

const SAMPLE_FOUNTAIN_P2 = `Title: Test Story
Credit: Written by AI

INT. LIVING ROOM - DAY

JOHN sits quietly.

JOHN
Hello, world.
(smiling)
It's a good day.

CUT TO:

EXT. PARK - SUNSET

A WOMAN walks her dog.`;

// ── Wave 130 — Revision Engine Hardening + Theme Resonance Pass ──────────────

import { themePass } from '../../server/nvm/revision/passes/theme.ts';
import type { PassInput } from '../../server/nvm/revision/passes/types.ts';
import type { ScreenplaySceneRecord } from '../../server/nvm/screenplay/memory.ts';
import type { StructureState } from '../../server/nvm/screenplay/structure.ts';

// Complete ScreenplaySceneRecord factory — every required field present so the
// records typecheck under `tsc --noEmit`, not just under runtime strip-types.
function makeSceneRecord(over: Partial<ScreenplaySceneRecord> = {}): ScreenplaySceneRecord {
  return {
    commitId: `commit-${over.sceneIdx ?? 0}`,
    sceneIdx: 0,
    slug: 'INT. ROOM - DAY',
    purpose: 'establish_world',
    dramaticTurn: 'none',
    revelation: null,
    emotionalShift: 'neutral',
    visualBeats: [],
    dialogueHighlights: [],
    unresolvedClues: [],
    seededClueIds: [],
    payoffSetupIds: [],
    clockRaised: false,
    clockDelta: 0,
    suspenseDelta: 0,
    curiosityDelta: 0,
    createdAt: 0,
    ...over,
  };
}

function makeMinimalInput(overrides: Partial<PassInput> = {}): PassInput {
  return {
    fountain: 'INT. ROOM - DAY\n\nA person sits.\n',
    original: 'INT. ROOM - DAY\n\nA person sits.\n',
    annotations: [],
    structure: {
      actPosition: 'act1', escalating: false, reversalCount: 0,
      openClues: 0, completionPercent: 20, midpointPressure: 0,
      tightestScene: 0,
    } as StructureState,
    records: [makeSceneRecord()],
    approvedSpans: [],
    storyContext: {},
    ...overrides,
  };
}

// ── Wave 132 — Rewrite truncation guard ──────────────────────────────────────

import { evaluateRewrite, REWRITE_MIN_LENGTH_RATIO } from '../../server/nvm/revision/rewrite.ts';

// ── Wave 134 — Relationship Arc Pass (Pass 14) ───────────────────────────────

import { relationshipArcPass } from '../../server/nvm/revision/passes/relationship-arc.ts';


  // ── Wave 150: Dialogue pass enhancements ──────────────────────────────────
  describe('Wave 150 — dialoguePass: talking heads, over-parenthetical, deadlock', async () => {
    const blankRec = (idx: number): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      purpose: 'dialogue', dramaticTurn: 'nothing', revelation: null,
      clockRaised: false, clockDelta: 0, emotionalShift: 'neutral', suspenseDelta: 1,
      dialogueHighlights: [], unresolvedClues: [], seededClueIds: [], payoffSetupIds: [],
      visualBeats: [], relationshipShifts: [],
    });

    it('dialoguePass detects TALKING_HEADS for long dialogue run with no action beats', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      // 12+ character-cue/dialogue lines with no action between them
      let block = `INT. ROOM - DAY\n`;
      for (let i = 0; i < 6; i++) {
        block += `ALICE\nSomething important.\n\nBOB\nI disagree with that.\n\n`;
      }
      const result = await dialoguePass({
        fountain: block, original: block,
        records: [blankRec(0)] as any, structure: {} as any, annotations: [], approvedSpans: [],
      });
      const heads = result.issues.filter(i => i.rule === 'TALKING_HEADS');
      assert.ok(heads.length >= 1, 'Should detect TALKING_HEADS for long unbroken dialogue run');
      assert.ok(heads[0].severity === 'minor');
    });

    it('dialoguePass does NOT fire TALKING_HEADS when action breaks dialogue', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      let block = `INT. ROOM - DAY\n`;
      for (let i = 0; i < 6; i++) {
        block += `ALICE\nSomething important.\n\nBOB\nI disagree.\n\nShe sits down.\n\n`;
      }
      const result = await dialoguePass({
        fountain: block, original: block,
        records: [blankRec(0)] as any, structure: {} as any, annotations: [], approvedSpans: [],
      });
      const heads = result.issues.filter(i => i.rule === 'TALKING_HEADS');
      assert.ok(heads.length === 0, 'Should NOT fire when action lines break the dialogue run');
    });

    it('dialoguePass detects OVER_PARENTHETICAL for a character directing every line', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      // ALICE has a parenthetical on 6 of 7 lines = 86%
      const fountain = `INT. ROOM - DAY
ALICE
(angrily)
First line here.
(desperately)
Second line here.
(quietly)
Third line here.
(bitterly)
Fourth line here.
(hopefully)
Fifth line here.
(sarcastically)
Sixth line here.
Seventh line no paren.

BOB
Okay.
`;
      const result = await dialoguePass({
        fountain, original: fountain,
        records: [blankRec(0)] as any, structure: {} as any, annotations: [], approvedSpans: [],
      });
      const overparen = result.issues.filter(i => i.rule === 'OVER_PARENTHETICAL');
      assert.ok(overparen.length >= 1, 'Should detect OVER_PARENTHETICAL for >40% parenthetical rate');
      assert.ok(overparen[0].severity === 'minor');
    });

    it('dialoguePass detects DEADLOCK_DIALOGUE for circular argument with repeated keywords', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      // ALICE and BOB repeat "money contract signing deadline" cycle
      const fountain = `INT. OFFICE - DAY
ALICE
The contract money signing deadline must happen today.

BOB
The contract money signing cannot happen before deadline review.

ALICE
Without the money contract we cannot meet the signing deadline.

BOB
The signing money deadline contract is not ready yet.

ALICE
This money contract deadline signing situation is impossible.

BOB
We need to resolve this signing contract money deadline now.
`;
      const result = await dialoguePass({
        fountain, original: fountain,
        records: [blankRec(0)] as any, structure: {} as any, annotations: [], approvedSpans: [],
      });
      const deadlock = result.issues.filter(i => i.rule === 'DEADLOCK_DIALOGUE');
      assert.ok(deadlock.length >= 1, 'Should detect DEADLOCK_DIALOGUE for circular cycling argument');
      assert.ok(deadlock[0].severity === 'minor');
    });
  });


  // ── Wave 164: Dialogue pass enhancements ──────────────────────────────────
  describe('Wave 164 — dialoguePass: rhetorical question flood, density inversion, voice uniformity', async () => {
    const makeRec = (idx: number, override: Partial<any> = {}): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      purpose: 'dialogue', dramaticTurn: 'nothing', revelation: null,
      clockRaised: false, clockDelta: 0, emotionalShift: 'neutral', suspenseDelta: 1,
      dialogueHighlights: [], unresolvedClues: [], seededClueIds: [],
      payoffSetupIds: [], visualBeats: [], relationshipShifts: [],
      ...override,
    });

    // ── RHETORICAL_QUESTION_FLOOD ─────────────────────────────────────────────
    it('dialoguePass detects RHETORICAL_QUESTION_FLOOD when speaker asks 3+ consecutive questions', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      const fountain = [
        'INT. OFFICE - DAY',
        '',
        'ALICE',
        'Where did he go?',
        '',
        'BOB',
        "I don't know.",
        '',
        'ALICE',
        "Why didn't you call me?",
        '',
        'BOB',
        'I forgot.',
        '',
        'ALICE',
        'What were you thinking?',
        '',
      ].join('\n');
      const { issues } = await dialoguePass({
        fountain, records: [makeRec(0)] as any, approvedSpans: [],
        storyContext: undefined as any, priorPassResults: [],
      } as any);
      assert.ok(
        issues.some(i => i.rule === 'RHETORICAL_QUESTION_FLOOD'),
        `Expected RHETORICAL_QUESTION_FLOOD; got: ${issues.map(i => i.rule).join(', ')}`,
      );
    });

    it('dialoguePass does NOT fire RHETORICAL_QUESTION_FLOOD when speaker mixes questions with declarations', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      const fountain = [
        'INT. OFFICE - DAY',
        '',
        'ALICE',
        'Where did he go?',
        '',
        'BOB',
        "I don't know.",
        '',
        'ALICE',
        'I need to find him now.',
        '',
        'BOB',
        "I'll help you look.",
        '',
        'ALICE',
        'Can you call him?',
        '',
      ].join('\n');
      const { issues } = await dialoguePass({
        fountain, records: [makeRec(0)] as any, approvedSpans: [],
        storyContext: undefined as any, priorPassResults: [],
      } as any);
      assert.ok(
        !issues.some(i => i.rule === 'RHETORICAL_QUESTION_FLOOD'),
        'Should NOT fire when speaker mixes questions with declarative statements',
      );
    });

    // ── DIALOGUE_DENSITY_INVERSION ────────────────────────────────────────────
    it('dialoguePass detects DIALOGUE_DENSITY_INVERSION when climax talks more than setup', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      // 8 scenes: setup (0,1) = 2 lines each; climax (6,7) = 10 lines each
      const buildHeavy = (idx: number) =>
        `INT. SC${idx} - DAY\n\n` +
        Array.from({ length: 5 }, (_, j) =>
          `ALICE\nLine ${j + 1} of dialogue here.\n\nBOB\nResponse ${j + 1} here.\n`,
        ).join('\n');
      const buildSparse = (idx: number) =>
        `INT. SC${idx} - DAY\n\nALICE\nHello.\n\nBOB\nHi.\n\n`;
      const buildSingle = (idx: number) =>
        `INT. SC${idx} - DAY\n\nALICE\nOkay.\n\n`;
      const fountain =
        buildSparse(0) + buildSparse(1) +
        buildSingle(2) + buildSingle(3) + buildSingle(4) + buildSingle(5) +
        buildHeavy(6) + buildHeavy(7);
      const records = Array.from({ length: 8 }, (_, i) => makeRec(i));
      const { issues } = await dialoguePass({
        fountain, records: records as any, approvedSpans: [],
        storyContext: undefined as any, priorPassResults: [],
      } as any);
      assert.ok(
        issues.some(i => i.rule === 'DIALOGUE_DENSITY_INVERSION'),
        `Expected DIALOGUE_DENSITY_INVERSION; got: ${issues.map(i => i.rule).join(', ')}`,
      );
    });

    it('dialoguePass does NOT fire DIALOGUE_DENSITY_INVERSION when setup talks more than climax', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      const buildHeavy = (idx: number) =>
        `INT. SC${idx} - DAY\n\n` +
        Array.from({ length: 5 }, (_, j) =>
          `ALICE\nLine ${j + 1} here.\n\nBOB\nResp ${j + 1}.\n`,
        ).join('\n');
      const buildSparse = (idx: number) =>
        `INT. SC${idx} - DAY\n\nALICE\nReady.\n\nBOB\nGo.\n\n`;
      const buildSingle = (idx: number) =>
        `INT. SC${idx} - DAY\n\nALICE\nOkay.\n\n`;
      const fountain =
        buildHeavy(0) + buildHeavy(1) +
        buildSingle(2) + buildSingle(3) + buildSingle(4) + buildSingle(5) +
        buildSparse(6) + buildSparse(7);
      const records = Array.from({ length: 8 }, (_, i) => makeRec(i));
      const { issues } = await dialoguePass({
        fountain, records: records as any, approvedSpans: [],
        storyContext: undefined as any, priorPassResults: [],
      } as any);
      assert.ok(
        !issues.some(i => i.rule === 'DIALOGUE_DENSITY_INVERSION'),
        'Should NOT fire when setup zone has more dialogue than climax',
      );
    });

    // ── CHARACTER_VOICE_UNIFORMITY ────────────────────────────────────────────
    it('dialoguePass detects CHARACTER_VOICE_UNIFORMITY when all speakers share same rhythm', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      // All 3 speakers have lines of identical length (~37 chars)
      const line37 = 'This is roughly thirty-seven chars ok';
      const entries: string[] = ['INT. OFFICE - DAY', ''];
      for (let i = 0; i < 5; i++) {
        entries.push('ALICE', line37, '', 'BOB', line37, '', 'CAROL', line37, '');
      }
      const fountain = entries.join('\n');
      const { issues } = await dialoguePass({
        fountain, records: [makeRec(0)] as any, approvedSpans: [],
        storyContext: undefined as any, priorPassResults: [],
      } as any);
      assert.ok(
        issues.some(i => i.rule === 'CHARACTER_VOICE_UNIFORMITY'),
        `Expected CHARACTER_VOICE_UNIFORMITY; got: ${issues.map(i => i.rule).join(', ')}`,
      );
    });

    it('dialoguePass does NOT fire CHARACTER_VOICE_UNIFORMITY when speakers have distinct line lengths', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      const shortLine = 'Yes.';
      const medLine = 'I understand what you are saying, really I do.';
      const longLine = 'This is a very long and detailed line of dialogue that provides tremendous context for the entire scene and its dramatic stakes.';
      const entries: string[] = ['INT. OFFICE - DAY', ''];
      for (let i = 0; i < 5; i++) {
        entries.push('ALICE', shortLine, '', 'BOB', medLine, '', 'CAROL', longLine, '');
      }
      const fountain = entries.join('\n');
      const { issues } = await dialoguePass({
        fountain, records: [makeRec(0)] as any, approvedSpans: [],
        storyContext: undefined as any, priorPassResults: [],
      } as any);
      assert.ok(
        !issues.some(i => i.rule === 'CHARACTER_VOICE_UNIFORMITY'),
        'Should NOT fire when speakers have distinct rhythmic signatures',
      );
    });
  });


  describe('Wave 178 — dialoguePass: greeting ritual, vocative overuse, filler openers', async () => {
    const blankRec = (idx: number): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`, purpose: 'dialogue',
      dramaticTurn: 'nothing', revelation: null, clockRaised: false, clockDelta: 0,
      emotionalShift: 'neutral', suspenseDelta: 1, dialogueHighlights: [],
      unresolvedClues: [], seededClueIds: [], payoffSetupIds: [], visualBeats: [],
      relationshipShifts: [],
    });
    const dlgInput = (fountain: string) => ({
      fountain, original: fountain,
      records: [blankRec(0)] as any, structure: {} as any, annotations: [], approvedSpans: [],
    });
    // Build a fountain from [speaker, line] pairs under one scene heading
    const buildDialogue = (pairs: Array<[string, string]>) =>
      `INT. ROOM - DAY\n\n` + pairs.map(([s, l]) => `${s}\n${l}\n`).join('\n');

    // ── GREETING_RITUAL_OVERUSE ───────────────────────────────────────────────
    it('dialoguePass detects GREETING_RITUAL_OVERUSE when greetings pad the dialogue', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      const fountain = buildDialogue([
        ['ALICE', 'Hello.'], ['BOB', 'Hi.'], ['ALICE', 'How are you?'],
        ['BOB', 'I brought the files.'], ['ALICE', 'Good.'],
      ]);
      const result = await dialoguePass(dlgInput(fountain));
      const greet = result.issues.filter(i => i.rule === 'GREETING_RITUAL_OVERUSE');
      assert.ok(greet.length >= 1, `Should detect GREETING_RITUAL_OVERUSE; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(greet[0].severity === 'minor');
    });

    it('dialoguePass does NOT fire GREETING_RITUAL_OVERUSE when dialogue starts mid-conversation', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      const fountain = buildDialogue([
        ['ALICE', 'You took the money.'], ['BOB', 'I had no choice about the timing.'],
        ['ALICE', 'There is always a choice.'], ['BOB', 'Not for people like us.'],
        ['ALICE', 'Then we are done.'],
      ]);
      const result = await dialoguePass(dlgInput(fountain));
      assert.ok(
        !result.issues.some(i => i.rule === 'GREETING_RITUAL_OVERUSE'),
        'Should NOT fire when dialogue contains no ritual greetings',
      );
    });

    // ── VOCATIVE_NAME_OVERUSE ─────────────────────────────────────────────────
    it('dialoguePass detects VOCATIVE_NAME_OVERUSE when characters over-name each other', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      const fountain = buildDialogue([
        ['ALICE', 'Bob, you have to listen to me.'],
        ['BOB', 'Alice, I already heard you.'],
        ['ALICE', 'Then act on it, Bob.'],
        ['BOB', 'It is not that simple.'],
        ['ALICE', 'It never is.'],
        ['BOB', 'Give me time.'],
        ['ALICE', 'We are out of time.'],
        ['BOB', 'I understand that.'],
      ]);
      const result = await dialoguePass(dlgInput(fountain));
      const voc = result.issues.filter(i => i.rule === 'VOCATIVE_NAME_OVERUSE');
      assert.ok(voc.length >= 1, `Should detect VOCATIVE_NAME_OVERUSE; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(voc[0].severity === 'minor');
    });

    it('dialoguePass does NOT fire VOCATIVE_NAME_OVERUSE when names are used sparingly', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      const fountain = buildDialogue([
        ['ALICE', 'You have to listen to me.'],
        ['BOB', 'I already heard you.'],
        ['ALICE', 'Then act on it.'],
        ['BOB', 'It is not that simple.'],
        ['ALICE', 'It never is.'],
        ['BOB', 'Give me time.'],
        ['ALICE', 'We are out of time.'],
        ['BOB', 'I understand that.'],
      ]);
      const result = await dialoguePass(dlgInput(fountain));
      assert.ok(
        !result.issues.some(i => i.rule === 'VOCATIVE_NAME_OVERUSE'),
        'Should NOT fire when characters rarely address each other by name',
      );
    });

    // ── FILLER_OPENER_OVERUSE ─────────────────────────────────────────────────
    it('dialoguePass detects FILLER_OPENER_OVERUSE when lines open with throat-clears', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      const fountain = buildDialogue([
        ['ALICE', 'Well, I think you are wrong.'],
        ['BOB', 'Look, it is complicated.'],
        ['ALICE', 'Listen, I do not have time.'],
        ['BOB', 'I mean, we could try again.'],
        ['ALICE', 'That is enough.'],
        ['BOB', 'Fine.'],
        ['ALICE', 'Good.'],
        ['BOB', 'Agreed for once.'],
      ]);
      const result = await dialoguePass(dlgInput(fountain));
      const filler = result.issues.filter(i => i.rule === 'FILLER_OPENER_OVERUSE');
      assert.ok(filler.length >= 1, `Should detect FILLER_OPENER_OVERUSE; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(filler[0].severity === 'minor');
    });

    it('dialoguePass does NOT fire FILLER_OPENER_OVERUSE when lines start on content', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      const fountain = buildDialogue([
        ['ALICE', 'I think you are wrong.'],
        ['BOB', 'It is complicated.'],
        ['ALICE', 'I do not have time.'],
        ['BOB', 'We could try again.'],
        ['ALICE', 'That is enough.'],
        ['BOB', 'Fine by me.'],
        ['ALICE', 'Good enough.'],
        ['BOB', 'Agreed for once.'],
      ]);
      const result = await dialoguePass(dlgInput(fountain));
      assert.ok(
        !result.issues.some(i => i.rule === 'FILLER_OPENER_OVERUSE'),
        'Should NOT fire when dialogue lines begin on their content',
      );
    });
  });


  describe('Wave 185 — dialoguePass: question dominance, interruption void, speaker monopoly', async () => {
    const blankRec = (): any => ({
      commitId: 'c0', sceneIdx: 0, slug: 'INT. ROOM - DAY',
      purpose: 'dialogue', dramaticTurn: 'nothing', revelation: null,
      clockRaised: false, clockDelta: 0, emotionalShift: 'neutral', suspenseDelta: 1,
      dialogueHighlights: [], unresolvedClues: [], seededClueIds: [],
      payoffSetupIds: [], visualBeats: [], relationshipShifts: [],
    });

    // QUESTION_DOMINANCE — fires
    it('QUESTION_DOMINANCE fires when >45% of dialogue lines are questions', async () => {
      // 12 lines: 8 questions (67%). No single speaker has 3 consecutive questions.
      const fountain = `INT. OFFICE - DAY

ALICE
Did you call her?

BOB
Why would I call?

ALICE
I thought you two talked.

BOB
We haven't spoken in weeks.

ALICE
Are you sure she knows?

BOB
How would she know?

ALICE
You could have told her.

BOB
Should I have?

ALICE
Doesn't she deserve the truth?

BOB
I don't know what the truth is.

ALICE
Can you just be honest?

BOB
Is this really about her?
`;
      const result = await dialoguePass({ fountain, original: fountain, records: [blankRec()], structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(
        result.issues.some(i => i.rule === 'QUESTION_DOMINANCE'),
        `Expected QUESTION_DOMINANCE, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });

    // QUESTION_DOMINANCE — no-fire
    it('QUESTION_DOMINANCE does not fire when question rate is below threshold', async () => {
      const fountain = `INT. OFFICE - DAY

ALICE
I think we need to talk.

BOB
What's on your mind?

ALICE
She called me this morning.

BOB
I didn't know.

ALICE
She said you two argued.

BOB
I handled it.

ALICE
She's upset.

BOB
I'll call her tonight.

ALICE
This can't keep happening.

BOB
I know. It won't.

ALICE
Good.

BOB
Okay.
`;
      const result = await dialoguePass({ fountain, original: fountain, records: [blankRec()], structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(
        !result.issues.some(i => i.rule === 'QUESTION_DOMINANCE'),
        `Expected no QUESTION_DOMINANCE, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });

    // INTERRUPTION_VOID — fires
    it('INTERRUPTION_VOID fires when no dialogue line has an interruption marker', async () => {
      const fountain = `INT. HALLWAY - NIGHT

ALICE
We have to leave now.

BOB
I'm not going anywhere.

ALICE
You don't understand what's happening.

BOB
I understand perfectly.

ALICE
Then help me.

BOB
I can't.

ALICE
Why not?

BOB
Because I made a deal.

ALICE
With who?

BOB
It doesn't matter.

ALICE
It matters to me.

BOB
Then you shouldn't have asked.

ALICE
This is insane.

BOB
Walk away.

ALICE
I won't.
`;
      const result = await dialoguePass({ fountain, original: fountain, records: [blankRec()], structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(
        result.issues.some(i => i.rule === 'INTERRUPTION_VOID'),
        `Expected INTERRUPTION_VOID, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });

    // INTERRUPTION_VOID — no-fire
    it('INTERRUPTION_VOID does not fire when interruption markers are present', async () => {
      const fountain = `INT. HALLWAY - NIGHT

ALICE
We have to leave now.

BOB
I'm not going--

ALICE
Don't give me excuses.

BOB
You don't understand what--

ALICE
I understand everything.

BOB
I made a deal.

ALICE
With who?

BOB
It doesn't matter.

ALICE
It matters to me.

BOB
Then you shouldn't have asked.

ALICE
This is insane.

BOB
Walk away.

ALICE
I won't.
`;
      const result = await dialoguePass({ fountain, original: fountain, records: [blankRec()], structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(
        !result.issues.some(i => i.rule === 'INTERRUPTION_VOID'),
        `Expected no INTERRUPTION_VOID, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });

    // SPEAKER_MONOPOLY — fires
    it('SPEAKER_MONOPOLY fires when one character delivers >55% of all dialogue', async () => {
      // ALICE: 10 lines, BOB: 7 lines → 17 total; ALICE=59%
      // No 5-consecutive from ALICE (breaks at max 3 in a row)
      const fountain = `INT. KITCHEN - DAY

ALICE
I need you to listen.

ALICE
This is important.

ALICE
What happened last night wasn't an accident.

BOB
What do you mean?

ALICE
Someone was in the house.

ALICE
I heard them.

ALICE
I saw the door open.

BOB
Are you sure?

ALICE
I'm completely sure.

BOB
Okay. Tell me what you saw.

ALICE
A figure. Near the stairs.

ALICE
Then it was gone.

BOB
Did you call the police?

ALICE
No. That's why I'm telling you.

ALICE
We need to handle this ourselves.

BOB
Why? What aren't you telling me?

BOB
Alice.
`;
      const result = await dialoguePass({ fountain, original: fountain, records: [blankRec()], structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(
        result.issues.some(i => i.rule === 'SPEAKER_MONOPOLY'),
        `Expected SPEAKER_MONOPOLY, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });

    // SPEAKER_MONOPOLY — no-fire
    it('SPEAKER_MONOPOLY does not fire when dialogue is evenly distributed', async () => {
      const fountain = `INT. KITCHEN - DAY

ALICE
I need you to listen.

BOB
I'm listening.

ALICE
Someone was in the house last night.

BOB
What? Are you sure?

ALICE
I saw the door open.

BOB
Did you call the police?

ALICE
No. Not yet.

BOB
We have to. This is serious.

ALICE
I know. I'm scared.

BOB
I'll call them now.

ALICE
Thank you.

BOB
We'll figure this out.

ALICE
Together.

BOB
Together.

ALICE
Okay.
`;
      const result = await dialoguePass({ fountain, original: fountain, records: [blankRec()], structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(
        !result.issues.some(i => i.rule === 'SPEAKER_MONOPOLY'),
        `Expected no SPEAKER_MONOPOLY, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });
  });


  describe('Wave 227 — dialoguePass: mirror syndrome, imperative dominance, last-act exposition spike', async () => {
    const makeRec227 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, dialogueHighlights: [],
      revelation: null, relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'dialogue', dramaticTurn: 'nothing',
      ...overrides,
    });

    it('dialoguePass detects DIALOGUE_MIRROR_SYNDROME when responses echo the prior line as a question 3+ times', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      // 3 mirror responses: each response echoes ≥2 content words from prior line and ends with '?'
      const fountain227a = `INT. SC0 - DAY
An office meeting.

ALICE
I found the hidden briefcase outside.
BOB
You found the briefcase outside?
ALICE
There is secret money inside the case.
BOB
Secret money inside the case?
ALICE
And there is a signed contract between them.
BOB
A signed contract between them?
ALICE
The evidence confirms the suspect clearly.
BOB
The evidence confirms it?
ALICE
That means someone tampered with everything.
BOB
Someone tampered with everything here?
`;
      const records227a = [makeRec227(0)];
      const result227a = await dialoguePass({
        fountain: fountain227a, original: fountain227a,
        records: records227a as any, structure: {} as any,
        annotations: [null] as any, approvedSpans: [],
      });
      const mirror = result227a.issues.filter(i => i.rule === 'DIALOGUE_MIRROR_SYNDROME');
      assert.ok(mirror.length >= 1, 'Should detect DIALOGUE_MIRROR_SYNDROME when 3+ responses echo prior line as question');
      assert.strictEqual(mirror[0].severity, 'minor');
    });

    it('dialoguePass does NOT fire DIALOGUE_MIRROR_SYNDROME when responses are substantive reactions', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      // Responses address the prior line but don't echo content words back as questions
      const fountain227b = `INT. SC0 - DAY
An office meeting.

ALICE
I found the hidden briefcase outside.
BOB
What was inside it exactly?
ALICE
There is money inside the case somewhere.
BOB
That changes everything we planned carefully.
ALICE
And there is a signed contract between people.
BOB
That implicates several senior officials directly.
ALICE
The evidence confirms the original suspicion.
BOB
Then we should contact authorities immediately.
ALICE
I agree this requires urgent attention.
BOB
Let us proceed with great caution.
`;
      const records227b = [makeRec227(0)];
      const result227b = await dialoguePass({
        fountain: fountain227b, original: fountain227b,
        records: records227b as any, structure: {} as any,
        annotations: [null] as any, approvedSpans: [],
      });
      const mirror = result227b.issues.filter(i => i.rule === 'DIALOGUE_MIRROR_SYNDROME');
      assert.strictEqual(mirror.length, 0, 'Should NOT fire when responses are substantive and non-mirroring');
    });

    it('dialoguePass detects IMPERATIVE_DOMINANCE when a character delivers ≥60% of lines as commands', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      // BOSS has 12 lines: 9 imperatives (75%) and 3 non-imperatives
      const fountain227c = `INT. SC0 - DAY
The boardroom.

BOSS
Get out of here right now.
Stop what you are doing.
Leave this building immediately.
Move away from the window.
Bring me those documents tonight.
Give me your phone.
Tell me everything.
Come back here tomorrow.
Find the missing file.
What do you mean by that statement.
I need to understand this situation.
Perhaps we should consider alternatives.
`;
      const records227c = [makeRec227(0)];
      const result227c = await dialoguePass({
        fountain: fountain227c, original: fountain227c,
        records: records227c as any, structure: {} as any,
        annotations: [null] as any, approvedSpans: [],
      });
      const impDom = result227c.issues.filter(i => i.rule === 'IMPERATIVE_DOMINANCE');
      assert.ok(impDom.length >= 1, 'Should detect IMPERATIVE_DOMINANCE when character delivers 75% imperative commands');
      assert.strictEqual(impDom[0].severity, 'minor');
    });

    it('dialoguePass does NOT fire IMPERATIVE_DOMINANCE when a character uses varied speech types', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      // BOSS has 12 lines: only 4 imperatives (33%), 8 are questions/declarations
      const fountain227d = `INT. SC0 - DAY
The boardroom.

BOSS
What do you think about this plan.
I believe we need more time here.
Get out of here right now.
Perhaps we should reconsider this approach.
Do you understand what I am saying.
I am not sure this will work.
Leave this building immediately.
We need to discuss this more carefully.
I wonder what you are thinking right now.
Perhaps there is another way forward here.
Go find the missing files please.
I think we can solve this together.
`;
      const records227d = [makeRec227(0)];
      const result227d = await dialoguePass({
        fountain: fountain227d, original: fountain227d,
        records: records227d as any, structure: {} as any,
        annotations: [null] as any, approvedSpans: [],
      });
      const impDom = result227d.issues.filter(i => i.rule === 'IMPERATIVE_DOMINANCE');
      assert.strictEqual(impDom.length, 0, 'Should NOT fire when character uses a mix of speech types');
    });

    it('dialoguePass detects LAST_ACT_EXPOSITION_SPIKE when Act 3 has more exposition than Act 1', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      // 8 records; act1End=2 (scenes 0-1), act3Start=6 (scenes 6-7)
      // Act 1: 3 normal dialogue lines (0 expository)
      // Act 3: 4 lines, 3 with AS_YOU_KNOW patterns (75% expository)
      const fountain227e = [
        'INT. SC0 - DAY\nMorning.\n\nALICE\nI found something important.\n\nBOB\nTell me what you think.\n',
        'INT. SC1 - DAY\nLater.\n\nALICE\nWe need to move forward.\n',
        'INT. SC2 - DAY\nMidday.\n\nBOB\nThe plan progresses well.\n',
        'INT. SC3 - DAY\nAfternoon.\n\nALICE\nStay focused on the goal.\n',
        'INT. SC4 - DAY\nEvening.\n\nBOB\nKeep pushing forward.\n',
        'INT. SC5 - DAY\nNight.\n\nALICE\nWe are almost there.\n',
        'INT. SC6 - DAY\nClimax.\n\nALICE\nAs you know, the killer came from inside.\nAs I told you before, the weapon was planted.\nYou already know about the hidden evidence here.\n',
        'INT. SC7 - DAY\nDenouement.\n\nBOB\nAs we discussed earlier, you were completely right.\n',
      ].join('\n');
      const records227e = Array.from({ length: 8 }, (_, i) => makeRec227(i));
      const result227e = await dialoguePass({
        fountain: fountain227e, original: fountain227e,
        records: records227e as any, structure: {} as any,
        annotations: records227e.map(() => null) as any, approvedSpans: [],
      });
      const lastActExp = result227e.issues.filter(i => i.rule === 'LAST_ACT_EXPOSITION_SPIKE');
      assert.ok(lastActExp.length >= 1, 'Should detect LAST_ACT_EXPOSITION_SPIKE when Act 3 has more exposition than Act 1');
      assert.strictEqual(lastActExp[0].severity, 'major');
    });

    it('dialoguePass does NOT fire LAST_ACT_EXPOSITION_SPIKE when Act 1 has more exposition than Act 3', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      // Act 1: exposition lines; Act 3: clean action dialogue
      const fountain227f = [
        'INT. SC0 - DAY\nMorning.\n\nALICE\nAs you know, this whole situation started last year.\nAs I told you before, we cannot trust anyone here.\n',
        'INT. SC1 - DAY\nLater.\n\nBOB\nYou already know about the arrangement we made.\n',
        'INT. SC2 - DAY\nMidday.\n\nALICE\nLet us proceed then.\n',
        'INT. SC3 - DAY\nAfternoon.\n\nBOB\nAgreed completely.\n',
        'INT. SC4 - DAY\nEvening.\n\nALICE\nNow we act.\n',
        'INT. SC5 - DAY\nNight.\n\nBOB\nThe door opens.\n',
        'INT. SC6 - DAY\nClimax.\n\nALICE\nWe move now.\n\nBOB\nRight behind you.\n',
        'INT. SC7 - DAY\nDenouement.\n\nALICE\nIt is over.\n\nBOB\nFinally.\n',
      ].join('\n');
      const records227f = Array.from({ length: 8 }, (_, i) => makeRec227(i));
      const result227f = await dialoguePass({
        fountain: fountain227f, original: fountain227f,
        records: records227f as any, structure: {} as any,
        annotations: records227f.map(() => null) as any, approvedSpans: [],
      });
      const lastActExp = result227f.issues.filter(i => i.rule === 'LAST_ACT_EXPOSITION_SPIKE');
      assert.strictEqual(lastActExp.length, 0, 'Should NOT fire when Act 1 carries more exposition than Act 3');
    });
  });


  describe('Wave 311 — dialoguePass: hedge saturation, filler sound overuse, one-word dominance', async () => {
    const runD311 = async (fountain: string) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('DIALOGUE_HEDGE_SATURATION fires when >30% of lines contain a softener', async () => {
      const lines311hs = [
        'ALICE\nI just wanted to talk.',
        'BOB\nMaybe this can wait.',
        'ALICE\nI think we should go.',
        'BOB\nIt is sort of complicated.',
        'ALICE\nProbably nothing then.',
        'BOB\nGet your coat.',
        'ALICE\nThe car is outside.',
        'BOB\nWe leave at six.',
        'ALICE\nDoors lock at seven.',
        'BOB\nUnderstood completely.',
      ].join('\n\n');
      const res = await runD311(lines311hs);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_HEDGE_SATURATION'), 'DIALOGUE_HEDGE_SATURATION should fire');
    });

    it('DIALOGUE_HEDGE_SATURATION does not fire when dialogue is committed', async () => {
      const lines311nhs = [
        'ALICE\nWe are leaving now.',
        'BOB\nNo we are not.',
        'ALICE\nGet your coat.',
        'BOB\nMake me.',
        'ALICE\nThe car is outside.',
        'BOB\nLet it rust there.',
        'ALICE\nWe leave at six.',
        'BOB\nI decide when we leave.',
        'ALICE\nDoors lock at seven.',
        'BOB\nThen lock them.',
      ].join('\n\n');
      const res = await runD311(lines311nhs);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_HEDGE_SATURATION'), 'DIALOGUE_HEDGE_SATURATION should not fire');
    });

    it('DIALOGUE_FILLER_SOUND_OVERUSE fires when 3+ lines contain a hesitation sound', async () => {
      const lines311fs = [
        'ALICE\nUm, I am not sure about this.',
        'BOB\nUh, neither am I really.',
        'ALICE\nWhat do you want to do.',
        'BOB\nHmm, let me consider it.',
        'ALICE\nWe do not have all night.',
        'BOB\nI know that already.',
        'ALICE\nThen decide.',
        'BOB\nFine, we go.',
      ].join('\n\n');
      const res = await runD311(lines311fs);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_FILLER_SOUND_OVERUSE'), 'DIALOGUE_FILLER_SOUND_OVERUSE should fire');
    });

    it('DIALOGUE_FILLER_SOUND_OVERUSE does not fire when hesitation sounds are absent', async () => {
      const lines311nfs = [
        'ALICE\nI am not sure about this.',
        'BOB\nNeither am I really.',
        'ALICE\nWhat do you want to do.',
        'BOB\nLet me consider it.',
        'ALICE\nWe do not have all night.',
        'BOB\nI know that already.',
        'ALICE\nThen decide.',
        'BOB\nFine, we go.',
      ].join('\n\n');
      const res = await runD311(lines311nfs);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_FILLER_SOUND_OVERUSE'), 'DIALOGUE_FILLER_SOUND_OVERUSE should not fire');
    });

    it('DIALOGUE_ONE_WORD_DOMINANCE fires when >35% of lines are a single word', async () => {
      const lines311ow = [
        'ALICE\nNo.',
        'BOB\nWhy?',
        'ALICE\nStop.',
        'BOB\nWhen?',
        'ALICE\nNow.',
        'BOB\nI cannot do this alone tonight.',
        'ALICE\nThe whole plan depends on you.',
        'BOB\nYou always say that to me.',
        'ALICE\nBecause it is true every time.',
        'BOB\nThen help me carry it.',
      ].join('\n\n');
      const res = await runD311(lines311ow);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_ONE_WORD_DOMINANCE'), 'DIALOGUE_ONE_WORD_DOMINANCE should fire');
    });

    it('DIALOGUE_ONE_WORD_DOMINANCE does not fire when lines develop thoughts', async () => {
      const lines311now = [
        'ALICE\nNo, I will not do that.',
        'BOB\nWhy are you being like this.',
        'ALICE\nStop pushing me so hard.',
        'BOB\nWhen will you ever listen.',
        'ALICE\nNow is not the right time.',
        'BOB\nI cannot do this alone tonight.',
        'ALICE\nThe whole plan depends on you.',
        'BOB\nYou always say that to me.',
        'ALICE\nBecause it is true every time.',
        'BOB\nThen help me carry it.',
      ].join('\n\n');
      const res = await runD311(lines311now);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_ONE_WORD_DOMINANCE'), 'DIALOGUE_ONE_WORD_DOMINANCE should not fire');
    });
  });


  describe('Wave 966 — dialoguePass: dialogue curiosity zone imbalance, dialogue revelation zone imbalance, dialogue relationship zone imbalance', async () => {
    const makeRec966 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'establish_world', dramaticTurn: 'nothing',
      ...overrides,
    });
    const buildScenes966 = (count: number): string => {
      let f = '';
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${i} - DAY\n\nA figure moves through the room.\n\n`;
      }
      return f;
    };
    const runD966 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // Zone geometry n=10: Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}. Target at 0,1,2,8,9 →
    // Z0 3/5=60% (bloat), Z1 and Z2 empty → fires. Target at 0,3,5,8 → every zone touched → no-fire.
    it('DIALOGUE_CURIOSITY_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of curiosity-raising scenes', async () => {
      const records966a = Array.from({ length: 10 }, (_, i) =>
        makeRec966(i, [0, 1, 2, 8, 9].includes(i) ? { curiosityDelta: 1 } : {}));
      const res = await runD966(buildScenes966(10), records966a);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_CURIOSITY_ZONE_IMBALANCE'), 'DIALOGUE_CURIOSITY_ZONE_IMBALANCE should fire');
    });

    it('DIALOGUE_CURIOSITY_ZONE_IMBALANCE does not fire when curiosity-raising scenes touch every zone', async () => {
      const records966an = Array.from({ length: 10 }, (_, i) =>
        makeRec966(i, [0, 3, 5, 8].includes(i) ? { curiosityDelta: 1 } : {}));
      const res = await runD966(buildScenes966(10), records966an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_CURIOSITY_ZONE_IMBALANCE'), 'DIALOGUE_CURIOSITY_ZONE_IMBALANCE should not fire');
    });

    it('DIALOGUE_REVELATION_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of revelation scenes', async () => {
      const records966b = Array.from({ length: 10 }, (_, i) =>
        makeRec966(i, [0, 1, 2, 8, 9].includes(i) ? { revelation: 'a hidden truth surfaces' } : {}));
      const res = await runD966(buildScenes966(10), records966b);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_REVELATION_ZONE_IMBALANCE'), 'DIALOGUE_REVELATION_ZONE_IMBALANCE should fire');
    });

    it('DIALOGUE_REVELATION_ZONE_IMBALANCE does not fire when revelation scenes touch every zone', async () => {
      const records966bn = Array.from({ length: 10 }, (_, i) =>
        makeRec966(i, [0, 3, 5, 8].includes(i) ? { revelation: 'a hidden truth surfaces' } : {}));
      const res = await runD966(buildScenes966(10), records966bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_REVELATION_ZONE_IMBALANCE'), 'DIALOGUE_REVELATION_ZONE_IMBALANCE should not fire');
    });

    it('DIALOGUE_RELATIONSHIP_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of relationship-shift scenes', async () => {
      const records966c = Array.from({ length: 10 }, (_, i) =>
        makeRec966(i, [0, 1, 2, 8, 9].includes(i) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {}));
      const res = await runD966(buildScenes966(10), records966c);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_RELATIONSHIP_ZONE_IMBALANCE'), 'DIALOGUE_RELATIONSHIP_ZONE_IMBALANCE should fire');
    });

    it('DIALOGUE_RELATIONSHIP_ZONE_IMBALANCE does not fire when relationship-shift scenes touch every zone', async () => {
      const records966cn = Array.from({ length: 10 }, (_, i) =>
        makeRec966(i, [0, 3, 5, 8].includes(i) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {}));
      const res = await runD966(buildScenes966(10), records966cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_RELATIONSHIP_ZONE_IMBALANCE'), 'DIALOGUE_RELATIONSHIP_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 952 — dialoguePass: dialogue revelation_purpose zone imbalance, dialogue suspense zone imbalance, dialogue open_thread zone imbalance', async () => {
    const makeRec952 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'establish_world', dramaticTurn: 'nothing',
      ...overrides,
    });
    const buildScenes952 = (count: number): string => {
      let f = '';
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${i} - DAY\n\nA figure moves through the room.\n\n`;
      }
      return f;
    };
    const runD952 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // Zone geometry n=10: Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}. Target at 0,1,2,8,9 →
    // Z0 3/5=60% (bloat), Z1 and Z2 empty → fires. Target at 0,3,5,8 → every zone touched → no-fire.
    it('DIALOGUE_REVELATION_PURPOSE_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of revelation-purposed scenes', async () => {
      const records952a = Array.from({ length: 10 }, (_, i) =>
        makeRec952(i, [0, 1, 2, 8, 9].includes(i) ? { purpose: 'revelation' } : {}));
      const res = await runD952(buildScenes952(10), records952a);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_REVELATION_PURPOSE_ZONE_IMBALANCE'), 'DIALOGUE_REVELATION_PURPOSE_ZONE_IMBALANCE should fire');
    });

    it('DIALOGUE_REVELATION_PURPOSE_ZONE_IMBALANCE does not fire when revelation-purposed scenes touch every zone', async () => {
      const records952an = Array.from({ length: 10 }, (_, i) =>
        makeRec952(i, [0, 3, 5, 8].includes(i) ? { purpose: 'revelation' } : {}));
      const res = await runD952(buildScenes952(10), records952an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_REVELATION_PURPOSE_ZONE_IMBALANCE'), 'DIALOGUE_REVELATION_PURPOSE_ZONE_IMBALANCE should not fire');
    });

    it('DIALOGUE_SUSPENSE_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of suspense-raising scenes', async () => {
      const records952b = Array.from({ length: 10 }, (_, i) =>
        makeRec952(i, [0, 1, 2, 8, 9].includes(i) ? { suspenseDelta: 1 } : {}));
      const res = await runD952(buildScenes952(10), records952b);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_SUSPENSE_ZONE_IMBALANCE'), 'DIALOGUE_SUSPENSE_ZONE_IMBALANCE should fire');
    });

    it('DIALOGUE_SUSPENSE_ZONE_IMBALANCE does not fire when suspense-raising scenes touch every zone', async () => {
      const records952bn = Array.from({ length: 10 }, (_, i) =>
        makeRec952(i, [0, 3, 5, 8].includes(i) ? { suspenseDelta: 1 } : {}));
      const res = await runD952(buildScenes952(10), records952bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_SUSPENSE_ZONE_IMBALANCE'), 'DIALOGUE_SUSPENSE_ZONE_IMBALANCE should not fire');
    });

    it('DIALOGUE_OPEN_THREAD_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of open-thread scenes', async () => {
      const records952c = Array.from({ length: 10 }, (_, i) =>
        makeRec952(i, [0, 1, 2, 8, 9].includes(i) ? { unresolvedClues: ['q1'] } : {}));
      const res = await runD952(buildScenes952(10), records952c);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_OPEN_THREAD_ZONE_IMBALANCE'), 'DIALOGUE_OPEN_THREAD_ZONE_IMBALANCE should fire');
    });

    it('DIALOGUE_OPEN_THREAD_ZONE_IMBALANCE does not fire when open-thread scenes touch every zone', async () => {
      const records952cn = Array.from({ length: 10 }, (_, i) =>
        makeRec952(i, [0, 3, 5, 8].includes(i) ? { unresolvedClues: ['q1'] } : {}));
      const res = await runD952(buildScenes952(10), records952cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_OPEN_THREAD_ZONE_IMBALANCE'), 'DIALOGUE_OPEN_THREAD_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 938 — dialoguePass: dialogue revelation_purpose zone cluster, dialogue revelation_purpose drought run, dialogue positive_emotion zone imbalance', async () => {
    const makeRec938 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'establish_world', dramaticTurn: 'nothing',
      ...overrides,
    });
    const buildScenes938 = (count: number): string => {
      let f = '';
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${i} - DAY\n\nA figure moves through the room.\n\n`;
      }
      return f;
    };
    const runD938 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // DIALOGUE_REVELATION_PURPOSE_ZONE_CLUSTER fire: n=9, 3 thirds; revelation-purposed scenes at
    // 0,1,2 (opening third) → 3/3 = 100% > 75%. Filler default 'establish_world'.
    it('DIALOGUE_REVELATION_PURPOSE_ZONE_CLUSTER fires when >75% of revelation-purposed scenes cluster in one third', async () => {
      const records938a = Array.from({ length: 9 }, (_, i) =>
        makeRec938(i, [0, 1, 2].includes(i) ? { purpose: 'revelation' } : {}));
      const res = await runD938(buildScenes938(9), records938a);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_REVELATION_PURPOSE_ZONE_CLUSTER'), 'DIALOGUE_REVELATION_PURPOSE_ZONE_CLUSTER should fire');
    });

    it('DIALOGUE_REVELATION_PURPOSE_ZONE_CLUSTER does not fire when revelation-purposed scenes spread across thirds', async () => {
      const records938an = Array.from({ length: 9 }, (_, i) =>
        makeRec938(i, [0, 4, 8].includes(i) ? { purpose: 'revelation' } : {}));
      const res = await runD938(buildScenes938(9), records938an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_REVELATION_PURPOSE_ZONE_CLUSTER'), 'DIALOGUE_REVELATION_PURPOSE_ZONE_CLUSTER should not fire');
    });

    // DIALOGUE_REVELATION_PURPOSE_DROUGHT_RUN fire: n=10, revelation-purposed scenes at 0, 8, 9
    // (minPresentCount 3), leaving a 7-scene gap (indices 1-7) — run of 7 >= threshold 6.
    it('DIALOGUE_REVELATION_PURPOSE_DROUGHT_RUN fires when a long run has no revelation-purposed scene', async () => {
      const records938b = Array.from({ length: 10 }, (_, i) =>
        makeRec938(i, [0, 8, 9].includes(i) ? { purpose: 'revelation' } : {}));
      const res = await runD938(buildScenes938(10), records938b);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_REVELATION_PURPOSE_DROUGHT_RUN'), 'DIALOGUE_REVELATION_PURPOSE_DROUGHT_RUN should fire');
    });

    it('DIALOGUE_REVELATION_PURPOSE_DROUGHT_RUN does not fire when revelation-purposed scenes are evenly spread', async () => {
      const records938bn = Array.from({ length: 10 }, (_, i) =>
        makeRec938(i, [0, 3, 6, 9].includes(i) ? { purpose: 'revelation' } : {}));
      const res = await runD938(buildScenes938(10), records938bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_REVELATION_PURPOSE_DROUGHT_RUN'), 'DIALOGUE_REVELATION_PURPOSE_DROUGHT_RUN should not fire');
    });

    // DIALOGUE_POSITIVE_EMOTION_ZONE_IMBALANCE fire: n=10, Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9};
    // positive at 0,1,2,8,9 → Z0 3/5=60% (bloat), Z1 and Z2 empty.
    it('DIALOGUE_POSITIVE_EMOTION_ZONE_IMBALANCE fires when positive-shift scenes cluster in two zones and two are empty', async () => {
      const records938c = Array.from({ length: 10 }, (_, i) =>
        makeRec938(i, [0, 1, 2, 8, 9].includes(i) ? { emotionalShift: 'positive' } : {}));
      const res = await runD938(buildScenes938(10), records938c);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_POSITIVE_EMOTION_ZONE_IMBALANCE'), 'DIALOGUE_POSITIVE_EMOTION_ZONE_IMBALANCE should fire');
    });

    it('DIALOGUE_POSITIVE_EMOTION_ZONE_IMBALANCE does not fire when positive-shift scenes touch every zone', async () => {
      const records938cn = Array.from({ length: 10 }, (_, i) =>
        makeRec938(i, [0, 3, 5, 8].includes(i) ? { emotionalShift: 'positive' } : {}));
      const res = await runD938(buildScenes938(10), records938cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_POSITIVE_EMOTION_ZONE_IMBALANCE'), 'DIALOGUE_POSITIVE_EMOTION_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 924 — dialoguePass: dialogue character_moment zone imbalance, dialogue stakes zone imbalance, dialogue negative_emotion zone imbalance', async () => {
    const makeRec924 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'establish_world', dramaticTurn: 'nothing',
      ...overrides,
    });
    const buildScenes924 = (count: number): string => {
      let f = '';
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${i} - DAY\n\nA figure moves through the room.\n\n`;
      }
      return f;
    };
    const runD924 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // Zone geometry n=10: Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}. Target at 0,1,2,8,9 →
    // Z0 3/5=60% (bloat), Z1 and Z2 empty → fires. Target at 0,3,5,8 → every zone touched → no-fire.
    it('DIALOGUE_CHARACTER_MOMENT_ZONE_IMBALANCE fires when character-moment scenes cluster in two zones and two are empty', async () => {
      const records924a = Array.from({ length: 10 }, (_, i) =>
        makeRec924(i, [0, 1, 2, 8, 9].includes(i) ? { purpose: 'character_moment' } : {}));
      const res = await runD924(buildScenes924(10), records924a);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_CHARACTER_MOMENT_ZONE_IMBALANCE'), 'DIALOGUE_CHARACTER_MOMENT_ZONE_IMBALANCE should fire');
    });

    it('DIALOGUE_CHARACTER_MOMENT_ZONE_IMBALANCE does not fire when character-moment scenes touch every zone', async () => {
      const records924an = Array.from({ length: 10 }, (_, i) =>
        makeRec924(i, [0, 3, 5, 8].includes(i) ? { purpose: 'character_moment' } : {}));
      const res = await runD924(buildScenes924(10), records924an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_CHARACTER_MOMENT_ZONE_IMBALANCE'), 'DIALOGUE_CHARACTER_MOMENT_ZONE_IMBALANCE should not fire');
    });

    it('DIALOGUE_STAKES_ZONE_IMBALANCE fires when stakes-raising scenes cluster in two zones and two are empty', async () => {
      const records924b = Array.from({ length: 10 }, (_, i) =>
        makeRec924(i, [0, 1, 2, 8, 9].includes(i) ? { purpose: 'raise_stakes' } : {}));
      const res = await runD924(buildScenes924(10), records924b);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_STAKES_ZONE_IMBALANCE'), 'DIALOGUE_STAKES_ZONE_IMBALANCE should fire');
    });

    it('DIALOGUE_STAKES_ZONE_IMBALANCE does not fire when stakes-raising scenes touch every zone', async () => {
      const records924bn = Array.from({ length: 10 }, (_, i) =>
        makeRec924(i, [0, 3, 5, 8].includes(i) ? { purpose: 'raise_stakes' } : {}));
      const res = await runD924(buildScenes924(10), records924bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_STAKES_ZONE_IMBALANCE'), 'DIALOGUE_STAKES_ZONE_IMBALANCE should not fire');
    });

    it('DIALOGUE_NEGATIVE_EMOTION_ZONE_IMBALANCE fires when negative-shift scenes cluster in two zones and two are empty', async () => {
      const records924c = Array.from({ length: 10 }, (_, i) =>
        makeRec924(i, [0, 1, 2, 8, 9].includes(i) ? { emotionalShift: 'negative' } : {}));
      const res = await runD924(buildScenes924(10), records924c);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_NEGATIVE_EMOTION_ZONE_IMBALANCE'), 'DIALOGUE_NEGATIVE_EMOTION_ZONE_IMBALANCE should fire');
    });

    it('DIALOGUE_NEGATIVE_EMOTION_ZONE_IMBALANCE does not fire when negative-shift scenes touch every zone', async () => {
      const records924cn = Array.from({ length: 10 }, (_, i) =>
        makeRec924(i, [0, 3, 5, 8].includes(i) ? { emotionalShift: 'negative' } : {}));
      const res = await runD924(buildScenes924(10), records924cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_NEGATIVE_EMOTION_ZONE_IMBALANCE'), 'DIALOGUE_NEGATIVE_EMOTION_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 910 — dialoguePass: dialogue complicate zone imbalance, dialogue introduce_conflict zone imbalance, dialogue turning_point zone imbalance', async () => {
    const makeRec910 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'establish_world', dramaticTurn: 'nothing',
      ...overrides,
    });
    const buildScenes910 = (count: number): string => {
      let f = '';
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${i} - DAY\n\nA figure moves through the room.\n\n`;
      }
      return f;
    };
    const runD910 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // Zone geometry n=10: Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}. Target at 0,1,2,8,9 →
    // Z0 3/5=60% (bloat), Z1 and Z2 empty → fires. Target at 0,3,5,8 → every zone touched →
    // no-fire. Default filler purpose 'establish_world' is not one of the tested values.
    it('DIALOGUE_COMPLICATE_ZONE_IMBALANCE fires when complicating scenes cluster in two zones and two are empty', async () => {
      const records910a = Array.from({ length: 10 }, (_, i) =>
        makeRec910(i, [0, 1, 2, 8, 9].includes(i) ? { purpose: 'complicate' } : {}));
      const res = await runD910(buildScenes910(10), records910a);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_COMPLICATE_ZONE_IMBALANCE'), 'DIALOGUE_COMPLICATE_ZONE_IMBALANCE should fire');
    });

    it('DIALOGUE_COMPLICATE_ZONE_IMBALANCE does not fire when complicating scenes touch every zone', async () => {
      const records910an = Array.from({ length: 10 }, (_, i) =>
        makeRec910(i, [0, 3, 5, 8].includes(i) ? { purpose: 'complicate' } : {}));
      const res = await runD910(buildScenes910(10), records910an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_COMPLICATE_ZONE_IMBALANCE'), 'DIALOGUE_COMPLICATE_ZONE_IMBALANCE should not fire');
    });

    it('DIALOGUE_INTRODUCE_CONFLICT_ZONE_IMBALANCE fires when conflict-introducing scenes cluster in two zones and two are empty', async () => {
      const records910b = Array.from({ length: 10 }, (_, i) =>
        makeRec910(i, [0, 1, 2, 8, 9].includes(i) ? { purpose: 'introduce_conflict' } : {}));
      const res = await runD910(buildScenes910(10), records910b);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_INTRODUCE_CONFLICT_ZONE_IMBALANCE'), 'DIALOGUE_INTRODUCE_CONFLICT_ZONE_IMBALANCE should fire');
    });

    it('DIALOGUE_INTRODUCE_CONFLICT_ZONE_IMBALANCE does not fire when conflict-introducing scenes touch every zone', async () => {
      const records910bn = Array.from({ length: 10 }, (_, i) =>
        makeRec910(i, [0, 3, 5, 8].includes(i) ? { purpose: 'introduce_conflict' } : {}));
      const res = await runD910(buildScenes910(10), records910bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_INTRODUCE_CONFLICT_ZONE_IMBALANCE'), 'DIALOGUE_INTRODUCE_CONFLICT_ZONE_IMBALANCE should not fire');
    });

    it('DIALOGUE_TURNING_POINT_ZONE_IMBALANCE fires when turning-point scenes cluster in two zones and two are empty', async () => {
      const records910c = Array.from({ length: 10 }, (_, i) =>
        makeRec910(i, [0, 1, 2, 8, 9].includes(i) ? { purpose: 'turning_point' } : {}));
      const res = await runD910(buildScenes910(10), records910c);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_TURNING_POINT_ZONE_IMBALANCE'), 'DIALOGUE_TURNING_POINT_ZONE_IMBALANCE should fire');
    });

    it('DIALOGUE_TURNING_POINT_ZONE_IMBALANCE does not fire when turning-point scenes touch every zone', async () => {
      const records910cn = Array.from({ length: 10 }, (_, i) =>
        makeRec910(i, [0, 3, 5, 8].includes(i) ? { purpose: 'turning_point' } : {}));
      const res = await runD910(buildScenes910(10), records910cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_TURNING_POINT_ZONE_IMBALANCE'), 'DIALOGUE_TURNING_POINT_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 896 — dialoguePass: dialogue climax zone imbalance, dialogue establish_world zone imbalance, dialogue resolution zone imbalance', async () => {
    const makeRec896 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'complicate', dramaticTurn: 'nothing',
      ...overrides,
    });
    const buildScenes896 = (count: number): string => {
      let f = '';
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${i} - DAY\n\nA figure moves through the room.\n\n`;
      }
      return f;
    };
    const runD896 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('DIALOGUE_CLIMAX_ZONE_IMBALANCE fires when climax scenes cluster in two zones and two are empty', async () => {
      const records896a = Array.from({ length: 10 }, (_, i) =>
        makeRec896(i, [0, 1, 2, 8, 9].includes(i) ? { purpose: 'climax' } : {}));
      const res = await runD896(buildScenes896(10), records896a);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_CLIMAX_ZONE_IMBALANCE'), 'DIALOGUE_CLIMAX_ZONE_IMBALANCE should fire');
    });

    it('DIALOGUE_CLIMAX_ZONE_IMBALANCE does not fire when climax scenes are spread across all four zones', async () => {
      const records896an = Array.from({ length: 10 }, (_, i) =>
        makeRec896(i, [0, 3, 5, 8].includes(i) ? { purpose: 'climax' } : {}));
      const res = await runD896(buildScenes896(10), records896an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_CLIMAX_ZONE_IMBALANCE'), 'DIALOGUE_CLIMAX_ZONE_IMBALANCE should not fire');
    });

    it('DIALOGUE_ESTABLISH_WORLD_ZONE_IMBALANCE fires when establish_world scenes cluster in two zones and two are empty', async () => {
      const records896b = Array.from({ length: 10 }, (_, i) =>
        makeRec896(i, [0, 1, 2, 8, 9].includes(i) ? { purpose: 'establish_world' } : {}));
      const res = await runD896(buildScenes896(10), records896b);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_ESTABLISH_WORLD_ZONE_IMBALANCE'), 'DIALOGUE_ESTABLISH_WORLD_ZONE_IMBALANCE should fire');
    });

    it('DIALOGUE_ESTABLISH_WORLD_ZONE_IMBALANCE does not fire when establish_world scenes are spread across all four zones', async () => {
      const records896bn = Array.from({ length: 10 }, (_, i) =>
        makeRec896(i, [0, 3, 5, 8].includes(i) ? { purpose: 'establish_world' } : {}));
      const res = await runD896(buildScenes896(10), records896bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_ESTABLISH_WORLD_ZONE_IMBALANCE'), 'DIALOGUE_ESTABLISH_WORLD_ZONE_IMBALANCE should not fire');
    });

    it('DIALOGUE_RESOLUTION_ZONE_IMBALANCE fires when resolution scenes cluster in two zones and two are empty', async () => {
      const records896c = Array.from({ length: 10 }, (_, i) =>
        makeRec896(i, [0, 1, 2, 8, 9].includes(i) ? { purpose: 'resolution' } : {}));
      const res = await runD896(buildScenes896(10), records896c);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_RESOLUTION_ZONE_IMBALANCE'), 'DIALOGUE_RESOLUTION_ZONE_IMBALANCE should fire');
    });

    it('DIALOGUE_RESOLUTION_ZONE_IMBALANCE does not fire when resolution scenes are spread across all four zones', async () => {
      const records896cn = Array.from({ length: 10 }, (_, i) =>
        makeRec896(i, [0, 3, 5, 8].includes(i) ? { purpose: 'resolution' } : {}));
      const res = await runD896(buildScenes896(10), records896cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_RESOLUTION_ZONE_IMBALANCE'), 'DIALOGUE_RESOLUTION_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 882 — dialoguePass: dialogue resolution drought run, dialogue complicate zone cluster, dialogue complicate drought run', async () => {
    const makeRec882 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'complicate', dramaticTurn: 'nothing',
      ...overrides,
    });
    const buildScenes882 = (count: number): string => {
      let f = '';
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${i} - DAY\n\nA figure moves through the room.\n\n`;
      }
      return f;
    };
    const runD882 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // DIALOGUE_RESOLUTION_DROUGHT_RUN fire:
    // n=10; resolution at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('DIALOGUE_RESOLUTION_DROUGHT_RUN fires when a long run has no resolution-purposed scene', async () => {
      const recs882a = Array.from({ length: 10 }, (_, i) => makeRec882(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'resolution' } : {}
      ));
      const res = await runD882(buildScenes882(10), recs882a);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_RESOLUTION_DROUGHT_RUN'), 'DIALOGUE_RESOLUTION_DROUGHT_RUN should fire');
    });

    it('DIALOGUE_RESOLUTION_DROUGHT_RUN does not fire when resolution-purposed scenes are evenly spread', async () => {
      const recs882an = Array.from({ length: 10 }, (_, i) => makeRec882(i,
        (i === 0 || i === 3 || i === 6 || i === 9) ? { purpose: 'resolution' } : {}
      ));
      const res = await runD882(buildScenes882(10), recs882an);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_RESOLUTION_DROUGHT_RUN'), 'DIALOGUE_RESOLUTION_DROUGHT_RUN should not fire');
    });

    // DIALOGUE_COMPLICATE_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; complicate scenes at 0,1,2 → 100% opening third
    it('DIALOGUE_COMPLICATE_ZONE_CLUSTER fires when >75% of complicating scenes cluster in one third', async () => {
      const recs882b = Array.from({ length: 9 }, (_, i) => makeRec882(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'complicate' } : { purpose: 'establish_world' }
      ));
      const res = await runD882(buildScenes882(9), recs882b);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_COMPLICATE_ZONE_CLUSTER'), 'DIALOGUE_COMPLICATE_ZONE_CLUSTER should fire');
    });

    it('DIALOGUE_COMPLICATE_ZONE_CLUSTER does not fire when complicating scenes spread across thirds', async () => {
      const recs882bn = Array.from({ length: 9 }, (_, i) => makeRec882(i,
        (i === 0 || i === 4 || i === 8) ? { purpose: 'complicate' } : { purpose: 'establish_world' }
      ));
      const res = await runD882(buildScenes882(9), recs882bn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_COMPLICATE_ZONE_CLUSTER'), 'DIALOGUE_COMPLICATE_ZONE_CLUSTER should not fire');
    });

    // DIALOGUE_COMPLICATE_DROUGHT_RUN fire:
    // n=10; complicate at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('DIALOGUE_COMPLICATE_DROUGHT_RUN fires when a long run has no complicating scene', async () => {
      const recs882c = Array.from({ length: 10 }, (_, i) => makeRec882(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'complicate' } : { purpose: 'establish_world' }
      ));
      const res = await runD882(buildScenes882(10), recs882c);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_COMPLICATE_DROUGHT_RUN'), 'DIALOGUE_COMPLICATE_DROUGHT_RUN should fire');
    });

    it('DIALOGUE_COMPLICATE_DROUGHT_RUN does not fire when complicating scenes are evenly spread', async () => {
      const recs882cn = Array.from({ length: 10 }, (_, i) => makeRec882(i,
        (i === 0 || i === 3 || i === 6 || i === 9) ? { purpose: 'complicate' } : { purpose: 'establish_world' }
      ));
      const res = await runD882(buildScenes882(10), recs882cn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_COMPLICATE_DROUGHT_RUN'), 'DIALOGUE_COMPLICATE_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 868 — dialoguePass: dialogue climax drought run, dialogue establish world drought run, dialogue resolution zone cluster', async () => {
    const makeRec868 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'complicate', dramaticTurn: 'nothing',
      ...overrides,
    });
    const buildScenes868 = (count: number): string => {
      let f = '';
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${i} - DAY\n\nA figure moves through the room.\n\n`;
      }
      return f;
    };
    const runD868 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // DIALOGUE_CLIMAX_DROUGHT_RUN fire:
    // n=10; climax at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('DIALOGUE_CLIMAX_DROUGHT_RUN fires when a long run has no climax-purposed scene', async () => {
      const recs868a = Array.from({ length: 10 }, (_, i) => makeRec868(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'climax' } : {}
      ));
      const res = await runD868(buildScenes868(10), recs868a);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_CLIMAX_DROUGHT_RUN'), 'DIALOGUE_CLIMAX_DROUGHT_RUN should fire');
    });

    it('DIALOGUE_CLIMAX_DROUGHT_RUN does not fire when climax-purposed scenes are evenly spread', async () => {
      const recs868an = Array.from({ length: 10 }, (_, i) => makeRec868(i,
        (i === 0 || i === 3 || i === 6 || i === 9) ? { purpose: 'climax' } : {}
      ));
      const res = await runD868(buildScenes868(10), recs868an);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_CLIMAX_DROUGHT_RUN'), 'DIALOGUE_CLIMAX_DROUGHT_RUN should not fire');
    });

    // DIALOGUE_ESTABLISH_WORLD_DROUGHT_RUN fire:
    // n=10; establish_world at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('DIALOGUE_ESTABLISH_WORLD_DROUGHT_RUN fires when a long run has no world-establishing scene', async () => {
      const recs868b = Array.from({ length: 10 }, (_, i) => makeRec868(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'establish_world' } : {}
      ));
      const res = await runD868(buildScenes868(10), recs868b);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_ESTABLISH_WORLD_DROUGHT_RUN'), 'DIALOGUE_ESTABLISH_WORLD_DROUGHT_RUN should fire');
    });

    it('DIALOGUE_ESTABLISH_WORLD_DROUGHT_RUN does not fire when world-establishing scenes are evenly spread', async () => {
      const recs868bn = Array.from({ length: 10 }, (_, i) => makeRec868(i,
        (i === 0 || i === 3 || i === 6 || i === 9) ? { purpose: 'establish_world' } : {}
      ));
      const res = await runD868(buildScenes868(10), recs868bn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_ESTABLISH_WORLD_DROUGHT_RUN'), 'DIALOGUE_ESTABLISH_WORLD_DROUGHT_RUN should not fire');
    });

    // DIALOGUE_RESOLUTION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; resolution scenes at 0,1,2 → 100% opening third
    it('DIALOGUE_RESOLUTION_ZONE_CLUSTER fires when >75% of resolution-purposed scenes cluster in one third', async () => {
      const recs868c = Array.from({ length: 9 }, (_, i) => makeRec868(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'resolution' } : {}
      ));
      const res = await runD868(buildScenes868(9), recs868c);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_RESOLUTION_ZONE_CLUSTER'), 'DIALOGUE_RESOLUTION_ZONE_CLUSTER should fire');
    });

    it('DIALOGUE_RESOLUTION_ZONE_CLUSTER does not fire when resolution-purposed scenes spread across thirds', async () => {
      const recs868cn = Array.from({ length: 9 }, (_, i) => makeRec868(i,
        (i === 0 || i === 4 || i === 8) ? { purpose: 'resolution' } : {}
      ));
      const res = await runD868(buildScenes868(9), recs868cn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_RESOLUTION_ZONE_CLUSTER'), 'DIALOGUE_RESOLUTION_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 854 — dialoguePass: dialogue positive emotion drought run, dialogue climax zone cluster, dialogue establish world zone cluster', async () => {
    const makeRec854 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'complicate', dramaticTurn: 'nothing',
      ...overrides,
    });
    const buildScenes854 = (count: number): string => {
      let f = '';
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${i} - DAY\n\nA figure moves through the room.\n\n`;
      }
      return f;
    };
    const runD854 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // DIALOGUE_POSITIVE_EMOTION_DROUGHT_RUN fire:
    // n=10; positive-emotion at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('DIALOGUE_POSITIVE_EMOTION_DROUGHT_RUN fires when a long run has no positive-emotion charge', async () => {
      const recs854a = Array.from({ length: 10 }, (_, i) => makeRec854(i,
        (i === 0 || i === 1 || i === 2) ? { emotionalShift: 'positive' } : {}
      ));
      const res = await runD854(buildScenes854(10), recs854a);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_POSITIVE_EMOTION_DROUGHT_RUN'), 'DIALOGUE_POSITIVE_EMOTION_DROUGHT_RUN should fire');
    });

    it('DIALOGUE_POSITIVE_EMOTION_DROUGHT_RUN does not fire when positive-emotion scenes are evenly spread', async () => {
      const recs854an = Array.from({ length: 10 }, (_, i) => makeRec854(i,
        (i === 0 || i === 3 || i === 6 || i === 9) ? { emotionalShift: 'positive' } : {}
      ));
      const res = await runD854(buildScenes854(10), recs854an);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_POSITIVE_EMOTION_DROUGHT_RUN'), 'DIALOGUE_POSITIVE_EMOTION_DROUGHT_RUN should not fire');
    });

    // DIALOGUE_CLIMAX_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; climax scenes at 0,1,2 → 100% opening third
    it('DIALOGUE_CLIMAX_ZONE_CLUSTER fires when >75% of climax-purposed scenes cluster in one third', async () => {
      const recs854b = Array.from({ length: 9 }, (_, i) => makeRec854(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'climax' } : {}
      ));
      const res = await runD854(buildScenes854(9), recs854b);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_CLIMAX_ZONE_CLUSTER'), 'DIALOGUE_CLIMAX_ZONE_CLUSTER should fire');
    });

    it('DIALOGUE_CLIMAX_ZONE_CLUSTER does not fire when climax-purposed scenes spread across thirds', async () => {
      const recs854bn = Array.from({ length: 9 }, (_, i) => makeRec854(i,
        (i === 0 || i === 4 || i === 8) ? { purpose: 'climax' } : {}
      ));
      const res = await runD854(buildScenes854(9), recs854bn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_CLIMAX_ZONE_CLUSTER'), 'DIALOGUE_CLIMAX_ZONE_CLUSTER should not fire');
    });

    // DIALOGUE_ESTABLISH_WORLD_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; establish_world scenes at 0,1,2 → 100% opening third
    it('DIALOGUE_ESTABLISH_WORLD_ZONE_CLUSTER fires when >75% of world-establishing scenes cluster in one third', async () => {
      const recs854c = Array.from({ length: 9 }, (_, i) => makeRec854(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'establish_world' } : {}
      ));
      const res = await runD854(buildScenes854(9), recs854c);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_ESTABLISH_WORLD_ZONE_CLUSTER'), 'DIALOGUE_ESTABLISH_WORLD_ZONE_CLUSTER should fire');
    });

    it('DIALOGUE_ESTABLISH_WORLD_ZONE_CLUSTER does not fire when world-establishing scenes spread across thirds', async () => {
      const recs854cn = Array.from({ length: 9 }, (_, i) => makeRec854(i,
        (i === 0 || i === 4 || i === 8) ? { purpose: 'establish_world' } : {}
      ));
      const res = await runD854(buildScenes854(9), recs854cn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_ESTABLISH_WORLD_ZONE_CLUSTER'), 'DIALOGUE_ESTABLISH_WORLD_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 840 — dialoguePass: dialogue introduce conflict drought run, dialogue negative emotion drought run, dialogue positive emotion zone cluster', async () => {
    const makeRec840 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'complicate', dramaticTurn: 'nothing',
      ...overrides,
    });
    const buildScenes840 = (count: number): string => {
      let f = '';
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${i} - DAY\n\nA figure moves through the room.\n\n`;
      }
      return f;
    };
    const runD840 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // DIALOGUE_INTRODUCE_CONFLICT_DROUGHT_RUN fire:
    // n=10; introduce_conflict at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('DIALOGUE_INTRODUCE_CONFLICT_DROUGHT_RUN fires when a long run has no new conflict', async () => {
      const recs840a = Array.from({ length: 10 }, (_, i) => makeRec840(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'introduce_conflict' } : {}
      ));
      const res = await runD840(buildScenes840(10), recs840a);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_INTRODUCE_CONFLICT_DROUGHT_RUN'), 'DIALOGUE_INTRODUCE_CONFLICT_DROUGHT_RUN should fire');
    });

    it('DIALOGUE_INTRODUCE_CONFLICT_DROUGHT_RUN does not fire when conflict-introducing scenes are evenly spread', async () => {
      const recs840an = Array.from({ length: 10 }, (_, i) => makeRec840(i,
        (i === 0 || i === 3 || i === 6 || i === 9) ? { purpose: 'introduce_conflict' } : {}
      ));
      const res = await runD840(buildScenes840(10), recs840an);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_INTRODUCE_CONFLICT_DROUGHT_RUN'), 'DIALOGUE_INTRODUCE_CONFLICT_DROUGHT_RUN should not fire');
    });

    // DIALOGUE_NEGATIVE_EMOTION_DROUGHT_RUN fire:
    // n=10; negative-emotion at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('DIALOGUE_NEGATIVE_EMOTION_DROUGHT_RUN fires when a long run has no negative-emotion charge', async () => {
      const recs840b = Array.from({ length: 10 }, (_, i) => makeRec840(i,
        (i === 0 || i === 1 || i === 2) ? { emotionalShift: 'negative' } : {}
      ));
      const res = await runD840(buildScenes840(10), recs840b);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_NEGATIVE_EMOTION_DROUGHT_RUN'), 'DIALOGUE_NEGATIVE_EMOTION_DROUGHT_RUN should fire');
    });

    it('DIALOGUE_NEGATIVE_EMOTION_DROUGHT_RUN does not fire when negative-emotion scenes are evenly spread', async () => {
      const recs840bn = Array.from({ length: 10 }, (_, i) => makeRec840(i,
        (i === 0 || i === 3 || i === 6 || i === 9) ? { emotionalShift: 'negative' } : {}
      ));
      const res = await runD840(buildScenes840(10), recs840bn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_NEGATIVE_EMOTION_DROUGHT_RUN'), 'DIALOGUE_NEGATIVE_EMOTION_DROUGHT_RUN should not fire');
    });

    // DIALOGUE_POSITIVE_EMOTION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; positive-emotion scenes at 0,1,2 → 100% opening third
    it('DIALOGUE_POSITIVE_EMOTION_ZONE_CLUSTER fires when >75% of positive-emotion scenes cluster in one third', async () => {
      const recs840c = Array.from({ length: 9 }, (_, i) => makeRec840(i,
        (i === 0 || i === 1 || i === 2) ? { emotionalShift: 'positive' } : {}
      ));
      const res = await runD840(buildScenes840(9), recs840c);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_POSITIVE_EMOTION_ZONE_CLUSTER'), 'DIALOGUE_POSITIVE_EMOTION_ZONE_CLUSTER should fire');
    });

    it('DIALOGUE_POSITIVE_EMOTION_ZONE_CLUSTER does not fire when positive-emotion scenes spread across thirds', async () => {
      const recs840cn = Array.from({ length: 9 }, (_, i) => makeRec840(i,
        (i === 0 || i === 4 || i === 8) ? { emotionalShift: 'positive' } : {}
      ));
      const res = await runD840(buildScenes840(9), recs840cn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_POSITIVE_EMOTION_ZONE_CLUSTER'), 'DIALOGUE_POSITIVE_EMOTION_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 826 — dialoguePass: dialogue turning point drought run, dialogue introduce conflict zone cluster, dialogue negative emotion zone cluster', async () => {
    const makeRec826 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'complicate', dramaticTurn: 'nothing',
      ...overrides,
    });
    const buildScenes826 = (count: number): string => {
      let f = '';
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${i} - DAY\n\nA figure moves through the room.\n\n`;
      }
      return f;
    };
    const runD826 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // DIALOGUE_TURNING_POINT_DROUGHT_RUN fire:
    // n=10; turning_point at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('DIALOGUE_TURNING_POINT_DROUGHT_RUN fires when a long run has no turning point', async () => {
      const recs826a = Array.from({ length: 10 }, (_, i) => makeRec826(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'turning_point' } : {}
      ));
      const res = await runD826(buildScenes826(10), recs826a);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_TURNING_POINT_DROUGHT_RUN'), 'DIALOGUE_TURNING_POINT_DROUGHT_RUN should fire');
    });

    it('DIALOGUE_TURNING_POINT_DROUGHT_RUN does not fire when turning points are evenly spread', async () => {
      const recs826an = Array.from({ length: 10 }, (_, i) => makeRec826(i,
        (i === 0 || i === 3 || i === 6 || i === 9) ? { purpose: 'turning_point' } : {}
      ));
      const res = await runD826(buildScenes826(10), recs826an);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_TURNING_POINT_DROUGHT_RUN'), 'DIALOGUE_TURNING_POINT_DROUGHT_RUN should not fire');
    });

    // DIALOGUE_INTRODUCE_CONFLICT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; introduce_conflict scenes at 0,1,2 → 100% opening third
    it('DIALOGUE_INTRODUCE_CONFLICT_ZONE_CLUSTER fires when >75% of conflict-introducing scenes cluster in one third', async () => {
      const recs826b = Array.from({ length: 9 }, (_, i) => makeRec826(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'introduce_conflict' } : {}
      ));
      const res = await runD826(buildScenes826(9), recs826b);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_INTRODUCE_CONFLICT_ZONE_CLUSTER'), 'DIALOGUE_INTRODUCE_CONFLICT_ZONE_CLUSTER should fire');
    });

    it('DIALOGUE_INTRODUCE_CONFLICT_ZONE_CLUSTER does not fire when conflict-introducing scenes spread across thirds', async () => {
      const recs826bn = Array.from({ length: 9 }, (_, i) => makeRec826(i,
        (i === 0 || i === 4 || i === 8) ? { purpose: 'introduce_conflict' } : {}
      ));
      const res = await runD826(buildScenes826(9), recs826bn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_INTRODUCE_CONFLICT_ZONE_CLUSTER'), 'DIALOGUE_INTRODUCE_CONFLICT_ZONE_CLUSTER should not fire');
    });

    // DIALOGUE_NEGATIVE_EMOTION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; negative-emotion scenes at 0,1,2 → 100% opening third
    it('DIALOGUE_NEGATIVE_EMOTION_ZONE_CLUSTER fires when >75% of negative-emotion scenes cluster in one third', async () => {
      const recs826c = Array.from({ length: 9 }, (_, i) => makeRec826(i,
        (i === 0 || i === 1 || i === 2) ? { emotionalShift: 'negative' } : {}
      ));
      const res = await runD826(buildScenes826(9), recs826c);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_NEGATIVE_EMOTION_ZONE_CLUSTER'), 'DIALOGUE_NEGATIVE_EMOTION_ZONE_CLUSTER should fire');
    });

    it('DIALOGUE_NEGATIVE_EMOTION_ZONE_CLUSTER does not fire when negative-emotion scenes spread across thirds', async () => {
      const recs826cn = Array.from({ length: 9 }, (_, i) => makeRec826(i,
        (i === 0 || i === 4 || i === 8) ? { emotionalShift: 'negative' } : {}
      ));
      const res = await runD826(buildScenes826(9), recs826cn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_NEGATIVE_EMOTION_ZONE_CLUSTER'), 'DIALOGUE_NEGATIVE_EMOTION_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 812 — dialoguePass: dialogue stakes zone cluster, dialogue stakes drought run, dialogue turning point zone cluster', async () => {
    const makeRec812 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'complicate', dramaticTurn: 'nothing',
      ...overrides,
    });
    const buildScenes812 = (count: number): string => {
      let f = '';
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${i} - DAY\n\nA figure moves through the room.\n\n`;
      }
      return f;
    };
    const runD812 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // DIALOGUE_STAKES_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; raise_stakes scenes at 0,1,2 → 100% opening third
    it('DIALOGUE_STAKES_ZONE_CLUSTER fires when >75% of stakes-raising scenes cluster in one third', async () => {
      const recs812a = Array.from({ length: 9 }, (_, i) => makeRec812(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'raise_stakes' } : {}
      ));
      const res = await runD812(buildScenes812(9), recs812a);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_STAKES_ZONE_CLUSTER'), 'DIALOGUE_STAKES_ZONE_CLUSTER should fire');
    });

    it('DIALOGUE_STAKES_ZONE_CLUSTER does not fire when stakes-raising scenes spread across thirds', async () => {
      const recs812an = Array.from({ length: 9 }, (_, i) => makeRec812(i,
        (i === 0 || i === 4 || i === 8) ? { purpose: 'raise_stakes' } : {}
      ));
      const res = await runD812(buildScenes812(9), recs812an);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_STAKES_ZONE_CLUSTER'), 'DIALOGUE_STAKES_ZONE_CLUSTER should not fire');
    });

    // DIALOGUE_STAKES_DROUGHT_RUN fire:
    // n=10; raise_stakes at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('DIALOGUE_STAKES_DROUGHT_RUN fires when a long run has no stakes-raising scene', async () => {
      const recs812b = Array.from({ length: 10 }, (_, i) => makeRec812(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'raise_stakes' } : {}
      ));
      const res = await runD812(buildScenes812(10), recs812b);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_STAKES_DROUGHT_RUN'), 'DIALOGUE_STAKES_DROUGHT_RUN should fire');
    });

    it('DIALOGUE_STAKES_DROUGHT_RUN does not fire when stakes-raising scenes are evenly spread', async () => {
      const recs812bn = Array.from({ length: 10 }, (_, i) => makeRec812(i,
        (i === 0 || i === 3 || i === 6 || i === 9) ? { purpose: 'raise_stakes' } : {}
      ));
      const res = await runD812(buildScenes812(10), recs812bn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_STAKES_DROUGHT_RUN'), 'DIALOGUE_STAKES_DROUGHT_RUN should not fire');
    });

    // DIALOGUE_TURNING_POINT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; turning_point scenes at 0,1,2 → 100% opening third
    it('DIALOGUE_TURNING_POINT_ZONE_CLUSTER fires when >75% of turning-point scenes cluster in one third', async () => {
      const recs812c = Array.from({ length: 9 }, (_, i) => makeRec812(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'turning_point' } : {}
      ));
      const res = await runD812(buildScenes812(9), recs812c);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_TURNING_POINT_ZONE_CLUSTER'), 'DIALOGUE_TURNING_POINT_ZONE_CLUSTER should fire');
    });

    it('DIALOGUE_TURNING_POINT_ZONE_CLUSTER does not fire when turning-point scenes spread across thirds', async () => {
      const recs812cn = Array.from({ length: 9 }, (_, i) => makeRec812(i,
        (i === 0 || i === 4 || i === 8) ? { purpose: 'turning_point' } : {}
      ));
      const res = await runD812(buildScenes812(9), recs812cn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_TURNING_POINT_ZONE_CLUSTER'), 'DIALOGUE_TURNING_POINT_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 798 — dialoguePass: dialogue revelation drought run, dialogue revelation peak uncaused, dialogue character moment zone cluster', async () => {
    const makeRec798 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'complicate', dramaticTurn: 'nothing',
      ...overrides,
    });
    const buildScenes798 = (count: number): string => {
      let f = '';
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${i} - DAY\n\nA figure moves through the room.\n\n`;
      }
      return f;
    };
    const runD798 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // DIALOGUE_REVELATION_DROUGHT_RUN fire:
    // n=10; revelation present at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('DIALOGUE_REVELATION_DROUGHT_RUN fires when a long run has no revelation', async () => {
      const recs798a = Array.from({ length: 10 }, (_, i) => makeRec798(i,
        (i === 0 || i === 1 || i === 2) ? { revelation: 'truth revealed' } : {}
      ));
      const res = await runD798(buildScenes798(10), recs798a);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_REVELATION_DROUGHT_RUN'), 'DIALOGUE_REVELATION_DROUGHT_RUN should fire');
    });

    it('DIALOGUE_REVELATION_DROUGHT_RUN does not fire when revelations are evenly spread', async () => {
      const recs798an = Array.from({ length: 10 }, (_, i) => makeRec798(i,
        (i === 0 || i === 3 || i === 6 || i === 9) ? { revelation: 'truth revealed' } : {}
      ));
      const res = await runD798(buildScenes798(10), recs798an);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_REVELATION_DROUGHT_RUN'), 'DIALOGUE_REVELATION_DROUGHT_RUN should not fire');
    });

    // DIALOGUE_REVELATION_PEAK_UNCAUSED fire:
    // 8 scenes; revelation-qualifying (magnitude 1) at 2 and 5; peak resolves to the first (idx 2);
    // no dramaticTurn at 0, 1, or 2 itself (2-scene lookback + the peak scene itself).
    it('DIALOGUE_REVELATION_PEAK_UNCAUSED fires when the revelation scene has no dramatic turn nearby', async () => {
      const recs798b = Array.from({ length: 8 }, (_, i) => makeRec798(i,
        (i === 2 || i === 5) ? { revelation: 'truth revealed' } : {}
      ));
      const res = await runD798(buildScenes798(8), recs798b);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_REVELATION_PEAK_UNCAUSED'), 'DIALOGUE_REVELATION_PEAK_UNCAUSED should fire');
    });

    it('DIALOGUE_REVELATION_PEAK_UNCAUSED does not fire when a dramatic turn precedes the revelation scene', async () => {
      const recs798bn = Array.from({ length: 8 }, (_, i) => makeRec798(i,
        i === 1 ? { dramaticTurn: 'reversal' } :
        (i === 2 || i === 5) ? { revelation: 'truth revealed' } : {}
      ));
      const res = await runD798(buildScenes798(8), recs798bn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_REVELATION_PEAK_UNCAUSED'), 'DIALOGUE_REVELATION_PEAK_UNCAUSED should not fire');
    });

    // DIALOGUE_CHARACTER_MOMENT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; character_moment scenes at 0,1,2 → 100% opening third
    it('DIALOGUE_CHARACTER_MOMENT_ZONE_CLUSTER fires when >75% of character-moment scenes cluster in one third', async () => {
      const recs798c = Array.from({ length: 9 }, (_, i) => makeRec798(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'character_moment' } : {}
      ));
      const res = await runD798(buildScenes798(9), recs798c);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_CHARACTER_MOMENT_ZONE_CLUSTER'), 'DIALOGUE_CHARACTER_MOMENT_ZONE_CLUSTER should fire');
    });

    it('DIALOGUE_CHARACTER_MOMENT_ZONE_CLUSTER does not fire when character-moment scenes spread across thirds', async () => {
      const recs798cn = Array.from({ length: 9 }, (_, i) => makeRec798(i,
        (i === 0 || i === 4 || i === 8) ? { purpose: 'character_moment' } : {}
      ));
      const res = await runD798(buildScenes798(9), recs798cn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_CHARACTER_MOMENT_ZONE_CLUSTER'), 'DIALOGUE_CHARACTER_MOMENT_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 784 — dialoguePass: dialogue revelation zone cluster, dialogue clock raised zone cluster, dialogue emotion drought run', async () => {
    const makeRec784 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'complicate', dramaticTurn: 'nothing',
      ...overrides,
    });
    const buildScenes784 = (count: number): string => {
      let f = '';
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${i} - DAY\n\nA figure moves through the room.\n\n`;
      }
      return f;
    };
    const runD784 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // DIALOGUE_REVELATION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; revelation scenes at 0,1,2 → 100% opening third
    it('DIALOGUE_REVELATION_ZONE_CLUSTER fires when >75% of revelation scenes cluster in one third', async () => {
      const recs784a = Array.from({ length: 9 }, (_, i) => makeRec784(i,
        (i === 0 || i === 1 || i === 2) ? { revelation: 'truth revealed' } : {}
      ));
      const res = await runD784(buildScenes784(9), recs784a);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_REVELATION_ZONE_CLUSTER'), 'DIALOGUE_REVELATION_ZONE_CLUSTER should fire');
    });

    it('DIALOGUE_REVELATION_ZONE_CLUSTER does not fire when revelation scenes spread across thirds', async () => {
      const recs784an = Array.from({ length: 9 }, (_, i) => makeRec784(i,
        (i === 0 || i === 4 || i === 8) ? { revelation: 'truth revealed' } : {}
      ));
      const res = await runD784(buildScenes784(9), recs784an);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_REVELATION_ZONE_CLUSTER'), 'DIALOGUE_REVELATION_ZONE_CLUSTER should not fire');
    });

    // DIALOGUE_CLOCK_RAISED_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; clockRaised scenes at 0,1,2 → 100% opening third
    it('DIALOGUE_CLOCK_RAISED_ZONE_CLUSTER fires when >75% of clock-raising scenes cluster in one third', async () => {
      const recs784b = Array.from({ length: 9 }, (_, i) => makeRec784(i,
        (i === 0 || i === 1 || i === 2) ? { clockRaised: true } : {}
      ));
      const res = await runD784(buildScenes784(9), recs784b);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_CLOCK_RAISED_ZONE_CLUSTER'), 'DIALOGUE_CLOCK_RAISED_ZONE_CLUSTER should fire');
    });

    it('DIALOGUE_CLOCK_RAISED_ZONE_CLUSTER does not fire when clock-raising scenes spread across thirds', async () => {
      const recs784bn = Array.from({ length: 9 }, (_, i) => makeRec784(i,
        (i === 0 || i === 4 || i === 8) ? { clockRaised: true } : {}
      ));
      const res = await runD784(buildScenes784(9), recs784bn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_CLOCK_RAISED_ZONE_CLUSTER'), 'DIALOGUE_CLOCK_RAISED_ZONE_CLUSTER should not fire');
    });

    // DIALOGUE_EMOTION_DROUGHT_RUN fire:
    // n=10; scenes 0,1,2 carry an emotional charge (>=3 present overall); scenes 3-9 (7 scenes) have none
    it('DIALOGUE_EMOTION_DROUGHT_RUN fires when the longest no-emotional-charge run reaches 6', async () => {
      const recs784c = Array.from({ length: 10 }, (_, i) => makeRec784(i,
        (i === 0 || i === 1 || i === 2) ? { emotionalShift: 'negative' } : {}
      ));
      const res = await runD784(buildScenes784(10), recs784c);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_EMOTION_DROUGHT_RUN'), 'DIALOGUE_EMOTION_DROUGHT_RUN should fire');
    });

    it('DIALOGUE_EMOTION_DROUGHT_RUN does not fire when emotional charges are evenly spread', async () => {
      const recs784cn = Array.from({ length: 10 }, (_, i) => makeRec784(i,
        (i === 0 || i === 3 || i === 6 || i === 9) ? { emotionalShift: 'negative' } : {}
      ));
      const res = await runD784(buildScenes784(10), recs784cn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_EMOTION_DROUGHT_RUN'), 'DIALOGUE_EMOTION_DROUGHT_RUN should not fire');
    });
  });


  describe('Wave 770 — dialoguePass: dialogue clock delta zone cluster, dialogue suspense peak uncaused, dialogue relationship drought run', async () => {
    const makeRec770 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'complicate', dramaticTurn: 'nothing',
      ...overrides,
    });
    const buildScenes770 = (count: number): string => {
      let f = '';
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${i} - DAY\n\nA figure moves through the room.\n\n`;
      }
      return f;
    };
    const runD770 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // DIALOGUE_CLOCK_DELTA_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; clock-shifting scenes at 0,1,2 → 100% opening third
    it('DIALOGUE_CLOCK_DELTA_ZONE_CLUSTER fires when >75% of clock-shifting scenes cluster in one third', async () => {
      const recs770a = Array.from({ length: 9 }, (_, i) => makeRec770(i,
        (i === 0 || i === 1 || i === 2) ? { clockDelta: i === 1 ? -1 : 1 } : {}
      ));
      const res = await runD770(buildScenes770(9), recs770a);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_CLOCK_DELTA_ZONE_CLUSTER'), 'DIALOGUE_CLOCK_DELTA_ZONE_CLUSTER should fire');
    });

    it('DIALOGUE_CLOCK_DELTA_ZONE_CLUSTER does not fire when clock-shifting scenes spread across thirds', async () => {
      const recs770an = Array.from({ length: 9 }, (_, i) => makeRec770(i,
        (i === 0 || i === 4 || i === 8) ? { clockDelta: 1 } : {}
      ));
      const res = await runD770(buildScenes770(9), recs770an);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_CLOCK_DELTA_ZONE_CLUSTER'), 'DIALOGUE_CLOCK_DELTA_ZONE_CLUSTER should not fire');
    });

    // DIALOGUE_SUSPENSE_PEAK_UNCAUSED fire:
    // 8 scenes; suspenseDelta qualifying (>0) at 2 and 5; peak resolves to the first (idx 2, tie
    // on magnitude 3); no dramaticTurn/revelation at indices 0 or 1 (2-scene lookback).
    it('DIALOGUE_SUSPENSE_PEAK_UNCAUSED fires when the peak suspense scene has no preparing cause nearby', async () => {
      const recs770b = Array.from({ length: 8 }, (_, i) => makeRec770(i));
      recs770b[2] = makeRec770(2, { suspenseDelta: 3 });
      recs770b[5] = makeRec770(5, { suspenseDelta: 3 });
      const res = await runD770(buildScenes770(8), recs770b);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_SUSPENSE_PEAK_UNCAUSED'), 'DIALOGUE_SUSPENSE_PEAK_UNCAUSED should fire');
    });

    it('DIALOGUE_SUSPENSE_PEAK_UNCAUSED does not fire when a preparing cause precedes the peak suspense scene', async () => {
      const recs770bn = Array.from({ length: 8 }, (_, i) => makeRec770(i));
      recs770bn[2] = makeRec770(2, { suspenseDelta: 3 });
      recs770bn[5] = makeRec770(5, { suspenseDelta: 3 });
      recs770bn[1] = makeRec770(1, { dramaticTurn: 'reversal' });
      const res = await runD770(buildScenes770(8), recs770bn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_SUSPENSE_PEAK_UNCAUSED'), 'DIALOGUE_SUSPENSE_PEAK_UNCAUSED should not fire');
    });

    // DIALOGUE_RELATIONSHIP_DROUGHT_RUN fire:
    // n=10; relationship-shift scenes at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('DIALOGUE_RELATIONSHIP_DROUGHT_RUN fires when a long run has no relationship shift', async () => {
      const recs770c = Array.from({ length: 10 }, (_, i) => makeRec770(i,
        (i === 0 || i === 1 || i === 2) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {}
      ));
      const res = await runD770(buildScenes770(10), recs770c);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_RELATIONSHIP_DROUGHT_RUN'), 'DIALOGUE_RELATIONSHIP_DROUGHT_RUN should fire');
    });

    it('DIALOGUE_RELATIONSHIP_DROUGHT_RUN does not fire when relationship shifts are evenly spread', async () => {
      const recs770cn = Array.from({ length: 10 }, (_, i) => makeRec770(i,
        (i === 0 || i === 3 || i === 6 || i === 9) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {}
      ));
      const res = await runD770(buildScenes770(10), recs770cn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_RELATIONSHIP_DROUGHT_RUN'), 'DIALOGUE_RELATIONSHIP_DROUGHT_RUN should not fire');
    });
  });


  describe('Wave 756 — dialoguePass: dialogue relationship zone cluster, dialogue clock delta drought run, dialogue suspense drought run', async () => {
    const makeRec756 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'complicate', dramaticTurn: 'nothing',
      ...overrides,
    });
    const buildScenes756 = (count: number): string => {
      let f = '';
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${i} - DAY\n\nA figure moves through the room.\n\n`;
      }
      return f;
    };
    const runD756 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // DIALOGUE_RELATIONSHIP_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; relationship-shift scenes at 0,1,2 → 100% opening third
    it('DIALOGUE_RELATIONSHIP_ZONE_CLUSTER fires when >75% of relationship-shift scenes cluster in one third', async () => {
      const recs756a = Array.from({ length: 9 }, (_, i) => makeRec756(i,
        (i === 0 || i === 1 || i === 2) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {}
      ));
      const res = await runD756(buildScenes756(9), recs756a);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_RELATIONSHIP_ZONE_CLUSTER'), 'DIALOGUE_RELATIONSHIP_ZONE_CLUSTER should fire');
    });

    // DIALOGUE_RELATIONSHIP_ZONE_CLUSTER no-fire:
    // relationship-shift scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('DIALOGUE_RELATIONSHIP_ZONE_CLUSTER does not fire when relationship-shift scenes are distributed across thirds', async () => {
      const recs756an = Array.from({ length: 9 }, (_, i) => makeRec756(i,
        (i === 0 || i === 4 || i === 7) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {}
      ));
      const res = await runD756(buildScenes756(9), recs756an);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_RELATIONSHIP_ZONE_CLUSTER'), 'DIALOGUE_RELATIONSHIP_ZONE_CLUSTER should not fire');
    });

    // DIALOGUE_CLOCK_DELTA_DROUGHT_RUN fire:
    // n=10; scenes 0,1,2 shift the clock (>=3 present overall); scenes 3-9 (7 scenes) have none
    it('DIALOGUE_CLOCK_DELTA_DROUGHT_RUN fires when the longest no-clock-movement run reaches 6', async () => {
      const recs756b = Array.from({ length: 10 }, (_, i) => makeRec756(i,
        (i === 0 || i === 1 || i === 2) ? { clockDelta: 1 } : {}
      ));
      const res = await runD756(buildScenes756(10), recs756b);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_CLOCK_DELTA_DROUGHT_RUN'), 'DIALOGUE_CLOCK_DELTA_DROUGHT_RUN should fire');
    });

    // DIALOGUE_CLOCK_DELTA_DROUGHT_RUN no-fire:
    // clock-shifting scenes spread out so no gap reaches 6 consecutive scenes
    it('DIALOGUE_CLOCK_DELTA_DROUGHT_RUN does not fire when clock movement is spread through the story', async () => {
      const recs756bn = Array.from({ length: 10 }, (_, i) => makeRec756(i,
        (i === 0 || i === 3 || i === 6 || i === 9) ? { clockDelta: 1 } : {}
      ));
      const res = await runD756(buildScenes756(10), recs756bn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_CLOCK_DELTA_DROUGHT_RUN'), 'DIALOGUE_CLOCK_DELTA_DROUGHT_RUN should not fire');
    });

    // DIALOGUE_SUSPENSE_DROUGHT_RUN fire:
    // n=10; scenes 0,1,2 have rising suspense (>=3 present overall); scenes 3-9 (7 scenes) have none
    it('DIALOGUE_SUSPENSE_DROUGHT_RUN fires when the longest no-rising-suspense run reaches 6', async () => {
      const recs756c = Array.from({ length: 10 }, (_, i) => makeRec756(i,
        (i === 0 || i === 1 || i === 2) ? { suspenseDelta: 1 } : {}
      ));
      const res = await runD756(buildScenes756(10), recs756c);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_SUSPENSE_DROUGHT_RUN'), 'DIALOGUE_SUSPENSE_DROUGHT_RUN should fire');
    });

    // DIALOGUE_SUSPENSE_DROUGHT_RUN no-fire:
    // rising-suspense scenes spread out so no gap reaches 6 consecutive scenes
    it('DIALOGUE_SUSPENSE_DROUGHT_RUN does not fire when rising suspense is spread through the story', async () => {
      const recs756cn = Array.from({ length: 10 }, (_, i) => makeRec756(i,
        (i === 0 || i === 3 || i === 6 || i === 9) ? { suspenseDelta: 1 } : {}
      ));
      const res = await runD756(buildScenes756(10), recs756cn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_SUSPENSE_DROUGHT_RUN'), 'DIALOGUE_SUSPENSE_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 742 — dialoguePass: dialogue curiosity zone cluster, dialogue open thread peak uncaused, dialogue staging drought run', async () => {
    const makeRec742 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'complicate', dramaticTurn: 'nothing',
      ...overrides,
    });
    const buildScenes742 = (count: number): string => {
      let f = '';
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${i} - DAY\n\nA figure moves through the room.\n\n`;
      }
      return f;
    };
    const runD742 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // DIALOGUE_CURIOSITY_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; curiosity-positive scenes at 0,1,2 → 100% opening third
    it('DIALOGUE_CURIOSITY_ZONE_CLUSTER fires when >75% of curiosity-positive scenes cluster in one third', async () => {
      const recs742a = Array.from({ length: 9 }, (_, i) => makeRec742(i,
        (i === 0 || i === 1 || i === 2) ? { curiosityDelta: 1 } : {}
      ));
      const res = await runD742(buildScenes742(9), recs742a);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_CURIOSITY_ZONE_CLUSTER'), 'DIALOGUE_CURIOSITY_ZONE_CLUSTER should fire');
    });

    // DIALOGUE_CURIOSITY_ZONE_CLUSTER no-fire:
    // curiosity-positive scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('DIALOGUE_CURIOSITY_ZONE_CLUSTER does not fire when curiosity-positive scenes are distributed across thirds', async () => {
      const recs742an = Array.from({ length: 9 }, (_, i) => makeRec742(i,
        (i === 0 || i === 4 || i === 7) ? { curiosityDelta: 1 } : {}
      ));
      const res = await runD742(buildScenes742(9), recs742an);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_CURIOSITY_ZONE_CLUSTER'), 'DIALOGUE_CURIOSITY_ZONE_CLUSTER should not fire');
    });

    // DIALOGUE_OPEN_THREAD_PEAK_UNCAUSED fire:
    // n=8; open threads at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('DIALOGUE_OPEN_THREAD_PEAK_UNCAUSED fires when the peak open-thread scene has no dramatic turn or revelation nearby', async () => {
      const recs742b = Array.from({ length: 8 }, (_, i) => makeRec742(i,
        i === 2 ? { unresolvedClues: ['clue-a'] }
        : i === 6 ? { unresolvedClues: ['a', 'b', 'c', 'd', 'e'] }
        : {}
      ));
      const res = await runD742(buildScenes742(8), recs742b);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_OPEN_THREAD_PEAK_UNCAUSED'), 'DIALOGUE_OPEN_THREAD_PEAK_UNCAUSED should fire');
    });

    // DIALOGUE_OPEN_THREAD_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('DIALOGUE_OPEN_THREAD_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs742bn = Array.from({ length: 8 }, (_, i) => makeRec742(i,
        i === 2 ? { unresolvedClues: ['clue-a'] }
        : i === 5 ? { dramaticTurn: 'reversal' }
        : i === 6 ? { unresolvedClues: ['a', 'b', 'c', 'd', 'e'] }
        : {}
      ));
      const res = await runD742(buildScenes742(8), recs742bn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_OPEN_THREAD_PEAK_UNCAUSED'), 'DIALOGUE_OPEN_THREAD_PEAK_UNCAUSED should not fire');
    });

    // DIALOGUE_STAGING_DROUGHT_RUN fire:
    // 10 scenes; visual beats at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('DIALOGUE_STAGING_DROUGHT_RUN fires when the longest no-visual-beat run is ≥6', async () => {
      const recs742c = Array.from({ length: 10 }, (_, i) => makeRec742(i,
        (i === 0 || i === 1 || i === 2 || i === 9) ? { visualBeats: ['a beat'] } : {}
      ));
      const res = await runD742(buildScenes742(10), recs742c);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_STAGING_DROUGHT_RUN'), 'DIALOGUE_STAGING_DROUGHT_RUN should fire');
    });

    // DIALOGUE_STAGING_DROUGHT_RUN no-fire:
    // visual beats at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('DIALOGUE_STAGING_DROUGHT_RUN does not fire when visual beats are distributed without a long drought', async () => {
      const recs742cn = Array.from({ length: 10 }, (_, i) => makeRec742(i,
        (i === 0 || i === 4 || i === 9) ? { visualBeats: ['a beat'] } : {}
      ));
      const res = await runD742(buildScenes742(10), recs742cn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_STAGING_DROUGHT_RUN'), 'DIALOGUE_STAGING_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 728 — dialoguePass: dialogue curiosity peak uncaused, dialogue open thread drought run, dialogue staging zone cluster', async () => {
    const makeRec728 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'complicate', dramaticTurn: 'nothing',
      ...overrides,
    });
    const buildScenes728 = (count: number): string => {
      let f = '';
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${i} - DAY\n\nA figure moves through the room.\n\n`;
      }
      return f;
    };
    const runD728 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // DIALOGUE_CURIOSITY_PEAK_UNCAUSED fire:
    // n=8; curiosity spikes at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('DIALOGUE_CURIOSITY_PEAK_UNCAUSED fires when the peak curiosity-spike scene has no dramatic turn or revelation nearby', async () => {
      const recs728a = Array.from({ length: 8 }, (_, i) => makeRec728(i,
        i === 2 ? { curiosityDelta: 1 }
        : i === 6 ? { curiosityDelta: 5 }
        : {}
      ));
      const res = await runD728(buildScenes728(8), recs728a);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_CURIOSITY_PEAK_UNCAUSED'), 'DIALOGUE_CURIOSITY_PEAK_UNCAUSED should fire');
    });

    // DIALOGUE_CURIOSITY_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('DIALOGUE_CURIOSITY_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs728an = Array.from({ length: 8 }, (_, i) => makeRec728(i,
        i === 2 ? { curiosityDelta: 1 }
        : i === 5 ? { dramaticTurn: 'reversal' }
        : i === 6 ? { curiosityDelta: 5 }
        : {}
      ));
      const res = await runD728(buildScenes728(8), recs728an);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_CURIOSITY_PEAK_UNCAUSED'), 'DIALOGUE_CURIOSITY_PEAK_UNCAUSED should not fire');
    });

    // DIALOGUE_OPEN_THREAD_DROUGHT_RUN fire:
    // 10 scenes; open threads at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('DIALOGUE_OPEN_THREAD_DROUGHT_RUN fires when the longest no-outstanding-clue run is ≥6', async () => {
      const recs728b = Array.from({ length: 10 }, (_, i) => makeRec728(i,
        (i === 0 || i === 1 || i === 2 || i === 9) ? { unresolvedClues: ['clue-a'] } : {}
      ));
      const res = await runD728(buildScenes728(10), recs728b);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_OPEN_THREAD_DROUGHT_RUN'), 'DIALOGUE_OPEN_THREAD_DROUGHT_RUN should fire');
    });

    // DIALOGUE_OPEN_THREAD_DROUGHT_RUN no-fire:
    // open threads at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('DIALOGUE_OPEN_THREAD_DROUGHT_RUN does not fire when open threads are distributed without a long drought', async () => {
      const recs728bn = Array.from({ length: 10 }, (_, i) => makeRec728(i,
        (i === 0 || i === 4 || i === 9) ? { unresolvedClues: ['clue-a'] } : {}
      ));
      const res = await runD728(buildScenes728(10), recs728bn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_OPEN_THREAD_DROUGHT_RUN'), 'DIALOGUE_OPEN_THREAD_DROUGHT_RUN should not fire');
    });

    // DIALOGUE_STAGING_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; visually dense scenes at 0,1,2 → 100% opening third
    it('DIALOGUE_STAGING_ZONE_CLUSTER fires when >75% of visually dense scenes cluster in one third', async () => {
      const recs728c = Array.from({ length: 9 }, (_, i) => makeRec728(i,
        (i === 0 || i === 1 || i === 2) ? { visualBeats: ['a', 'b'] } : {}
      ));
      const res = await runD728(buildScenes728(9), recs728c);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_STAGING_ZONE_CLUSTER'), 'DIALOGUE_STAGING_ZONE_CLUSTER should fire');
    });

    // DIALOGUE_STAGING_ZONE_CLUSTER no-fire:
    // visually dense scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('DIALOGUE_STAGING_ZONE_CLUSTER does not fire when visually dense scenes are distributed across thirds', async () => {
      const recs728cn = Array.from({ length: 9 }, (_, i) => makeRec728(i,
        (i === 0 || i === 4 || i === 7) ? { visualBeats: ['a', 'b'] } : {}
      ));
      const res = await runD728(buildScenes728(9), recs728cn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_STAGING_ZONE_CLUSTER'), 'DIALOGUE_STAGING_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 714 — dialoguePass: highlighted dialogue drought run, dialogue seed zone cluster, dialogue payoff peak uncaused', async () => {
    const makeRec714 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'complicate', dramaticTurn: 'nothing',
      ...overrides,
    });
    const buildScenes714 = (count: number): string => {
      let f = '';
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${i} - DAY\n\nA figure moves through the room.\n\n`;
      }
      return f;
    };
    const runD714 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // HIGHLIGHTED_DIALOGUE_DROUGHT_RUN fire:
    // 10 scenes; highlights at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('HIGHLIGHTED_DIALOGUE_DROUGHT_RUN fires when the longest no-highlighted-dialogue run is ≥6', async () => {
      const recs714a = Array.from({ length: 10 }, (_, i) => makeRec714(i,
        (i === 0 || i === 1 || i === 2 || i === 9) ? { dialogueHighlights: ['line-a'] } : {}
      ));
      const res = await runD714(buildScenes714(10), recs714a);
      assert.ok(res.issues.some((is: any) => is.rule === 'HIGHLIGHTED_DIALOGUE_DROUGHT_RUN'), 'HIGHLIGHTED_DIALOGUE_DROUGHT_RUN should fire');
    });

    // HIGHLIGHTED_DIALOGUE_DROUGHT_RUN no-fire:
    // highlights at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('HIGHLIGHTED_DIALOGUE_DROUGHT_RUN does not fire when highlighted dialogue is distributed without a long drought', async () => {
      const recs714an = Array.from({ length: 10 }, (_, i) => makeRec714(i,
        (i === 0 || i === 4 || i === 9) ? { dialogueHighlights: ['line-a'] } : {}
      ));
      const res = await runD714(buildScenes714(10), recs714an);
      assert.ok(!res.issues.some((is: any) => is.rule === 'HIGHLIGHTED_DIALOGUE_DROUGHT_RUN'), 'HIGHLIGHTED_DIALOGUE_DROUGHT_RUN should not fire');
    });

    // DIALOGUE_SEED_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; seed scenes at 0,1,2 → 100% opening third
    it('DIALOGUE_SEED_ZONE_CLUSTER fires when >75% of seed scenes cluster in one third', async () => {
      const recs714b = Array.from({ length: 9 }, (_, i) => makeRec714(i,
        (i === 0 || i === 1 || i === 2) ? { seededClueIds: ['clue-a'] } : {}
      ));
      const res = await runD714(buildScenes714(9), recs714b);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_SEED_ZONE_CLUSTER'), 'DIALOGUE_SEED_ZONE_CLUSTER should fire');
    });

    // DIALOGUE_SEED_ZONE_CLUSTER no-fire:
    // seed scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('DIALOGUE_SEED_ZONE_CLUSTER does not fire when seed scenes are distributed across thirds', async () => {
      const recs714bn = Array.from({ length: 9 }, (_, i) => makeRec714(i,
        (i === 0 || i === 4 || i === 7) ? { seededClueIds: ['clue-a'] } : {}
      ));
      const res = await runD714(buildScenes714(9), recs714bn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_SEED_ZONE_CLUSTER'), 'DIALOGUE_SEED_ZONE_CLUSTER should not fire');
    });

    // DIALOGUE_PAYOFF_PEAK_UNCAUSED fire:
    // n=8; payoffs at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('DIALOGUE_PAYOFF_PEAK_UNCAUSED fires when the peak payoff scene has no dramatic turn or revelation nearby', async () => {
      const recs714c = Array.from({ length: 8 }, (_, i) => makeRec714(i,
        i === 2 ? { payoffSetupIds: ['thread-a'] }
        : i === 6 ? { payoffSetupIds: ['a', 'b', 'c', 'd', 'e'] }
        : {}
      ));
      const res = await runD714(buildScenes714(8), recs714c);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_PAYOFF_PEAK_UNCAUSED'), 'DIALOGUE_PAYOFF_PEAK_UNCAUSED should fire');
    });

    // DIALOGUE_PAYOFF_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('DIALOGUE_PAYOFF_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs714cn = Array.from({ length: 8 }, (_, i) => makeRec714(i,
        i === 2 ? { payoffSetupIds: ['thread-a'] }
        : i === 5 ? { dramaticTurn: 'reversal' }
        : i === 6 ? { payoffSetupIds: ['a', 'b', 'c', 'd', 'e'] }
        : {}
      ));
      const res = await runD714(buildScenes714(8), recs714cn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_PAYOFF_PEAK_UNCAUSED'), 'DIALOGUE_PAYOFF_PEAK_UNCAUSED should not fire');
    });
  });

  describe('Wave 700 — dialoguePass: dialogue highlight zone cluster, dialogue seed peak uncaused, dialogue payoff drought run', async () => {
    const makeRec700 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'complicate', dramaticTurn: 'nothing',
      ...overrides,
    });
    const buildScenes700 = (count: number): string => {
      let f = '';
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${i} - DAY\n\nA figure moves through the room.\n\n`;
      }
      return f;
    };
    const runD700 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // DIALOGUE_HIGHLIGHT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; highlighted-dialogue scenes at 0,1,2 → 100% opening third
    it('DIALOGUE_HIGHLIGHT_ZONE_CLUSTER fires when >75% of highlighted-dialogue scenes cluster in one third', async () => {
      const recs700a = Array.from({ length: 9 }, (_, i) => makeRec700(i,
        (i === 0 || i === 1 || i === 2) ? { dialogueHighlights: ['line-a'] } : {}
      ));
      const res = await runD700(buildScenes700(9), recs700a);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_HIGHLIGHT_ZONE_CLUSTER'), 'DIALOGUE_HIGHLIGHT_ZONE_CLUSTER should fire');
    });

    // DIALOGUE_HIGHLIGHT_ZONE_CLUSTER no-fire:
    // highlighted-dialogue scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('DIALOGUE_HIGHLIGHT_ZONE_CLUSTER does not fire when highlighted-dialogue scenes are distributed across thirds', async () => {
      const recs700an = Array.from({ length: 9 }, (_, i) => makeRec700(i,
        (i === 0 || i === 4 || i === 7) ? { dialogueHighlights: ['line-a'] } : {}
      ));
      const res = await runD700(buildScenes700(9), recs700an);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_HIGHLIGHT_ZONE_CLUSTER'), 'DIALOGUE_HIGHLIGHT_ZONE_CLUSTER should not fire');
    });

    // DIALOGUE_SEED_PEAK_UNCAUSED fire:
    // n=8; seeds at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('DIALOGUE_SEED_PEAK_UNCAUSED fires when the peak seed scene has no dramatic turn or revelation nearby', async () => {
      const recs700b = Array.from({ length: 8 }, (_, i) => makeRec700(i,
        i === 2 ? { seededClueIds: ['clue-a'] }
        : i === 6 ? { seededClueIds: ['a', 'b', 'c', 'd', 'e'] }
        : {}
      ));
      const res = await runD700(buildScenes700(8), recs700b);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_SEED_PEAK_UNCAUSED'), 'DIALOGUE_SEED_PEAK_UNCAUSED should fire');
    });

    // DIALOGUE_SEED_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('DIALOGUE_SEED_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs700bn = Array.from({ length: 8 }, (_, i) => makeRec700(i,
        i === 2 ? { seededClueIds: ['clue-a'] }
        : i === 5 ? { dramaticTurn: 'reversal' }
        : i === 6 ? { seededClueIds: ['a', 'b', 'c', 'd', 'e'] }
        : {}
      ));
      const res = await runD700(buildScenes700(8), recs700bn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_SEED_PEAK_UNCAUSED'), 'DIALOGUE_SEED_PEAK_UNCAUSED should not fire');
    });

    // DIALOGUE_PAYOFF_DROUGHT_RUN fire:
    // 10 scenes; payoffs at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('DIALOGUE_PAYOFF_DROUGHT_RUN fires when the longest no-payoff run is ≥6', async () => {
      const recs700c = Array.from({ length: 10 }, (_, i) => makeRec700(i,
        (i === 0 || i === 1 || i === 2 || i === 9) ? { payoffSetupIds: ['thread-a'] } : {}
      ));
      const res = await runD700(buildScenes700(10), recs700c);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_PAYOFF_DROUGHT_RUN'), 'DIALOGUE_PAYOFF_DROUGHT_RUN should fire');
    });

    // DIALOGUE_PAYOFF_DROUGHT_RUN no-fire:
    // payoffs at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('DIALOGUE_PAYOFF_DROUGHT_RUN does not fire when payoffs are distributed without a long drought', async () => {
      const recs700cn = Array.from({ length: 10 }, (_, i) => makeRec700(i,
        (i === 0 || i === 4 || i === 9) ? { payoffSetupIds: ['thread-a'] } : {}
      ));
      const res = await runD700(buildScenes700(10), recs700cn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_PAYOFF_DROUGHT_RUN'), 'DIALOGUE_PAYOFF_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 686 — dialoguePass: dialogue relationship peak uncaused, dialogue character moment drought run, dialogue emotion zone cluster', async () => {
    const makeRec686 = (sceneIdx: number, extra: Record<string, any> = {}): any => ({
      sceneIdx, suspenseDelta: 0, curiosityDelta: 0, clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing', payoffSetupIds: [], relationshipShifts: [],
      emotionalShift: 'neutral', seededClueIds: [], dialogueHighlights: [], unresolvedClues: [],
      visualBeats: [], purpose: 'complicate', slug: `s${sceneIdx}`, ...extra,
    });
    const buildScenes686 = (count: number): string => {
      let f = '';
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${i} - DAY\n\nA figure moves through the room.\n\n`;
      }
      return f;
    };
    const runD686 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // DIALOGUE_RELATIONSHIP_PEAK_UNCAUSED fire:
    // n=8; shifts at 2 (1 shift) and 6 (5 shifts, the peak); no dramaticTurn or revelation at
    // 6, 5, or 4
    it('DIALOGUE_RELATIONSHIP_PEAK_UNCAUSED fires when the peak relationship-shift scene has no dramatic turn or revelation nearby', async () => {
      const recs686a = Array.from({ length: 8 }, (_, i) => makeRec686(i,
        i === 2 ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] }
        : i === 6 ? { relationshipShifts: [0, 1, 2, 3, 4].map(n => ({ pairKey: `a|${n}`, dimension: 'trust', amount: 0.2 })) }
        : {}
      ));
      const res = await runD686(buildScenes686(8), recs686a);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_RELATIONSHIP_PEAK_UNCAUSED'), 'DIALOGUE_RELATIONSHIP_PEAK_UNCAUSED should fire');
    });

    // DIALOGUE_RELATIONSHIP_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('DIALOGUE_RELATIONSHIP_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs686an = Array.from({ length: 8 }, (_, i) => makeRec686(i,
        i === 2 ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] }
        : i === 5 ? { dramaticTurn: 'reversal' }
        : i === 6 ? { relationshipShifts: [0, 1, 2, 3, 4].map(n => ({ pairKey: `a|${n}`, dimension: 'trust', amount: 0.2 })) }
        : {}
      ));
      const res = await runD686(buildScenes686(8), recs686an);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_RELATIONSHIP_PEAK_UNCAUSED'), 'DIALOGUE_RELATIONSHIP_PEAK_UNCAUSED should not fire');
    });

    // DIALOGUE_CHARACTER_MOMENT_DROUGHT_RUN fire:
    // 10 scenes; character-moment at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('DIALOGUE_CHARACTER_MOMENT_DROUGHT_RUN fires when the longest no-character-moment run is ≥6', async () => {
      const recs686b = Array.from({ length: 10 }, (_, i) => makeRec686(i,
        (i === 0 || i === 1 || i === 2 || i === 9) ? { purpose: 'character_moment' } : {}
      ));
      const res = await runD686(buildScenes686(10), recs686b);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_CHARACTER_MOMENT_DROUGHT_RUN'), 'DIALOGUE_CHARACTER_MOMENT_DROUGHT_RUN should fire');
    });

    // DIALOGUE_CHARACTER_MOMENT_DROUGHT_RUN no-fire:
    // character-moment at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('DIALOGUE_CHARACTER_MOMENT_DROUGHT_RUN does not fire when character-moment scenes are distributed without a long drought', async () => {
      const recs686bn = Array.from({ length: 10 }, (_, i) => makeRec686(i,
        (i === 0 || i === 4 || i === 9) ? { purpose: 'character_moment' } : {}
      ));
      const res = await runD686(buildScenes686(10), recs686bn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_CHARACTER_MOMENT_DROUGHT_RUN'), 'DIALOGUE_CHARACTER_MOMENT_DROUGHT_RUN should not fire');
    });

    // DIALOGUE_EMOTION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; emotionally-charged scenes at 0,1,2 → 100% opening third
    it('DIALOGUE_EMOTION_ZONE_CLUSTER fires when >75% of emotionally-charged scenes cluster in one third', async () => {
      const recs686c = Array.from({ length: 9 }, (_, i) => makeRec686(i,
        (i === 0 || i === 1 || i === 2) ? { emotionalShift: 'positive' } : {}
      ));
      const res = await runD686(buildScenes686(9), recs686c);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_EMOTION_ZONE_CLUSTER'), 'DIALOGUE_EMOTION_ZONE_CLUSTER should fire');
    });

    // DIALOGUE_EMOTION_ZONE_CLUSTER no-fire:
    // emotionally-charged scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('DIALOGUE_EMOTION_ZONE_CLUSTER does not fire when emotionally-charged scenes are distributed across thirds', async () => {
      const recs686cn = Array.from({ length: 9 }, (_, i) => makeRec686(i,
        (i === 0 || i === 4 || i === 7) ? { emotionalShift: 'negative' } : {}
      ));
      const res = await runD686(buildScenes686(9), recs686cn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_EMOTION_ZONE_CLUSTER'), 'DIALOGUE_EMOTION_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 672 — dialoguePass: dialogue clock delta peak uncaused, dialogue clock drought run, dialogue suspense zone cluster', async () => {
    const makeRec672 = (sceneIdx: number, extra: Record<string, any> = {}): any => ({
      sceneIdx, suspenseDelta: 0, curiosityDelta: 0, clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing', payoffSetupIds: [], relationshipShifts: [],
      emotionalShift: 'neutral', seededClueIds: [], dialogueHighlights: [], unresolvedClues: [],
      visualBeats: [], purpose: 'complicate', slug: `s${sceneIdx}`, ...extra,
    });
    const buildScenes672 = (count: number): string => {
      let f = '';
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${i} - DAY\n\nA figure moves through the room.\n\n`;
      }
      return f;
    };
    const runD672 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // DIALOGUE_CLOCK_DELTA_PEAK_UNCAUSED fire:
    // n=8; clockDelta at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('DIALOGUE_CLOCK_DELTA_PEAK_UNCAUSED fires when the peak clockDelta scene has no dramatic turn or revelation nearby', async () => {
      const recs672a = Array.from({ length: 8 }, (_, i) => makeRec672(i,
        i === 2 ? { clockDelta: 1 }
        : i === 6 ? { clockDelta: 5 }
        : {}
      ));
      const res = await runD672(buildScenes672(8), recs672a);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_CLOCK_DELTA_PEAK_UNCAUSED'), 'DIALOGUE_CLOCK_DELTA_PEAK_UNCAUSED should fire');
    });

    // DIALOGUE_CLOCK_DELTA_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('DIALOGUE_CLOCK_DELTA_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs672an = Array.from({ length: 8 }, (_, i) => makeRec672(i,
        i === 2 ? { clockDelta: 1 }
        : i === 5 ? { dramaticTurn: 'reversal' }
        : i === 6 ? { clockDelta: 5 }
        : {}
      ));
      const res = await runD672(buildScenes672(8), recs672an);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_CLOCK_DELTA_PEAK_UNCAUSED'), 'DIALOGUE_CLOCK_DELTA_PEAK_UNCAUSED should not fire');
    });

    // DIALOGUE_CLOCK_DROUGHT_RUN fire:
    // 10 scenes; clock raised at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('DIALOGUE_CLOCK_DROUGHT_RUN fires when the longest no-clock run is ≥6', async () => {
      const recs672b = Array.from({ length: 10 }, (_, i) => makeRec672(i,
        (i === 0 || i === 1 || i === 2 || i === 9) ? { clockRaised: true } : {}
      ));
      const res = await runD672(buildScenes672(10), recs672b);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_CLOCK_DROUGHT_RUN'), 'DIALOGUE_CLOCK_DROUGHT_RUN should fire');
    });

    // DIALOGUE_CLOCK_DROUGHT_RUN no-fire:
    // clock raised at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('DIALOGUE_CLOCK_DROUGHT_RUN does not fire when clock raises are distributed without a long drought', async () => {
      const recs672bn = Array.from({ length: 10 }, (_, i) => makeRec672(i,
        (i === 0 || i === 4 || i === 9) ? { clockRaised: true } : {}
      ));
      const res = await runD672(buildScenes672(10), recs672bn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_CLOCK_DROUGHT_RUN'), 'DIALOGUE_CLOCK_DROUGHT_RUN should not fire');
    });

    // DIALOGUE_SUSPENSE_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; rising-suspense scenes at 0,1,2 → 100% opening third
    it('DIALOGUE_SUSPENSE_ZONE_CLUSTER fires when >75% of rising-suspense scenes cluster in one third', async () => {
      const recs672c = Array.from({ length: 9 }, (_, i) => makeRec672(i,
        (i === 0 || i === 1 || i === 2) ? { suspenseDelta: 1 } : {}
      ));
      const res = await runD672(buildScenes672(9), recs672c);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_SUSPENSE_ZONE_CLUSTER'), 'DIALOGUE_SUSPENSE_ZONE_CLUSTER should fire');
    });

    // DIALOGUE_SUSPENSE_ZONE_CLUSTER no-fire:
    // rising-suspense scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('DIALOGUE_SUSPENSE_ZONE_CLUSTER does not fire when rising-suspense scenes are distributed across thirds', async () => {
      const recs672cn = Array.from({ length: 9 }, (_, i) => makeRec672(i,
        (i === 0 || i === 4 || i === 7) ? { suspenseDelta: 1 } : {}
      ));
      const res = await runD672(buildScenes672(9), recs672cn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_SUSPENSE_ZONE_CLUSTER'), 'DIALOGUE_SUSPENSE_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 658 — dialoguePass: dialogue staging peak uncaused, dialogue seed drought run, dialogue payoff zone cluster', async () => {
    const makeRec658 = (sceneIdx: number, extra: Record<string, any> = {}): any => ({
      sceneIdx, suspenseDelta: 0, curiosityDelta: 0, clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing', payoffSetupIds: [], relationshipShifts: [],
      emotionalShift: 'neutral', seededClueIds: [], dialogueHighlights: [], unresolvedClues: [],
      visualBeats: [], purpose: 'complicate', slug: `s${sceneIdx}`, ...extra,
    });
    const buildScenes658 = (count: number): string => {
      let f = '';
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${i} - DAY\n\nA figure moves through the room.\n\n`;
      }
      return f;
    };
    const runD658 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // DIALOGUE_STAGING_PEAK_UNCAUSED fire:
    // n=8; staging at 2 (1 beat) and 6 (5 beats, the peak); no dramaticTurn or revelation at
    // 6, 5, or 4
    it('DIALOGUE_STAGING_PEAK_UNCAUSED fires when the peak physical-staging scene has no dramatic turn or revelation nearby', async () => {
      const recs658a = Array.from({ length: 8 }, (_, i) => makeRec658(i,
        i === 2 ? { visualBeats: ['glances at the clock'] }
        : i === 6 ? { visualBeats: ['a', 'b', 'c', 'd', 'e'] }
        : {}
      ));
      const res = await runD658(buildScenes658(8), recs658a);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_STAGING_PEAK_UNCAUSED'), 'DIALOGUE_STAGING_PEAK_UNCAUSED should fire');
    });

    // DIALOGUE_STAGING_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('DIALOGUE_STAGING_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs658an = Array.from({ length: 8 }, (_, i) => makeRec658(i,
        i === 2 ? { visualBeats: ['glances at the clock'] }
        : i === 5 ? { dramaticTurn: 'reversal' }
        : i === 6 ? { visualBeats: ['a', 'b', 'c', 'd', 'e'] }
        : {}
      ));
      const res = await runD658(buildScenes658(8), recs658an);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_STAGING_PEAK_UNCAUSED'), 'DIALOGUE_STAGING_PEAK_UNCAUSED should not fire');
    });

    // DIALOGUE_SEED_DROUGHT_RUN fire:
    // 10 scenes; seeded at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('DIALOGUE_SEED_DROUGHT_RUN fires when the longest no-seed run is ≥6', async () => {
      const recs658b = Array.from({ length: 10 }, (_, i) => makeRec658(i,
        (i === 0 || i === 1 || i === 2 || i === 9) ? { seededClueIds: ['clue-x'] } : {}
      ));
      const res = await runD658(buildScenes658(10), recs658b);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_SEED_DROUGHT_RUN'), 'DIALOGUE_SEED_DROUGHT_RUN should fire');
    });

    // DIALOGUE_SEED_DROUGHT_RUN no-fire:
    // seeded at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('DIALOGUE_SEED_DROUGHT_RUN does not fire when seeding is distributed without a long drought', async () => {
      const recs658bn = Array.from({ length: 10 }, (_, i) => makeRec658(i,
        (i === 0 || i === 4 || i === 9) ? { seededClueIds: ['clue-x'] } : {}
      ));
      const res = await runD658(buildScenes658(10), recs658bn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_SEED_DROUGHT_RUN'), 'DIALOGUE_SEED_DROUGHT_RUN should not fire');
    });

    // DIALOGUE_PAYOFF_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; payoff scenes at 0,1,2 → 100% opening third
    it('DIALOGUE_PAYOFF_ZONE_CLUSTER fires when >75% of payoff scenes cluster in one third', async () => {
      const recs658c = Array.from({ length: 9 }, (_, i) => makeRec658(i,
        (i === 0 || i === 1 || i === 2) ? { payoffSetupIds: ['thread-a'] } : {}
      ));
      const res = await runD658(buildScenes658(9), recs658c);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_PAYOFF_ZONE_CLUSTER'), 'DIALOGUE_PAYOFF_ZONE_CLUSTER should fire');
    });

    // DIALOGUE_PAYOFF_ZONE_CLUSTER no-fire:
    // payoff scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('DIALOGUE_PAYOFF_ZONE_CLUSTER does not fire when payoff scenes are distributed across thirds', async () => {
      const recs658cn = Array.from({ length: 9 }, (_, i) => makeRec658(i,
        (i === 0 || i === 4 || i === 7) ? { payoffSetupIds: ['thread-a'] } : {}
      ));
      const res = await runD658(buildScenes658(9), recs658cn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_PAYOFF_ZONE_CLUSTER'), 'DIALOGUE_PAYOFF_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 644 — dialoguePass: dialogue highlight peak uncaused, dialogue curiosity drought run, dialogue open thread zone cluster', async () => {
    const makeRec644 = (sceneIdx: number, extra: Record<string, any> = {}): any => ({
      sceneIdx, suspenseDelta: 0, curiosityDelta: 0, clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing', payoffSetupIds: [], relationshipShifts: [],
      emotionalShift: 'neutral', seededClueIds: [], dialogueHighlights: [], unresolvedClues: [],
      visualBeats: [], purpose: 'complicate', slug: `s${sceneIdx}`, ...extra,
    });
    const runD644 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };
    const buildScenes644 = (count: number): string => {
      let f = '';
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${i} - DAY\n\nA figure moves through the room.\n\n`;
      }
      return f;
    };

    // DIALOGUE_HIGHLIGHT_PEAK_UNCAUSED fire:
    // n=8; highlights at 2 (1 line) and 6 (5 lines, the peak); no dramaticTurn or revelation at
    // 6, 5, or 4
    it('DIALOGUE_HIGHLIGHT_PEAK_UNCAUSED fires when the peak highlighted-dialogue scene has no dramatic turn or revelation nearby', async () => {
      const recs644a = Array.from({ length: 8 }, (_, i) => makeRec644(i,
        i === 2 ? { dialogueHighlights: ['line-a'] }
        : i === 6 ? { dialogueHighlights: ['a', 'b', 'c', 'd', 'e'] }
        : {}
      ));
      const res = await runD644(buildScenes644(8), recs644a);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_HIGHLIGHT_PEAK_UNCAUSED'), 'DIALOGUE_HIGHLIGHT_PEAK_UNCAUSED should fire');
    });

    // DIALOGUE_HIGHLIGHT_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('DIALOGUE_HIGHLIGHT_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs644an = Array.from({ length: 8 }, (_, i) => makeRec644(i,
        i === 2 ? { dialogueHighlights: ['line-a'] }
        : i === 5 ? { dramaticTurn: 'reversal' }
        : i === 6 ? { dialogueHighlights: ['a', 'b', 'c', 'd', 'e'] }
        : {}
      ));
      const res = await runD644(buildScenes644(8), recs644an);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_HIGHLIGHT_PEAK_UNCAUSED'), 'DIALOGUE_HIGHLIGHT_PEAK_UNCAUSED should not fire');
    });

    // DIALOGUE_CURIOSITY_DROUGHT_RUN fire:
    // 10 scenes; curiosity rises at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('DIALOGUE_CURIOSITY_DROUGHT_RUN fires when the longest no-curiosity-rise run is ≥6', async () => {
      const recs644b = Array.from({ length: 10 }, (_, i) => makeRec644(i,
        i === 0 || i === 1 || i === 2 || i === 9 ? { curiosityDelta: 1 } : {}
      ));
      const res = await runD644(buildScenes644(10), recs644b);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_CURIOSITY_DROUGHT_RUN'), 'DIALOGUE_CURIOSITY_DROUGHT_RUN should fire');
    });

    // DIALOGUE_CURIOSITY_DROUGHT_RUN no-fire:
    // curiosity rises at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('DIALOGUE_CURIOSITY_DROUGHT_RUN does not fire when curiosity rises are distributed without a long drought', async () => {
      const recs644bn = Array.from({ length: 10 }, (_, i) => makeRec644(i,
        i === 0 || i === 4 || i === 9 ? { curiosityDelta: 1 } : {}
      ));
      const res = await runD644(buildScenes644(10), recs644bn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_CURIOSITY_DROUGHT_RUN'), 'DIALOGUE_CURIOSITY_DROUGHT_RUN should not fire');
    });

    // DIALOGUE_OPEN_THREAD_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; open-thread scenes at 0,1,2 → 100% opening third
    it('DIALOGUE_OPEN_THREAD_ZONE_CLUSTER fires when >75% of open-thread scenes cluster in one third', async () => {
      const recs644c = Array.from({ length: 9 }, (_, i) => makeRec644(i,
        i === 0 || i === 1 || i === 2 ? { unresolvedClues: ['unpaid-clue'] } : {}
      ));
      const res = await runD644(buildScenes644(9), recs644c);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_OPEN_THREAD_ZONE_CLUSTER'), 'DIALOGUE_OPEN_THREAD_ZONE_CLUSTER should fire');
    });

    // DIALOGUE_OPEN_THREAD_ZONE_CLUSTER no-fire:
    // open-thread scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('DIALOGUE_OPEN_THREAD_ZONE_CLUSTER does not fire when open-thread scenes are distributed across thirds', async () => {
      const recs644cn = Array.from({ length: 9 }, (_, i) => makeRec644(i,
        i === 0 || i === 4 || i === 7 ? { unresolvedClues: ['unpaid-clue'] } : {}
      ));
      const res = await runD644(buildScenes644(9), recs644cn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_OPEN_THREAD_ZONE_CLUSTER'), 'DIALOGUE_OPEN_THREAD_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 630 — dialoguePass: dialogue payoff staging decoupled, dialogue shift staging aftermath void, dialogue payoff zone imbalance', async () => {
    const makeRec630 = (sceneIdx: number, extra: Record<string, any> = {}): any => ({
      sceneIdx, suspenseDelta: 0, curiosityDelta: 0, clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing', payoffSetupIds: [], relationshipShifts: [],
      emotionalShift: 'neutral', seededClueIds: [], dialogueHighlights: [], unresolvedClues: [],
      visualBeats: [], purpose: 'complicate', slug: `s${sceneIdx}`, ...extra,
    });
    const runD630 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };
    const buildScenes630 = (count: number): string => {
      let f = '';
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${i} - DAY\n\nA figure moves through the room.\n\n`;
      }
      return f;
    };

    // DIALOGUE_PAYOFF_STAGING_DECOUPLED fire:
    // n=6; payoffs at 0,1 (no staging); staged at 4,5 (no payoff) → zero overlap → fires
    it('DIALOGUE_PAYOFF_STAGING_DECOUPLED fires when payoff scenes and visually-staged scenes never overlap', async () => {
      const recs630a = Array.from({ length: 6 }, (_, i) => makeRec630(i,
        i === 0 || i === 1 ? { payoffSetupIds: ['thread-a'] }
        : i === 4 || i === 5 ? { visualBeats: ['closes the case', 'sets it down'] }
        : {}
      ));
      const res = await runD630(buildScenes630(6), recs630a);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_PAYOFF_STAGING_DECOUPLED'), 'DIALOGUE_PAYOFF_STAGING_DECOUPLED should fire');
    });

    // DIALOGUE_PAYOFF_STAGING_DECOUPLED no-fire:
    // scene 0 carries BOTH a payoff and visual staging → overlap exists
    it('DIALOGUE_PAYOFF_STAGING_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs630an = Array.from({ length: 6 }, (_, i) => makeRec630(i,
        i === 0 ? { payoffSetupIds: ['thread-a'], visualBeats: ['closes the case', 'sets it down'] }
        : i === 1 ? { payoffSetupIds: ['thread-b'] }
        : i === 5 ? { visualBeats: ['closes the case', 'sets it down'] }
        : {}
      ));
      const res = await runD630(buildScenes630(6), recs630an);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_PAYOFF_STAGING_DECOUPLED'), 'DIALOGUE_PAYOFF_STAGING_DECOUPLED should not fire');
    });

    // DIALOGUE_SHIFT_STAGING_AFTERMATH_VOID fire:
    // n=8, window=2; shift triggers at 0,1; their windows {1,2} and {2,3} carry no visually
    // dense scene; staged scenes exist elsewhere at 5,6,7 → fires
    it('DIALOGUE_SHIFT_STAGING_AFTERMATH_VOID fires when no shift is followed by a visually dense scene within 2 scenes', async () => {
      const recs630b = Array.from({ length: 8 }, (_, i) => makeRec630(i,
        i === 0 || i === 1 ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.5 }] }
        : i === 5 || i === 6 || i === 7 ? { visualBeats: ['closes the case', 'sets it down'] }
        : {}
      ));
      const res = await runD630(buildScenes630(8), recs630b);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_SHIFT_STAGING_AFTERMATH_VOID'), 'DIALOGUE_SHIFT_STAGING_AFTERMATH_VOID should fire');
    });

    // DIALOGUE_SHIFT_STAGING_AFTERMATH_VOID no-fire:
    // scene 3 (inside trigger 1's window {2,3}) now carries staging → that trigger's aftermath
    // is no longer void
    it('DIALOGUE_SHIFT_STAGING_AFTERMATH_VOID does not fire when a trigger window contains a visually dense scene', async () => {
      const recs630bn = Array.from({ length: 8 }, (_, i) => makeRec630(i,
        i === 0 || i === 1 ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.5 }] }
        : i === 3 || i === 5 || i === 6 || i === 7 ? { visualBeats: ['closes the case', 'sets it down'] }
        : {}
      ));
      const res = await runD630(buildScenes630(8), recs630bn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_SHIFT_STAGING_AFTERMATH_VOID'), 'DIALOGUE_SHIFT_STAGING_AFTERMATH_VOID should not fire');
    });

    // DIALOGUE_PAYOFF_ZONE_IMBALANCE fire:
    // n=12 (three scenes per zone); payoffs at 6,7,8,9; zone 2 (6-8)=3, zone 3 (9)=1, total=4;
    // zones 0,1 empty; bloatZoneIdx=zone2, 3/4=75% ≥ 50% → fires
    it('DIALOGUE_PAYOFF_ZONE_IMBALANCE fires when one zone is empty of payoffs while another is bloated', async () => {
      const recs630c = Array.from({ length: 12 }, (_, i) => makeRec630(i, {
        payoffSetupIds: (i === 6 || i === 7 || i === 8 || i === 9) ? ['thread'] : [],
      }));
      const res = await runD630(buildScenes630(12), recs630c);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_PAYOFF_ZONE_IMBALANCE'), 'DIALOGUE_PAYOFF_ZONE_IMBALANCE should fire');
    });

    // DIALOGUE_PAYOFF_ZONE_IMBALANCE no-fire:
    // one payoff per zone (1,4,7,10) → no zone is empty
    it('DIALOGUE_PAYOFF_ZONE_IMBALANCE does not fire when payoffs are spread across all zones', async () => {
      const recs630cn = Array.from({ length: 12 }, (_, i) => makeRec630(i, {
        payoffSetupIds: (i === 1 || i === 4 || i === 7 || i === 10) ? ['thread'] : [],
      }));
      const res = await runD630(buildScenes630(12), recs630cn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_PAYOFF_ZONE_IMBALANCE'), 'DIALOGUE_PAYOFF_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 616 — dialoguePass: purpose dialogue highlight decoupled, character moment zone imbalance, raise stakes dialogue highlight aftermath void', async () => {
    const makeRec616 = (sceneIdx: number, extra: Record<string, any> = {}): any => ({
      sceneIdx, suspenseDelta: 0, curiosityDelta: 0, clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing', payoffSetupIds: [], relationshipShifts: [],
      emotionalShift: 'neutral', seededClueIds: [], dialogueHighlights: [], unresolvedClues: [],
      visualBeats: [], purpose: 'complicate', slug: `s${sceneIdx}`, ...extra,
    });
    const runD616 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };
    const buildScenes616 = (count: number): string => {
      let f = '';
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${i} - DAY\n\nA figure moves through the room.\n\n`;
      }
      return f;
    };

    // PURPOSE_DIALOGUE_HIGHLIGHT_DECOUPLED fire:
    // n=6; pivotal purposes at 0,1 (no highlight); highlights at 4,5 (non-pivotal purpose) → zero overlap
    it('PURPOSE_DIALOGUE_HIGHLIGHT_DECOUPLED fires when pivotal-purpose scenes and dialogue highlights never overlap', async () => {
      const recs616a = Array.from({ length: 6 }, (_, i) => makeRec616(i,
        i === 0 ? { purpose: 'climax' }
        : i === 1 ? { purpose: 'turning_point' }
        : i === 4 || i === 5 ? { dialogueHighlights: ['a memorable line'] }
        : {}
      ));
      const res = await runD616(buildScenes616(6), recs616a);
      assert.ok(res.issues.some((is: any) => is.rule === 'PURPOSE_DIALOGUE_HIGHLIGHT_DECOUPLED'), 'PURPOSE_DIALOGUE_HIGHLIGHT_DECOUPLED should fire');
    });

    // PURPOSE_DIALOGUE_HIGHLIGHT_DECOUPLED no-fire:
    // scene 0 carries BOTH a pivotal purpose and a dialogue highlight → overlap exists
    it('PURPOSE_DIALOGUE_HIGHLIGHT_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs616an = Array.from({ length: 6 }, (_, i) => makeRec616(i,
        i === 0 ? { purpose: 'climax', dialogueHighlights: ['a memorable line'] }
        : i === 1 ? { purpose: 'turning_point' }
        : i === 5 ? { dialogueHighlights: ['another line'] }
        : {}
      ));
      const res = await runD616(buildScenes616(6), recs616an);
      assert.ok(!res.issues.some((is: any) => is.rule === 'PURPOSE_DIALOGUE_HIGHLIGHT_DECOUPLED'), 'PURPOSE_DIALOGUE_HIGHLIGHT_DECOUPLED should not fire');
    });

    // CHARACTER_MOMENT_ZONE_IMBALANCE fire:
    // n=12 (three scenes per zone); character-moment scenes at 6,9,10,11;
    // zones 0 (0-2) and 1 (3-5) are empty; zone 3 (9-11) holds 3/4 = 75% ≥ 50% → fires
    it('CHARACTER_MOMENT_ZONE_IMBALANCE fires when one zone is empty of character-moment scenes while another is bloated', async () => {
      const recs616b = Array.from({ length: 12 }, (_, i) => makeRec616(i, {
        purpose: (i === 6 || i === 9 || i === 10 || i === 11) ? 'character_moment' : 'complicate',
      }));
      const res = await runD616(buildScenes616(12), recs616b);
      assert.ok(res.issues.some((is: any) => is.rule === 'CHARACTER_MOMENT_ZONE_IMBALANCE'), 'CHARACTER_MOMENT_ZONE_IMBALANCE should fire');
    });

    // CHARACTER_MOMENT_ZONE_IMBALANCE no-fire:
    // one character-moment scene per zone (1,4,7,10) → no zone is empty
    it('CHARACTER_MOMENT_ZONE_IMBALANCE does not fire when every zone has a character-moment scene', async () => {
      const recs616bn = Array.from({ length: 12 }, (_, i) => makeRec616(i, {
        purpose: (i === 1 || i === 4 || i === 7 || i === 10) ? 'character_moment' : 'complicate',
      }));
      const res = await runD616(buildScenes616(12), recs616bn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'CHARACTER_MOMENT_ZONE_IMBALANCE'), 'CHARACTER_MOMENT_ZONE_IMBALANCE should not fire');
    });

    // RAISE_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fire:
    // n=8, window=2; stakes-raise triggers at 0,1; their windows {1,2} and {2,3} carry no
    // dialogue highlight; highlights exist elsewhere at 5,6,7 → fires
    it('RAISE_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fires when no stakes-raise is followed by a dialogue highlight within 2 scenes', async () => {
      const recs616c = Array.from({ length: 8 }, (_, i) => makeRec616(i,
        i === 0 || i === 1 ? { purpose: 'raise_stakes' }
        : i === 5 || i === 6 || i === 7 ? { dialogueHighlights: ['a memorable line'] }
        : {}
      ));
      const res = await runD616(buildScenes616(8), recs616c);
      assert.ok(res.issues.some((is: any) => is.rule === 'RAISE_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'RAISE_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    // RAISE_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID no-fire:
    // scene 3 (inside trigger 1's window {2,3}) now carries a highlight → that trigger's
    // aftermath is no longer void
    it('RAISE_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID does not fire when a trigger window contains a dialogue highlight', async () => {
      const recs616cn = Array.from({ length: 8 }, (_, i) => makeRec616(i,
        i === 0 || i === 1 ? { purpose: 'raise_stakes' }
        : i === 3 || i === 5 || i === 6 || i === 7 ? { dialogueHighlights: ['a memorable line'] }
        : {}
      ));
      const res = await runD616(buildScenes616(8), recs616cn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'RAISE_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'RAISE_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 602 — dialoguePass: dialogue highlight/open thread decoupled, visual beat zone imbalance, open thread aftermath void', async () => {
    const makeRec602 = (sceneIdx: number, extra: Record<string, any> = {}): any => ({
      sceneIdx, suspenseDelta: 0, curiosityDelta: 0, clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing', payoffSetupIds: [], relationshipShifts: [],
      emotionalShift: 'neutral', seededClueIds: [], dialogueHighlights: [], unresolvedClues: [],
      visualBeats: [], purpose: '', slug: `s${sceneIdx}`, ...extra,
    });
    const runD602 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };
    const buildScenes602 = (count: number): string => {
      let f = '';
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${i} - DAY\n\nA figure moves through the room.\n\n`;
      }
      return f;
    };

    // DIALOGUE_HIGHLIGHT_OPEN_THREAD_DECOUPLED fire:
    // n=8; scenes 0,1 carry a dialogue highlight (no debt); scenes 2,3 carry open clue-debt
    // (no highlight); zero scene has both → fires
    it('DIALOGUE_HIGHLIGHT_OPEN_THREAD_DECOUPLED fires when highlight scenes and open-thread scenes never overlap', async () => {
      const recs602a = Array.from({ length: 8 }, (_, i) => makeRec602(i, {
        dialogueHighlights: i === 0 || i === 1 ? ['a memorable line'] : [],
        unresolvedClues: i === 2 || i === 3 ? ['unpaid-clue'] : [],
      }));
      const res = await runD602(buildScenes602(8), recs602a);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_HIGHLIGHT_OPEN_THREAD_DECOUPLED'), 'DIALOGUE_HIGHLIGHT_OPEN_THREAD_DECOUPLED should fire');
    });

    // DIALOGUE_HIGHLIGHT_OPEN_THREAD_DECOUPLED no-fire:
    // scene 2 carries BOTH a dialogue highlight and open clue-debt → overlap exists
    it('DIALOGUE_HIGHLIGHT_OPEN_THREAD_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs602an = Array.from({ length: 8 }, (_, i) => makeRec602(i, {
        dialogueHighlights: i === 0 || i === 1 || i === 2 ? ['a memorable line'] : [],
        unresolvedClues: i === 2 || i === 3 ? ['unpaid-clue'] : [],
      }));
      const res = await runD602(buildScenes602(8), recs602an);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_HIGHLIGHT_OPEN_THREAD_DECOUPLED'), 'DIALOGUE_HIGHLIGHT_OPEN_THREAD_DECOUPLED should not fire');
    });

    // VISUAL_BEAT_ZONE_IMBALANCE fire:
    // n=12 (three scenes per zone); visually-dense scenes (visualBeats≥2) at 6,9,10,11;
    // zones 0 (0-2) and 1 (3-5) are empty; zone 3 (9-11) holds 3/4=75% ≥ 50% → fires
    it('VISUAL_BEAT_ZONE_IMBALANCE fires when one zone is empty of visually-dense scenes while another is bloated', async () => {
      const recs602b = Array.from({ length: 12 }, (_, i) => makeRec602(i, {
        visualBeats: (i === 6 || i === 9 || i === 10 || i === 11) ? ['examines the room', 'notices the photo'] : [],
      }));
      const res = await runD602(buildScenes602(12), recs602b);
      assert.ok(res.issues.some((is: any) => is.rule === 'VISUAL_BEAT_ZONE_IMBALANCE'), 'VISUAL_BEAT_ZONE_IMBALANCE should fire');
    });

    // VISUAL_BEAT_ZONE_IMBALANCE no-fire:
    // one visually-dense scene per zone (1,4,7,10) → no zone is empty
    it('VISUAL_BEAT_ZONE_IMBALANCE does not fire when every zone has a visually-dense scene', async () => {
      const recs602bn = Array.from({ length: 12 }, (_, i) => makeRec602(i, {
        visualBeats: (i === 1 || i === 4 || i === 7 || i === 10) ? ['examines the room', 'notices the photo'] : [],
      }));
      const res = await runD602(buildScenes602(12), recs602bn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'VISUAL_BEAT_ZONE_IMBALANCE'), 'VISUAL_BEAT_ZONE_IMBALANCE should not fire');
    });

    // OPEN_THREAD_DIALOGUE_AFTERMATH_VOID fire:
    // n=8, window=2; heavy clue-debt triggers at 0,1 (unresolvedClues≥3); their windows
    // {1,2} and {2,3} carry no dialogue highlight; highlights exist elsewhere at 5,6,7 → fires
    it('OPEN_THREAD_DIALOGUE_AFTERMATH_VOID fires when heavy clue-debt scenes are never followed by highlighted dialogue', async () => {
      const recs602c = Array.from({ length: 8 }, (_, i) => makeRec602(i, {
        unresolvedClues: i === 0 || i === 1 ? ['c1', 'c2', 'c3'] : [],
        dialogueHighlights: i === 5 || i === 6 || i === 7 ? ['a memorable line'] : [],
      }));
      const res = await runD602(buildScenes602(8), recs602c);
      assert.ok(res.issues.some((is: any) => is.rule === 'OPEN_THREAD_DIALOGUE_AFTERMATH_VOID'), 'OPEN_THREAD_DIALOGUE_AFTERMATH_VOID should fire');
    });

    // OPEN_THREAD_DIALOGUE_AFTERMATH_VOID no-fire:
    // scene 3 (inside trigger 1's window {2,3}) now carries a highlight → that trigger's
    // aftermath is no longer void
    it('OPEN_THREAD_DIALOGUE_AFTERMATH_VOID does not fire when a trigger window contains a highlighted scene', async () => {
      const recs602cn = Array.from({ length: 8 }, (_, i) => makeRec602(i, {
        unresolvedClues: i === 0 || i === 1 ? ['c1', 'c2', 'c3'] : [],
        dialogueHighlights: i === 3 || i === 5 || i === 6 || i === 7 ? ['a memorable line'] : [],
      }));
      const res = await runD602(buildScenes602(8), recs602cn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'OPEN_THREAD_DIALOGUE_AFTERMATH_VOID'), 'OPEN_THREAD_DIALOGUE_AFTERMATH_VOID should not fire');
    });
  });


  describe('Wave 588 — dialoguePass: curiosity-spike scene void, closing-zone silent, hedge back-loaded', async () => {
    const makeRec588 = (sceneIdx: number, extra: Record<string, any> = {}): any => ({
      sceneIdx, suspenseDelta: 0, curiosityDelta: 0, clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing', payoffSetupIds: [], relationshipShifts: [],
      emotionalShift: 'neutral', seededClueIds: [], dialogueHighlights: [], unresolvedClues: [],
      purpose: '', slug: `s${sceneIdx}`, ...extra,
    });
    const runD588 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };
    const buildScenes588 = (count: number, dlgFn: (i: number) => number): string => {
      let f = '';
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${i} - DAY\n\n`;
        const n = dlgFn(i);
        for (let j = 0; j < n; j++) {
          f += j % 2 === 0
            ? `ALICE\nShe found the documents early this morning.\n\n`
            : `BOB\nWe should leave before they close the gate.\n\n`;
        }
        if (n === 0) f += `The door crashes open. A figure steps from the dark.\n\n`;
      }
      return f;
    };

    // DIALOGUE_CURIOSITY_SPIKE_SCENE_VOID fire:
    // n=10; curiosityDelta>0 at scenes 2,5; those scenes have 0 dialogue; others have 2 lines → fires
    it('DIALOGUE_CURIOSITY_SPIKE_SCENE_VOID fires when all curiosity-spike scenes have no dialogue', async () => {
      const recs588a = Array.from({ length: 10 }, (_, i) => makeRec588(i, { curiosityDelta: i === 2 || i === 5 ? 1 : 0 }));
      const f588a = buildScenes588(10, i => i === 2 || i === 5 ? 0 : 2);
      const res = await runD588(f588a, recs588a);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_CURIOSITY_SPIKE_SCENE_VOID'), 'DIALOGUE_CURIOSITY_SPIKE_SCENE_VOID should fire');
    });

    // DIALOGUE_CURIOSITY_SPIKE_SCENE_VOID no-fire:
    // scene 2 (curiosity spike) has 2 dialogue lines → does not fire
    it('DIALOGUE_CURIOSITY_SPIKE_SCENE_VOID does not fire when a curiosity-spike scene has dialogue', async () => {
      const recs588an = Array.from({ length: 10 }, (_, i) => makeRec588(i, { curiosityDelta: i === 2 || i === 5 ? 1 : 0 }));
      const f588an = buildScenes588(10, i => i === 5 ? 0 : 2);
      const res = await runD588(f588an, recs588an);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_CURIOSITY_SPIKE_SCENE_VOID'), 'DIALOGUE_CURIOSITY_SPIKE_SCENE_VOID should not fire');
    });

    // DIALOGUE_CLOSING_ZONE_SILENT fire:
    // n=9; third=3; opening (0-2) and middle (3-5) have dialogue; closing (6-8) has none → fires
    it('DIALOGUE_CLOSING_ZONE_SILENT fires when the closing third has no dialogue', async () => {
      const recs588b = Array.from({ length: 9 }, (_, i) => makeRec588(i));
      const f588b = buildScenes588(9, i => i >= 6 ? 0 : 2);
      const res = await runD588(f588b, recs588b);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_CLOSING_ZONE_SILENT'), 'DIALOGUE_CLOSING_ZONE_SILENT should fire');
    });

    // DIALOGUE_CLOSING_ZONE_SILENT no-fire:
    // scene 7 (closing third) has 2 dialogue lines → does not fire
    it('DIALOGUE_CLOSING_ZONE_SILENT does not fire when the closing third has a dialogue scene', async () => {
      const recs588bn = Array.from({ length: 9 }, (_, i) => makeRec588(i));
      const f588bn = buildScenes588(9, i => i === 7 ? 2 : i >= 6 ? 0 : 2);
      const res = await runD588(f588bn, recs588bn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_CLOSING_ZONE_SILENT'), 'DIALOGUE_CLOSING_ZONE_SILENT should not fire');
    });

    // DIALOGUE_HEDGE_BACK_LOADED fire:
    // 16 lines total; scenes 0-1 (first half): 0 hedges; scenes 2-3 (second half): 8 hedges → fires
    it('DIALOGUE_HEDGE_BACK_LOADED fires when hedge lines concentrate in the second half', async () => {
      const f588c = [
        `INT. SCENE 0 - DAY\n\nALICE\nShe found the documents early this morning.\n\nBOB\nWe should leave before they close the gate.\n\nALICE\nThe report has arrived from the main office.\n\nBOB\nAll the files are ready for the final review.\n`,
        `INT. SCENE 1 - DAY\n\nALICE\nThey will make their decision very soon now.\n\nBOB\nThe meeting seemed quite productive for us.\n\nALICE\nEveryone appeared to be satisfied with this.\n\nBOB\nThe outcome was better than we had expected.\n`,
        `INT. SCENE 2 - DAY\n\nALICE\nMaybe we should consider another option here.\n\nBOB\nI think perhaps we need to try another way.\n\nALICE\nI suppose this could possibly work out well.\n\nBOB\nMaybe there is another path we have not tried.\n`,
        `INT. SCENE 3 - DAY\n\nALICE\nI guess we could try yet another approach here.\n\nBOB\nKind of hard to know what direction to choose.\n\nALICE\nPerhaps the other option would have been fine.\n\nBOB\nI think maybe this is the right thing to do.\n`,
      ].join('\n');
      const res = await runD588(f588c, []);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_HEDGE_BACK_LOADED'), 'DIALOGUE_HEDGE_BACK_LOADED should fire');
    });

    // DIALOGUE_HEDGE_BACK_LOADED no-fire:
    // first half has 2 hedge lines (> 1 limit) → does not fire
    it('DIALOGUE_HEDGE_BACK_LOADED does not fire when the first half has more than one hedge line', async () => {
      const f588cn = [
        `INT. SCENE 0 - DAY\n\nALICE\nMaybe she found the documents this morning.\n\nBOB\nWe should probably leave before they close.\n\nALICE\nThe report has arrived from the main office.\n\nBOB\nAll the files are ready for the final review.\n`,
        `INT. SCENE 1 - DAY\n\nALICE\nThey will make their decision very soon now.\n\nBOB\nThe meeting seemed quite productive for us.\n\nALICE\nEveryone appeared to be satisfied with this.\n\nBOB\nThe outcome was better than we had expected.\n`,
        `INT. SCENE 2 - DAY\n\nALICE\nMaybe we should consider another option here.\n\nBOB\nI think perhaps we need to try another way.\n\nALICE\nI suppose this could possibly work out well.\n\nBOB\nMaybe there is another path we have not tried.\n`,
        `INT. SCENE 3 - DAY\n\nALICE\nI guess we could try yet another approach here.\n\nBOB\nKind of hard to know what direction to choose.\n\nALICE\nPerhaps the other option would have been fine.\n\nBOB\nI think maybe this is the right thing to do.\n`,
      ].join('\n');
      const res = await runD588(f588cn, []);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_HEDGE_BACK_LOADED'), 'DIALOGUE_HEDGE_BACK_LOADED should not fire');
    });
  });


  describe('Wave 574 — dialoguePass: clock peak silent, sparse run, negation back-loaded', async () => {
    const makeRec574 = (sceneIdx: number, extra: Record<string, any> = {}): any => ({
      sceneIdx, suspenseDelta: 0, curiosityDelta: 0, clockRaised: false, clockDelta: 0,
      revelation: null, dramaticTurn: 'nothing', payoffSetupIds: [], relationshipShifts: [],
      emotionalShift: 'neutral', seededClueIds: [], dialogueHighlights: [], unresolvedClues: [],
      purpose: '', slug: `s${sceneIdx}`, ...extra,
    });
    const runD574 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };
    const buildScenes574 = (count: number, dlgFn: (i: number) => number): string => {
      let f = '';
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${i} - DAY\n\n`;
        const n = dlgFn(i);
        for (let j = 0; j < n; j++) {
          f += j % 2 === 0
            ? `ALICE\nShe found the documents early this morning.\n\n`
            : `BOB\nWe should leave before they close the gate.\n\n`;
        }
        if (n === 0) f += `The door crashes open. A figure steps from the dark.\n\n`;
      }
      return f;
    };

    it('DIALOGUE_CLOCK_PEAK_SILENT fires when peak-clockDelta scene has no dialogue while other clock scene does', async () => {
      // n=10; clockDelta>0 at pos 2 (delta=1, has dlg) and pos 5 (delta=3, no dlg — peak)
      const f574a = buildScenes574(10, i => i === 5 ? 0 : 2);
      const recs574a = Array.from({ length: 10 }, (_, i) => makeRec574(i, {
        clockDelta: i === 2 ? 1 : i === 5 ? 3 : 0,
      }));
      const res = await runD574(f574a, recs574a);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_CLOCK_PEAK_SILENT'), 'DIALOGUE_CLOCK_PEAK_SILENT should fire');
    });

    it('DIALOGUE_CLOCK_PEAK_SILENT does not fire when peak-clockDelta scene has dialogue', async () => {
      // peak clockDelta at pos 5 (delta=3, HAS dlg), other clock at pos 2 (delta=1, no dlg)
      const f574anr = buildScenes574(10, i => i === 2 ? 0 : 2);
      const recs574anr = Array.from({ length: 10 }, (_, i) => makeRec574(i, {
        clockDelta: i === 2 ? 1 : i === 5 ? 3 : 0,
      }));
      const res = await runD574(f574anr, recs574anr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_CLOCK_PEAK_SILENT'), 'DIALOGUE_CLOCK_PEAK_SILENT should not fire');
    });

    it('DIALOGUE_SPARSE_RUN fires when ≥4 consecutive scenes each have ≤1 dialogue line', async () => {
      // n=10; scenes 2,3,4,5 have 1 line (sparse); others have 3 lines → run=4 → fires
      const f574b = buildScenes574(10, i => [2, 3, 4, 5].includes(i) ? 1 : 3);
      const recs574b = Array.from({ length: 10 }, (_, i) => makeRec574(i));
      const res = await runD574(f574b, recs574b);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_SPARSE_RUN'), 'DIALOGUE_SPARSE_RUN should fire');
    });

    it('DIALOGUE_SPARSE_RUN does not fire when all scenes have ≥2 dialogue lines', async () => {
      // n=10; all scenes have 3 dialogue lines → no sparse run
      const f574bnr = buildScenes574(10, _ => 3);
      const recs574bnr = Array.from({ length: 10 }, (_, i) => makeRec574(i));
      const res = await runD574(f574bnr, recs574bnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_SPARSE_RUN'), 'DIALOGUE_SPARSE_RUN should not fire');
    });

    it('DIALOGUE_NEGATION_BACK_LOADED fires when >75% of negation lines are in the second half', async () => {
      // 8 dialogue lines total; first half (0-3): no negation; second half (4-7): 4 negation lines
      const f574c = [
        `INT. SCENE 0 - DAY\n\nALICE\nShe found the documents early this morning.\n\nBOB\nLet us continue with the plan as discussed.\n`,
        `INT. SCENE 1 - DAY\n\nALICE\nThe meeting seemed quite successful overall.\n\nBOB\nEveryone appeared to be happy with the outcome.\n`,
        `INT. SCENE 2 - DAY\n\nALICE\nNo, we cannot stay here any longer.\n\nBOB\nShe never expected this to happen at all.\n`,
        `INT. SCENE 3 - DAY\n\nALICE\nI can't believe what they did to us here.\n\nBOB\nNothing makes any sense to me right now.\n`,
      ].join('\n');
      const res = await runD574(f574c, []);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_NEGATION_BACK_LOADED'), 'DIALOGUE_NEGATION_BACK_LOADED should fire');
    });

    it('DIALOGUE_NEGATION_BACK_LOADED does not fire when negation is distributed across both halves', async () => {
      // 8 dialogue lines; 2 negation in first half + 2 negation in second half → 50% < 75%
      const f574cnr = [
        `INT. SCENE 0 - DAY\n\nALICE\nNo, she cannot do that now at all.\n\nBOB\nLet us continue with the usual plan.\n`,
        `INT. SCENE 1 - DAY\n\nALICE\nNothing makes sense to her today.\n\nBOB\nEveryone appeared to be pleased overall.\n`,
        `INT. SCENE 2 - DAY\n\nALICE\nThe meeting seemed quite successful.\n\nBOB\nShe never expected this to happen.\n`,
        `INT. SCENE 3 - DAY\n\nALICE\nI can't believe what they decided here.\n\nBOB\nLet us proceed as we had discussed.\n`,
      ].join('\n');
      const res = await runD574(f574cnr, []);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_NEGATION_BACK_LOADED'), 'DIALOGUE_NEGATION_BACK_LOADED should not fire');
    });
  });


  describe('Wave 560 — dialoguePass: clock aftermath silent, seed aftermath silent, relationship shift aftermath silent', async () => {
    const makeRec560 = (sceneIdx: number, extra: Record<string, any> = {}): any => ({
      sceneIdx, suspenseDelta: 0, curiosityDelta: 0, clockRaised: false,
      revelation: null, dramaticTurn: 'nothing', payoffSetupIds: [], relationshipShifts: [],
      emotionalShift: 'neutral', seededClueIds: [], dialogueHighlights: [], unresolvedClues: [],
      purpose: '', slug: `s${sceneIdx}`, ...extra,
    });
    const runD560 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };
    // Build n scenes; dlgFn(i) returns number of speaker-line pairs; 0 = silent action-only scene
    const buildScenes560 = (count: number, dlgFn: (i: number) => number): string => {
      let f = '';
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${i} - DAY\n\n`;
        const n = dlgFn(i);
        for (let j = 0; j < n; j++) {
          f += j % 2 === 0
            ? `ALICE\nShe found the documents early this morning.\n\n`
            : `BOB\nWe should leave before they close the gate.\n\n`;
        }
        if (n === 0) f += `The door crashes open. A figure steps from the dark.\n\n`;
      }
      return f;
    };

    // DIALOGUE_CLOCK_AFTERMATH_SILENT fire:
    // n=10; clocks at pos 2,5 (clockRaised=true, pos<9); next scenes 3,6 have no dialogue;
    // other scenes have 2 lines each; scenesWithDlg≥3 → fires
    it('DIALOGUE_CLOCK_AFTERMATH_SILENT fires when all clock-raise scenes are followed by silent scenes', async () => {
      const f560a = buildScenes560(10, i => [3, 6].includes(i) ? 0 : 2);
      const recs560a = Array.from({ length: 10 }, (_, i) =>
        makeRec560(i, { clockRaised: [2, 5].includes(i) }));
      const res = await runD560(f560a, recs560a);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_CLOCK_AFTERMATH_SILENT'), 'DIALOGUE_CLOCK_AFTERMATH_SILENT should fire');
    });

    // DIALOGUE_CLOCK_AFTERMATH_SILENT no-fire:
    // scene 3 (after clock at 2) HAS dialogue → anyClockAftermath=true → no fire
    it('DIALOGUE_CLOCK_AFTERMATH_SILENT does not fire when a clock-raise is followed by a scene with dialogue', async () => {
      const f560anr = buildScenes560(10, i => i === 6 ? 0 : 2);
      const recs560anr = Array.from({ length: 10 }, (_, i) =>
        makeRec560(i, { clockRaised: [2, 5].includes(i) }));
      const res = await runD560(f560anr, recs560anr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_CLOCK_AFTERMATH_SILENT'), 'DIALOGUE_CLOCK_AFTERMATH_SILENT should not fire');
    });

    // DIALOGUE_SEED_AFTERMATH_SILENT fire:
    // n=10; seeds at pos 2,5; next scenes 3,6 have no dialogue; other scenes have 2 lines → fires
    it('DIALOGUE_SEED_AFTERMATH_SILENT fires when all seed scenes are followed by silent scenes', async () => {
      const f560b = buildScenes560(10, i => [3, 6].includes(i) ? 0 : 2);
      const recs560b = Array.from({ length: 10 }, (_, i) =>
        makeRec560(i, { seededClueIds: [2, 5].includes(i) ? ['clue-A'] : [] }));
      const res = await runD560(f560b, recs560b);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_SEED_AFTERMATH_SILENT'), 'DIALOGUE_SEED_AFTERMATH_SILENT should fire');
    });

    // DIALOGUE_SEED_AFTERMATH_SILENT no-fire:
    // scene 3 (after seed at 2) HAS dialogue → no fire
    it('DIALOGUE_SEED_AFTERMATH_SILENT does not fire when a seed scene is followed by a scene with dialogue', async () => {
      const f560bnr = buildScenes560(10, i => i === 6 ? 0 : 2);
      const recs560bnr = Array.from({ length: 10 }, (_, i) =>
        makeRec560(i, { seededClueIds: [2, 5].includes(i) ? ['clue-A'] : [] }));
      const res = await runD560(f560bnr, recs560bnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_SEED_AFTERMATH_SILENT'), 'DIALOGUE_SEED_AFTERMATH_SILENT should not fire');
    });

    // DIALOGUE_RELATIONSHIP_SHIFT_AFTERMATH_SILENT fire:
    // n=10; relShifts at pos 2,5; next scenes 3,6 have no dialogue; other scenes have 2 lines → fires
    it('DIALOGUE_RELATIONSHIP_SHIFT_AFTERMATH_SILENT fires when all relationship-shift scenes are followed by silent scenes', async () => {
      const f560c = buildScenes560(10, i => [3, 6].includes(i) ? 0 : 2);
      const recs560c = Array.from({ length: 10 }, (_, i) =>
        makeRec560(i, { relationshipShifts: [2, 5].includes(i) ? [{ pairKey: 'A-B', dimension: 'trust', amount: 1 }] : [] }));
      const res = await runD560(f560c, recs560c);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_RELATIONSHIP_SHIFT_AFTERMATH_SILENT'), 'DIALOGUE_RELATIONSHIP_SHIFT_AFTERMATH_SILENT should fire');
    });

    // DIALOGUE_RELATIONSHIP_SHIFT_AFTERMATH_SILENT no-fire:
    // scene 3 (after relShift at 2) HAS dialogue → no fire
    it('DIALOGUE_RELATIONSHIP_SHIFT_AFTERMATH_SILENT does not fire when a relationship-shift is followed by a scene with dialogue', async () => {
      const f560cnr = buildScenes560(10, i => i === 6 ? 0 : 2);
      const recs560cnr = Array.from({ length: 10 }, (_, i) =>
        makeRec560(i, { relationshipShifts: [2, 5].includes(i) ? [{ pairKey: 'A-B', dimension: 'trust', amount: 1 }] : [] }));
      const res = await runD560(f560cnr, recs560cnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_RELATIONSHIP_SHIFT_AFTERMATH_SILENT'), 'DIALOGUE_RELATIONSHIP_SHIFT_AFTERMATH_SILENT should not fire');
    });
  });


  describe('Wave 546 — dialoguePass: relationship peak silent, negation front-loaded, suspense aftermath silent', async () => {
    const makeRec546 = (sceneIdx: number, extra: Record<string, any> = {}): any => ({
      sceneIdx, suspenseDelta: 0, curiosityDelta: 0, clockRaised: false,
      revelation: null, dramaticTurn: 'nothing', payoffSetupIds: [], relationshipShifts: [],
      emotionalShift: 'neutral', seededClueIds: [], dialogueHighlights: [], unresolvedClues: [],
      purpose: '', slug: `s${sceneIdx}`, ...extra,
    });
    const runD546 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };
    // 8 scenes; dlgFn returns number of dialogue lines per scene i
    const build546 = (count: number, dlgFn: (i: number) => number): string => {
      let f = '';
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${i} - DAY\n\n`;
        const n = dlgFn(i);
        for (let j = 0; j < n; j++) {
          f += j % 2 === 0
            ? `ALICE\nShe found the documents this morning.\n\n`
            : `BOB\nWe should leave before they close the gate.\n\n`;
        }
        if (n === 0) f += `The door crashes open and a figure steps in.\n\n`;
      }
      return f;
    };

    // DIALOGUE_RELATIONSHIP_PEAK_SILENT fire:
    // 8 scenes; scene 3 (pos=3≥2) has relShift amount=0.8 (peak) with NO dialogue;
    // scene 1 has relShift amount=0.3 and HAS dialogue; ≥3 dialogue scenes total → fires
    it('DIALOGUE_RELATIONSHIP_PEAK_SILENT fires when the peak relationship-shift scene has no dialogue', async () => {
      const f546a = build546(8, i => i === 3 ? 0 : 2);
      const recs546a = Array.from({ length: 8 }, (_, i) =>
        makeRec546(i, {
          relationshipShifts: i === 1
            ? [{ pairKey: 'A|B', dimension: 'trust', amount: 0.3 }]
            : i === 3
              ? [{ pairKey: 'A|B', dimension: 'trust', amount: 0.8 }]
              : [],
        }),
      );
      const res = await runD546(f546a, recs546a);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_RELATIONSHIP_PEAK_SILENT'), 'DIALOGUE_RELATIONSHIP_PEAK_SILENT should fire');
    });

    // DIALOGUE_RELATIONSHIP_PEAK_SILENT no-fire:
    // same records but scene 3 (peak) now HAS dialogue → no fire
    it('DIALOGUE_RELATIONSHIP_PEAK_SILENT does not fire when the peak relationship-shift scene has dialogue', async () => {
      const f546anr = build546(8, _ => 2); // all scenes have dialogue
      const recs546anr = Array.from({ length: 8 }, (_, i) =>
        makeRec546(i, {
          relationshipShifts: i === 1
            ? [{ pairKey: 'A|B', dimension: 'trust', amount: 0.3 }]
            : i === 3
              ? [{ pairKey: 'A|B', dimension: 'trust', amount: 0.8 }]
              : [],
        }),
      );
      const res = await runD546(f546anr, recs546anr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_RELATIONSHIP_PEAK_SILENT'), 'DIALOGUE_RELATIONSHIP_PEAK_SILENT should not fire');
    });

    // DIALOGUE_NEGATION_FRONT_LOADED fire:
    // 10 dialogue lines; first 4 contain negation words; all 4 in first half (0-4)
    // 4/4 = 100% > 75% → fires
    it('DIALOGUE_NEGATION_FRONT_LOADED fires when more than 75% of negation lines are in the first half', async () => {
      const f546b = [
        'INT. SCENE 0 - DAY', '',
        'ALICE', 'No, that is not going to happen here.', '',
        'BOB', 'Never mind, I will not try again.', '',
        'ALICE', 'Nothing will work if we do not proceed.', '',
        'BOB', 'That cannot be the right approach.', '',
        'ALICE', 'We should move forward together though.', '',
        'BOB', 'The plan makes sense for everyone here.', '',
        'ALICE', 'Let us try the approach this time.', '',
        'BOB', 'I understand what you mean exactly.', '',
        'ALICE', 'Let us get started on this right away.', '',
        'BOB', 'Everything looks good to me today.',
      ].join('\n');
      const res = await runD546(f546b);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_NEGATION_FRONT_LOADED'), 'DIALOGUE_NEGATION_FRONT_LOADED should fire');
    });

    // DIALOGUE_NEGATION_FRONT_LOADED no-fire:
    // negation at lines 0,1,7,8 → first half (0-4): 2 of 4 = 50% ≤ 75% → no fire
    it('DIALOGUE_NEGATION_FRONT_LOADED does not fire when negation is not concentrated in the first half', async () => {
      const f546bnr = [
        'INT. SCENE 0 - DAY', '',
        'ALICE', 'No, I cannot do that right now.', '',
        'BOB', 'That will never work out for us.', '',
        'ALICE', 'We should move forward together.', '',
        'BOB', 'The plan makes sense for everyone.', '',
        'ALICE', 'Let us try a new approach here.', '',
        'BOB', 'I understand the situation fully.', '',
        'ALICE', 'Nothing is going the right way now.', '',
        'BOB', 'That is not working out at all.', '',
        'ALICE', 'Let us get this finished today.', '',
        'BOB', 'Everything looks fine to me now.',
      ].join('\n');
      const res = await runD546(f546bnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_NEGATION_FRONT_LOADED'), 'DIALOGUE_NEGATION_FRONT_LOADED should not fire');
    });

    // DIALOGUE_SUSPENSE_AFTERMATH_SILENT fire:
    // n=10; suspense at i=2,5 (pos<9); scenes 3,6 (following) have no dialogue; ≥3 with dialogue → fires
    it('DIALOGUE_SUSPENSE_AFTERMATH_SILENT fires when all suspense-spike scenes are followed by silent scenes', async () => {
      const f546c = build546(10, i => [3, 6].includes(i) ? 0 : 2);
      const recs546c = Array.from({ length: 10 }, (_, i) =>
        makeRec546(i, { suspenseDelta: [2, 5].includes(i) ? 1 : 0 }),
      );
      const res = await runD546(f546c, recs546c);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_SUSPENSE_AFTERMATH_SILENT'), 'DIALOGUE_SUSPENSE_AFTERMATH_SILENT should fire');
    });

    // DIALOGUE_SUSPENSE_AFTERMATH_SILENT no-fire:
    // scene 3 (after spike at 2) HAS dialogue → anyFollowedByDlg=true → no fire
    it('DIALOGUE_SUSPENSE_AFTERMATH_SILENT does not fire when a suspense-spike is followed by a dialogue scene', async () => {
      const f546cnr = build546(10, i => i === 6 ? 0 : 2);
      const recs546cnr = Array.from({ length: 10 }, (_, i) =>
        makeRec546(i, { suspenseDelta: [2, 5].includes(i) ? 1 : 0 }),
      );
      const res = await runD546(f546cnr, recs546cnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_SUSPENSE_AFTERMATH_SILENT'), 'DIALOGUE_SUSPENSE_AFTERMATH_SILENT should not fire');
    });
  });


  describe('Wave 532 — dialoguePass: dramatic-turn aftermath silent, payoff aftermath silent, middle zone silent', async () => {
    const makeRec532 = (sceneIdx: number, extra: Record<string, any> = {}): any => ({
      sceneIdx, suspenseDelta: 0, curiosityDelta: 0, clockRaised: false,
      revelation: null, dramaticTurn: 'nothing', payoffSetupIds: [], relationshipShifts: [],
      emotionalShift: 'neutral', seededClueIds: [], dialogueHighlights: [], unresolvedClues: [],
      purpose: '', slug: `s${sceneIdx}`, ...extra,
    });
    const runD532 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };
    // Build n scenes; dlgFn(i) returns number of dialogue lines for scene i
    const buildScenes532 = (count: number, dlgFn: (i: number) => number): string => {
      let f = '';
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${i} - DAY\n\n`;
        const n = dlgFn(i);
        for (let j = 0; j < n; j++) {
          f += j % 2 === 0
            ? `ALICE\nShe found the documents early this morning.\n\n`
            : `BOB\nWe should leave before they close the gate.\n\n`;
        }
        if (n === 0) f += `The door crashes open. A figure steps from the dark.\n\n`;
      }
      return f;
    };

    it('DIALOGUE_DRAMATIC_TURN_AFTERMATH_SILENT fires when all dramatic-turn aftermaths have no dialogue', async () => {
      // n=10; dramatic turns at pos 2,5 (not at last pos 9);
      // following scenes (pos 3,6) have no dialogue; other scenes (0,1,4,7,8,9) have dialogue → fires
      const f532a = buildScenes532(10, i => [3, 6].includes(i) ? 0 : 2);
      const recs532a = Array.from({ length: 10 }, (_, i) =>
        makeRec532(i, [2, 5].includes(i) ? { dramaticTurn: 'reversal' } : {})
      );
      const res = await runD532(f532a, recs532a);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_DRAMATIC_TURN_AFTERMATH_SILENT'), 'DIALOGUE_DRAMATIC_TURN_AFTERMATH_SILENT should fire');
    });

    it('DIALOGUE_DRAMATIC_TURN_AFTERMATH_SILENT does not fire when a dramatic-turn aftermath has dialogue', async () => {
      // Same but scene 3 (after turn at 2) now has dialogue → anyTurnAftermathHasDlg=true → no fire
      const f532anr = buildScenes532(10, i => i === 6 ? 0 : 2);
      const recs532anr = Array.from({ length: 10 }, (_, i) =>
        makeRec532(i, [2, 5].includes(i) ? { dramaticTurn: 'reversal' } : {})
      );
      const res = await runD532(f532anr, recs532anr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_DRAMATIC_TURN_AFTERMATH_SILENT'), 'DIALOGUE_DRAMATIC_TURN_AFTERMATH_SILENT should not fire');
    });

    it('DIALOGUE_PAYOFF_AFTERMATH_SILENT fires when all payoff aftermaths have no dialogue', async () => {
      // n=10; payoffs at pos 2,5 (not at last pos 9);
      // following scenes (pos 3,6) have no dialogue; other scenes have dialogue → fires
      const f532b = buildScenes532(10, i => [3, 6].includes(i) ? 0 : 2);
      const recs532b = Array.from({ length: 10 }, (_, i) =>
        makeRec532(i, [2, 5].includes(i) ? { payoffSetupIds: ['setup-A'] } : {})
      );
      const res = await runD532(f532b, recs532b);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_PAYOFF_AFTERMATH_SILENT'), 'DIALOGUE_PAYOFF_AFTERMATH_SILENT should fire');
    });

    it('DIALOGUE_PAYOFF_AFTERMATH_SILENT does not fire when a payoff aftermath has dialogue', async () => {
      // Same but scene 3 (after payoff at 2) now has dialogue → anyPayoffAftermathHasDlg=true → no fire
      const f532bnr = buildScenes532(10, i => i === 6 ? 0 : 2);
      const recs532bnr = Array.from({ length: 10 }, (_, i) =>
        makeRec532(i, [2, 5].includes(i) ? { payoffSetupIds: ['setup-A'] } : {})
      );
      const res = await runD532(f532bnr, recs532bnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_PAYOFF_AFTERMATH_SILENT'), 'DIALOGUE_PAYOFF_AFTERMATH_SILENT should not fire');
    });

    it('DIALOGUE_MIDDLE_ZONE_SILENT fires when middle third has no dialogue while opening and closing do', async () => {
      // n=9, third=3: opening pos 0-2, middle pos 3-5, closing pos 6-8
      // dialogue at pos 0,1 (opening) and pos 6,7 (closing); NO dialogue at pos 3,4,5 (middle)
      // scenesWithDlg=4 ≥ 4; openHasDlg=true, middleHasDlg=false, closeHasDlg=true → fires
      const f532c = buildScenes532(9, i => ([0, 1, 6, 7].includes(i) ? 2 : 0));
      const recs532c = Array.from({ length: 9 }, (_, i) => makeRec532(i));
      const res = await runD532(f532c, recs532c);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_MIDDLE_ZONE_SILENT'), 'DIALOGUE_MIDDLE_ZONE_SILENT should fire');
    });

    it('DIALOGUE_MIDDLE_ZONE_SILENT does not fire when middle third has at least one dialogue scene', async () => {
      // n=9; same setup but pos 4 (middle third) now has dialogue → middleHasDlg=true → no fire
      const f532cnr = buildScenes532(9, i => ([0, 1, 4, 6, 7].includes(i) ? 2 : 0));
      const recs532cnr = Array.from({ length: 9 }, (_, i) => makeRec532(i));
      const res = await runD532(f532cnr, recs532cnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_MIDDLE_ZONE_SILENT'), 'DIALOGUE_MIDDLE_ZONE_SILENT should not fire');
    });
  });


  describe('Wave 518 — dialoguePass: seed scene dialogue absent, relationship shift scene dialogue absent, revelation aftermath silent', async () => {
    const makeRec518 = (sceneIdx: number, extra: Record<string, any> = {}): any => ({
      sceneIdx, suspenseDelta: 0, curiosityDelta: 0, clockRaised: false,
      revelation: null, dramaticTurn: 'nothing', payoffSetupIds: [], relationshipShifts: [],
      emotionalShift: 'neutral', seededClueIds: [], dialogueHighlights: [], unresolvedClues: [],
      purpose: '', slug: `s${sceneIdx}`, ...extra,
    });
    const runD518 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };
    // Build n scenes; dlgFn(i) returns number of dialogue line-pairs for scene i
    const buildScenes518 = (count: number, dlgFn: (i: number) => number): string => {
      let f = '';
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${i} - DAY\n\n`;
        const n = dlgFn(i);
        for (let j = 0; j < n; j++) {
          f += j % 2 === 0
            ? `ALICE\nShe found the documents early this morning.\n\n`
            : `BOB\nWe should leave before they close the gate.\n\n`;
        }
        if (n === 0) f += `The door crashes open. A figure steps from the dark.\n\n`;
      }
      return f;
    };

    it('SEED_SCENE_DIALOGUE_ABSENT fires when all seed scenes have no dialogue', async () => {
      // n=10; seeds at sceneIdx 2,5 (no dialogue); other scenes (0,1,3,4,6,7,8,9) have 2 lines → fire
      const f518a = buildScenes518(10, i => [2, 5].includes(i) ? 0 : 2);
      const recs518a = Array.from({ length: 10 }, (_, i) =>
        makeRec518(i, [2, 5].includes(i) ? { seededClueIds: ['clue-A'] } : {}));
      const res = await runD518(f518a, recs518a);
      assert.ok(res.issues.some((is: any) => is.rule === 'SEED_SCENE_DIALOGUE_ABSENT'), 'SEED_SCENE_DIALOGUE_ABSENT should fire');
    });

    it('SEED_SCENE_DIALOGUE_ABSENT does not fire when a seed scene has dialogue', async () => {
      // Same but sceneIdx 2 (seed) now has 2 dialogue lines → not all seeds silent → no fire
      const f518anr = buildScenes518(10, i => i === 5 ? 0 : 2);
      const recs518anr = Array.from({ length: 10 }, (_, i) =>
        makeRec518(i, [2, 5].includes(i) ? { seededClueIds: ['clue-A'] } : {}));
      const res = await runD518(f518anr, recs518anr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'SEED_SCENE_DIALOGUE_ABSENT'), 'SEED_SCENE_DIALOGUE_ABSENT should not fire');
    });

    it('RELATIONSHIP_SHIFT_SCENE_DIALOGUE_ABSENT fires when all relationship-shift scenes have no dialogue', async () => {
      // n=10; rel-shift scenes at sceneIdx 2,5 (no dialogue); others have 2 lines → fire
      const f518b = buildScenes518(10, i => [2, 5].includes(i) ? 0 : 2);
      const recs518b = Array.from({ length: 10 }, (_, i) =>
        makeRec518(i, [2, 5].includes(i) ? { relationshipShifts: [{ from: 'A', to: 'B', delta: 1 }] } : {}));
      const res = await runD518(f518b, recs518b);
      assert.ok(res.issues.some((is: any) => is.rule === 'RELATIONSHIP_SHIFT_SCENE_DIALOGUE_ABSENT'), 'RELATIONSHIP_SHIFT_SCENE_DIALOGUE_ABSENT should fire');
    });

    it('RELATIONSHIP_SHIFT_SCENE_DIALOGUE_ABSENT does not fire when a relationship-shift scene has dialogue', async () => {
      // Same but sceneIdx 2 (rel-shift) now has dialogue → not all silent → no fire
      const f518bnr = buildScenes518(10, i => i === 5 ? 0 : 2);
      const recs518bnr = Array.from({ length: 10 }, (_, i) =>
        makeRec518(i, [2, 5].includes(i) ? { relationshipShifts: [{ from: 'A', to: 'B', delta: 1 }] } : {}));
      const res = await runD518(f518bnr, recs518bnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'RELATIONSHIP_SHIFT_SCENE_DIALOGUE_ABSENT'), 'RELATIONSHIP_SHIFT_SCENE_DIALOGUE_ABSENT should not fire');
    });

    it('DIALOGUE_REVELATION_AFTERMATH_SILENT fires when no revelation is followed by a scene with dialogue', async () => {
      // n=10; revelations at pos 2,5; next scenes (3,6) have no dialogue; other scenes have 2 lines → fire
      const f518c = buildScenes518(10, i => [3, 6].includes(i) ? 0 : 2);
      const recs518c = Array.from({ length: 10 }, (_, i) =>
        makeRec518(i, [2, 5].includes(i) ? { revelation: 'Truth revealed.' } : {}));
      const res = await runD518(f518c, recs518c);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_REVELATION_AFTERMATH_SILENT'), 'DIALOGUE_REVELATION_AFTERMATH_SILENT should fire');
    });

    it('DIALOGUE_REVELATION_AFTERMATH_SILENT does not fire when a revelation is followed by a scene with dialogue', async () => {
      // Same but scene 3 (after revelation at 2) has dialogue → anyRevAftermath=true → no fire
      const f518cnr = buildScenes518(10, i => i === 6 ? 0 : 2);
      const recs518cnr = Array.from({ length: 10 }, (_, i) =>
        makeRec518(i, [2, 5].includes(i) ? { revelation: 'Truth revealed.' } : {}));
      const res = await runD518(f518cnr, recs518cnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_REVELATION_AFTERMATH_SILENT'), 'DIALOGUE_REVELATION_AFTERMATH_SILENT should not fire');
    });
  });


  describe('Wave 504 — dialoguePass: dialogue silence run, dialogue density front heavy, payoff scene dialogue absent', async () => {
    const makeRec504 = (sceneIdx: number, extra: Record<string, any> = {}): any => ({
      sceneIdx, suspenseDelta: 0, curiosityDelta: 0, clockRaised: false,
      revelation: null, dramaticTurn: 'nothing', payoffSetupIds: [], relationshipShifts: [],
      emotionalShift: 'neutral', seededClueIds: [], dialogueHighlights: [], unresolvedClues: [],
      purpose: '', slug: `s${sceneIdx}`, ...extra,
    });
    const runD504 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };
    // Build n scenes; dlgFn(i) returns number of dialogue line-pairs to emit for scene i
    const buildScenes504 = (count: number, dlgFn: (i: number) => number): string => {
      let f = '';
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${i} - DAY\n\n`;
        const n = dlgFn(i);
        for (let j = 0; j < n; j++) {
          f += j % 2 === 0
            ? `ALICE\nShe found the documents early this morning.\n\n`
            : `BOB\nWe should leave before they close the gate.\n\n`;
        }
        if (n === 0) f += `The door crashes open. A figure steps from the dark.\n\n`;
      }
      return f;
    };

    it('DIALOGUE_SILENCE_RUN fires when 3+ consecutive scenes have no dialogue', async () => {
      // n=10; dialogue at 0,1,2,7 (4 scenes with dlg ≥ 4); silence at 3,4,5 → run=3 ≥ 3 → fire
      const f504a = buildScenes504(10, i => [0, 1, 2, 7].includes(i) ? 2 : 0);
      const recs504a = Array.from({ length: 10 }, (_, i) => makeRec504(i));
      const res = await runD504(f504a, recs504a);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_SILENCE_RUN'), 'DIALOGUE_SILENCE_RUN should fire');
    });

    it('DIALOGUE_SILENCE_RUN does not fire when no consecutive silent run reaches 3', async () => {
      // n=10; dialogue at 0,1,2,4,6,8 (6 scenes); silence at 3,5,7,9 → max run=1 < 3 → no fire
      const f504anr = buildScenes504(10, i => [0, 1, 2, 4, 6, 8].includes(i) ? 2 : 0);
      const recs504anr = Array.from({ length: 10 }, (_, i) => makeRec504(i));
      const res = await runD504(f504anr, recs504anr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_SILENCE_RUN'), 'DIALOGUE_SILENCE_RUN should not fire');
    });

    it('DIALOGUE_DENSITY_FRONT_HEAVY fires when first-half density is >= 2x the second-half density', async () => {
      // n=10; half=5; first half (0-4) each 4 lines → avg=4.0; second half (5-9) each 1 line → avg=1.0
      // 4.0 >= 1.0 AND 4.0 >= 2*1.0=2.0 → fire; total dialogue scenes=10 >= 5
      const f504b = buildScenes504(10, i => i < 5 ? 4 : 1);
      const recs504b = Array.from({ length: 10 }, (_, i) => makeRec504(i));
      const res = await runD504(f504b, recs504b);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_DENSITY_FRONT_HEAVY'), 'DIALOGUE_DENSITY_FRONT_HEAVY should fire');
    });

    it('DIALOGUE_DENSITY_FRONT_HEAVY does not fire when second-half density is within 2x of first half', async () => {
      // n=10; half=5; first half each 3 lines → avg=3.0; second half each 2 lines → avg=2.0
      // 3.0 >= 1.0 but 3.0 < 2*2.0=4.0 → no fire
      const f504bnr = buildScenes504(10, i => i < 5 ? 3 : 2);
      const recs504bnr = Array.from({ length: 10 }, (_, i) => makeRec504(i));
      const res = await runD504(f504bnr, recs504bnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_DENSITY_FRONT_HEAVY'), 'DIALOGUE_DENSITY_FRONT_HEAVY should not fire');
    });

    it('PAYOFF_SCENE_DIALOGUE_ABSENT fires when all payoff scenes have no dialogue', async () => {
      // n=10; payoff at sceneIdx 3,6 (no dialogue there); scenes 0,1,2,4,5,7 have 2 lines each
      // payoffScenes=2 >= 2; scenesWithDlg=6 >= 3; all payoffs silent → fire
      const f504c = buildScenes504(10, i => [3, 6].includes(i) ? 0 : 2);
      const recs504c = Array.from({ length: 10 }, (_, i) =>
        makeRec504(i, [3, 6].includes(i) ? { payoffSetupIds: ['setup-X'] } : {}));
      const res = await runD504(f504c, recs504c);
      assert.ok(res.issues.some((is: any) => is.rule === 'PAYOFF_SCENE_DIALOGUE_ABSENT'), 'PAYOFF_SCENE_DIALOGUE_ABSENT should fire');
    });

    it('PAYOFF_SCENE_DIALOGUE_ABSENT does not fire when a payoff scene has dialogue', async () => {
      // Same but scene 3 (payoff) now has 2 dialogue lines → not all payoffs silent → no fire
      const f504cnr = buildScenes504(10, i => i === 6 ? 0 : 2);
      const recs504cnr = Array.from({ length: 10 }, (_, i) =>
        makeRec504(i, [3, 6].includes(i) ? { payoffSetupIds: ['setup-X'] } : {}));
      const res = await runD504(f504cnr, recs504cnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'PAYOFF_SCENE_DIALOGUE_ABSENT'), 'PAYOFF_SCENE_DIALOGUE_ABSENT should not fire');
    });
  });


  describe('Wave 490 — dialoguePass: dialogue verbal peak uncaused, dialogue negative scene void, dialogue scene temporal cluster', async () => {
    const makeRec490 = (sceneIdx: number, extra: Record<string, any> = {}): any => ({
      sceneIdx, suspenseDelta: 0, curiosityDelta: 0, clockRaised: false,
      revelation: null, dramaticTurn: 'nothing', payoffSetupIds: [], relationshipShifts: [],
      emotionalShift: 'neutral', seededClueIds: [], dialogueHighlights: [], unresolvedClues: [],
      purpose: '', slug: `s${sceneIdx}`, ...extra,
    });
    const runD490 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };
    // Build fountain with per-scene dialogue line counts; dlgFn(i) returns number of dialogue lines
    const buildScenes490 = (count: number, dlgFn: (i: number) => number): string => {
      let f = '';
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${i} - DAY\n\n`;
        const n = dlgFn(i);
        for (let j = 0; j < n; j++) {
          f += j % 2 === 0 ? `ALICE\nShe found the documents this morning.\n\n` : `BOB\nWe leave before the gate closes tonight.\n\n`;
        }
        if (n === 0) f += `The door crashes open. A figure steps from the dark.\n\n`;
      }
      return f;
    };

    it('DIALOGUE_VERBAL_PEAK_UNCAUSED fires when peak-dialogue scene has no prior causal driver', async () => {
      // n=8; scene 4 has 6 dialogue lines (peak); all others have 2; records[2] and [3] are flat
      const f490a = buildScenes490(8, i => i === 4 ? 6 : 2);
      const recs490a = Array.from({ length: 8 }, (_, i) => makeRec490(i));
      const res = await runD490(f490a, recs490a);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_VERBAL_PEAK_UNCAUSED'), 'DIALOGUE_VERBAL_PEAK_UNCAUSED should fire');
    });

    it('DIALOGUE_VERBAL_PEAK_UNCAUSED does not fire when prior scene has a structural driver', async () => {
      // Same but rec[3] (just before peak at 4) has suspenseDelta=2 → hasCause=true → no fire
      const f490anr = buildScenes490(8, i => i === 4 ? 6 : 2);
      const recs490anr = Array.from({ length: 8 }, (_, i) => makeRec490(i, i === 3 ? { suspenseDelta: 2 } : {}));
      const res = await runD490(f490anr, recs490anr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_VERBAL_PEAK_UNCAUSED'), 'DIALOGUE_VERBAL_PEAK_UNCAUSED should not fire');
    });

    it('DIALOGUE_NEGATIVE_SCENE_VOID fires when all negative-emotion scenes have no dialogue', async () => {
      // n=8; negative scenes at 1,4 (no dialogue); other 6 scenes have 2 lines each → ≥5 active
      const f490b = buildScenes490(8, i => [1, 4].includes(i) ? 0 : 2);
      const recs490b = Array.from({ length: 8 }, (_, i) =>
        makeRec490(i, [1, 4].includes(i) ? { emotionalShift: 'negative' } : {}));
      const res = await runD490(f490b, recs490b);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_NEGATIVE_SCENE_VOID'), 'DIALOGUE_NEGATIVE_SCENE_VOID should fire');
    });

    it('DIALOGUE_NEGATIVE_SCENE_VOID does not fire when a negative scene carries dialogue', async () => {
      // Scene 1 (negative) now has 2 dialogue lines → not all silent → no fire
      const f490bnr = buildScenes490(8, i => i === 4 ? 0 : 2);
      const recs490bnr = Array.from({ length: 8 }, (_, i) =>
        makeRec490(i, [1, 4].includes(i) ? { emotionalShift: 'negative' } : {}));
      const res = await runD490(f490bnr, recs490bnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_NEGATIVE_SCENE_VOID'), 'DIALOGUE_NEGATIVE_SCENE_VOID should not fire');
    });

    it('DIALOGUE_SCENE_TEMPORAL_CLUSTER fires when >75% of dialogue scenes fall in one third', async () => {
      // n=12; third=4; dialogue scenes at 0,1,2,3 (all in zone1); scenes 4-11 silent → 4/4=100% > 75%
      const f490c = buildScenes490(12, i => i < 4 ? 2 : 0);
      const recs490c = Array.from({ length: 12 }, (_, i) => makeRec490(i));
      const res = await runD490(f490c, recs490c);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_SCENE_TEMPORAL_CLUSTER'), 'DIALOGUE_SCENE_TEMPORAL_CLUSTER should fire');
    });

    it('DIALOGUE_SCENE_TEMPORAL_CLUSTER does not fire when dialogue scenes are distributed across thirds', async () => {
      // n=12; third=4; dialogue at 0 (zone1), 4 (zone2), 8 (zone3), 11 (zone3) → max=2/4=50% ≤ 75%
      const f490cnr = buildScenes490(12, i => [0, 4, 8, 11].includes(i) ? 2 : 0);
      const recs490cnr = Array.from({ length: 12 }, (_, i) => makeRec490(i));
      const res = await runD490(f490cnr, recs490cnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_SCENE_TEMPORAL_CLUSTER'), 'DIALOGUE_SCENE_TEMPORAL_CLUSTER should not fire');
    });
  });


  describe('Wave 476 — dialoguePass: clock scene void, positive scene void, dialogue dense aftermath silent', async () => {
    const makeRec476 = (sceneIdx: number, extra: Record<string, any> = {}): any => ({
      sceneIdx, suspenseDelta: 0, curiosityDelta: 0, clockRaised: false,
      revelation: null, dramaticTurn: 'nothing', payoffSetupIds: [], relationshipShifts: [],
      emotionalShift: 'neutral', seededClueIds: [], dialogueHighlights: [], unresolvedClues: [],
      purpose: '', slug: `s${sceneIdx}`, ...extra,
    });
    const runD476 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };
    // Build n scenes; withDlgFn(i) => true means 2 dialogue lines, false means action only
    const buildScenes476 = (count: number, withDlgFn: (i: number) => boolean): string => {
      let f = '';
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${i} - DAY\n\n`;
        if (withDlgFn(i)) {
          f += `ALICE\nShe found the documents early this morning.\n\nBOB\nWe should leave before they close the gate.\n\n`;
        } else {
          f += `The door crashes open. A figure steps from the dark.\n\n`;
        }
      }
      return f;
    };
    // Build a scene with 3 dialogue lines (for dense scenes)
    const buildDenseScene = (i: number): string =>
      `INT. SCENE ${i} - DAY\n\nALICE\nShe found all the documents this morning.\n\nBOB\nWe need to leave before they close the gate tonight.\n\nALICE\nThen we move as soon as the sun goes down today.\n\n`;
    const buildSilentScene = (i: number): string =>
      `INT. SCENE ${i} - DAY\n\nThe door crashes open. A figure steps from the dark.\n\n`;

    it('DIALOGUE_CLOCK_SCENE_VOID fires when every clockRaised scene has no dialogue', async () => {
      // n=8; clock scenes at 0,3 (both silent); scenes 1,2,4,5,6,7 each have 2 lines → 12 total ≥ 10
      const recs476a = Array.from({ length: 8 }, (_, i) =>
        makeRec476(i, i === 0 || i === 3 ? { clockRaised: true } : {}));
      const f476a = buildScenes476(8, i => i !== 0 && i !== 3);
      const res = await runD476(f476a, recs476a);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_CLOCK_SCENE_VOID'), 'DIALOGUE_CLOCK_SCENE_VOID should fire');
    });

    it('DIALOGUE_CLOCK_SCENE_VOID does not fire when a clockRaised scene carries dialogue', async () => {
      // Same setup but scene 0 (clock) now HAS dialogue → not all clock scenes silent
      const recs476anr = Array.from({ length: 8 }, (_, i) =>
        makeRec476(i, i === 0 || i === 3 ? { clockRaised: true } : {}));
      const f476anr = buildScenes476(8, i => i !== 3);
      const res = await runD476(f476anr, recs476anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_CLOCK_SCENE_VOID'), 'DIALOGUE_CLOCK_SCENE_VOID should not fire');
    });

    it('DIALOGUE_POSITIVE_SCENE_VOID fires when every positive-emotion scene has no dialogue', async () => {
      // n=8; positive scenes at 1,4,6 (all silent); other 5 scenes have 2 lines each → 10 total
      const recs476b = Array.from({ length: 8 }, (_, i) =>
        makeRec476(i, [1, 4, 6].includes(i) ? { emotionalShift: 'positive' } : {}));
      const f476b = buildScenes476(8, i => ![1, 4, 6].includes(i));
      const res = await runD476(f476b, recs476b);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_POSITIVE_SCENE_VOID'), 'DIALOGUE_POSITIVE_SCENE_VOID should fire');
    });

    it('DIALOGUE_POSITIVE_SCENE_VOID does not fire when a positive scene carries dialogue', async () => {
      // Positive scenes at 1,4,6; scene 1 now HAS dialogue → not all silent
      const recs476bnr = Array.from({ length: 8 }, (_, i) =>
        makeRec476(i, [1, 4, 6].includes(i) ? { emotionalShift: 'positive' } : {}));
      const f476bnr = buildScenes476(8, i => i !== 4 && i !== 6);
      const res = await runD476(f476bnr, recs476bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_POSITIVE_SCENE_VOID'), 'DIALOGUE_POSITIVE_SCENE_VOID should not fire');
    });

    it('DIALOGUE_DENSE_AFTERMATH_SILENT fires when every dense scene is followed by a silent scene', async () => {
      // n=10; dense scenes at 0,2,4 (3 dlg lines each); scenes 1,3,5 silent; scenes 6-9 have 2 lines each
      // dense scenes 0→next 1 (silent), 2→next 3 (silent), 4→next 5 (silent) → all followed by silence
      let f476c = buildDenseScene(0) + buildSilentScene(1) + buildDenseScene(2) +
        buildSilentScene(3) + buildDenseScene(4) + buildSilentScene(5);
      for (let i = 6; i < 10; i++) f476c += buildScenes476(1, () => true).replace('INT. SCENE 0 - DAY', `INT. SCENE ${i} - DAY`);
      const recs476c = Array.from({ length: 10 }, (_, i) => makeRec476(i));
      const res = await runD476(f476c, recs476c);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_DENSE_AFTERMATH_SILENT'), 'DIALOGUE_DENSE_AFTERMATH_SILENT should fire');
    });

    it('DIALOGUE_DENSE_AFTERMATH_SILENT does not fire when a dense scene is followed by an active scene', async () => {
      // Dense scenes at 0,2,4; but scene 1 (follows 0) now also has 2 dialogue lines → not all silent
      let f476cnr = buildDenseScene(0);
      f476cnr += `INT. SCENE 1 - DAY\n\nALICE\nShe found the documents this morning.\n\nBOB\nWe leave now.\n\n`;
      f476cnr += buildDenseScene(2) + buildSilentScene(3) + buildDenseScene(4) + buildSilentScene(5);
      for (let i = 6; i < 10; i++) f476cnr += buildScenes476(1, () => true).replace('INT. SCENE 0 - DAY', `INT. SCENE ${i} - DAY`);
      const recs476cnr = Array.from({ length: 10 }, (_, i) => makeRec476(i));
      const res = await runD476(f476cnr, recs476cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_DENSE_AFTERMATH_SILENT'), 'DIALOGUE_DENSE_AFTERMATH_SILENT should not fire');
    });
  });


  describe('Wave 462 — dialoguePass: dramatic turn scene void, negation flood, opening silent', async () => {
    const makeRec462 = (sceneIdx: number, extra: Record<string, any> = {}): any => ({
      sceneIdx, suspenseDelta: 0, curiosityDelta: 0, clockRaised: false,
      revelation: null, dramaticTurn: 'nothing', payoffSetupIds: [], relationshipShifts: [],
      emotionalShift: 'neutral', seededClueIds: [], dialogueHighlights: [], unresolvedClues: [],
      purpose: '', slug: `s${sceneIdx}`, ...extra,
    });
    const runD462 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };
    const buildScenes462 = (count: number, withDlgFn: (i: number) => boolean): string => {
      let f = '';
      const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${labels[i] ?? i} - DAY\n\n`;
        if (withDlgFn(i)) {
          f += `ALICE\nShe found the documents early this morning.\n\nBOB\nWe should leave before they close the gate.\n\n`;
        } else {
          f += `The door crashes open. A figure steps from the dark.\n\n`;
        }
      }
      return f;
    };

    it('DIALOGUE_DRAMATIC_TURN_SCENE_VOID fires when every dramatic-turn scene has no dialogue', async () => {
      // n=8; turn scenes at 2,5 both have no dialogue; other scenes carry 12 dialogue lines
      const recs462a = Array.from({ length: 8 }, (_, i) => makeRec462(i, [2, 5].includes(i) ? { dramaticTurn: 'reversal' } : {}));
      const f462a = buildScenes462(8, i => ![2, 5].includes(i));
      const res = await runD462(f462a, recs462a);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_DRAMATIC_TURN_SCENE_VOID'), 'DIALOGUE_DRAMATIC_TURN_SCENE_VOID should fire');
    });

    it('DIALOGUE_DRAMATIC_TURN_SCENE_VOID does NOT fire when a dramatic-turn scene carries dialogue', async () => {
      // n=8; turn scenes at 2,5; scene 2 HAS dialogue → not all turns silent → no fire
      const recs462aNF = Array.from({ length: 8 }, (_, i) => makeRec462(i, [2, 5].includes(i) ? { dramaticTurn: 'reversal' } : {}));
      const f462aNF = buildScenes462(8, i => i !== 5);
      const res = await runD462(f462aNF, recs462aNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_DRAMATIC_TURN_SCENE_VOID'), 'DIALOGUE_DRAMATIC_TURN_SCENE_VOID should not fire');
    });

    it('DIALOGUE_NEGATION_FLOOD fires when more than 30% of lines carry a negation', async () => {
      // 10 lines, 6 with negation (60% > 30%) → fires
      const lines462b = [
        'No, I won\'t go back there.',
        'Nothing matters anymore to me.',
        'You can\'t make me do this.',
        'I never said that to her.',
        'We don\'t have any time left.',
        'Nobody is coming to help us.',
        'She found the documents this morning.',
        'The car waits by the factory road.',
        'Turn the radio up and drive fast.',
        'They will arrive at dawn tomorrow.',
      ];
      const body462b = lines462b.map((l, i) => `${i % 2 === 0 ? 'ALICE' : 'BOB'}\n${l}`).join('\n\n');
      const f462b = `INT. ROOM - DAY\n\n${body462b}\n`;
      const res = await runD462(f462b);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_NEGATION_FLOOD'), 'DIALOGUE_NEGATION_FLOOD should fire');
    });

    it('DIALOGUE_NEGATION_FLOOD does NOT fire when negation stays at or below 30%', async () => {
      // 10 lines, 3 with negation (30%, not > 30%) → no fire
      const lines462bNF = [
        'No, I won\'t go back there.',
        'Nothing matters anymore to me.',
        'You can\'t make me do this.',
        'She found the documents this morning.',
        'We should leave before the gate closes.',
        'The car waits by the factory road.',
        'Turn the radio up and drive fast.',
        'He made a choice this evening.',
        'The road ends just past the hill.',
        'They will arrive at dawn tomorrow.',
      ];
      const body462bNF = lines462bNF.map((l, i) => `${i % 2 === 0 ? 'ALICE' : 'BOB'}\n${l}`).join('\n\n');
      const f462bNF = `INT. ROOM - DAY\n\n${body462bNF}\n`;
      const res = await runD462(f462bNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_NEGATION_FLOOD'), 'DIALOGUE_NEGATION_FLOOD should not fire');
    });

    it('DIALOGUE_OPENING_SILENT fires when the first 20% of scenes has no dialogue', async () => {
      // n=10; openingEnd=2; scenes 0,1 silent; scenes 2–9 carry 16 dialogue lines (≥15) → fires
      const recs462c = Array.from({ length: 10 }, (_, i) => makeRec462(i));
      const f462c = buildScenes462(10, i => i >= 2);
      const res = await runD462(f462c, recs462c);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_OPENING_SILENT'), 'DIALOGUE_OPENING_SILENT should fire');
    });

    it('DIALOGUE_OPENING_SILENT does NOT fire when the opening zone carries dialogue', async () => {
      // n=10; all scenes have dialogue → openingDlgCount > 0 → no fire
      const recs462cNF = Array.from({ length: 10 }, (_, i) => makeRec462(i));
      const f462cNF = buildScenes462(10, () => true);
      const res = await runD462(f462cNF, recs462cNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_OPENING_SILENT'), 'DIALOGUE_OPENING_SILENT should not fire');
    });
  });


  describe('Wave 448 — dialoguePass: curiosity peak silent, question back-loaded, revelation scene void', async () => {
    const makeRec448 = (sceneIdx: number, extra: Record<string, any> = {}): any => ({
      sceneIdx, suspenseDelta: 0, curiosityDelta: 0, clockRaised: false,
      revelation: null, dramaticTurn: 'nothing', payoffSetupIds: [], relationshipShifts: [],
      emotionalShift: 'neutral', seededClueIds: [], dialogueHighlights: [], unresolvedClues: [],
      purpose: '', slug: `s${sceneIdx}`, ...extra,
    });
    const runD448 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };
    const buildScenes448 = (count: number, withDlgFn: (i: number) => boolean): string => {
      let f = '';
      const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${labels[i] ?? i} - DAY\n\n`;
        if (withDlgFn(i)) {
          f += `ALICE\nShe found the documents early this morning.\n\nBOB\nWe need to leave before they close the gate.\n\n`;
        } else {
          f += `The door crashes open. A figure steps from the dark.\n\n`;
        }
      }
      return f;
    };

    it('DIALOGUE_CURIOSITY_PEAK_SILENT fires when peak-curiosity scene has no dialogue', async () => {
      // 8 scenes; scene 3 has curiosityDelta=2.0 (peak ≥ 1.5, pos=3 ≥ 1) and no dialogue
      const recs448a = Array.from({ length: 8 }, (_, i) => makeRec448(i, i === 3 ? { curiosityDelta: 2.0 } : {}));
      const f448a = buildScenes448(8, i => i !== 3);
      const res = await runD448(f448a, recs448a);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_CURIOSITY_PEAK_SILENT'), 'DIALOGUE_CURIOSITY_PEAK_SILENT should fire');
    });

    it('DIALOGUE_CURIOSITY_PEAK_SILENT does NOT fire when peak-curiosity scene has dialogue', async () => {
      // Same records but ALL scenes (including scene 3) have dialogue
      const recs448aNF = Array.from({ length: 8 }, (_, i) => makeRec448(i, i === 3 ? { curiosityDelta: 2.0 } : {}));
      const f448aNF = buildScenes448(8, () => true);
      const res = await runD448(f448aNF, recs448aNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_CURIOSITY_PEAK_SILENT'), 'DIALOGUE_CURIOSITY_PEAK_SILENT should not fire');
    });

    it('DIALOGUE_QUESTION_BACK_LOADED fires when second-half question rate exceeds first-half rate by 2×', async () => {
      // 12 lines: first half has 1 question (rate≈0.167); second half has 5 questions (rate≈0.833) → 0.833 > 0.167×2 → fires
      const lines448b = [
        'She found the documents early this morning.',
        'We need to leave before they close the gate.',
        'The car is waiting by the old factory road.',
        'What exactly did she tell you last night?',      // ? in first half (index 3 of 12 → first of 6)
        'He made a choice and we have to live with it.',
        'Turn off the radio before they track us down.',
        // second half (indices 6-11):
        'Where are you going with all of this now?',     // ?
        'Why did you not tell me before today here?',    // ?
        'When did you first find out about it then?',    // ?
        'How long have you known about this one plan?',  // ?
        'Who exactly told you to keep quiet back then?', // ?
        'The road ends here and we have no way back.',
      ];
      const body448b = lines448b.map((l, i) => `${i % 2 === 0 ? 'ALICE' : 'BOB'}\n${l}`).join('\n\n');
      const f448b = `INT. ROOM - DAY\n\n${body448b}\n`;
      const res = await runD448(f448b);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_QUESTION_BACK_LOADED'), 'DIALOGUE_QUESTION_BACK_LOADED should fire');
    });

    it('DIALOGUE_QUESTION_BACK_LOADED does NOT fire when questions are evenly distributed', async () => {
      // 12 lines: 2 questions in first half, 2 in second half → same rate → ratio=1 < 2 → no fire
      const lines448bNF = [
        'She found the documents early this morning.',
        'Where are you going with all of this now?',     // ? in first half
        'We need to leave before they close the gate.',
        'The car is waiting by the old factory road.',
        'What exactly did she tell you last night?',     // ? in first half
        'Turn off the radio before they track us down.',
        // second half:
        'He made a choice and we have to live with it.',
        'Who exactly told you to keep quiet back then?', // ? in second half
        'The road ends here and we have no way back.',
        'She has been waiting for a signal since dawn.',
        'Why did you not tell me before today here?',    // ? in second half
        'The bridge was closed before we even arrived.',
      ];
      const body448bNF = lines448bNF.map((l, i) => `${i % 2 === 0 ? 'ALICE' : 'BOB'}\n${l}`).join('\n\n');
      const f448bNF = `INT. ROOM - DAY\n\n${body448bNF}\n`;
      const res = await runD448(f448bNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_QUESTION_BACK_LOADED'), 'DIALOGUE_QUESTION_BACK_LOADED should not fire');
    });

    it('DIALOGUE_REVELATION_SCENE_VOID fires when all revelation scenes contain no dialogue', async () => {
      // 8 scenes; revelations in scenes 2,3 (no dialogue); all other scenes have dialogue
      const recs448c = Array.from({ length: 8 }, (_, i) =>
        makeRec448(i, { revelation: [2, 3].includes(i) ? `Truth at scene ${i}` : null }),
      );
      const f448c = buildScenes448(8, i => ![2, 3].includes(i));
      const res = await runD448(f448c, recs448c);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_REVELATION_SCENE_VOID'), 'DIALOGUE_REVELATION_SCENE_VOID should fire');
    });

    it('DIALOGUE_REVELATION_SCENE_VOID does NOT fire when at least one revelation scene has dialogue', async () => {
      // 8 scenes; revelations in scenes 2,3; scene 2 HAS dialogue, scene 3 does not
      const recs448cNF = Array.from({ length: 8 }, (_, i) =>
        makeRec448(i, { revelation: [2, 3].includes(i) ? `Truth at scene ${i}` : null }),
      );
      const f448cNF = buildScenes448(8, i => i !== 3); // scene 3 has no dialogue; scene 2 has dialogue
      const res = await runD448(f448cNF, recs448cNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_REVELATION_SCENE_VOID'), 'DIALOGUE_REVELATION_SCENE_VOID should not fire');
    });
  });


  describe('Wave 434 — dialoguePass: tension peak silent, climax void, hedge front-loaded', async () => {
    const makeRec434 = (sceneIdx: number, extra: Record<string, any> = {}): any => ({
      sceneIdx, suspenseDelta: 0, curiosityDelta: 0, clockRaised: false,
      revelation: null, dramaticTurn: 'nothing', payoffSetupIds: [], relationshipShifts: [],
      emotionalShift: 'neutral', seededClueIds: [], dialogueHighlights: [], unresolvedClues: [],
      purpose: '', slug: `s${sceneIdx}`, ...extra,
    });
    const runD434 = async (fountain: string, records: any[] = []) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };
    const buildScenes434 = (count: number, withDlgFn: (i: number) => boolean): string => {
      let f = '';
      const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
      for (let i = 0; i < count; i++) {
        f += `INT. SCENE ${labels[i] ?? i} - DAY\n\n`;
        if (withDlgFn(i)) {
          f += `ALICE\nShe found the documents early this morning.\n\nBOB\nWe need to leave before they close the gate.\n\n`;
        } else {
          f += `The door crashes open. A figure steps from the dark. Silence fills the room.\n\n`;
        }
      }
      return f;
    };

    it('DIALOGUE_TENSION_PEAK_SILENT fires when peak-suspense scene has no dialogue', async () => {
      // 8 scenes; scene index 5 is the peak (suspenseDelta=3) with no dialogue; all others have 2 lines each
      const recs434a = Array.from({ length: 8 }, (_, i) => makeRec434(i, i === 5 ? { suspenseDelta: 3 } : {}));
      const f434a = buildScenes434(8, i => i !== 5);
      const res = await runD434(f434a, recs434a);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_TENSION_PEAK_SILENT'), 'DIALOGUE_TENSION_PEAK_SILENT should fire');
    });

    it('DIALOGUE_TENSION_PEAK_SILENT does not fire when peak-suspense scene has dialogue', async () => {
      // Same structure but ALL scenes (including scene 5) have dialogue
      const recs434aNF = Array.from({ length: 8 }, (_, i) => makeRec434(i, i === 5 ? { suspenseDelta: 3 } : {}));
      const f434aNF = buildScenes434(8, () => true);
      const res = await runD434(f434aNF, recs434aNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_TENSION_PEAK_SILENT'), 'DIALOGUE_TENSION_PEAK_SILENT should not fire');
    });

    it('DIALOGUE_CLIMAX_VOID fires when final 20% of scenes has no dialogue', async () => {
      // 10 scenes; finalStart = floor(10*0.8) = 8; scenes 8-9 have no dialogue
      const recs434b = Array.from({ length: 10 }, (_, i) => makeRec434(i));
      const f434b = buildScenes434(10, i => i < 8);
      const res = await runD434(f434b, recs434b);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_CLIMAX_VOID'), 'DIALOGUE_CLIMAX_VOID should fire');
    });

    it('DIALOGUE_CLIMAX_VOID does not fire when final 20% has dialogue', async () => {
      // Same 10 scenes but ALL scenes have dialogue
      const recs434bNF = Array.from({ length: 10 }, (_, i) => makeRec434(i));
      const f434bNF = buildScenes434(10, () => true);
      const res = await runD434(f434bNF, recs434bNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_CLIMAX_VOID'), 'DIALOGUE_CLIMAX_VOID should not fire');
    });

    it('DIALOGUE_HEDGE_FRONT_LOADED fires when hedges cluster in first half only', async () => {
      // 14 lines: first 7 carry 5 hedges; last 7 carry 0 hedges → fires (5≥5, 0≤1)
      const lines434c = [
        'Maybe we should wait a little longer here.',       // hedge
        'I think the signal will arrive quite soon.',       // hedge
        'Perhaps if we just move the box to the left.',     // hedge (two: perhaps + just)
        'I guess we have no other choice right now.',       // hedge
        'Sort of lost without any real direction forward.', // hedge
        'She drove without stopping once for gas.',
        'We need to reach them before the sun goes down.',
        // second half (indices 7-13):
        'The door is locked from the inside tonight.',
        'Turn the generator off at the main switch.',
        'She is standing right outside the hallway door.',
        'Call the office and confirm the meeting time.',
        'Bring everything you need for the long road.',
        'He left without saying a single word at all.',
        'The contract was signed and filed before noon.',
      ];
      const body434c = lines434c.map((l, i) => `${i % 2 === 0 ? 'ALICE' : 'BOB'}\n${l}`).join('\n\n');
      const f434c = `INT. ROOM - DAY\n\n${body434c}\n`;
      const res = await runD434(f434c);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_HEDGE_FRONT_LOADED'), 'DIALOGUE_HEDGE_FRONT_LOADED should fire');
    });

    it('DIALOGUE_HEDGE_FRONT_LOADED does not fire when hedges appear in only 3 first-half lines', async () => {
      // 14 lines: first 7 carry only 3 hedges → firstHedges=3 < 5, so does not fire
      const lines434cNF = [
        'Maybe we should wait a little longer here.',   // hedge
        'I think the signal will arrive quite soon.',   // hedge
        'Perhaps if we move the box to the corner.',    // hedge
        'She drove without stopping once for gas.',
        'We need to reach them before the sun goes down.',
        'The door was locked when we arrived here.',
        'Turn the generator off at the main switch.',
        // second half (indices 7-13):
        'She is standing right outside the hallway.',
        'Call the office and confirm the meeting time.',
        'Bring everything you need for the long road.',
        'He left without saying a single word at all.',
        'The contract was signed before noon today.',
        'We have no time left to waste on this matter.',
        'The report is filed and ready for review now.',
      ];
      const body434cNF = lines434cNF.map((l, i) => `${i % 2 === 0 ? 'ALICE' : 'BOB'}\n${l}`).join('\n\n');
      const f434cNF = `INT. ROOM - DAY\n\n${body434cNF}\n`;
      const res = await runD434(f434cNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_HEDGE_FRONT_LOADED'), 'DIALOGUE_HEDGE_FRONT_LOADED should not fire');
    });
  });


  describe('Wave 420 — dialoguePass: interrupt flood, excuse flood, affirmation flood', async () => {
    const runD420 = async (fountain: string) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };
    const buildD420 = (lines: string[]): string => {
      const body = lines.map((l, i) => `${i % 2 === 0 ? 'ANNA' : 'MARK'}\n${l}`).join('\n\n');
      return `INT. ROOM - DAY\n\n${body}\n`;
    };

    it('DIALOGUE_INTERRUPT_FLOOD fires when >25% of lines end with "--"', async () => {
      // 5 of 12 lines end with "--" (41.7%) → fires
      const f420i = buildD420([
        'We have to leave before--',
        'But the contract says--',
        'Not if she finds out about--',
        'You knew all along that I--',
        'Listen if you would just--',
        'The kettle is still on the stove.',
        'Your brother called from the airport.',
        'The board meeting starts at three.',
        'Bring the keys and the folder.',
        'Her flight lands around midnight.',
        'The lease is inside the drawer.',
        'I locked the front door already.',
      ]);
      const res = await runD420(f420i);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_INTERRUPT_FLOOD'), 'DIALOGUE_INTERRUPT_FLOOD should fire');
    });

    it('DIALOGUE_INTERRUPT_FLOOD does not fire when lines are complete sentences', async () => {
      // 0 of 12 lines end with "--" → no fire
      const f420iNF = buildD420([
        'We have to leave before sunrise.',
        'But the contract says nothing now.',
        'Not if she finds out the truth.',
        'You knew all along what happened.',
        'The kettle is still on the stove.',
        'Your brother called from the airport.',
        'The board meeting starts at three.',
        'Bring the keys and the folder.',
        'Her flight lands around midnight.',
        'The lease is inside the drawer.',
        'I locked the front door already.',
        'She signed the contract this morning.',
      ]);
      const res = await runD420(f420iNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_INTERRUPT_FLOOD'), 'DIALOGUE_INTERRUPT_FLOOD should not fire');
    });

    it('DIALOGUE_EXCUSE_FLOOD fires when >25% of lines carry rationalization patterns', async () => {
      // 5 of 12 lines have excuse patterns (41.7%) → fires
      const f420e = buildD420([
        'I left because the situation was impossible.',
        "She did it because she had to protect us.",
        'I had to make a choice before midnight.',
        "That's why I never told you the truth.",
        'The reason is nobody else would do it.',
        'The kettle is still on the stove.',
        'Your brother called from the airport.',
        'The board meeting starts at three.',
        'Bring the keys and the folder.',
        'Her flight lands around midnight.',
        'The lease is inside the drawer.',
        'I locked the front door already.',
      ]);
      const res = await runD420(f420e);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_EXCUSE_FLOOD'), 'DIALOGUE_EXCUSE_FLOOD should fire');
    });

    it('DIALOGUE_EXCUSE_FLOOD does not fire when dialogue confronts the present', async () => {
      // 0 excuse patterns in 12 lines → no fire
      const f420eNF = buildD420([
        'You never listen to me at all.',
        'I will not do this again today.',
        'Put the gun down right now.',
        'We are leaving before midnight.',
        'The kettle is still on the stove.',
        'Your brother is at the airport.',
        'The board meeting starts at three.',
        'Bring the keys and the folder.',
        'The truck is parked by the dock.',
        'Her flight lands around midnight.',
        'The lease is inside the drawer.',
        'I trust you with my life now.',
      ]);
      const res = await runD420(f420eNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_EXCUSE_FLOOD'), 'DIALOGUE_EXCUSE_FLOOD should not fire');
    });

    it('DIALOGUE_AFFIRMATION_FLOOD fires when >25% of lines are pure bare assent', async () => {
      // 5 of 12 lines are pure affirmations (41.7%) → fires
      const f420af = buildD420([
        'Okay.',
        'Yes.',
        'Absolutely.',
        'Of course.',
        'Right.',
        'The kettle is still on the stove.',
        'Your brother called from the airport.',
        'The board meeting starts at three.',
        'Bring the keys and the folder.',
        'Her flight lands around midnight.',
        'The lease is inside the drawer.',
        'I locked the front door already.',
      ]);
      const res = await runD420(f420af);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_AFFIRMATION_FLOOD'), 'DIALOGUE_AFFIRMATION_FLOOD should fire');
    });

    it('DIALOGUE_AFFIRMATION_FLOOD does not fire when dialogue has no affirmation flood', async () => {
      // 0 pure affirmation lines in 12 → no fire
      const f420afNF = buildD420([
        'We have to leave before sunrise.',
        'The car is parked in the street.',
        'I will not do this again today.',
        'Turn the kettle off please.',
        'We have to decide what comes next.',
        'The board meeting starts at three.',
        'Your brother called from London.',
        'The keys are inside the drawer.',
        'Her flight lands at midnight.',
        'Bring the folder to the meeting.',
        'I locked the front door already.',
        'She signed the contract this morning.',
      ]);
      const res = await runD420(f420afNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_AFFIRMATION_FLOOD'), 'DIALOGUE_AFFIRMATION_FLOOD should not fire');
    });
  });


  describe('Wave 406 — dialoguePass: vague-noun flood, reported-speech flood, oath-intensifier flood', async () => {
    const runD406 = async (fountain: string) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };
    const buildD406 = (lines: string[]): string => {
      const body = lines.map((l, i) => `${i % 2 === 0 ? 'ANNA' : 'MARK'}\n${l}`).join('\n\n');
      return `INT. ROOM - DAY\n\n${body}\n`;
    };

    it('DIALOGUE_VAGUE_NOUN_FLOOD fires when >30% of lines lean on indefinite placeholders', async () => {
      const f406v = buildD406([
        'Just do the thing we talked about.',
        'Get the stuff from the car.',
        'Something happened last night.',
        'I need to talk to someone.',
        'Put it somewhere safe.',
        'We will figure it out somehow.',
        'Whatever you decide is fine.',
        'The car is parked outside.',
        'I locked the front door.',
        'Marcus left at noon today.',
        'The meeting starts at three.',
        'She signed the contract already.',
      ]);
      const res = await runD406(f406v);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_VAGUE_NOUN_FLOOD'), 'DIALOGUE_VAGUE_NOUN_FLOOD should fire');
    });

    it('DIALOGUE_VAGUE_NOUN_FLOOD does NOT fire when dialogue names concrete objects', async () => {
      const f406vNF = buildD406([
        'The car is parked outside the bank.',
        'I locked the steel front door.',
        'Marcus left the office at noon.',
        'The board meeting starts at three.',
        'She signed the lease this morning.',
        'Bring the morphine and the bandages.',
        'The bridge on Route 9 is closed.',
        'Your brother called from Lisbon.',
        'The kettle is still on the stove.',
        'He parked the truck by the dock.',
        'The letters are inside the drawer.',
        'Her flight lands at midnight.',
      ]);
      const res = await runD406(f406vNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_VAGUE_NOUN_FLOOD'), 'DIALOGUE_VAGUE_NOUN_FLOOD should not fire');
    });

    it('DIALOGUE_REPORTED_SPEECH_FLOOD fires when >20% of lines recount what others said', async () => {
      const f406r = buildD406([
        'He said the deal was already off.',
        'She told me to wait right here.',
        'They say the bridge is closed now.',
        'I told him exactly what happened.',
        'He was like, forget the whole plan.',
        'The kettle is still on the stove.',
        'Your brother called from the airport.',
        'The board meeting starts at three.',
        'Bring the keys and the folder.',
        'The truck is parked by the dock.',
        'Her flight lands around midnight.',
        'The lease is inside the drawer.',
      ]);
      const res = await runD406(f406r);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_REPORTED_SPEECH_FLOOD'), 'DIALOGUE_REPORTED_SPEECH_FLOOD should fire');
    });

    it('DIALOGUE_REPORTED_SPEECH_FLOOD does NOT fire when characters confront in the present', async () => {
      const f406rNF = buildD406([
        'You never listen to me at all.',
        'I will not do this again.',
        'Put the gun down right now.',
        'We are leaving before midnight.',
        'The kettle is still on the stove.',
        'Your brother is at the airport.',
        'The board meeting starts at three.',
        'Bring the keys and the folder.',
        'The truck is parked by the dock.',
        'Her flight lands around midnight.',
        'The lease is inside the drawer.',
        'I trust you with my life.',
      ]);
      const res = await runD406(f406rNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_REPORTED_SPEECH_FLOOD'), 'DIALOGUE_REPORTED_SPEECH_FLOOD should not fire');
    });

    it('DIALOGUE_OATH_INTENSIFIER_FLOOD fires when >20% of lines lean on a mild oath', async () => {
      const f406o = buildD406([
        'Damn it, not this again.',
        'What the hell were you thinking?',
        'Oh god, this is really bad.',
        'Jesus, would you slow down.',
        'The kettle is still on the stove.',
        'Your brother is at the airport.',
        'The board meeting starts at three.',
        'Bring the keys and the folder.',
        'The truck is parked by the dock.',
        'Her flight lands around midnight.',
        'The lease is inside the drawer.',
        'I locked the front door.',
      ]);
      const res = await runD406(f406o);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_OATH_INTENSIFIER_FLOOD'), 'DIALOGUE_OATH_INTENSIFIER_FLOOD should fire');
    });

    it('DIALOGUE_OATH_INTENSIFIER_FLOOD does NOT fire when dialogue avoids oaths', async () => {
      const f406oNF = buildD406([
        'Not this again, please.',
        'What were you thinking back there?',
        'This is really bad for us.',
        'Would you slow down a little.',
        'The kettle is still on the stove.',
        'Your brother is at the airport.',
        'The board meeting starts at three.',
        'Bring the keys and the folder.',
        'The truck is parked by the dock.',
        'Her flight lands around midnight.',
        'The lease is inside the drawer.',
        'I locked the front door.',
      ]);
      const res = await runD406(f406oNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_OATH_INTENSIFIER_FLOOD'), 'DIALOGUE_OATH_INTENSIFIER_FLOOD should not fire');
    });
  });


  describe('Wave 392 — dialoguePass: emotion naming, amplifier flood, time-marker flood', async () => {
    const runD392 = async (fountain: string) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('DIALOGUE_EMOTION_NAMING fires when 3+ lines state a feeling outright', async () => {
      const f392e = `INT. ROOM - DAY

ANNA
I'm so angry at you right now.

MARK
Don't be.

ANNA
I feel hurt by what you did.

MARK
I never meant that.

ANNA
I'm scared of what comes next.

MARK
We'll be fine.

ANNA
You always say that.

MARK
Because it's true.`;
      const res = await runD392(f392e);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_EMOTION_NAMING'), 'DIALOGUE_EMOTION_NAMING should fire');
    });

    it('DIALOGUE_EMOTION_NAMING does not fire when feelings are shown not stated', async () => {
      const f392en = `INT. ROOM - DAY

ANNA
Get out of my sight.

MARK
Don't be like this.

ANNA
You broke the one rule.

MARK
I never meant that.

ANNA
And now? What happens now.

MARK
We'll be fine.

ANNA
You always say that.

MARK
Because it's true.`;
      const res = await runD392(f392en);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_EMOTION_NAMING'), 'DIALOGUE_EMOTION_NAMING should not fire');
    });

    it('DIALOGUE_AMPLIFIER_FLOOD fires when >25% of lines carry an amplifier', async () => {
      const f392a = `INT. OFFICE - DAY

SAM
This is very important to me.

RAY
Okay.

SAM
I'm really not sure about it.

RAY
Take your time.

SAM
It's absolutely the right call.

RAY
If you say so.

SAM
I'm completely certain now.

RAY
Then let's do it.

SAM
We move at dawn.

RAY
Understood.`;
      const res = await runD392(f392a);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_AMPLIFIER_FLOOD'), 'DIALOGUE_AMPLIFIER_FLOOD should fire');
    });

    it('DIALOGUE_AMPLIFIER_FLOOD does not fire when dialogue avoids amplifiers', async () => {
      const f392an = `INT. OFFICE - DAY

SAM
This matters to me.

RAY
Okay.

SAM
I'm not sure about it.

RAY
Take your time.

SAM
It's the right call.

RAY
If you say so.

SAM
I'm certain now.

RAY
Then let's do it.

SAM
We move at dawn.

RAY
Understood.`;
      const res = await runD392(f392an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_AMPLIFIER_FLOOD'), 'DIALOGUE_AMPLIFIER_FLOOD should not fire');
    });

    it('DIALOGUE_TIME_MARKER_FLOOD fires when >25% of lines carry a temporal reference', async () => {
      const f392t = `INT. KITCHEN - DAY

LIA
You said this yesterday too.

JON
Did I?

LIA
We talked about it last night.

JON
I forget.

LIA
The meeting is tomorrow morning.

JON
Right.

LIA
He called an hour ago.

JON
And?

LIA
We decide now.

JON
Agreed.`;
      const res = await runD392(f392t);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_TIME_MARKER_FLOOD'), 'DIALOGUE_TIME_MARKER_FLOOD should fire');
    });

    it('DIALOGUE_TIME_MARKER_FLOOD does not fire when dialogue stays in the present', async () => {
      const f392tn = `INT. KITCHEN - DAY

LIA
You said this before.

JON
Did I?

LIA
We talked about it already.

JON
I forget.

LIA
The meeting is set.

JON
Right.

LIA
He called.

JON
And?

LIA
We decide now.

JON
Agreed.`;
      const res = await runD392(f392tn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_TIME_MARKER_FLOOD'), 'DIALOGUE_TIME_MARKER_FLOOD should not fire');
    });
  });


  describe('Wave 378 — dialoguePass: superlative flood, anaphora run, verbal-tic flood', async () => {
    const runD378 = async (fountain: string) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('DIALOGUE_SUPERLATIVE_FLOOD fires when >25% of dialogue lines carry a superlative', async () => {
      const f378s = `INT. OFFICE - DAY

SAM
This is the best deal we have ever seen.

RAY
It might be.

SAM
She is the worst manager in the building.

RAY
That seems harsh.

SAM
This is the biggest mistake of my life.

RAY
Calm down.

SAM
You are the smartest person I know.

RAY
I doubt that.

SAM
We should leave now.

RAY
Fine by me.`;
      const res = await runD378(f378s);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_SUPERLATIVE_FLOOD'), 'DIALOGUE_SUPERLATIVE_FLOOD should fire');
    });

    it('DIALOGUE_SUPERLATIVE_FLOOD does not fire when dialogue avoids superlatives', async () => {
      const f378sn = `INT. OFFICE - DAY

SAM
This is a fair deal for us.

RAY
It might be.

SAM
She is a difficult manager to work with.

RAY
That seems harsh.

SAM
This was a mistake on my part.

RAY
Calm down.

SAM
You are a sharp person, you know.

RAY
I doubt that.

SAM
We should leave now.

RAY
Fine by me.`;
      const res = await runD378(f378sn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_SUPERLATIVE_FLOOD'), 'DIALOGUE_SUPERLATIVE_FLOOD should not fire');
    });

    it('DIALOGUE_ANAPHORA_RUN fires when 3+ consecutive dialogue lines open with the same word', async () => {
      const f378a = `INT. ROOM - DAY

SAM
I want to understand this.

RAY
I think you already do.

SAM
I knew you would say that.

RAY
So what now?

SAM
We decide together.

RAY
Together it is.`;
      const res = await runD378(f378a);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_ANAPHORA_RUN'), 'DIALOGUE_ANAPHORA_RUN should fire');
    });

    it('DIALOGUE_ANAPHORA_RUN does not fire when consecutive lines vary their openers', async () => {
      const f378an = `INT. ROOM - DAY

SAM
I want to understand this.

RAY
You already do.

SAM
Maybe that is true.

RAY
So what now?

SAM
We decide together.

RAY
Together it is.`;
      const res = await runD378(f378an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_ANAPHORA_RUN'), 'DIALOGUE_ANAPHORA_RUN should not fire');
    });

    it('DIALOGUE_VERBAL_TIC_FLOOD fires when >25% of dialogue lines carry a disclaimer-intensifier', async () => {
      const f378v = `INT. BAR - NIGHT

LIA
I literally cannot believe this.

JON
Relax.

LIA
Honestly, you never listen.

JON
That is not fair.

LIA
Basically, we are done here.

JON
Don't say that.

LIA
Actually, I mean it this time.

JON
Let's talk tomorrow.

LIA
There is nothing left to say.

JON
Maybe there is.`;
      const res = await runD378(f378v);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_VERBAL_TIC_FLOOD'), 'DIALOGUE_VERBAL_TIC_FLOOD should fire');
    });

    it('DIALOGUE_VERBAL_TIC_FLOOD does not fire when dialogue avoids verbal-tic words', async () => {
      const f378vn = `INT. BAR - NIGHT

LIA
I cannot believe this.

JON
Relax.

LIA
You never listen to me.

JON
That is not fair.

LIA
We are done here.

JON
Don't say that.

LIA
I mean it this time.

JON
Let's talk tomorrow.

LIA
There is nothing left to say.

JON
Maybe there is.`;
      const res = await runD378(f378vn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_VERBAL_TIC_FLOOD'), 'DIALOGUE_VERBAL_TIC_FLOOD should not fire');
    });
  });


  describe('Wave 364 — dialoguePass: first-person saturation, passive construct flood, present-perfect flood', async () => {
    const runD364 = async (fountain: string) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('DIALOGUE_FIRST_PERSON_SATURATION fires when >40% of lines begin with I or My', async () => {
      const f364fp = `INT. KITCHEN - DAY

ANNA
I don't know what to say.
I've been thinking about this for weeks.
My mind keeps going back to that night.
I just can't let it go.
My hands shake every time I try.
She needs to understand.
I can't pretend anymore.
I tried to call but you didn't answer.
The door was locked when I arrived.
My plan was different from yours.`;
      const res = await runD364(f364fp);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_FIRST_PERSON_SATURATION'), 'DIALOGUE_FIRST_PERSON_SATURATION should fire');
    });

    it('DIALOGUE_FIRST_PERSON_SATURATION does not fire when dialogue varies its openers', async () => {
      const f364fpn = `INT. KITCHEN - DAY

ANNA
What are you doing here?
This has to stop today.
We need to talk about it.
Nobody told me you were coming.
There's no way around this anymore.
You knew all along, didn't you?
It happened three years ago.
She wasn't supposed to find out.
He made the first move.
Everything fell apart that night.`;
      const res = await runD364(f364fpn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_FIRST_PERSON_SATURATION'), 'DIALOGUE_FIRST_PERSON_SATURATION should not fire');
    });

    it('DIALOGUE_PASSIVE_CONSTRUCT_FLOOD fires when >25% of dialogue lines use passive constructions', async () => {
      const f364pc = `INT. OFFICE - DAY

TOM
She was told about the decision yesterday.
It has been decided by the board already.
The report was filed without my knowledge.
I had no idea what happened.
The contract was signed by someone else.
I received the news this morning.
The evidence was collected before we arrived.
Nobody warned me about this.
Something has to change.
We need to move forward.`;
      const res = await runD364(f364pc);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_PASSIVE_CONSTRUCT_FLOOD'), 'DIALOGUE_PASSIVE_CONSTRUCT_FLOOD should fire');
    });

    it('DIALOGUE_PASSIVE_CONSTRUCT_FLOOD does not fire when dialogue uses active voice', async () => {
      const f364pcn = `INT. OFFICE - DAY

TOM
She told me about the decision yesterday.
The board made that call already.
Someone filed the report without telling me.
I had no idea this happened.
She signed the contract herself.
I heard the news this morning.
We collected the evidence before you arrived.
No one warned me about this situation.
Something has to change for the better.
We need to move forward together.`;
      const res = await runD364(f364pcn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_PASSIVE_CONSTRUCT_FLOOD'), 'DIALOGUE_PASSIVE_CONSTRUCT_FLOOD should not fire');
    });

    it('DIALOGUE_PRESENT_PERFECT_FLOOD fires when >25% of lines use present perfect tense', async () => {
      const f364pp = `INT. LIVING ROOM - DAY

CLAIRE
I've been waiting for three hours.
She's told me everything already.
We've tried this before, you know.
I haven't slept in two days.
They've always done it this way.
He's never listened to anyone.
The situation has changed now.
Nothing works the way it should.
She walked in without warning.
Give me one good reason.`;
      const res = await runD364(f364pp);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_PRESENT_PERFECT_FLOOD'), 'DIALOGUE_PRESENT_PERFECT_FLOOD should fire');
    });

    it('DIALOGUE_PRESENT_PERFECT_FLOOD does not fire when dialogue stays in present or simple past', async () => {
      const f364ppn = `INT. LIVING ROOM - DAY

CLAIRE
I'm waiting for an answer right now.
She told me everything an hour ago.
We tried this last month.
I didn't sleep last night.
They always do it this way.
He never listens to anyone here.
The situation changes by the minute.
Nothing works the way it should.
She walked in without knocking.
Give me one good reason, please.`;
      const res = await runD364(f364ppn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_PRESENT_PERFECT_FLOOD'), 'DIALOGUE_PRESENT_PERFECT_FLOOD should not fire');
    });
  });


  describe('Wave 350 — dialoguePass: you-opener flood, thanks overuse, self-reference illeism', async () => {
    const runD350 = async (fountain: string) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('DIALOGUE_YOU_OPENER_FLOOD fires when >30% of lines begin with "You"', async () => {
      const f350y = `INT. ROOM - DAY

ALICE
You never listen to me at all.
You always do this to us.
You promised it would be different.
The rain is falling outside now.
We should head home before dark.

BOB
You cannot keep blaming me here.
You said we would be fine today.
I packed the bags this morning.
The car is waiting in the lot.
Let us just go home now please.`;
      const res = await runD350(f350y);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_YOU_OPENER_FLOOD'), 'DIALOGUE_YOU_OPENER_FLOOD should fire');
    });

    it('DIALOGUE_YOU_OPENER_FLOOD does not fire when "You" openers are rare', async () => {
      const f350yn = `INT. ROOM - DAY

ALICE
You never listen to me at all.
We should head home before dark.
The rain is falling outside now.
I packed the bags this morning.
The car is waiting in the lot.

BOB
We can still make it in time.
I believe the road is clear now.
The plan is set for tonight.
Let us just go home now please.
Morning will come soon enough.`;
      const res = await runD350(f350yn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_YOU_OPENER_FLOOD'), 'DIALOGUE_YOU_OPENER_FLOOD should not fire');
    });

    it('DIALOGUE_THANKS_OVERUSE fires when 3+ lines are expressions of gratitude', async () => {
      const f350t = `INT. ROOM - DAY

ALICE
Thank you for coming today.
The meeting starts at noon now.
Thanks for all of your help here.

BOB
I appreciate it more than you know.
We should review the documents soon.
The numbers look correct to me.
Let us proceed with the vote now.
We adjourn until tomorrow morning.`;
      const res = await runD350(f350t);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_THANKS_OVERUSE'), 'DIALOGUE_THANKS_OVERUSE should fire');
    });

    it('DIALOGUE_THANKS_OVERUSE does not fire when gratitude is rare', async () => {
      const f350tn = `INT. ROOM - DAY

ALICE
Thank you for coming today.
The meeting starts at noon now.
We should review the documents soon.

BOB
The numbers look correct to me.
Let us proceed with the vote now.
We adjourn until tomorrow morning.
The budget needs another review.
Nothing else matters right now.`;
      const res = await runD350(f350tn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_THANKS_OVERUSE'), 'DIALOGUE_THANKS_OVERUSE should not fire');
    });

    it('DIALOGUE_SELF_REFERENCE fires when a character names themselves in >20% of lines', async () => {
      const f350s = `INT. ROOM - DAY

JOHN
John does not make mistakes like that.
John always keeps his promises here.
John will handle this himself now.
The weather looks clear today.

MARY
We should leave before the storm.
I packed everything we will need.
The road ahead is long and dark.
Let us go now before it rains.`;
      const res = await runD350(f350s);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_SELF_REFERENCE'), 'DIALOGUE_SELF_REFERENCE should fire');
    });

    it('DIALOGUE_SELF_REFERENCE does not fire when characters speak in the first person', async () => {
      const f350sn = `INT. ROOM - DAY

JOHN
I do not make mistakes like that.
I always keep my promises here.
I will handle this myself now.
The weather looks clear today.

MARY
We should leave before the storm.
I packed everything we will need.
The road ahead is long and dark.
Let us go now before it rains.`;
      const res = await runD350(f350sn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_SELF_REFERENCE'), 'DIALOGUE_SELF_REFERENCE should not fire');
    });
  });


  describe('Wave 336 — dialoguePass: question flood, negative opener flood, mid-sentence caps flood', async () => {
    const runD336 = async (fountain: string) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('DIALOGUE_QUESTION_FLOOD fires when >35% of lines are questions', async () => {
      const fountain336q = `INT. ROOM - DAY

ALICE
What do you want from me?
Are you even listening right now?
We should leave now today.
The door is open wide.

BOB
Did you hear what I said there?
Why are you doing this to me?
I am not leaving here at all.
Maybe later then okay fine.
The walls feel close tonight.
What were you thinking of then?`;
      const res = await runD336(fountain336q);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_QUESTION_FLOOD'), 'DIALOGUE_QUESTION_FLOOD should fire');
    });

    it('DIALOGUE_QUESTION_FLOOD does not fire when questions are a minority', async () => {
      const fountain336qnw = `INT. ROOM - DAY

ALICE
What do you want from me?
We should leave now today.
The door is open wide here.
I am staying right here now.

BOB
The problem is very clear now.
We can still try again then.
Maybe later then okay fine.
The road is long and hard here.
I believe you are right here.
Time to go and leave now please.`;
      const res = await runD336(fountain336qnw);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_QUESTION_FLOOD'), 'DIALOGUE_QUESTION_FLOOD should not fire');
    });

    it('DIALOGUE_NEGATIVE_OPENER_FLOOD fires when >30% of lines open with a negative', async () => {
      const fountain336n = `INT. ROOM - DAY

ALICE
No, I will not do that now.
We should leave now today here.
Can't you see what is happening?
The door is wide open there.

BOB
Never again will I do this here.
I am just standing here now still.
Don't push me any further please.
The walls are closing in fast.
We can still try once more now.
Won't you just listen to me please.`;
      const res = await runD336(fountain336n);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_NEGATIVE_OPENER_FLOOD'), 'DIALOGUE_NEGATIVE_OPENER_FLOOD should fire');
    });

    it('DIALOGUE_NEGATIVE_OPENER_FLOOD does not fire when negatives are rare', async () => {
      const fountain336nnw = `INT. ROOM - DAY

ALICE
No, I will not do that now.
We should leave now today here.
The door is wide open there now.
I believe you are right here now.

BOB
The problem is very clear now here.
I am just standing here now still.
The walls are closing in fast now.
We can still try once more now please.
You need to trust me right now here.
Maybe later then okay fine please.`;
      const res = await runD336(fountain336nnw);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_NEGATIVE_OPENER_FLOOD'), 'DIALOGUE_NEGATIVE_OPENER_FLOOD should not fire');
    });

    it('DIALOGUE_MIDSENTENCE_CAPS_FLOOD fires when ≥4 lines shout a word mid-sentence', async () => {
      const fountain336c = `INT. ROOM - DAY

ALICE
I TOLD you this was wrong here.
We should leave now today please.
You simply CANNOT do that to me.
The door is open very wide now.

BOB
We NEED to leave right now please.
I am not leaving here at all now.
Stop doing this to me PLEASE now.
The walls feel very close tonight.`;
      const res = await runD336(fountain336c);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_MIDSENTENCE_CAPS_FLOOD'), 'DIALOGUE_MIDSENTENCE_CAPS_FLOOD should fire');
    });

    it('DIALOGUE_MIDSENTENCE_CAPS_FLOOD does not fire when caps emphasis is rare', async () => {
      const fountain336cnw = `INT. ROOM - DAY

ALICE
I TOLD you this was wrong here.
We should leave now today please.
The door is open very wide now.
I believe you are right here now.

BOB
The problem is very clear now here.
I am not leaving here at all now.
We can still try once more now here.
You CANNOT do this to me right now.`;
      const res = await runD336(fountain336cnw);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_MIDSENTENCE_CAPS_FLOOD'), 'DIALOGUE_MIDSENTENCE_CAPS_FLOOD should not fire');
    });
  });


  describe('Wave 325 — dialoguePass: expletive opener overuse, absolute overuse, within-line word echo', async () => {
    const runD325 = async (fountain: string) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('DIALOGUE_EXPLETIVE_OPENER_OVERUSE fires when >25% of lines begin with a dummy subject', async () => {
      const fountain325e = `INT. ROOM - DAY

ALICE
There's something wrong here.
It's not what you think.
We should leave now.
The door is open.

BOB
Here's the problem now.
I am not leaving.
There was a noise outside.
The walls feel close.
We can still try.
Maybe later then.`;
      const res = await runD325(fountain325e);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_EXPLETIVE_OPENER_OVERUSE'), 'DIALOGUE_EXPLETIVE_OPENER_OVERUSE should fire');
    });

    it('DIALOGUE_EXPLETIVE_OPENER_OVERUSE does not fire when openers use real subjects', async () => {
      const fountain325ne = `INT. ROOM - DAY

ALICE
There's something wrong here.
We should leave now.
The door is open.
I am not leaving.

BOB
The problem is clear now.
We can still try.
Maybe later then.
The road is long.
Morning comes early here.
Time to go now.`;
      const res = await runD325(fountain325ne);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_EXPLETIVE_OPENER_OVERUSE'), 'DIALOGUE_EXPLETIVE_OPENER_OVERUSE should not fire');
    });

    it('DIALOGUE_ABSOLUTE_OVERUSE fires when >30% of lines contain a universal term', async () => {
      const fountain325a = `INT. ROOM - DAY

ALICE
You always do this.
Everyone knows the truth.
We should leave now.
The door is open.

BOB
I completely understand now.
I am not leaving.
Everything is falling apart.
The walls feel close.
We can still try.
Maybe later then.`;
      const res = await runD325(fountain325a);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_ABSOLUTE_OVERUSE'), 'DIALOGUE_ABSOLUTE_OVERUSE should fire');
    });

    it('DIALOGUE_ABSOLUTE_OVERUSE does not fire when absolutes are rare', async () => {
      const fountain325na = `INT. ROOM - DAY

ALICE
You always do this.
We should leave now.
The door is open.
I am not leaving.

BOB
The problem is clear now.
We can still try.
Maybe later then.
The road is long.
Morning comes early here.
Time to go now.`;
      const res = await runD325(fountain325na);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_ABSOLUTE_OVERUSE'), 'DIALOGUE_ABSOLUTE_OVERUSE should not fire');
    });

    it('DIALOGUE_WITHIN_LINE_WORD_ECHO fires when 3+ lines triple a word', async () => {
      const fountain325w = `INT. ROOM - DAY

ALICE
No no no please stop.
Run run run right now.

BOB
Stop stop stop it please.
I am staying here now.
We should leave soon.
The door is open wide.
The walls feel close.
Maybe later then okay.`;
      const res = await runD325(fountain325w);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_WITHIN_LINE_WORD_ECHO'), 'DIALOGUE_WITHIN_LINE_WORD_ECHO should fire');
    });

    it('DIALOGUE_WITHIN_LINE_WORD_ECHO does not fire without within-line tripling', async () => {
      const fountain325nw = `INT. ROOM - DAY

ALICE
No please stop right now.
Run quickly to the door.

BOB
Stop it for a second.
I am staying here now.
We should leave soon.
The door is open wide.
The walls feel close.
Maybe later then okay.`;
      const res = await runD325(fountain325nw);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_WITHIN_LINE_WORD_ECHO'), 'DIALOGUE_WITHIN_LINE_WORD_ECHO should not fire');
    });
  });


  describe('Wave 297 — dialoguePass: contraction starvation, apology loop, repeated line', async () => {
    const runD297 = async (fountain: string) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('CONTRACTION_STARVATION fires when full-forms appear 5+ times with zero contractions', async () => {
      const lines297cs = [
        'ALICE\nI am certain about this.',
        'BOB\nYou are wrong about him.',
        'ALICE\nIt is too late for that.',
        'BOB\nWe cannot turn back now.',
        'ALICE\nI do not believe you.',
        'BOB\nThat is your choice to make.',
        'ALICE\nLeave the keys on the table.',
        'BOB\nTake them yourself.',
        'ALICE\nFine then.',
        'BOB\nGood riddance to you.',
        'ALICE\nWatch the door behind you.',
        'BOB\nAlways the last word with you.',
      ].join('\n\n');
      const res = await runD297(lines297cs);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONTRACTION_STARVATION'), 'CONTRACTION_STARVATION should fire');
    });

    it('CONTRACTION_STARVATION does not fire when dialogue contains contractions', async () => {
      const lines297ncs = [
        "ALICE\nI'm certain about this.",
        'BOB\nYou are wrong about him.',
        "ALICE\nIt's too late for that.",
        'BOB\nWe cannot turn back now.',
        'ALICE\nI do not believe you.',
        "BOB\nThat's your choice to make.",
        'ALICE\nLeave the keys on the table.',
        'BOB\nTake them yourself.',
        'ALICE\nFine then.',
        'BOB\nGood riddance to you.',
        'ALICE\nWatch the door behind you.',
        'BOB\nAlways the last word with you.',
      ].join('\n\n');
      const res = await runD297(lines297ncs);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONTRACTION_STARVATION'), 'CONTRACTION_STARVATION should not fire');
    });

    it('APOLOGY_LOOP fires when >20% of dialogue lines contain an apology', async () => {
      const lines297al = [
        "ALICE\nI'm sorry about last night.",
        "BOB\nSorry doesn't fix the window.",
        'ALICE\nForgive me, I was upset.',
        "BOB\nMy apologies for shouting back.",
        "ALICE\nIt won't happen again.",
        'BOB\nYou said that before.',
        'ALICE\nThis time is different.',
        'BOB\nProve it then.',
        'ALICE\nGive me the chance.',
        "BOB\nOne chance, that's all.",
      ].join('\n\n');
      const res = await runD297(lines297al);
      assert.ok(res.issues.some((i: any) => i.rule === 'APOLOGY_LOOP'), 'APOLOGY_LOOP should fire');
    });

    it('APOLOGY_LOOP does not fire when apologies are sparse', async () => {
      const lines297nal = [
        "ALICE\nI'm sorry about last night.",
        "BOB\nThat doesn't fix the window.",
        'ALICE\nI know what I did.',
        'BOB\nThen own it for once.',
        "ALICE\nIt won't happen again.",
        'BOB\nYou said that before.',
        'ALICE\nThis time is different.',
        'BOB\nProve it then.',
        'ALICE\nGive me the chance.',
        "BOB\nOne chance, that's all.",
      ].join('\n\n');
      const res = await runD297(lines297nal);
      assert.ok(!res.issues.some((i: any) => i.rule === 'APOLOGY_LOOP'), 'APOLOGY_LOOP should not fire');
    });

    it('DIALOGUE_REPEATED_LINE fires when a 4+ word line is spoken verbatim 3+ times', async () => {
      const lines297rl = [
        "ALICE\nWe need to leave now.",
        "BOB\nNot until he calls back.",
        "ALICE\nWe need to leave now.",
        "BOB\nThe phone could ring any minute.",
        "ALICE\nWe need to leave now.",
        "BOB\nFive more minutes, please.",
        "ALICE\nThe car is already running.",
        "BOB\nThen turn it off.",
        "ALICE\nYou are impossible tonight.",
        "BOB\nAnd you are predictable.",
        "ALICE\nGet your coat already.",
        "BOB\nFine, you win this round.",
      ].join('\n\n');
      const res = await runD297(lines297rl);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_REPEATED_LINE'), 'DIALOGUE_REPEATED_LINE should fire');
    });

    it('DIALOGUE_REPEATED_LINE does not fire when no substantive line repeats 3 times', async () => {
      const lines297nrl = [
        "ALICE\nWe need to leave now.",
        "BOB\nNot until he calls back.",
        "ALICE\nWe really have to go.",
        "BOB\nThe phone could ring any minute.",
        "ALICE\nIt's time, grab your things.",
        "BOB\nFive more minutes, please.",
        "ALICE\nThe car is already running.",
        "BOB\nThen turn it off.",
        "ALICE\nYou are impossible tonight.",
        "BOB\nAnd you are predictable.",
        "ALICE\nGet your coat already.",
        "BOB\nFine, you win this round.",
      ].join('\n\n');
      const res = await runD297(lines297nrl);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_REPEATED_LINE'), 'DIALOGUE_REPEATED_LINE should not fire');
    });
  });


  describe('Wave 283 — dialoguePass: future tense flood, conditional overload, opener monotony', async () => {
    const runD283 = async (fountain: string) => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      return dialoguePass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('FUTURE_TENSE_FLOOD fires when >35% of 10+ dialogue lines use future tense', async () => {
      const lines283f = [
        "ALICE\nI'll fix it tomorrow.",
        "BOB\nWe'll see about that.",
        "ALICE\nYou'll regret this.",
        "BOB\nI will make sure it happens.",
        "ALICE\nThey'll never know.",
        "BOB\nWe're going to change everything.",
        "ALICE\nI'm going to leave now.",
        "BOB\nShe'll find out eventually.",
        "ALICE\nWe'll be fine.",
        "BOB\nNot tonight.",
      ].join('\n\n');
      const res = await runD283(lines283f);
      assert.ok(res.issues.some((i: any) => i.rule === 'FUTURE_TENSE_FLOOD'), 'FUTURE_TENSE_FLOOD should fire');
    });

    it('FUTURE_TENSE_FLOOD does not fire when future tense is ≤35%', async () => {
      const lines283nf = [
        "ALICE\nWhat happened here?",
        "BOB\nI told you already.",
        "ALICE\nThat's not good enough.",
        "BOB\nWe'll deal with it later.",
        "ALICE\nNow is better.",
        "BOB\nStop pushing.",
        "ALICE\nI need answers.",
        "BOB\nYou can't handle them.",
        "ALICE\nWatch me.",
        "BOB\nFine.",
      ].join('\n\n');
      const res = await runD283(lines283nf);
      assert.ok(!res.issues.some((i: any) => i.rule === 'FUTURE_TENSE_FLOOD'), 'FUTURE_TENSE_FLOOD should not fire');
    });

    it('DIALOGUE_CONDITIONAL_OVERLOAD fires when >30% of 10+ lines use conditionals', async () => {
      const lines283co = [
        "ALICE\nIf you leave now I won't stop you.",
        "BOB\nWould you really let me go?",
        "ALICE\nUnless you have something to say.",
        "BOB\nI could try to explain.",
        "ALICE\nIf you could do that.",
        "BOB\nWould it matter?",
        "ALICE\nIf you mean it, yes.",
        "BOB\nSure.",
        "ALICE\nI see.",
        "BOB\nOkay.",
      ].join('\n\n');
      const res = await runD283(lines283co);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_CONDITIONAL_OVERLOAD'), 'DIALOGUE_CONDITIONAL_OVERLOAD should fire');
    });

    it('DIALOGUE_CONDITIONAL_OVERLOAD does not fire when conditionals are ≤30%', async () => {
      const lines283nco = [
        "ALICE\nGet out.",
        "BOB\nNo.",
        "ALICE\nI mean it.",
        "BOB\nSo do I.",
        "ALICE\nYou have no idea what you've done.",
        "BOB\nI know exactly what I did.",
        "ALICE\nThen own it.",
        "BOB\nI do.",
        "ALICE\nProve it.",
        "BOB\nGive me a chance.",
      ].join('\n\n');
      const res = await runD283(lines283nco);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_CONDITIONAL_OVERLOAD'), 'DIALOGUE_CONDITIONAL_OVERLOAD should not fire');
    });

    it('DIALOGUE_OPENER_MONOTONY fires when single opener dominates >30% of substantive lines', async () => {
      const lines283om = [
        "ALICE\nWell I think you should go.",
        "BOB\nWell that is not happening.",
        "ALICE\nWell we need to talk about this.",
        "BOB\nWell I disagree completely.",
        "ALICE\nWell someone has to decide.",
        "BOB\nOkay fine then.",
        "ALICE\nWell are you listening to me.",
        "BOB\nI hear you loud and clear.",
        "ALICE\nWell then what is your answer.",
        "BOB\nWell I have no answer right now.",
        "ALICE\nThat is not acceptable.",
        "BOB\nDeal with it.",
      ].join('\n\n');
      const res = await runD283(lines283om);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_OPENER_MONOTONY'), 'DIALOGUE_OPENER_MONOTONY should fire');
    });

    it('DIALOGUE_OPENER_MONOTONY does not fire when openers are varied', async () => {
      const lines283nom = [
        "ALICE\nGet out of my house.",
        "BOB\nYou cannot do this to me.",
        "ALICE\nWatch me try right now.",
        "BOB\nAfter everything we have been through.",
        "ALICE\nBecause of what you did to us.",
        "BOB\nNothing happened the way you think.",
        "ALICE\nStop pretending you are innocent.",
        "BOB\nI am telling you the truth.",
        "ALICE\nEvery time you say that.",
        "BOB\nListen to me for once.",
        "ALICE\nTime is up for excuses.",
        "BOB\nPlease just hear me out.",
      ].join('\n\n');
      const res = await runD283(lines283nom);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_OPENER_MONOTONY'), 'DIALOGUE_OPENER_MONOTONY should not fire');
    });
  });


  describe('Wave 269 — dialoguePass: dialogue question cluster, agreement chain, long speech dominance', async () => {
    const dInput269 = (fountain: string) => ({ fountain, original: fountain, records: [] as any, structure: {} as any, annotations: [], approvedSpans: [] });

    it('DIALOGUE_QUESTION_CLUSTER fires when 3+ consecutive dialogue lines are questions', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      // 12 lines; first 4 are all questions
      const f269a = [
        'INT. ROOM - DAY', '',
        'ALICE', 'What do you want from me now?',
        'BOB', 'Why did you come here tonight?',
        'ALICE', 'Are you trying to trap me here?',
        'BOB', 'Did you really think I would not notice?',
        'ALICE', 'I did what I had to do.',
        'BOB', 'It was not your decision to make.',
        'ALICE', 'Someone had to take immediate action.',
        'BOB', 'That is not how we do things.',
        'ALICE', 'The situation demanded a response.',
        'BOB', 'You should have consulted me first.',
        'ALICE', 'There was no time left to wait.',
        'BOB', 'There is always time for this matter.',
      ].join('\n');
      const result269a = await dialoguePass(dInput269(f269a));
      const qc = result269a.issues.filter((i: any) => i.rule === 'DIALOGUE_QUESTION_CLUSTER');
      assert.ok(qc.length >= 1, `Should detect DIALOGUE_QUESTION_CLUSTER, got: ${JSON.stringify(result269a.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(qc[0].severity, 'minor');
    });

    it('DIALOGUE_QUESTION_CLUSTER does NOT fire when questions are not consecutive', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      // 12 lines; questions at lines 0, 2, 4, 6 — interleaved with statements
      const f269b = [
        'INT. ROOM - DAY', '',
        'ALICE', 'What do you want from me now?',
        'BOB', 'I came here to settle this matter.',
        'ALICE', 'Why did you come here tonight?',
        'BOB', 'Because you left me no other choice.',
        'ALICE', 'Are you trying to trap me here?',
        'BOB', 'I am trying to protect everyone involved.',
        'ALICE', 'Did you really think I would not notice?',
        'BOB', 'I had hoped we could avoid all of this.',
        'ALICE', 'We cannot pretend nothing happened here.',
        'BOB', 'Then we deal with it together now.',
        'ALICE', 'Fine. Tell me everything you know.',
        'BOB', 'It started three weeks ago at the factory.',
      ].join('\n');
      const result269b = await dialoguePass(dInput269(f269b));
      const qc = result269b.issues.filter((i: any) => i.rule === 'DIALOGUE_QUESTION_CLUSTER');
      assert.strictEqual(qc.length, 0, 'Should NOT fire when questions are not consecutive');
    });

    it('DIALOGUE_AGREEMENT_CHAIN fires when 3+ consecutive lines are agreement responses', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      // 10+ lines; BOB, CAROL, DAVE give 3 consecutive agreement lines in a row
      const f269c = [
        'INT. ROOM - DAY', '',
        'ALICE', 'We need everyone to commit to this plan right now.',
        'BOB', 'Yes.',
        'CAROL', 'Right.',
        'DAVE', 'Absolutely.',
        'ALICE', 'Then we proceed as discussed at midnight sharp.',
        'BOB', 'I will handle the eastern approach route tonight.',
        'CAROL', 'And I will cover the northern exit point clearly.',
        'DAVE', 'Everything is already in position for tonight.',
        'ALICE', 'Do not be late for the rendezvous point at all.',
        'BOB', 'We will not fail on this one tonight.',
      ].join('\n');
      const result269c = await dialoguePass(dInput269(f269c));
      const ac = result269c.issues.filter((i: any) => i.rule === 'DIALOGUE_AGREEMENT_CHAIN');
      assert.ok(ac.length >= 1, `Should detect DIALOGUE_AGREEMENT_CHAIN, got: ${JSON.stringify(result269c.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(ac[0].severity, 'minor');
    });

    it('DIALOGUE_AGREEMENT_CHAIN does NOT fire when agreements are separated by other lines', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      // 10+ lines; agreements at lines 1 and 5 — not consecutive
      const f269d = [
        'INT. ROOM - DAY', '',
        'ALICE', 'We move at midnight and take the eastern route.',
        'BOB', 'Yes.',
        'ALICE', 'Are you certain that is the safest way?',
        'BOB', 'I have my doubts about the eastern checkpoint.',
        'ALICE', 'Then we discuss alternatives before we commit.',
        'BOB', 'Agreed.',
        'ALICE', 'Good. Let us look at the map again.',
        'BOB', 'There might be a better route through the valley.',
        'ALICE', 'Show me what you are thinking here.',
        'BOB', 'It adds an hour but avoids the checkpoint completely.',
      ].join('\n');
      const result269d = await dialoguePass(dInput269(f269d));
      const ac = result269d.issues.filter((i: any) => i.rule === 'DIALOGUE_AGREEMENT_CHAIN');
      assert.strictEqual(ac.length, 0, 'Should NOT fire when agreements are separated by other lines');
    });

    it('LONG_SPEECH_DOMINANCE fires when more than 50% of dialogue lines are 15+ words', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      // 12 lines; 8 lines are 15+ words (67%)
      const f269e = [
        'INT. ROOM - DAY', '',
        'ALICE', 'I have been thinking about this situation for several days and I believe we need to act now before it is too late.',
        'BOB', 'The circumstances that led us here were entirely beyond our control and we should not blame ourselves for any of it.',
        'ALICE', 'Perhaps you are right but the consequences of inaction are just as serious as the consequences of acting too quickly here.',
        'BOB', 'We have to weigh every possible outcome before we commit to a course of action that cannot easily be reversed later.',
        'ALICE', 'I understand that and I share your caution but the window of opportunity will close if we do not move soon.',
        'BOB', 'Then let us at least agree on the minimal steps we can take together without exposing ourselves to unnecessary risk.',
        'ALICE', 'Fair enough.',
        'BOB', 'Good.',
        'ALICE', 'I will have the documents ready by tomorrow morning for the review we discussed at the last meeting in detail.',
        'BOB', 'And I will arrange the necessary contacts to ensure that everything proceeds according to the original plan we agreed on.',
        'ALICE', 'Perfect.',
        'BOB', 'Then we are aligned on this specific course of action and we can proceed with confidence knowing the plan is solid.',
      ].join('\n');
      const result269e = await dialoguePass(dInput269(f269e));
      const lsd = result269e.issues.filter((i: any) => i.rule === 'LONG_SPEECH_DOMINANCE');
      assert.ok(lsd.length >= 1, `Should detect LONG_SPEECH_DOMINANCE, got: ${JSON.stringify(result269e.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(lsd[0].severity, 'minor');
    });

    it('LONG_SPEECH_DOMINANCE does NOT fire when fewer than half of lines are long speeches', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      // 12 lines; only 3 lines are 15+ words (25%)
      const f269f = [
        'INT. ROOM - DAY', '',
        'ALICE', 'We need to talk.',
        'BOB', 'I know.',
        'ALICE', 'It cannot wait any longer.',
        'BOB', 'The situation has changed significantly since our last conversation and I believe we need to reconsider our position entirely.',
        'ALICE', 'Tell me more.',
        'BOB', 'New evidence came in.',
        'ALICE', 'What kind?',
        'BOB', 'The kind that changes everything.',
        'ALICE', 'Show me.',
        'BOB', 'Here.',
        'ALICE', 'I see what you mean now and I agree that this fundamentally alters the options that are available to us going forward.',
        'BOB', 'Exactly. So what do we do?',
      ].join('\n');
      const result269f = await dialoguePass(dInput269(f269f));
      const lsd = result269f.issues.filter((i: any) => i.rule === 'LONG_SPEECH_DOMINANCE');
      assert.strictEqual(lsd.length, 0, 'Should NOT fire when fewer than half of lines are long speeches');
    });
  });


  describe('Wave 255 — dialoguePass: ellipsis overuse, tag-question overuse, exclamation overuse', async () => {
    const dInput255 = (fountain: string) => ({ fountain, original: fountain, records: [] as any, structure: {} as any, annotations: [], approvedSpans: [] });

    it('ELLIPSIS_OVERUSE fires when >35% of dialogue lines contain an ellipsis', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      // 12 lines, 6 with ellipsis → 50%
      const f255a = [
        'INT. ROOM - DAY', '',
        'ALICE', 'I was going to say something...',
        'BOB', 'But you never finish...',
        'ALICE', 'It is just that... I wonder.',
        'BOB', 'We should talk about it later.',
        'ALICE', 'Maybe... maybe not.',
        'BOB', 'Tell me what you need from me.',
        'ALICE', 'I don\'t know... it is complicated.',
        'BOB', 'Everything is complicated with you.',
        'ALICE', 'If only you understood...',
        'BOB', 'I am trying my best here.',
        'ALICE', 'Are you, though...',
        'BOB', 'Let us just go home.',
      ].join('\n');
      const result255a = await dialoguePass(dInput255(f255a));
      assert.ok(result255a.issues.some((i: any) => i.rule === 'ELLIPSIS_OVERUSE'), `Expected ELLIPSIS_OVERUSE, got: ${JSON.stringify(result255a.issues.map((i: any) => i.rule))}`);
    });

    it('ELLIPSIS_OVERUSE does NOT fire when few lines use ellipsis', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      // 12 lines, 1 with ellipsis → 8%
      const f255b = [
        'INT. ROOM - DAY', '',
        'ALICE', 'Tell me everything you know.',
        'BOB', 'It happened at noon yesterday.',
        'ALICE', 'Who else was in the room.',
        'BOB', 'Only the two of us were there.',
        'ALICE', 'Then you saw what he did.',
        'BOB', 'I saw the whole thing clearly.',
        'ALICE', 'Good. We can use that.',
        'BOB', 'Well... I am not so sure.',
        'ALICE', 'We have no other choice now.',
        'BOB', 'Fine. Let us proceed carefully.',
        'ALICE', 'Meet me at the dock tonight.',
        'BOB', 'I will be there on time.',
      ].join('\n');
      const result255b = await dialoguePass(dInput255(f255b));
      assert.ok(!result255b.issues.some((i: any) => i.rule === 'ELLIPSIS_OVERUSE'), 'Should NOT fire when few lines use ellipsis');
    });

    it('TAG_QUESTION_OVERUSE fires when >25% of dialogue lines end with a tag question', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      // 10 lines, 4 tag questions → 40%
      const f255c = [
        'INT. ROOM - DAY', '',
        'ALICE', 'You came here to help me, right?',
        'BOB', 'I always do what I can.',
        'ALICE', 'It is the right thing, isn\'t it?',
        'BOB', 'We have been over this before.',
        'ALICE', 'You trust me, don\'t you?',
        'BOB', 'Of course I trust you.',
        'ALICE', 'Then we move tonight, okay?',
        'BOB', 'Let me think it over first.',
        'ALICE', 'There is no time to waste.',
        'BOB', 'I understand the stakes here.',
      ].join('\n');
      const result255c = await dialoguePass(dInput255(f255c));
      assert.ok(result255c.issues.some((i: any) => i.rule === 'TAG_QUESTION_OVERUSE'), `Expected TAG_QUESTION_OVERUSE, got: ${JSON.stringify(result255c.issues.map((i: any) => i.rule))}`);
    });

    it('TAG_QUESTION_OVERUSE does NOT fire when few lines are tag questions', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      // 10 lines, 1 tag question → 10%
      const f255d = [
        'INT. ROOM - DAY', '',
        'ALICE', 'We move at dawn.',
        'BOB', 'I will ready the car.',
        'ALICE', 'Bring the documents with you.',
        'BOB', 'They are already packed.',
        'ALICE', 'Good work on this.',
        'BOB', 'It was nothing special.',
        'ALICE', 'You did well, didn\'t you?',
        'BOB', 'I suppose I did.',
        'ALICE', 'Now we wait for the signal.',
        'BOB', 'I hate the waiting part.',
      ].join('\n');
      const result255d = await dialoguePass(dInput255(f255d));
      assert.ok(!result255d.issues.some((i: any) => i.rule === 'TAG_QUESTION_OVERUSE'), 'Should NOT fire when few lines are tag questions');
    });

    it('EXCLAMATION_OVERUSE fires when >35% of dialogue lines end with an exclamation', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      // 12 lines, 6 ending with '!' → 50%
      const f255e = [
        'INT. ROOM - DAY', '',
        'ALICE', 'Get out of here now!',
        'BOB', 'You cannot make me!',
        'ALICE', 'I said move it!',
        'BOB', 'This is insane.',
        'ALICE', 'Listen to me!',
        'BOB', 'I am listening.',
        'ALICE', 'Then do something!',
        'BOB', 'I am trying my best.',
        'ALICE', 'Try harder!',
        'BOB', 'Give me a moment.',
        'ALICE', 'We have no time.',
        'BOB', 'Fine, let us go.',
      ].join('\n');
      const result255e = await dialoguePass(dInput255(f255e));
      assert.ok(result255e.issues.some((i: any) => i.rule === 'EXCLAMATION_OVERUSE'), `Expected EXCLAMATION_OVERUSE, got: ${JSON.stringify(result255e.issues.map((i: any) => i.rule))}`);
    });

    it('EXCLAMATION_OVERUSE does NOT fire when few lines end with an exclamation', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      // 12 lines, 1 ending with '!' → 8%
      const f255f = [
        'INT. ROOM - DAY', '',
        'ALICE', 'We should leave soon.',
        'BOB', 'I agree with that.',
        'ALICE', 'The roads will be clear.',
        'BOB', 'Let us take the back way.',
        'ALICE', 'That is wise.',
        'BOB', 'I packed the maps already.',
        'ALICE', 'Good thinking on that.',
        'BOB', 'We make a decent team.',
        'ALICE', 'Watch out!',
        'BOB', 'I see it. We are fine.',
        'ALICE', 'That was close.',
        'BOB', 'Let us keep moving.',
      ].join('\n');
      const result255f = await dialoguePass(dInput255(f255f));
      assert.ok(!result255f.issues.some((i: any) => i.rule === 'EXCLAMATION_OVERUSE'), 'Should NOT fire when few lines end with an exclamation');
    });
  });


  describe('Wave 241 — dialoguePass: self-correction absent, speaker pair monopoly, retrospective flood', async () => {
    it('DIALOGUE_SELF_CORRECTION_ABSENT fires when no dialogue line contains a self-correction marker', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      // 15 dialogue lines, none with self-correction
      const speakers = ['ALICE', 'BOB'];
      const lines241a = [
        'INT. ROOM - DAY', '',
        ...Array.from({ length: 15 }, (_, i) => [speakers[i % 2], `Tell me what you know about it.`]).flat(),
      ];
      const f241a = lines241a.join('\n');
      const result = await dialoguePass({ fountain: f241a, original: f241a, records: [] as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(result.issues.some((i: any) => i.rule === 'DIALOGUE_SELF_CORRECTION_ABSENT'), `Expected DIALOGUE_SELF_CORRECTION_ABSENT, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('DIALOGUE_SELF_CORRECTION_ABSENT does NOT fire when at least one line has a self-correction', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      const speakers = ['ALICE', 'BOB'];
      const lines241b = [
        'INT. ROOM - DAY', '',
        ...Array.from({ length: 14 }, (_, i) => [speakers[i % 2], 'Tell me what you know.']).flat(),
        'ALICE', 'I mean, actually, let me start over.',
      ];
      const f241b = lines241b.join('\n');
      const result = await dialoguePass({ fountain: f241b, original: f241b, records: [] as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(!result.issues.some((i: any) => i.rule === 'DIALOGUE_SELF_CORRECTION_ABSENT'), 'Should NOT fire when at least one self-correction exists');
    });

    it('SPEAKER_PAIR_MONOPOLY fires when two speakers deliver ≥85% of dialogue with ≥4 speakers present', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      // 16 lines: ALICE=8, BOB=6, CAROL=1, DAN=1 → top-2=14/16=87.5%
      const f241c = [
        'INT. ROOM - DAY', '',
        ...Array.from({ length: 8 }, () => ['ALICE', 'I want to explain what happened here.']).flat(),
        ...Array.from({ length: 6 }, () => ['BOB', 'That is not what I remember at all.']).flat(),
        'CAROL', 'Excuse me.',
        'DAN', 'Right.',
      ].join('\n');
      const result = await dialoguePass({ fountain: f241c, original: f241c, records: [] as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(result.issues.some((i: any) => i.rule === 'SPEAKER_PAIR_MONOPOLY'), `Expected SPEAKER_PAIR_MONOPOLY, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('SPEAKER_PAIR_MONOPOLY does NOT fire when dialogue is distributed across speakers', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      // 16 lines: ALICE=4, BOB=4, CAROL=4, DAN=4 → top-2=8/16=50%
      const f241d = [
        'INT. ROOM - DAY', '',
        ...Array.from({ length: 4 }, () => ['ALICE', 'I see what you mean.']).flat(),
        ...Array.from({ length: 4 }, () => ['BOB', 'Tell me more about it.']).flat(),
        ...Array.from({ length: 4 }, () => ['CAROL', 'That seems important to me.']).flat(),
        ...Array.from({ length: 4 }, () => ['DAN', 'I agree with that view.']).flat(),
      ].join('\n');
      const result = await dialoguePass({ fountain: f241d, original: f241d, records: [] as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(!result.issues.some((i: any) => i.rule === 'SPEAKER_PAIR_MONOPOLY'), 'Should NOT fire when dialogue is evenly distributed');
    });

    it('DIALOGUE_RETROSPECTIVE_FLOOD fires when >55% of dialogue lines contain past-tense verbs', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      // 12 lines, 8 with past tense verbs
      const f241e = [
        'INT. ROOM - DAY', '',
        'ALICE', 'She told me everything that happened.',
        'BOB', 'He left before I arrived home.',
        'ALICE', 'They were there when I came back.',
        'BOB', 'She said the same thing to me.',
        'ALICE', 'I walked to the door and looked.',
        'BOB', 'He had been there for hours.',
        'ALICE', 'They went upstairs and found nothing.',
        'BOB', 'She heard the noise and ran away.',
        'ALICE', 'Good morning.',
        'BOB', 'Ready today.',
        'ALICE', 'Plans are set.',
        'BOB', 'Clear day.',
      ].join('\n');
      const result = await dialoguePass({ fountain: f241e, original: f241e, records: [] as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(result.issues.some((i: any) => i.rule === 'DIALOGUE_RETROSPECTIVE_FLOOD'), `Expected DIALOGUE_RETROSPECTIVE_FLOOD, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('DIALOGUE_RETROSPECTIVE_FLOOD does NOT fire when dialogue is mostly present-tense', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      // 12 lines, no past tense verbs from the regex list
      const f241f = [
        'INT. ROOM - DAY', '',
        'ALICE', 'I plan to meet him this evening.',
        'BOB', 'She drives downtown every morning.',
        'ALICE', 'What time does he arrive today.',
        'BOB', 'The office closes at six sharp.',
        'ALICE', 'I expect this to finish soon.',
        'BOB', 'She speaks clearly under pressure.',
        'ALICE', 'Everything changes if we act quickly.',
        'BOB', 'He opens the drawer and reaches in.',
        'ALICE', 'I see the papers on the desk.',
        'BOB', 'She carries the report to him.',
        'ALICE', 'He signs his name.',
        'BOB', 'I agree with your view here.',
      ].join('\n');
      const result = await dialoguePass({ fountain: f241f, original: f241f, records: [] as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(!result.issues.some((i: any) => i.rule === 'DIALOGUE_RETROSPECTIVE_FLOOD'), 'Should NOT fire when dialogue is mostly present-tense');
    });
  });


  describe('Wave 215 — dialoguePass: non-responsive exchange, lexical poverty, cadence monotony (conversational dynamics)', async () => {
    // Build a fountain from [speaker, line] turns so each turn parses to one dialogue line.
    const buildDialogueFountain215 = (turns: Array<[string, string]>) =>
      'INT. ROOM - DAY\n\n' + turns.map(([s, l]) => `${s}\n${l}\n`).join('\n');
    const makeInput215 = (turns: Array<[string, string]>) => {
      const fountain = buildDialogueFountain215(turns);
      return {
        fountain, original: fountain,
        records: [] as any, structure: {} as any,
        storyContext: {} as any, annotations: [] as any,
        approvedSpans: [],
      };
    };

    it('NON_RESPONSIVE_EXCHANGE fires when consecutive turns share no content words', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      // 10 alternating turns, each about a wholly unrelated subject → 9 non-responsive
      // transitions in a row → run ≥ 4 → fires
      const turns: Array<[string, string]> = [
        ['ALICE', 'Mountains towered above frozen northern valleys.'],
        ['BOB', 'Quarterly accountants filed annual taxes yesterday.'],
        ['ALICE', 'Penguins migrated across southern frozen oceans.'],
        ['BOB', 'Carburetors require expensive replacement gaskets soon.'],
        ['ALICE', 'Shakespeare authored numerous celebrated tragedies.'],
        ['BOB', 'Volcanoes disrupted busy airline departure schedules.'],
        ['ALICE', 'Bakers kneaded fresh sourdough overnight downstairs.'],
        ['BOB', 'Telescopes magnified extremely distant spiral galaxies.'],
        ['ALICE', 'Gardeners pruned wildly overgrown suburban hedges.'],
        ['BOB', 'Investors panicked during sudden market downturns.'],
      ];
      const result = await dialoguePass(makeInput215(turns));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'NON_RESPONSIVE_EXCHANGE'),
        'Should fire when 4+ consecutive cross-speaker turns share no content words',
      );
    });

    it('NON_RESPONSIVE_EXCHANGE does not fire when each turn engages the previous one', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      // Each line shares a content word with the line it answers → every transition responsive
      const turns: Array<[string, string]> = [
        ['ALICE', 'Where are the missing financial documents?'],
        ['BOB', 'Those documents stayed inside locked cabinets.'],
        ['ALICE', 'Which cabinets hold the legal folders?'],
        ['BOB', 'Legal folders contain the signed contracts.'],
        ['ALICE', 'Were the contracts mailed before deadline?'],
        ['BOB', 'The deadline passed without any warning.'],
        ['ALICE', 'What warning reached the company directors?'],
        ['BOB', 'Directors approved the final annual budget.'],
        ['ALICE', 'The budget funded brand new equipment.'],
        ['BOB', 'Equipment arrived during early winter storms.'],
      ];
      const result = await dialoguePass(makeInput215(turns));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'NON_RESPONSIVE_EXCHANGE'),
        'Should NOT fire when consecutive turns share content words (responsive exchange)',
      );
    });

    it('DIALOGUE_LEXICAL_POVERTY fires when characters recycle a tiny vocabulary', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      // 10 lines drawn from a 3-word pool → ~50 content tokens, 3 unique → TTR ≈ 0.06
      const turns: Array<[string, string]> = Array.from({ length: 10 }, (_, i) =>
        [i % 2 === 0 ? 'ALICE' : 'BOB', 'Money power control money power.'] as [string, string],
      );
      const result = await dialoguePass(makeInput215(turns));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'DIALOGUE_LEXICAL_POVERTY'),
        'Should fire when the content-word type-token ratio falls below 0.45',
      );
    });

    it('DIALOGUE_LEXICAL_POVERTY does not fire when the vocabulary is rich', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      // 10 lines of largely unique content words → TTR near 1.0
      const turns: Array<[string, string]> = [
        ['ALICE', 'The ancient lighthouse guarded treacherous coastal rocks.'],
        ['BOB', 'Migrating swallows vanished beyond distant autumn horizons.'],
        ['ALICE', 'Grandmother baked cinnamon pastries every quiet morning.'],
        ['BOB', 'Engineers calibrated satellites orbiting faraway frozen planets.'],
        ['ALICE', 'Raging wildfires consumed thousands of forested acres.'],
        ['BOB', 'Violinists rehearsed symphonies inside marble concert auditoriums.'],
        ['ALICE', 'Detectives uncovered forged documents beneath dusty floorboards.'],
        ['BOB', 'Retreating glaciers exposed ancient warming polar regions.'],
        ['ALICE', 'Merchants traded exotic spices along scorching desert routes.'],
        ['BOB', 'Astronomers photographed comets streaking through midnight skies.'],
      ];
      const result = await dialoguePass(makeInput215(turns));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'DIALOGUE_LEXICAL_POVERTY'),
        'Should NOT fire when the dialogue draws on a wide, varied vocabulary',
      );
    });

    it('CADENCE_MONOTONY fires when every line runs the same length', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      // 12 lines, each exactly 7 words → coefficient of variation 0 → fires
      const seven: string[] = [
        'She quietly closed the heavy wooden door.',
        'He never wanted to leave this town.',
        'They walked along the empty midnight shoreline.',
        'Nobody answered the phone that cold evening.',
        'We hid the letters beneath loose floorboards.',
        'You promised to return before the storm.',
        'The children gathered around the dying fire.',
        'Smoke drifted slowly across the silent valley.',
        'Her hands trembled holding the faded photograph.',
        'Rain fell steadily upon the tin roof.',
        'He counted every coin inside the jar.',
        'Morning light crept beneath the wooden shutters.',
      ];
      const turns: Array<[string, string]> = seven.map((l, i) =>
        [i % 2 === 0 ? 'ALICE' : 'BOB', l] as [string, string],
      );
      const result = await dialoguePass(makeInput215(turns));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'CADENCE_MONOTONY'),
        'Should fire when line-length coefficient of variation is below 0.35',
      );
    });

    it('CADENCE_MONOTONY does not fire when line lengths vary widely', async () => {
      const { dialoguePass } = await import('../../server/nvm/revision/passes/dialogue.ts');
      // 12 lines with lengths [2,9,3,11,2,8,4,10,3,9,2,8] → high coefficient of variation
      const varied: string[] = [
        'Get out.',
        'I have been waiting right here for three hours.',
        'Close the door.',
        'You never once considered how any of this truly affects me.',
        'Stop it.',
        'We should have left this place long ago.',
        'I do not believe you.',
        'Everything we built together has finally come crashing down today.',
        'Just go away.',
        'She quietly walked across the empty parking lot outside.',
        'No more.',
        'Nothing about this situation makes any sense anymore.',
      ];
      const turns: Array<[string, string]> = varied.map((l, i) =>
        [i % 2 === 0 ? 'ALICE' : 'BOB', l] as [string, string],
      );
      const result = await dialoguePass(makeInput215(turns));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'CADENCE_MONOTONY'),
        'Should NOT fire when line lengths alternate between short and long',
      );
    });
  });


  describe('Wave 204 — dialoguePass: punctuation flatline, staccato overuse, pronoun-I overload', async () => {
    const blankRec204 = (): any => ({
      commitId: 'c0', sceneIdx: 0, slug: 'INT. ROOM - DAY',
      purpose: 'dialogue', dramaticTurn: 'nothing', revelation: null,
      clockRaised: false, clockDelta: 0, emotionalShift: 'neutral', suspenseDelta: 1,
      dialogueHighlights: [], unresolvedClues: [], seededClueIds: [],
      payoffSetupIds: [], visualBeats: [], relationshipShifts: [],
    });
    const dlgInput204 = (fountain: string) => ({
      fountain, original: fountain, records: [blankRec204()],
      structure: {} as any, annotations: [], approvedSpans: [],
    });

    // ── PUNCTUATION_FLATLINE ──────────────────────────────────────────────────
    it('dialoguePass detects PUNCTUATION_FLATLINE when >85% of lines end with period and none with "!"', async () => {
      // 12 dialogue lines, all ending in period, no '!', all >5 words, none start "I"
      const fountain = `INT. OFFICE - DAY

The room is quiet.

ALICE
The numbers came back from the lab today.

BOB
They confirmed everything we suspected about him.

ALICE
We should bring this to the board soon.

BOB
The board will want more evidence first.

She walks to the window.

ALICE
There is enough here to start the process.

BOB
Maybe the timing could not be any worse.

ALICE
We have waited long enough for this moment.

BOB
Then we move forward with the plan tomorrow.

He closes the folder.

ALICE
The others need to know what happened here.

BOB
They will find out soon enough themselves.

ALICE
We cannot keep them in the dark forever.

BOB
For now we keep this between the two of us.
`;
      const result = await dialoguePass(dlgInput204(fountain));
      const issues = result.issues.filter(i => i.rule === 'PUNCTUATION_FLATLINE');
      assert.ok(issues.length >= 1, `Should detect PUNCTUATION_FLATLINE; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(issues[0].severity === 'minor');
    });

    it('dialoguePass does NOT fire PUNCTUATION_FLATLINE when some lines end with "!"', async () => {
      const fountain = `INT. OFFICE - DAY

The room is quiet.

ALICE
The numbers came back from the lab today!

BOB
They confirmed everything we suspected about him.

ALICE
We should bring this to the board soon!

BOB
The board will want more evidence first.

She walks to the window.

ALICE
There is enough here to start the process.

BOB
Maybe the timing could not be any worse!

ALICE
We have waited long enough for this moment.

BOB
Then we move forward with the plan tomorrow.

He closes the folder.

ALICE
The others need to know what happened here.

BOB
They will find out soon enough themselves.

ALICE
We cannot keep them in the dark forever.

BOB
For now we keep this between the two of us.
`;
      const result = await dialoguePass(dlgInput204(fountain));
      assert.ok(
        !result.issues.some(i => i.rule === 'PUNCTUATION_FLATLINE'),
        'Should NOT fire when some dialogue lines end with "!"',
      );
    });

    // ── DIALOGUE_STACCATO_OVERUSE ─────────────────────────────────────────────
    it('dialoguePass detects DIALOGUE_STACCATO_OVERUSE when >65% of lines are five words or fewer', async () => {
      // 12 dialogue lines, all <=5 words; varied punctuation to avoid flatline
      const fountain = `INT. ALLEY - NIGHT

They press against the wall.

ALICE
Get down now!

BOB
They saw us.

ALICE
Move to the back.

BOB
The door is locked.

He tries the handle.

ALICE
Break the window!

BOB
Too much noise.

ALICE
We have no choice.

BOB
Wait for my signal.

She crouches low.

ALICE
The guard is coming.

BOB
Hold your position.

ALICE
He turned away now.

BOB
Move move move!
`;
      const result = await dialoguePass(dlgInput204(fountain));
      const issues = result.issues.filter(i => i.rule === 'DIALOGUE_STACCATO_OVERUSE');
      assert.ok(issues.length >= 1, `Should detect DIALOGUE_STACCATO_OVERUSE; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(issues[0].severity === 'minor');
    });

    it('dialoguePass does NOT fire DIALOGUE_STACCATO_OVERUSE when lines are developed sentences', async () => {
      const fountain = `INT. ALLEY - NIGHT

They press against the wall.

ALICE
We need to get down before they spot us!

BOB
They already saw us when we crossed the street.

ALICE
Then we move toward the back exit quietly.

BOB
The back door has been locked since this morning.

He tries the handle.

ALICE
We could break the window if we move fast!

BOB
That would make far too much noise for comfort.

ALICE
We really do not have any other choice now.

BOB
Just wait for my signal before you do anything.

She crouches low.

ALICE
The guard is coming around the corner toward us.

BOB
Hold your position and do not make a sound.

ALICE
He finally turned away from our hiding spot.

BOB
Now we move quickly before he comes back around!
`;
      const result = await dialoguePass(dlgInput204(fountain));
      assert.ok(
        !result.issues.some(i => i.rule === 'DIALOGUE_STACCATO_OVERUSE'),
        'Should NOT fire when most lines are developed sentences',
      );
    });

    // ── PRONOUN_I_OVERLOAD ────────────────────────────────────────────────────
    it('dialoguePass detects PRONOUN_I_OVERLOAD when >60% of lines begin with "I"', async () => {
      // 10 dialogue lines, 7 begin with "I" (70%)
      const fountain = `INT. CORRIDOR - DAY

The hallway stretches ahead.

ALICE
I walked the entire length of the corridor.

BOB
The lights were already off when we arrived.

ALICE
I checked every single door along the way.

BOB
I saw nothing out of place down there.

She kneels by the mat.

ALICE
I found the spare key under the mat.

BOB
That is where they always seem to leave it.

ALICE
I opened the safe without any real trouble.

BOB
I think the documents were right where we expected.

He pockets the drive.

ALICE
I copied everything onto the backup drive.

ALICE
I left long before anyone even noticed me there.
`;
      const result = await dialoguePass(dlgInput204(fountain));
      const issues = result.issues.filter(i => i.rule === 'PRONOUN_I_OVERLOAD');
      assert.ok(issues.length >= 1, `Should detect PRONOUN_I_OVERLOAD; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(issues[0].severity === 'minor');
    });

    it('dialoguePass does NOT fire PRONOUN_I_OVERLOAD when openers are varied', async () => {
      const fountain = `INT. CORRIDOR - DAY

The hallway stretches ahead.

ALICE
The corridor ran the entire length of the floor.

BOB
The lights were already off when we arrived.

ALICE
Every single door along the way was checked.

BOB
Nothing seemed out of place down there.

She kneels by the mat.

ALICE
The spare key was hidden under the mat.

BOB
That is where they always seem to leave it.

ALICE
The safe opened without any real trouble.

BOB
Those documents were right where we expected.

He pockets the drive.

ALICE
Everything went onto the backup drive cleanly.

BOB
Nobody even noticed us leaving the building.
`;
      const result = await dialoguePass(dlgInput204(fountain));
      assert.ok(
        !result.issues.some(i => i.rule === 'PRONOUN_I_OVERLOAD'),
        'Should NOT fire when dialogue openers are varied',
      );
    });
  });


describe('Wave 123 — dialoguePass: ON_THE_NOSE_RE false-positive fix + TRAIT_LABELING', () => {
  it('ON_THE_NOSE does not fire for "I feel the cold wind" (non-emotion "I feel")', async () => {
    const fountain = 'INT. OFFICE - DAY\n\nALICE\nI feel the cold wind on my skin.\n';
    const result = await dialoguePass(makePassInput(fountain));
    const onNose = result.issues.find(i => i.rule === 'ON_THE_NOSE');
    assert.equal(onNose, undefined, 'ON_THE_NOSE must not fire for physical "I feel" without emotion word');
  });

  it('ON_THE_NOSE fires correctly for "I feel so angry"', async () => {
    const fountain = 'INT. OFFICE - DAY\n\nALICE\nI feel so angry right now.\n';
    const result = await dialoguePass(makePassInput(fountain));
    const onNose = result.issues.find(i => i.rule === 'ON_THE_NOSE');
    assert.ok(onNose, 'ON_THE_NOSE fires for direct emotion statement');
  });

  it('TRAIT_LABELING fires when character labels another character', async () => {
    const fountain = 'INT. OFFICE - DAY\n\nALICE\nYou are such a coward, you know that?\n\nBOB\nYou\'re right.\n';
    const result = await dialoguePass(makePassInput(fountain));
    const traitIssue = result.issues.find(i => i.rule === 'TRAIT_LABELING');
    assert.ok(traitIssue, 'TRAIT_LABELING fires for explicit trait labeling in dialogue');
  });
});


// ── Wave 135: Dialogue Subtext Level 2 ───────────────────────────────────────

describe('Wave 135 — dialoguePass: Level 2 subtext analysis', () => {

  function makeDialogueInput(fountain: string, records: import('../../server/nvm/screenplay/memory.ts').ScreenplaySceneRecord[]): import('../../server/nvm/revision/passes/types.ts').PassInput {
    return {
      fountain,
      original: fountain,
      annotations: [],
      structure: makeStructureForRevision('act1', 0, 0, false),
      records,
      approvedSpans: [],
      storyContext: undefined,
    };
  }

  it('EMOTIONAL_SUPPRESSION fires when a speaker uses ≥60% positive vocab in a negative-shift scene', async () => {
    const fountain = `INT. HOSPITAL - DAY

ALICE
Everything's fine, really.

ALICE
I'm okay, don't worry.

ALICE
It's going to be fine, no problem.

BOB
Are you sure?
`;
    const records: import('../../server/nvm/screenplay/memory.ts').ScreenplaySceneRecord[] = [
      makeSceneRecord({ sceneIdx: 0, emotionalShift: 'negative' }),
    ];
    const result = await dialoguePass(makeDialogueInput(fountain, records));
    assert.ok(
      result.issues.some(i => i.rule === 'EMOTIONAL_SUPPRESSION'),
      'EMOTIONAL_SUPPRESSION should fire when speaker denies a negative-shift scene',
    );
  });

  it('EMOTIONAL_SUPPRESSION does NOT fire when speaker has fewer than 3 lines', async () => {
    const fountain = `INT. HOSPITAL - DAY

ALICE
Everything's fine.

ALICE
I'm okay.

BOB
Okay.
`;
    const records: import('../../server/nvm/screenplay/memory.ts').ScreenplaySceneRecord[] = [
      makeSceneRecord({ sceneIdx: 0, emotionalShift: 'negative' }),
    ];
    const result = await dialoguePass(makeDialogueInput(fountain, records));
    assert.ok(
      !result.issues.some(i => i.rule === 'EMOTIONAL_SUPPRESSION'),
      'EMOTIONAL_SUPPRESSION should not fire with fewer than 3 lines per speaker',
    );
  });

  it('POWER_SILENCE fires when one speaker > 70% of lines in a large-relationship-shift scene', async () => {
    const fountain = `INT. COURTROOM - DAY

ALICE
I never agreed to that.

ALICE
You can't just do this.

ALICE
Listen to me, this isn't fair.

ALICE
Why won't you say anything?

BOB
Fine.
`;
    const records: import('../../server/nvm/screenplay/memory.ts').ScreenplaySceneRecord[] = [
      makeSceneRecord({ sceneIdx: 0, relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: -0.8 }] }),
    ];
    const result = await dialoguePass(makeDialogueInput(fountain, records));
    assert.ok(
      result.issues.some(i => i.rule === 'POWER_SILENCE'),
      'POWER_SILENCE should fire when one speaker dominates in a relationship-shifting scene',
    );
  });

  it('QUESTION_DODGE fires when a direct question is followed by an unrelated response', async () => {
    const fountain = `INT. KITCHEN - DAY

ALICE
Where were you last night during the blackout?

BOB
These flowers look beautiful today.
`;
    const records: import('../../server/nvm/screenplay/memory.ts').ScreenplaySceneRecord[] = [
      makeSceneRecord({ sceneIdx: 0 }),
    ];
    const result = await dialoguePass(makeDialogueInput(fountain, records));
    assert.ok(
      result.issues.some(i => i.rule === 'QUESTION_DODGE'),
      'QUESTION_DODGE should fire when the response ignores the question subject',
    );
  });

  it('QUESTION_DODGE does NOT fire when the response addresses the question', async () => {
    const fountain = `INT. KITCHEN - DAY

ALICE
Where were you last night during the blackout?

BOB
I was at the station during the blackout, working late.
`;
    const records: import('../../server/nvm/screenplay/memory.ts').ScreenplaySceneRecord[] = [
      makeSceneRecord({ sceneIdx: 0 }),
    ];
    const result = await dialoguePass(makeDialogueInput(fountain, records));
    assert.ok(
      !result.issues.some(i => i.rule === 'QUESTION_DODGE'),
      'QUESTION_DODGE should not fire when the response contains question subjects',
    );
  });

  it('DENIAL_INVERSION fires when a strong negative is immediately followed by a forced positive', async () => {
    const fountain = `INT. LIVING ROOM - NIGHT

ALICE
I can't believe she's gone.

ALICE
But everything will be fine, I'm okay.

BOB
We'll get through this.
`;
    const records: import('../../server/nvm/screenplay/memory.ts').ScreenplaySceneRecord[] = [
      makeSceneRecord({ sceneIdx: 0, emotionalShift: 'negative' }),
    ];
    const result = await dialoguePass(makeDialogueInput(fountain, records));
    assert.ok(
      result.issues.some(i => i.rule === 'DENIAL_INVERSION'),
      'DENIAL_INVERSION should fire for strong-negative → forced-positive sequence',
    );
  });

  it('passes clean dialogue with none of the Level 2 rules', async () => {
    const fountain = `INT. CAFE - DAY

ALICE
You've been avoiding me.

BOB
I needed some space to think.

ALICE
About what?

BOB
About everything that happened at the marina.
`;
    const records: import('../../server/nvm/screenplay/memory.ts').ScreenplaySceneRecord[] = [
      makeSceneRecord({ sceneIdx: 0, emotionalShift: 'neutral' }),
    ];
    const result = await dialoguePass(makeDialogueInput(fountain, records));
    const level2Rules = ['EMOTIONAL_SUPPRESSION', 'POWER_SILENCE', 'QUESTION_DODGE', 'DENIAL_INVERSION'];
    const level2Issues = result.issues.filter(i => level2Rules.includes(i.rule));
    assert.equal(level2Issues.length, 0, `clean dialogue should not trigger Level 2 rules, got: ${level2Issues.map(i => i.rule).join(', ')}`);
  });

});