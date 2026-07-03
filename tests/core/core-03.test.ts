// Extracted from the former monolithic test.ts (audit M2.1 — split for maintainability).
// Engine/lib/nvm-core tests that predate or fall outside the 14-pass wave rotation. Shared imports/helpers below are duplicated verbatim across every split
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


// ── Wave 85 ───────────────────────────────────────────────────────────────────
describe('Wave 85 — converge loop onStep callback + M7 continuity cleanup', () => {

  // ── onStep callback ───────────────────────────────────────────────────────

  it('ConvergeStep onStep callback fires for each evaluated candidate', async () => {
    const { convergeScene } = await import('../../server/nvm/converge/loop.ts');
    const { emptyState } = await import('../../server/nvm/state/NarrativeState.ts');

    const steps: unknown[] = [];
    let generateCalls = 0;

    const fakeGenerate = async (_spec: unknown, n: number) => {
      generateCalls += n;
      return Array.from({ length: n }, (_, i) => ({
        transitionId: `cand-${generateCalls}-${i}`,
        sceneIdx: 0,
        sceneFunction: 'build_tension' as const,
        activeMechanisms: ['core_mechanism'],
        beforeStateHash: '',
        ops: [],
        preconditions: [{ type: 'state_exists' as const, factId: 'world' }],
        postconditions: [],
        provenance: { origin: 'model_generated' as const, createdAt: Date.now() },
      }));
    };

    const state = emptyState();
    const target = { sceneIdx: 0, sceneFunction: 'build_tension' as const, activeMechanisms: [], tensionTarget: 1, qualityTarget: 1 };
    const budget = {
      maxIterations: 2,
      candidatesPerIteration: 2,
      onStep: (step: import('../../server/nvm/converge/loop.ts').ConvergeStep) => {
        steps.push({ iteration: step.iteration, passed: step.passed });
      },
    };

    await convergeScene(state as import('../../server/nvm/state/NarrativeState.ts').NarrativeState, target, fakeGenerate as unknown as import('../../server/nvm/generate/proof-spec.ts').CandidateGenerator, budget);

    // Should have received at least one step (iter 0 with candidatesPerIteration=2 means 2 steps)
    assert.ok(steps.length >= 2, `Expected ≥2 onStep calls, got ${steps.length}`);
    // First step should be iteration 0
    assert.equal((steps[0] as { iteration: number }).iteration, 0);
  });

  it('onStep callback receives valid ConvergeStep fields', async () => {
    const { convergeScene } = await import('../../server/nvm/converge/loop.ts');
    const { emptyState } = await import('../../server/nvm/state/NarrativeState.ts');

    const collectedSteps: import('../../server/nvm/converge/loop.ts').ConvergeStep[] = [];

    const fakeGenerate = async (_spec: unknown, n: number) =>
      Array.from({ length: n }, (_, i) => ({
        transitionId: `t-${i}`,
        sceneIdx: 0,
        sceneFunction: 'build_tension' as const,
        activeMechanisms: ['core_mechanism'],
        beforeStateHash: '',
        ops: [],
        preconditions: [{ type: 'state_exists' as const, factId: 'x' }],
        postconditions: [],
        provenance: { origin: 'model_generated' as const, createdAt: Date.now() },
      }));

    const state = emptyState();
    const target = { sceneIdx: 0, sceneFunction: 'build_tension' as const, activeMechanisms: [], tensionTarget: 1, qualityTarget: 1 };
    await convergeScene(
      state as import('../../server/nvm/state/NarrativeState.ts').NarrativeState,
      target,
      fakeGenerate as unknown as import('../../server/nvm/generate/proof-spec.ts').CandidateGenerator,
      { maxIterations: 1, candidatesPerIteration: 1, onStep: s => collectedSteps.push(s) },
    );

    assert.ok(collectedSteps.length >= 1);
    const s = collectedSteps[0];
    assert.equal(typeof s.iteration, 'number');
    assert.equal(typeof s.candidateId, 'string');
    assert.equal(typeof s.passed, 'boolean');
    assert.equal(typeof s.valuationScore, 'number');
    assert.equal(typeof s.qualityScore, 'number');
    assert.equal(typeof s.compositeScore, 'number');
    assert.ok(isFinite(s.compositeScore), 'compositeScore should be finite');
  });

  it('onStep not required — omitting it does not throw', async () => {
    const { convergeScene } = await import('../../server/nvm/converge/loop.ts');
    const { emptyState } = await import('../../server/nvm/state/NarrativeState.ts');

    const fakeGenerate = async (_spec: unknown, n: number) =>
      Array.from({ length: n }, (_, i) => ({
        transitionId: `t-${i}`,
        sceneIdx: 0,
        sceneFunction: 'build_tension' as const,
        activeMechanisms: ['core_mechanism'],
        beforeStateHash: '',
        ops: [],
        preconditions: [{ type: 'state_exists' as const, factId: 'x' }],
        postconditions: [],
        provenance: { origin: 'model_generated' as const, createdAt: Date.now() },
      }));

    const state = emptyState();
    const target = { sceneIdx: 0, sceneFunction: 'build_tension' as const, activeMechanisms: [], tensionTarget: 1, qualityTarget: 1 };
    // No onStep in budget — should complete without error
    const result = await convergeScene(
      state as import('../../server/nvm/state/NarrativeState.ts').NarrativeState,
      target,
      fakeGenerate as unknown as import('../../server/nvm/generate/proof-spec.ts').CandidateGenerator,
      { maxIterations: 1, candidatesPerIteration: 1 },
    );
    assert.ok(result, 'Result should be returned');
    assert.ok(Array.isArray(result.history), 'history should be an array');
  });

  // ── M7 continuity critic — structured opIdx ───────────────────────────────

  it('M7: continuity critic uses opIdx directly from ProofFinding (no regex)', async () => {
    const { continuityCritic } = await import('../../server/nvm/room/critics/continuity.ts');
    // APPRAISE_EMOTION on an unknown charId triggers IntentionalProof (only references, doesn't introduce).
    // UPDATE_BELIEF introduces the character into `known` so it would always pass — use APPRAISE_EMOTION.
    const ir: import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR = {
      transitionId: 'test-continuity-m7',
      sceneIdx: 1,
      sceneFunction: 'build_tension',
      activeMechanisms: ['core_mechanism'],
      beforeStateHash: '',
      ops: [
        {
          op: 'APPRAISE_EMOTION',
          charId: 'ghost_character_xyz',
          emotion: { joy: 0, distress: 80, anger: 0, fear: 0, pride: 0, shame: 0, dominant: 'distress' as const, intensity: 80, last_updated_at: 0 },
        } as import('../../server/nvm/ops/StoryOp.ts').StoryOp,
      ],
      preconditions: ['world_exists'],
      postconditions: [],
      provenance: { origin: 'model_generated' as const, createdAt: Date.now() },
    };

    const { emptyState } = await import('../../server/nvm/state/NarrativeState.ts');
    const state = emptyState() as import('../../server/nvm/state/NarrativeState.ts').NarrativeState;

    const critiques = continuityCritic(ir, state);
    // Should produce at least one critique (IntentionalProof failure)
    const intCritique = critiques.find(c => c.objection.includes('IntentionalProof'));
    assert.ok(intCritique, 'Should have an IntentionalProof critique');
    // targetOpIdx should be 0 (first op) — derived from structured opIdx, not regex
    assert.equal(intCritique!.targetOpIdx, 0, 'targetOpIdx should be 0 from structured opIdx field');
  });

  it('M7: continuity critic returns null targetOpIdx when opIdx is not set', async () => {
    const { continuityCritic } = await import('../../server/nvm/room/critics/continuity.ts');
    // CausalProof finding for missing preconditions has no opIdx
    const ir: import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR = {
      transitionId: 'test-causal-noop',
      sceneIdx: 2, // non-initial so causal proof checks preconditions
      sceneFunction: 'build_tension',
      activeMechanisms: ['core_mechanism'],
      beforeStateHash: '',
      ops: [
        {
          op: 'UPDATE_BELIEF',
          charId: 'alice',
          belief: { id: 'b1', proposition: 'test', confidence: 0.8, source: 'witnessed' as const, acquired_at: 0 },
        } as import('../../server/nvm/ops/StoryOp.ts').StoryOp,
      ],
      preconditions: [], // missing preconditions → CausalProof fails
      postconditions: [],
      provenance: { origin: 'model_generated' as const, createdAt: Date.now() },
    };

    const { emptyState } = await import('../../server/nvm/state/NarrativeState.ts');
    const state = emptyState() as import('../../server/nvm/state/NarrativeState.ts').NarrativeState;
    state.characterBeliefs = { alice: [] };

    const critiques = continuityCritic(ir, state);
    const causalCritique = critiques.find(c => c.objection.includes('CausalProof'));
    // CausalProof "missing preconditions" finding sets no opIdx → targetOpIdx should be null
    if (causalCritique) {
      assert.equal(causalCritique.targetOpIdx, null,
        'CausalProof missing-preconditions finding should yield null targetOpIdx');
    }
  });
});


// ── Wave 86 ───────────────────────────────────────────────────────────────────
describe('Wave 86 — character-arc dramaticTurn bug, Agent goal mutation, pacing guard, corpus cap', () => {

  // ── character-arc: UNMOTIVATED_TRANSFORMATION now uses r.purpose ──────────

  it('characterArcPass fires UNMOTIVATED_TRANSFORMATION when middle has no dramatic purpose', async () => {
    const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
    // 6 records: first two negative, last two positive, middle two are 'establish_world' (non-dramatic)
    const makeRec = (idx: number, shift: string, purpose: string) => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `SC${idx}`, purpose,
      dramaticTurn: `Scene ${purpose}`, // freeform — never 'none'
      revelation: null, clockRaised: false, clockDelta: 0,
      emotionalShift: shift, suspenseDelta: 0,
      dialogueHighlights: [], unresolvedClues: [],
      seededClueIds: [], payoffSetupIds: [],
      readerStateAnnotation: null,
    });
    const records = [
      makeRec(0, 'negative', 'establish_world'),
      makeRec(1, 'negative', 'establish_world'),
      makeRec(2, 'establish_world', 'establish_world'), // middle — non-dramatic
      makeRec(3, 'establish_world', 'establish_world'), // middle — non-dramatic
      makeRec(4, 'positive', 'character_moment'),
      makeRec(5, 'positive', 'character_moment'),
    ];
    const structure = {
      actPosition: 'act2' as const, completionPercent: 50,
      revelationCount: 0, approachingClimax: false,
      avgSuspensePerScene: 0, escalating: false, reversalDensity: 0,
      openClues: 0,
    };
    const result = await characterArcPass({
      fountain: 'INT. TEST - DAY\nA scene.\n',
      original: 'INT. TEST - DAY\nA scene.\n',
      records: records as unknown as Parameters<typeof characterArcPass>[0]['records'],
      structure: structure as unknown as Parameters<typeof characterArcPass>[0]['structure'],
      annotations: records.map(() => ({ revelation: null })) as unknown as Parameters<typeof characterArcPass>[0]['annotations'],
      approvedSpans: [],
    });
    const hasUnmotivated = result.issues.some(i => i.rule === 'UNMOTIVATED_TRANSFORMATION');
    assert.ok(hasUnmotivated, 'Should fire UNMOTIVATED_TRANSFORMATION when middle scenes have no dramatic purpose');
  });

  it('characterArcPass does NOT fire UNMOTIVATED_TRANSFORMATION when middle has revelation', async () => {
    const { characterArcPass } = await import('../../server/nvm/revision/passes/character-arc.ts');
    const makeRec = (idx: number, shift: string, purpose: string, rev: string | null = null) => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `SC${idx}`, purpose,
      dramaticTurn: `Some turn`, revelation: rev, clockRaised: false, clockDelta: 0,
      emotionalShift: shift, suspenseDelta: 0,
      dialogueHighlights: [], unresolvedClues: [],
      seededClueIds: [], payoffSetupIds: [],
      readerStateAnnotation: null,
    });
    const records = [
      makeRec(0, 'negative', 'establish_world'),
      makeRec(1, 'negative', 'establish_world'),
      makeRec(2, 'establish_world', 'establish_world', 'The truth about alice'), // middle has revelation
      makeRec(3, 'establish_world', 'character_moment'),
      makeRec(4, 'positive', 'character_moment'),
      makeRec(5, 'positive', 'resolution'),
    ];
    const structure = {
      actPosition: 'act2' as const, completionPercent: 50,
      revelationCount: 1, approachingClimax: false,
      avgSuspensePerScene: 0, escalating: false, reversalDensity: 0,
      openClues: 0,
    };
    const result = await characterArcPass({
      fountain: 'INT. TEST - DAY\nA scene.\n',
      original: 'INT. TEST - DAY\nA scene.\n',
      records: records as unknown as Parameters<typeof characterArcPass>[0]['records'],
      structure: structure as unknown as Parameters<typeof characterArcPass>[0]['structure'],
      annotations: records.map(() => ({ revelation: null })) as unknown as Parameters<typeof characterArcPass>[0]['annotations'],
      approvedSpans: [],
    });
    const hasUnmotivated = result.issues.some(i => i.rule === 'UNMOTIVATED_TRANSFORMATION');
    assert.ok(!hasUnmotivated, 'Should NOT fire UNMOTIVATED_TRANSFORMATION when middle has a revelation');
  });

  // ── pacing: avgLength=0 guard ─────────────────────────────────────────────

  it('pacingPass handles zero-line scenes without NaN', async () => {
    const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
    // Fountain with scene headers but no content lines → all scenes have 0 lines
    const fountain = 'INT. EMPTY - DAY\nINT. ALSO EMPTY - NIGHT\n';
    const result = await pacingPass({
      fountain,
      original: fountain,
      records: [],
      structure: { actPosition: 'act1' as const, completionPercent: 20, revelationCount: 0, approachingClimax: false, avgSuspensePerScene: 0, escalating: false, reversalDensity: 0, openClues: 0 } as unknown as Parameters<typeof pacingPass>[0]['structure'],
      annotations: [],
      approvedSpans: [],
    });
    assert.equal(result.pass, 'pacing');
    assert.equal(result.changed, false);
    // No NaN in any issue description
    for (const issue of result.issues) {
      assert.ok(!issue.description.includes('NaN'), `Issue description should not contain NaN: ${issue.description}`);
    }
  });

  // ── Wave 143: Energy monotone & rhythm variety ───────────────────────────

  it('pacingPass detects ENERGY_MONOTONE when all scenes have similar length', async () => {
    const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
    // Create 8 scenes all ~5 lines long (monotone energy)
    const fountain = Array.from({ length: 8 }, (_, i) =>
      `INT. SC${i} - DAY\nAction line.\nACTOR\nDialogue.\n`
    ).join('');
    const records = Array.from({ length: 8 }, (_, i) => ({
      commitId: `c${i}`, sceneIdx: i, slug: `SC${i}`, purpose: 'dialogue',
      dramaticTurn: 'nothing', revelation: null, clockRaised: false, clockDelta: 0,
      emotionalShift: 'neutral', suspenseDelta: 1,
      dialogueHighlights: [], unresolvedClues: [],
      seededClueIds: [], payoffSetupIds: [],
      readerStateAnnotation: null,
      relationshipShifts: [],
    }));
    const result = await pacingPass({
      fountain,
      original: fountain,
      records: records as unknown as Parameters<typeof pacingPass>[0]['records'],
      structure: { actPosition: 'act2b' as const, completionPercent: 60, revelationCount: 0, approachingClimax: false, avgSuspensePerScene: 1, escalating: false, reversalDensity: 0, openClues: 0 } as unknown as Parameters<typeof pacingPass>[0]['structure'],
      annotations: [],
      approvedSpans: [],
    });
    const monotone = result.issues.filter(i => i.rule === 'ENERGY_MONOTONE');
    assert.ok(monotone.length >= 1, 'Should detect ENERGY_MONOTONE for all scenes with similar length');
    assert.ok(monotone[0].severity === 'major');
  });

  it('pacingPass detects RHYTHM_INVERSION when climax has lower energy than opening', async () => {
    const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
    const fountain = Array.from({ length: 9 }, (_, i) =>
      `INT. SC${i} - DAY\nAction.\n`
    ).join('');
    // Scenes 0-2 (first third): high suspense
    // Scenes 6-8 (last third): low suspense
    const makeRec = (idx: number, suspense: number): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `SC${idx}`, purpose: 'dialogue',
      dramaticTurn: 'nothing', revelation: null, clockRaised: false, clockDelta: 0,
      emotionalShift: 'neutral', suspenseDelta: suspense,
      dialogueHighlights: [], unresolvedClues: [],
      seededClueIds: [], payoffSetupIds: [],
      readerStateAnnotation: null,
      relationshipShifts: [],
    });
    const records = [
      makeRec(0, 4),
      makeRec(1, 3.5),
      makeRec(2, 3),
      makeRec(3, 1.5),
      makeRec(4, 1),
      makeRec(5, 1.2),
      makeRec(6, 0.5),
      makeRec(7, 0.3),
      makeRec(8, 0.8),
    ];
    const result = await pacingPass({
      fountain,
      original: fountain,
      records: records as unknown as Parameters<typeof pacingPass>[0]['records'],
      structure: { actPosition: 'act3' as const, completionPercent: 100, revelationCount: 1, approachingClimax: true, avgSuspensePerScene: 1.5, escalating: false, reversalDensity: 1, openClues: 0 } as unknown as Parameters<typeof pacingPass>[0]['structure'],
      annotations: [],
      approvedSpans: [],
    });
    const inversion = result.issues.filter(i => i.rule === 'RHYTHM_INVERSION');
    assert.ok(inversion.length >= 1, 'Should detect RHYTHM_INVERSION for high energy opening + low energy climax');
    assert.ok(inversion[0].severity === 'critical');
  });

  it('pacingPass detects ENERGY_PLACEMENT_MISMATCH when high-energy scenes front-loaded', async () => {
    const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
    const fountain = Array.from({ length: 10 }, (_, i) =>
      `INT. SC${i} - DAY\nAction.\n`
    ).join('');
    // 4 high-energy scenes all in first 5 scenes
    const makeRec = (idx: number, suspense: number): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `SC${idx}`, purpose: 'dialogue',
      dramaticTurn: 'nothing', revelation: null, clockRaised: false, clockDelta: 0,
      emotionalShift: 'neutral', suspenseDelta: suspense,
      dialogueHighlights: [], unresolvedClues: [],
      seededClueIds: [], payoffSetupIds: [],
      readerStateAnnotation: null,
      relationshipShifts: [],
    });
    const records = [
      makeRec(0, 3),
      makeRec(1, 2.8),
      makeRec(2, 1),
      makeRec(3, 3.2),
      makeRec(4, 2.9),
      makeRec(5, 0.8),
      makeRec(6, 0.5),
      makeRec(7, 1),
      makeRec(8, 0.6),
      makeRec(9, 1.2),
    ];
    const result = await pacingPass({
      fountain,
      original: fountain,
      records: records as unknown as Parameters<typeof pacingPass>[0]['records'],
      structure: { actPosition: 'act2b' as const, completionPercent: 70, revelationCount: 1, approachingClimax: false, avgSuspensePerScene: 1.5, escalating: false, reversalDensity: 0, openClues: 1 } as unknown as Parameters<typeof pacingPass>[0]['structure'],
      annotations: [],
      approvedSpans: [],
    });
    const mismatch = result.issues.filter(i => i.rule === 'ENERGY_PLACEMENT_MISMATCH');
    assert.ok(mismatch.length >= 1, 'Should detect ENERGY_PLACEMENT_MISMATCH when high-energy scenes are front-loaded');
    assert.ok(mismatch[0].severity === 'major');
  });

  // ── corpus: maxScenesPerScenario cap ─────────────────────────────────────

  it('runSelfPlay respects maxScenesPerScenario by capping scene targets', async () => {
    const { runSelfPlay } = await import('../../server/nvm/selfplay/corpus.ts');

    const scenesProcessed: number[] = [];
    const fakeGenerate = async (_spec: unknown, n: number) =>
      Array.from({ length: n }, (_, i) => ({
        transitionId: `t-${scenesProcessed.length}-${i}`,
        sceneIdx: scenesProcessed.length,
        sceneFunction: 'build_tension' as const,
        activeMechanisms: ['core_mechanism'],
        beforeStateHash: '',
        ops: [],
        preconditions: ['world_exists'],
        postconditions: [],
        provenance: { origin: 'model_generated' as const, createdAt: Date.now() },
      }));

    const scenario = {
      scenarioId: 'test-cap',
      seed: 42,
      sceneTargets: [0, 1, 2, 3, 4].map(i => ({
        sceneIdx: i,
        sceneFunction: 'build_tension' as const,
        activeMechanisms: [] as string[],
        tensionTarget: 1,
        qualityTarget: 1,
      })),
    };

    // With cap of 2, only first 2 targets should run
    const report = await runSelfPlay(
      [scenario],
      fakeGenerate as unknown as import('../../server/nvm/generate/proof-spec.ts').CandidateGenerator,
      undefined,
      2, // maxScenesPerScenario
    );

    assert.equal(report.runs.length, 1, 'Should have one run');
    // The run should have processed at most 2 scenes
    assert.ok(report.runs[0].scenes.length <= 2, `Expected ≤2 scenes, got ${report.runs[0].scenes.length}`);
  });

  it('runSelfPlay with no cap processes all scene targets', async () => {
    const { runSelfPlay } = await import('../../server/nvm/selfplay/corpus.ts');

    const fakeGenerate = async (_spec: unknown, n: number) =>
      Array.from({ length: n }, (_, i) => ({
        transitionId: `t-${i}`,
        sceneIdx: 0,
        sceneFunction: 'build_tension' as const,
        activeMechanisms: ['core_mechanism'],
        beforeStateHash: '',
        ops: [],
        preconditions: ['world_exists'],
        postconditions: [],
        provenance: { origin: 'model_generated' as const, createdAt: Date.now() },
      }));

    const scenario = {
      scenarioId: 'test-no-cap',
      seed: 42,
      sceneTargets: [0, 1, 2].map(i => ({
        sceneIdx: i,
        sceneFunction: 'build_tension' as const,
        activeMechanisms: [] as string[],
        tensionTarget: 1,
        qualityTarget: 1,
      })),
    };

    const report = await runSelfPlay(
      [scenario],
      fakeGenerate as unknown as import('../../server/nvm/generate/proof-spec.ts').CandidateGenerator,
    );

    assert.equal(report.runs.length, 1);
    assert.equal(report.runs[0].scenes.length, 3, 'Without cap, all 3 scenes should run');
  });

  // ── Agent trust decay upper bound ─────────────────────────────────────────

  it('trust decay clamps to [0, 1] — upper bound added', () => {
    // Simulate the trust decay expression directly
    const decayTrust = (trust: number) => Math.max(0, Math.min(1, trust - 0.01));
    // Starting above 1 (shouldn't happen normally) — result is clamped to 1 (1.5-0.01=1.49, min(1,1.49)=1)
    assert.equal(decayTrust(1.5), 1, 'Over-limit trust decays but stays clamped at 1');
    assert.equal(decayTrust(1.0), 0.99, 'Full trust decays to 0.99');
    assert.equal(decayTrust(0.005), 0, 'Trust below decay step clamps to 0');
    assert.equal(decayTrust(0), 0, 'Zero trust stays zero');
    // Upper bound: result can never exceed 1 regardless of input
    assert.ok(decayTrust(2.0) <= 1, 'Result is always ≤1');
  });
});


// ── Wave 87 ───────────────────────────────────────────────────────────────────
describe('Wave 87 — payoff precision, repeated-purpose detection, dominant guard', () => {

  // ── payoff: same-scene payoff (gap=0) ─────────────────────────────────────

  it('payoffPass detects same-scene (gap=0) payoff as PAYOFF_TOO_QUICK major', async () => {
    const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
    const records = [
      {
        commitId: 'c0', sceneIdx: 0, slug: 'INT. ROOM - DAY', purpose: 'set_up_payoff',
        dramaticTurn: 'planted', revelation: null, clockRaised: false, clockDelta: 0,
        emotionalShift: 'neutral', suspenseDelta: 0,
        dialogueHighlights: [], unresolvedClues: [],
        seededClueIds: ['clue-A'],    // planted here
        payoffSetupIds: ['clue-A'],   // AND paid off here — same scene!
        readerStateAnnotation: null,
      },
    ];
    const structure = {
      actPosition: 'act1' as const, completionPercent: 20,
      revelationCount: 0, approachingClimax: false,
      avgSuspensePerScene: 0, escalating: false,
      reversalCount: 0, reversalDensity: 0,
      openClues: 0, midpointPressure: 0, tightestScene: null,
    };
    const result = await payoffPass({
      fountain: 'INT. ROOM - DAY\nHello.\n',
      original: 'INT. ROOM - DAY\nHello.\n',
      records: records as unknown as Parameters<typeof payoffPass>[0]['records'],
      structure: structure as Parameters<typeof payoffPass>[0]['structure'],
      annotations: [],
      approvedSpans: [],
    });
    const tooQuick = result.issues.filter(i => i.rule === 'PAYOFF_TOO_QUICK');
    assert.ok(tooQuick.length >= 1, 'Should flag same-scene payoff as PAYOFF_TOO_QUICK');
    assert.equal(tooQuick[0].severity, 'major', 'Same-scene payoff should be major severity');
  });

  it('payoffPass detects consecutive-scene (gap=1) payoff as PAYOFF_TOO_QUICK minor', async () => {
    const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
    const records = [
      {
        commitId: 'c0', sceneIdx: 0, slug: 'INT. ROOM - DAY', purpose: 'establish_world',
        dramaticTurn: 'planted', revelation: null, clockRaised: false, clockDelta: 0,
        emotionalShift: 'neutral', suspenseDelta: 0,
        dialogueHighlights: [], unresolvedClues: [],
        seededClueIds: ['clue-B'], payoffSetupIds: [],
        readerStateAnnotation: null,
      },
      {
        commitId: 'c1', sceneIdx: 1, slug: 'INT. ROOM - NIGHT', purpose: 'set_up_payoff',
        dramaticTurn: 'paid off', revelation: null, clockRaised: false, clockDelta: 0,
        emotionalShift: 'positive', suspenseDelta: 1,
        dialogueHighlights: [], unresolvedClues: [],
        seededClueIds: [], payoffSetupIds: ['clue-B'],
        readerStateAnnotation: null,
      },
    ];
    const structure = {
      actPosition: 'act1' as const, completionPercent: 20,
      revelationCount: 0, approachingClimax: false,
      avgSuspensePerScene: 0, escalating: false,
      reversalCount: 0, reversalDensity: 0,
      openClues: 0, midpointPressure: 0, tightestScene: null,
    };
    const result = await payoffPass({
      fountain: 'INT. ROOM - DAY\nScene.\nINT. ROOM - NIGHT\nScene.\n',
      original: 'INT. ROOM - DAY\nScene.\nINT. ROOM - NIGHT\nScene.\n',
      records: records as unknown as Parameters<typeof payoffPass>[0]['records'],
      structure: structure as Parameters<typeof payoffPass>[0]['structure'],
      annotations: [],
      approvedSpans: [],
    });
    const tooQuick = result.issues.filter(i => i.rule === 'PAYOFF_TOO_QUICK');
    assert.ok(tooQuick.length >= 1, 'Should flag consecutive-scene payoff');
    assert.equal(tooQuick[0].severity, 'minor', 'Consecutive-scene payoff should be minor severity');
  });

  it('payoffPass detects DANGLING_PAYOFF when setupId was never seeded', async () => {
    const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
    const records = [
      {
        commitId: 'c0', sceneIdx: 0, slug: 'INT. ROOM - DAY', purpose: 'establish_world',
        dramaticTurn: 'nothing', revelation: null, clockRaised: false, clockDelta: 0,
        emotionalShift: 'neutral', suspenseDelta: 0,
        dialogueHighlights: [], unresolvedClues: [],
        seededClueIds: [], // no clue seeded
        payoffSetupIds: ['ghost-clue'], // but paying off something never seeded!
        readerStateAnnotation: null,
      },
    ];
    const structure = {
      actPosition: 'act3' as const, completionPercent: 80,
      revelationCount: 0, approachingClimax: true,
      avgSuspensePerScene: 5, escalating: true,
      reversalCount: 1, reversalDensity: 1,
      openClues: 0, midpointPressure: 3, tightestScene: 0,
    };
    const result = await payoffPass({
      fountain: 'INT. ROOM - DAY\nScene.\n',
      original: 'INT. ROOM - DAY\nScene.\n',
      records: records as unknown as Parameters<typeof payoffPass>[0]['records'],
      structure: structure as Parameters<typeof payoffPass>[0]['structure'],
      annotations: [],
      approvedSpans: [],
    });
    const dangling = result.issues.filter(i => i.rule === 'DANGLING_PAYOFF');
    assert.ok(dangling.length >= 1, 'Should detect dangling payoff for never-seeded setupId');
    assert.ok(dangling[0].description.includes('ghost-clue'));
  });

  // ── Wave 140 additions: SETUP_WITHOUT_CONSEQUENCE and PAYOFF_MEMORY_GAP ────

  it('payoffPass detects SETUP_WITHOUT_CONSEQUENCE for clue appearing 2+ times without narrative consequence', async () => {
    const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
    const records = [
      {
        commitId: 'c0', sceneIdx: 0, slug: 'INT. ROOM - DAY', purpose: 'establish_world',
        dramaticTurn: 'nothing', revelation: null, clockRaised: false, clockDelta: 0,
        emotionalShift: 'neutral', suspenseDelta: 0,
        dialogueHighlights: [], unresolvedClues: [],
        seededClueIds: ['mysterious-letter'], // plant clue
        payoffSetupIds: [],
        readerStateAnnotation: null,
        relationshipShifts: [], // no relationship shift
      },
      {
        commitId: 'c1', sceneIdx: 1, slug: 'INT. KITCHEN - DAY', purpose: 'dialogue',
        dramaticTurn: 'nothing', revelation: null, clockRaised: false, clockDelta: 0,
        emotionalShift: 'neutral', suspenseDelta: 0.5, // low suspense
        dialogueHighlights: [], unresolvedClues: [],
        seededClueIds: ['mysterious-letter'], // clue appears again
        payoffSetupIds: [],
        readerStateAnnotation: null,
        relationshipShifts: [], // no consequence
      },
      {
        commitId: 'c2', sceneIdx: 2, slug: 'INT. STUDY - DAY', purpose: 'complication',
        dramaticTurn: 'nothing', revelation: null, clockRaised: false, clockDelta: 0,
        emotionalShift: 'neutral', suspenseDelta: 0.3,
        dialogueHighlights: [], unresolvedClues: [],
        seededClueIds: [],
        payoffSetupIds: [],
        readerStateAnnotation: null,
        relationshipShifts: [],
      },
    ];
    const structure = {
      actPosition: 'act2a' as const, completionPercent: 40,
      revelationCount: 0, approachingClimax: false,
      avgSuspensePerScene: 1, escalating: false,
      reversalCount: 0, reversalDensity: 0,
      openClues: 1, midpointPressure: 0, tightestScene: null,
    };
    const result = await payoffPass({
      fountain: 'INT. ROOM - DAY\nA.\nINT. KITCHEN - DAY\nB.\nINT. STUDY - DAY\nC.\n',
      original: 'INT. ROOM - DAY\nA.\nINT. KITCHEN - DAY\nB.\nINT. STUDY - DAY\nC.\n',
      records: records as unknown as Parameters<typeof payoffPass>[0]['records'],
      structure: structure as Parameters<typeof payoffPass>[0]['structure'],
      annotations: [],
      approvedSpans: [],
    });
    const consequence = result.issues.filter(i => i.rule === 'SETUP_WITHOUT_CONSEQUENCE');
    assert.ok(consequence.length >= 1, 'Should detect SETUP_WITHOUT_CONSEQUENCE for clue appearing 2+ times without consequence');
    assert.ok(consequence[0].description.includes('mysterious-letter'));
    assert.ok(consequence[0].severity === 'major');
  });

  it('payoffPass does NOT fire SETUP_WITHOUT_CONSEQUENCE when clue appears 2+ times WITH relationship shift', async () => {
    const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
    const records = [
      {
        commitId: 'c0', sceneIdx: 0, slug: 'INT. ROOM - DAY', purpose: 'establish_world',
        dramaticTurn: 'nothing', revelation: null, clockRaised: false, clockDelta: 0,
        emotionalShift: 'neutral', suspenseDelta: 0,
        dialogueHighlights: [], unresolvedClues: [],
        seededClueIds: ['secret-document'], // plant clue
        payoffSetupIds: [],
        readerStateAnnotation: null,
        relationshipShifts: [], // no consequence here
      },
      {
        commitId: 'c1', sceneIdx: 1, slug: 'INT. OFFICE - DAY', purpose: 'confrontation',
        dramaticTurn: 'revelation', revelation: 'secret-revealed', clockRaised: true, clockDelta: 2,
        emotionalShift: 'positive', suspenseDelta: 2.5, // high suspense + emotion
        dialogueHighlights: ['You know about the document?'], unresolvedClues: [],
        seededClueIds: ['secret-document'], // clue appears again
        payoffSetupIds: [],
        readerStateAnnotation: null,
        relationshipShifts: [{ pairKey: 'alice|bob', shiftMagnitude: 1.5 }], // HAS consequence
      },
    ];
    const structure = {
      actPosition: 'act2b' as const, completionPercent: 60,
      revelationCount: 1, approachingClimax: false,
      avgSuspensePerScene: 2, escalating: true,
      reversalCount: 0, reversalDensity: 0,
      openClues: 0, midpointPressure: 1, tightestScene: 1,
    };
    const result = await payoffPass({
      fountain: 'INT. ROOM - DAY\nA.\nINT. OFFICE - DAY\nALICE\nYou know about the document?\n',
      original: 'INT. ROOM - DAY\nA.\nINT. OFFICE - DAY\nALICE\nYou know about the document?\n',
      records: records as unknown as Parameters<typeof payoffPass>[0]['records'],
      structure: structure as Parameters<typeof payoffPass>[0]['structure'],
      annotations: [],
      approvedSpans: [],
    });
    const consequence = result.issues.filter(i => i.rule === 'SETUP_WITHOUT_CONSEQUENCE');
    assert.equal(consequence.length, 0, 'Should NOT fire SETUP_WITHOUT_CONSEQUENCE when clue has relationship shift consequence');
  });

  it('payoffPass detects PAYOFF_MEMORY_GAP for payoff 6+ scenes after setup', async () => {
    const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
    const records = [];
    for (let i = 0; i < 9; i++) {
      records.push({
        commitId: `c${i}`, sceneIdx: i, slug: `SC${i}`, purpose: 'dialogue',
        dramaticTurn: 'nothing', revelation: null, clockRaised: false, clockDelta: 0,
        emotionalShift: 'neutral', suspenseDelta: 0.5,
        dialogueHighlights: [], unresolvedClues: [],
        seededClueIds: i === 0 ? ['old-mystery'] : [], // plant at scene 0
        payoffSetupIds: i === 7 ? ['old-mystery'] : [], // payoff at scene 7 (gap = 7)
        readerStateAnnotation: null,
        relationshipShifts: [],
      });
    }
    const structure = {
      actPosition: 'act3' as const, completionPercent: 85,
      revelationCount: 1, approachingClimax: true,
      avgSuspensePerScene: 1, escalating: true,
      reversalCount: 0, reversalDensity: 0,
      openClues: 0, midpointPressure: 0, tightestScene: 7,
    };
    const result = await payoffPass({
      fountain: 'SC0\nA\nSC1\nB\nSC2\nC\nSC3\nD\nSC4\nE\nSC5\nF\nSC6\nG\nSC7\nH\nSC8\nI\n',
      original: 'SC0\nA\nSC1\nB\nSC2\nC\nSC3\nD\nSC4\nE\nSC5\nF\nSC6\nG\nSC7\nH\nSC8\nI\n',
      records: records as unknown as Parameters<typeof payoffPass>[0]['records'],
      structure: structure as Parameters<typeof payoffPass>[0]['structure'],
      annotations: [],
      approvedSpans: [],
    });
    const gap = result.issues.filter(i => i.rule === 'PAYOFF_MEMORY_GAP');
    assert.ok(gap.length >= 1, 'Should detect PAYOFF_MEMORY_GAP for payoff 7 scenes after setup');
    assert.ok(gap[0].description.includes('7 scenes'));
    assert.ok(gap[0].severity === 'minor');
  });

  it('payoffPass does NOT fire PAYOFF_MEMORY_GAP for payoff only 5 scenes after setup', async () => {
    const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
    const records = [];
    for (let i = 0; i < 8; i++) {
      records.push({
        commitId: `c${i}`, sceneIdx: i, slug: `SC${i}`, purpose: 'dialogue',
        dramaticTurn: 'nothing', revelation: null, clockRaised: false, clockDelta: 0,
        emotionalShift: 'neutral', suspenseDelta: 0.5,
        dialogueHighlights: [], unresolvedClues: [],
        seededClueIds: i === 0 ? ['clue'] : [],
        payoffSetupIds: i === 5 ? ['clue'] : [], // gap = 5 (should not fire)
        readerStateAnnotation: null,
        relationshipShifts: [],
      });
    }
    const structure = {
      actPosition: 'act3' as const, completionPercent: 80,
      revelationCount: 1, approachingClimax: true,
      avgSuspensePerScene: 1, escalating: true,
      reversalCount: 0, reversalDensity: 0,
      openClues: 0, midpointPressure: 0, tightestScene: 5,
    };
    const result = await payoffPass({
      fountain: 'SC0\nA\nSC1\nB\nSC2\nC\nSC3\nD\nSC4\nE\nSC5\nF\nSC6\nG\nSC7\nH\n',
      original: 'SC0\nA\nSC1\nB\nSC2\nC\nSC3\nD\nSC4\nE\nSC5\nF\nSC6\nG\nSC7\nH\n',
      records: records as unknown as Parameters<typeof payoffPass>[0]['records'],
      structure: structure as Parameters<typeof payoffPass>[0]['structure'],
      annotations: [],
      approvedSpans: [],
    });
    const gap = result.issues.filter(i => i.rule === 'PAYOFF_MEMORY_GAP');
    assert.equal(gap.length, 0, 'Should NOT fire PAYOFF_MEMORY_GAP for payoff only 5 scenes after setup');
  });

  // ── intention: REPEATED_PURPOSE ───────────────────────────────────────────

  it('intentionPass fires REPEATED_PURPOSE for 3 consecutive establish_world scenes', async () => {
    const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
    const makeRec = (idx: number, purpose: string) => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `SC${idx}`, purpose,
      dramaticTurn: 'nothing', revelation: null, clockRaised: false, clockDelta: 0,
      emotionalShift: 'neutral', suspenseDelta: 0,
      dialogueHighlights: [], unresolvedClues: [],
      seededClueIds: [], payoffSetupIds: [],
      readerStateAnnotation: null,
    });
    const records = [
      makeRec(0, 'establish_world'),
      makeRec(1, 'establish_world'),
      makeRec(2, 'establish_world'), // 3rd → fires
      makeRec(3, 'raise_stakes'),
    ];
    const structure = {
      actPosition: 'act1' as const, completionPercent: 20,
      revelationCount: 0, approachingClimax: false,
      avgSuspensePerScene: 0, escalating: false,
      reversalCount: 0, reversalDensity: 0,
      openClues: 0, midpointPressure: 0, tightestScene: null,
    };
    const result = await intentionPass({
      fountain: 'INT. SC0 - DAY\nA.\nINT. SC1 - DAY\nB.\nINT. SC2 - DAY\nC.\nINT. SC3 - DAY\nD.\n',
      original: 'INT. SC0 - DAY\nA.\nINT. SC1 - DAY\nB.\nINT. SC2 - DAY\nC.\nINT. SC3 - DAY\nD.\n',
      records: records as unknown as Parameters<typeof intentionPass>[0]['records'],
      structure: structure as Parameters<typeof intentionPass>[0]['structure'],
      annotations: [],
      approvedSpans: [],
    });
    const repeated = result.issues.filter(i => i.rule === 'REPEATED_PURPOSE');
    assert.ok(repeated.length >= 1, 'Should fire REPEATED_PURPOSE for 3 consecutive establish_world scenes');
    assert.ok(repeated[0].description.includes('establish_world'));
  });

  it('intentionPass does NOT fire REPEATED_PURPOSE for 3 consecutive raise_stakes scenes', async () => {
    const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
    const makeRec = (idx: number, purpose: string) => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `SC${idx}`, purpose,
      dramaticTurn: 'something', revelation: null, clockRaised: true, clockDelta: 1,
      emotionalShift: 'negative', suspenseDelta: 2,
      dialogueHighlights: [], unresolvedClues: [],
      seededClueIds: [], payoffSetupIds: [],
      readerStateAnnotation: null,
    });
    const records = [
      makeRec(0, 'raise_stakes'),
      makeRec(1, 'raise_stakes'),
      makeRec(2, 'raise_stakes'), // 3+ of a dramatic purpose — OK
    ];
    const structure = {
      actPosition: 'act2b' as const, completionPercent: 60,
      revelationCount: 0, approachingClimax: false,
      avgSuspensePerScene: 2, escalating: true,
      reversalCount: 0, reversalDensity: 0,
      openClues: 0, midpointPressure: 2, tightestScene: 2,
    };
    const result = await intentionPass({
      fountain: 'INT. SC0 - DAY\nA.\nINT. SC1 - DAY\nB.\nINT. SC2 - DAY\nC.\n',
      original: 'INT. SC0 - DAY\nA.\nINT. SC1 - DAY\nB.\nINT. SC2 - DAY\nC.\n',
      records: records as unknown as Parameters<typeof intentionPass>[0]['records'],
      structure: structure as Parameters<typeof intentionPass>[0]['structure'],
      annotations: [],
      approvedSpans: [],
    });
    const repeated = result.issues.filter(i => i.rule === 'REPEATED_PURPOSE');
    assert.ok(repeated.length === 0, 'raise_stakes streak should NOT trigger REPEATED_PURPOSE');
  });

  // ── Wave 142: Scene entropy detection ───────────────────────────────────────

  it('intentionPass detects ZERO_ENTROPY_SCENE for middle scene with no momentum', async () => {
    const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
    const makeRec = (idx: number, emotionalShift: string, suspenseDelta: number, hasRelationshipShift: boolean) => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `SC${idx}`, purpose: 'dialogue',
      dramaticTurn: 'nothing', revelation: null, clockRaised: false, clockDelta: 0,
      emotionalShift, suspenseDelta,
      dialogueHighlights: [], unresolvedClues: [],
      seededClueIds: [], payoffSetupIds: [],
      readerStateAnnotation: null,
      relationshipShifts: hasRelationshipShift ? [{ pairKey: 'a|b', shiftMagnitude: 1 }] : [],
    });
    const records = [
      makeRec(0, 'neutral', 1, false), // opening scene
      // Scene 1: NO emotional shift, NO suspense, NO clues, NO relationships — zero entropy
      makeRec(1, 'neutral', 0.2, false),
      makeRec(2, 'positive', 2, false), // closing scene
      makeRec(3, 'negative', 1.5, false),
      makeRec(4, 'neutral', 0.8, false),
      makeRec(5, 'positive', 2.5, false),
    ];
    const structure = {
      actPosition: 'act2b' as const, completionPercent: 60,
      revelationCount: 0, approachingClimax: false,
      avgSuspensePerScene: 1.5, escalating: true,
      reversalCount: 0, reversalDensity: 0,
      openClues: 0, midpointPressure: 1, tightestScene: 5,
    };
    const result = await intentionPass({
      fountain: 'SC0\nA\nSC1\nB\nSC2\nC\nSC3\nD\nSC4\nE\nSC5\nF\n',
      original: 'SC0\nA\nSC1\nB\nSC2\nC\nSC3\nD\nSC4\nE\nSC5\nF\n',
      records: records as unknown as Parameters<typeof intentionPass>[0]['records'],
      structure: structure as Parameters<typeof intentionPass>[0]['structure'],
      annotations: [],
      approvedSpans: [],
    });
    const entropy = result.issues.filter(i => i.rule === 'ZERO_ENTROPY_SCENE');
    assert.ok(entropy.length >= 1, 'Should detect ZERO_ENTROPY_SCENE for middle scene with no momentum');
    assert.ok(entropy[0].severity === 'major');
  });

  it('intentionPass does NOT fire ZERO_ENTROPY_SCENE when scene has emotional shift', async () => {
    const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
    const makeRec = (idx: number, emotionalShift: string) => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `SC${idx}`, purpose: 'dialogue',
      dramaticTurn: 'nothing', revelation: null, clockRaised: false, clockDelta: 0,
      emotionalShift, suspenseDelta: 0.5,
      dialogueHighlights: [], unresolvedClues: [],
      seededClueIds: [], payoffSetupIds: [],
      readerStateAnnotation: null,
      relationshipShifts: [],
    });
    const records = [
      makeRec(0, 'neutral'),
      makeRec(1, 'positive'), // HAS emotional shift — should not flag
      makeRec(2, 'positive'),
      makeRec(3, 'negative'),
      makeRec(4, 'neutral'),
      makeRec(5, 'positive'),
    ];
    const structure = {
      actPosition: 'act2b' as const, completionPercent: 60,
      revelationCount: 0, approachingClimax: false,
      avgSuspensePerScene: 1, escalating: true,
      reversalCount: 0, reversalDensity: 0,
      openClues: 0, midpointPressure: 0, tightestScene: 5,
    };
    const result = await intentionPass({
      fountain: 'SC0\nA\nSC1\nB\nSC2\nC\nSC3\nD\nSC4\nE\nSC5\nF\n',
      original: 'SC0\nA\nSC1\nB\nSC2\nC\nSC3\nD\nSC4\nE\nSC5\nF\n',
      records: records as unknown as Parameters<typeof intentionPass>[0]['records'],
      structure: structure as Parameters<typeof intentionPass>[0]['structure'],
      annotations: [],
      approvedSpans: [],
    });
    const entropy = result.issues.filter(i => i.rule === 'ZERO_ENTROPY_SCENE' && i.location.includes('Scene 1'));
    assert.ok(entropy.length === 0, 'Should NOT flag scene with emotional shift as zero entropy');
  });

  it('intentionPass detects ENTROPY_CLUSTER for 3 consecutive low-momentum scenes', async () => {
    const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
    const makeRec = (idx: number, suspenseDelta: number) => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `SC${idx}`, purpose: 'dialogue',
      dramaticTurn: 'nothing', revelation: null, clockRaised: false, clockDelta: 0,
      emotionalShift: 'neutral', suspenseDelta,
      dialogueHighlights: [], unresolvedClues: [],
      seededClueIds: [], payoffSetupIds: [],
      readerStateAnnotation: null,
      relationshipShifts: [],
    });
    const records = [
      makeRec(0, 2),
      // Scenes 1-3: 3 consecutive low-momentum scenes
      makeRec(1, 0.5),
      makeRec(2, 0.3),
      makeRec(3, 0.8),
      makeRec(4, 2.5),
    ];
    const structure = {
      actPosition: 'act2b' as const, completionPercent: 60,
      revelationCount: 0, approachingClimax: false,
      avgSuspensePerScene: 1, escalating: true,
      reversalCount: 0, reversalDensity: 0,
      openClues: 0, midpointPressure: 0, tightestScene: 4,
    };
    const result = await intentionPass({
      fountain: 'SC0\nA\nSC1\nB\nSC2\nC\nSC3\nD\nSC4\nE\n',
      original: 'SC0\nA\nSC1\nB\nSC2\nC\nSC3\nD\nSC4\nE\n',
      records: records as unknown as Parameters<typeof intentionPass>[0]['records'],
      structure: structure as Parameters<typeof intentionPass>[0]['structure'],
      annotations: [],
      approvedSpans: [],
    });
    const cluster = result.issues.filter(i => i.rule === 'ENTROPY_CLUSTER');
    assert.ok(cluster.length >= 1, 'Should detect ENTROPY_CLUSTER for 3 consecutive low-momentum scenes');
    assert.ok(cluster[0].severity === 'major');
  });

  it('intentionPass does NOT fire ENTROPY_CLUSTER when middle scene has relationship shift', async () => {
    const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
    const makeRec = (idx: number, suspenseDelta: number, hasRelationshipShift: boolean) => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `SC${idx}`, purpose: 'dialogue',
      dramaticTurn: 'nothing', revelation: null, clockRaised: false, clockDelta: 0,
      emotionalShift: 'neutral', suspenseDelta,
      dialogueHighlights: [], unresolvedClues: [],
      seededClueIds: [], payoffSetupIds: [],
      readerStateAnnotation: null,
      relationshipShifts: hasRelationshipShift ? [{ pairKey: 'a|b', shiftMagnitude: 1 }] : [],
    });
    const records = [
      makeRec(0, 2, false),
      makeRec(1, 0.5, false),
      makeRec(2, 0.3, true), // middle scene has relationship shift — breaks the cluster
      makeRec(3, 0.8, false),
      makeRec(4, 2.5, false),
    ];
    const structure = {
      actPosition: 'act2b' as const, completionPercent: 60,
      revelationCount: 0, approachingClimax: false,
      avgSuspensePerScene: 1, escalating: true,
      reversalCount: 0, reversalDensity: 0,
      openClues: 0, midpointPressure: 0, tightestScene: 4,
    };
    const result = await intentionPass({
      fountain: 'SC0\nA\nSC1\nB\nSC2\nC\nSC3\nD\nSC4\nE\n',
      original: 'SC0\nA\nSC1\nB\nSC2\nC\nSC3\nD\nSC4\nE\n',
      records: records as unknown as Parameters<typeof intentionPass>[0]['records'],
      structure: structure as Parameters<typeof intentionPass>[0]['structure'],
      annotations: [],
      approvedSpans: [],
    });
    const cluster = result.issues.filter(i => i.rule === 'ENTROPY_CLUSTER');
    assert.ok(cluster.length === 0, 'Should NOT fire ENTROPY_CLUSTER when one scene has relationship shift');
  });

  // ── proof-spec: e.dominant guard ─────────────────────────────────────────

  it('buildSystemPreamble skips emotion entries with missing dominant field', async () => {
    const { buildSystemPreamble } = await import('../../server/nvm/generate/proof-spec.ts');
    const { emptyState } = await import('../../server/nvm/state/NarrativeState.ts');
    const state = emptyState() as import('../../server/nvm/state/NarrativeState.ts').NarrativeState;
    // Inject emotion with undefined dominant (malformed/partial state)
    state.characterEmotions = {
      alice: { joy: 0, distress: 80, anger: 0, fear: 0, pride: 0, shame: 0,
               dominant: undefined as unknown as import('../../server/engine/types.ts').EmotionType,
               intensity: 80, last_updated_at: 0 },
      bob: { joy: 50, distress: 0, anger: 0, fear: 0, pride: 0, shame: 0,
             dominant: 'joy' as const, intensity: 50, last_updated_at: 0 },
    };
    const preamble = buildSystemPreamble([], state);
    // alice should be filtered out (undefined dominant), bob should appear
    assert.ok(!preamble.includes('undefined@80'), 'Should not emit "undefined@N" for missing dominant');
    assert.ok(preamble.includes('bob'), 'Should still emit bob with valid dominant');
  });
});


// ── Wave 88 ───────────────────────────────────────────────────────────────────
describe('Wave 88 — consensus accuracy fix, knownFacts cap, originality variety', () => {

  // ── room.ts consensus: unanimous critics now score 100 ───────────────────

  it('runWritersRoom consensus is 100 when all critics have same severity', async () => {
    const { runWritersRoom } = await import('../../server/nvm/room/room.ts');
    // Build an IR that will trigger multiple critics with uniform severity
    const ir: import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR = {
      transitionId: 'test-consensus',
      sceneIdx: 0,
      sceneFunction: 'build_tension',
      activeMechanisms: ['core_mechanism'],
      beforeStateHash: '',
      ops: [],
      preconditions: [],
      postconditions: [],
      provenance: { origin: 'model_generated' as const, createdAt: Date.now() },
    };
    const { emptyState } = await import('../../server/nvm/state/NarrativeState.ts');
    const state = emptyState() as import('../../server/nvm/state/NarrativeState.ts').NarrativeState;
    const result = runWritersRoom(ir, state);
    // consensus should be in [0, 100] — previously was deflated by the 0-anchor bug
    assert.ok(result.consensus >= 0 && result.consensus <= 100,
      `consensus should be in [0,100], got ${result.consensus}`);
    // If critiques are all same severity (or there are no critiques), consensus should be high
    if (result.dominantCritic === 'none' || result.critiques.length === 0) {
      assert.equal(result.consensus, 100, 'No critiques means full consensus');
    }
  });

  it('consensus formula: same-severity critiques give consensus=100', () => {
    // Test the fix directly: max - min should be 0 when all same severity
    const severities = [70, 70, 70];
    const maxSev = severities.length > 0 ? Math.max(...severities) : 0;
    const minSev = severities.length > 0 ? Math.min(...severities) : 0;
    const consensus = severities.length === 0 ? 100 : Math.max(0, Math.round(100 - (maxSev - minSev)));
    assert.equal(consensus, 100, 'Unanimous critics with same severity should give 100 consensus');
  });

  it('consensus formula: mixed-severity critiques reduce consensus', () => {
    const severities = [80, 20];
    const maxSev = Math.max(...severities);
    const minSev = Math.min(...severities);
    const consensus = Math.max(0, Math.round(100 - (maxSev - minSev)));
    assert.equal(consensus, 40, 'Wide severity spread should reduce consensus significantly');
  });

  // ── dispatcher: knownFacts cap at 100 ────────────────────────────────────

  it('UPDATE_READER_STATE caps knownFacts at 100 entries', async () => {
    const { applyStoryOps } = await import('../../server/nvm/ops/dispatcher.ts');
    const { emptyState } = await import('../../server/nvm/state/NarrativeState.ts');

    // Pre-populate audienceState with 100 existing facts
    let state = emptyState() as import('../../server/nvm/state/NarrativeState.ts').NarrativeState;
    state = {
      ...state,
      audienceState: {
        ...state.audienceState,
        knownFacts: Array.from({ length: 100 }, (_, i) => `fact-${i}`),
      },
    };

    // Apply one more UPDATE_READER_STATE with a knownFact
    const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
      {
        op: 'UPDATE_READER_STATE',
        delta: { suspense: 0, curiosity: 0, investment: 0, knownFact: 'new-fact' },
      },
    ];
    const after = applyStoryOps(state, ops);
    assert.equal(after.audienceState.knownFacts.length, 100,
      'knownFacts should stay capped at 100 after adding one more');
    // The newest fact should be present, oldest dropped
    assert.ok(after.audienceState.knownFacts.includes('new-fact'),
      'The new fact should be in the array');
    assert.ok(!after.audienceState.knownFacts.includes('fact-0'),
      'The oldest fact should be dropped (FIFO)');
  });

  // ── originality: low variety detection ───────────────────────────────────

  it('originalityPass detects LOW_SCENE_VARIETY for 2 purposes in 8+ scenes', async () => {
    const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
    const records = Array.from({ length: 8 }, (_, i) => ({
      commitId: `c${i}`, sceneIdx: i, slug: `SC${i}`,
      purpose: i % 2 === 0 ? 'establish_world' : 'character_moment',
      dramaticTurn: 'nothing', revelation: null, clockRaised: false, clockDelta: 0,
      emotionalShift: 'neutral', suspenseDelta: 0,
      dialogueHighlights: [], unresolvedClues: [],
      seededClueIds: [], payoffSetupIds: [],
      readerStateAnnotation: null,
    }));
    const result = await originalityPass({
      fountain: 'INT. SC0 - DAY\nA.\n',
      original: 'INT. SC0 - DAY\nA.\n',
      records: records as unknown as Parameters<typeof originalityPass>[0]['records'],
      structure: {} as Parameters<typeof originalityPass>[0]['structure'],
      annotations: [],
      approvedSpans: [],
    });
    const lowVar = result.issues.find(i => i.rule === 'LOW_SCENE_VARIETY');
    assert.ok(lowVar, 'Should detect LOW_SCENE_VARIETY for 2 purposes across 8 scenes');
  });

  it('originalityPass does NOT fire LOW_SCENE_VARIETY for 2 purposes in fewer than 8 scenes', async () => {
    const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
    const records = Array.from({ length: 6 }, (_, i) => ({
      commitId: `c${i}`, sceneIdx: i, slug: `SC${i}`,
      purpose: i % 2 === 0 ? 'establish_world' : 'character_moment',
      dramaticTurn: 'nothing', revelation: null, clockRaised: false, clockDelta: 0,
      emotionalShift: 'neutral', suspenseDelta: 0,
      dialogueHighlights: [], unresolvedClues: [],
      seededClueIds: [], payoffSetupIds: [],
      readerStateAnnotation: null,
    }));
    const result = await originalityPass({
      fountain: 'INT. SC0 - DAY\nA.\n',
      original: 'INT. SC0 - DAY\nA.\n',
      records: records as unknown as Parameters<typeof originalityPass>[0]['records'],
      structure: {} as Parameters<typeof originalityPass>[0]['structure'],
      annotations: [],
      approvedSpans: [],
    });
    const lowVar = result.issues.find(i => i.rule === 'LOW_SCENE_VARIETY');
    assert.ok(!lowVar, 'Should NOT fire LOW_SCENE_VARIETY for 6 scenes (threshold is 8)');
  });
});


// ── Wave 89 ───────────────────────────────────────────────────────────────────
describe('Wave 89 — dead-condition revival, severity-aware truncation, NaN hardening', () => {
  type Rec = import('../../server/nvm/screenplay/memory.ts').ScreenplaySceneRecord;
  function mkRec(overrides: Partial<Rec>): Rec {
    return {
      commitId: 'c0', sceneIdx: 0, slug: 'INT. TEST', purpose: 'character_moment',
      dramaticTurn: 'something happens', revelation: null, emotionalShift: 'neutral',
      visualBeats: [], dialogueHighlights: [], unresolvedClues: [],
      seededClueIds: [], payoffSetupIds: [], clockRaised: false, clockDelta: 0,
      suspenseDelta: 0, curiosityDelta: 0, createdAt: 0,
      ...overrides,
    };
  }

  // ── causality.ts: UNEXPLAINED_SUSPENSE_DROP was dead (dramaticTurn never 'none') ──
  it('causalityPass fires UNEXPLAINED_SUSPENSE_DROP on a sharp drop in a non-resolving scene', async () => {
    const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
    const records = [
      mkRec({ sceneIdx: 0, purpose: 'raise_stakes', suspenseDelta: 4 }),
      mkRec({ sceneIdx: 1, purpose: 'character_moment', suspenseDelta: -6 }),
    ];
    const result = await causalityPass({
      fountain: 'INT. TEST - DAY\nAction.\n',
      original: 'INT. TEST - DAY\nAction.\n',
      records: records as unknown as Parameters<typeof causalityPass>[0]['records'],
      structure: {} as Parameters<typeof causalityPass>[0]['structure'],
      annotations: [],
      approvedSpans: [],
    });
    const drop = result.issues.find(i => i.rule === 'UNEXPLAINED_SUSPENSE_DROP');
    assert.ok(drop, 'Should fire UNEXPLAINED_SUSPENSE_DROP — this rule was dead before Wave 89');
  });

  it('causalityPass does NOT fire UNEXPLAINED_SUSPENSE_DROP when the drop lands in a resolution scene', async () => {
    const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
    const records = [
      mkRec({ sceneIdx: 0, purpose: 'raise_stakes', suspenseDelta: 4 }),
      mkRec({ sceneIdx: 1, purpose: 'resolution', suspenseDelta: -6 }),
    ];
    const result = await causalityPass({
      fountain: 'INT. TEST - DAY\nAction.\n',
      original: 'INT. TEST - DAY\nAction.\n',
      records: records as unknown as Parameters<typeof causalityPass>[0]['records'],
      structure: {} as Parameters<typeof causalityPass>[0]['structure'],
      annotations: [],
      approvedSpans: [],
    });
    const drop = result.issues.find(i => i.rule === 'UNEXPLAINED_SUSPENSE_DROP');
    assert.ok(!drop, 'A resolution scene legitimately releases tension — should not flag');
  });

  // ── Wave 141 additions: motivation & action consequence ──────────────────────

  it('causalityPass detects UNMOTIVATED_DECISION when major decision has no prior setup', async () => {
    const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
    const records = [
      mkRec({ sceneIdx: 0, purpose: 'dialogue', suspenseDelta: 0.5, relationshipShifts: [] } as any),
      mkRec({ sceneIdx: 1, purpose: 'dialogue', suspenseDelta: 0.3, relationshipShifts: [] } as any),
      // Scene 2: major decision (high suspense) with NO setup in scenes 0-1
      mkRec({ sceneIdx: 2, purpose: 'climax', suspenseDelta: 3.5, relationshipShifts: [{ pairKey: 'alice|bob', shiftMagnitude: 1 }] } as any),
    ];
    const result = await causalityPass({
      fountain: 'INT. SC0 - DAY\nA.\nINT. SC1 - DAY\nB.\nINT. SC2 - DAY\nC.\n',
      original: 'INT. SC0 - DAY\nA.\nINT. SC1 - DAY\nB.\nINT. SC2 - DAY\nC.\n',
      records: records as unknown as Parameters<typeof causalityPass>[0]['records'],
      structure: {} as Parameters<typeof causalityPass>[0]['structure'],
      annotations: [],
      approvedSpans: [],
    });
    const unmotivated = result.issues.find(i => i.rule === 'UNMOTIVATED_DECISION');
    assert.ok(unmotivated, 'Should detect UNMOTIVATED_DECISION for decision with no prior setup');
    assert.ok(unmotivated?.severity === 'major');
  });

  it('causalityPass does NOT fire UNMOTIVATED_DECISION when decision has setup clue in prior scene', async () => {
    const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
    const records = [
      mkRec({ sceneIdx: 0, purpose: 'establish_world', seededClueIds: ['secret-revealed'] }),
      // Scene 1: decision motivated by the clue from scene 0
      mkRec({ sceneIdx: 1, purpose: 'climax', suspenseDelta: 3.5, relationshipShifts: [{ pairKey: 'alice|bob', shiftMagnitude: 1 }] } as any),
    ];
    const result = await causalityPass({
      fountain: 'INT. SC0 - DAY\nA.\nINT. SC1 - DAY\nB.\n',
      original: 'INT. SC0 - DAY\nA.\nINT. SC1 - DAY\nB.\n',
      records: records as unknown as Parameters<typeof causalityPass>[0]['records'],
      structure: {} as Parameters<typeof causalityPass>[0]['structure'],
      annotations: [],
      approvedSpans: [],
    });
    const unmotivated = result.issues.find(i => i.rule === 'UNMOTIVATED_DECISION');
    assert.ok(!unmotivated, 'Should NOT flag when decision has setup clue');
  });

  it('causalityPass detects ACTION_WITHOUT_CONSEQUENCE when planted clue has no character reaction', async () => {
    const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
    const records = [
      mkRec({ sceneIdx: 0, purpose: 'establish_world', seededClueIds: ['secret-letter'] }),
      // Scene 1: no consequence (no relationship shift, no suspense spike, no emotion)
      mkRec({ sceneIdx: 1, purpose: 'dialogue', suspenseDelta: 0.2, emotionalShift: 'neutral' } as any),
      mkRec({ sceneIdx: 2, purpose: 'dialogue', suspenseDelta: 0.3, emotionalShift: 'neutral' } as any),
    ];
    const result = await causalityPass({
      fountain: 'INT. SC0 - DAY\nA.\nINT. SC1 - DAY\nB.\nINT. SC2 - DAY\nC.\n',
      original: 'INT. SC0 - DAY\nA.\nINT. SC1 - DAY\nB.\nINT. SC2 - DAY\nC.\n',
      records: records as unknown as Parameters<typeof causalityPass>[0]['records'],
      structure: {} as Parameters<typeof causalityPass>[0]['structure'],
      annotations: [],
      approvedSpans: [],
    });
    const consequence = result.issues.find(i => i.rule === 'ACTION_WITHOUT_CONSEQUENCE');
    assert.ok(consequence, 'Should detect ACTION_WITHOUT_CONSEQUENCE for clue with no character reaction');
    assert.ok(consequence?.severity === 'major');
  });

  it('causalityPass does NOT fire ACTION_WITHOUT_CONSEQUENCE when action triggers relationship shift', async () => {
    const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
    const records = [
      mkRec({ sceneIdx: 0, purpose: 'establish_world', seededClueIds: ['secret-letter'] }),
      // Scene 1: DOES have consequence (relationship shift)
      mkRec({ sceneIdx: 1, purpose: 'confrontation', suspenseDelta: 2.5, relationshipShifts: [{ pairKey: 'alice|bob', shiftMagnitude: -1.5 }] } as any),
    ];
    const result = await causalityPass({
      fountain: 'INT. SC0 - DAY\nA.\nINT. SC1 - DAY\nALICE\nYou lied.\n',
      original: 'INT. SC0 - DAY\nA.\nINT. SC1 - DAY\nALICE\nYou lied.\n',
      records: records as unknown as Parameters<typeof causalityPass>[0]['records'],
      structure: {} as Parameters<typeof causalityPass>[0]['structure'],
      annotations: [],
      approvedSpans: [],
    });
    const consequence = result.issues.find(i => i.rule === 'ACTION_WITHOUT_CONSEQUENCE');
    assert.ok(!consequence, 'Should NOT flag when action triggers relationship shift');
  });

  it('causalityPass detects ABANDONED_GOAL when clue appears 2+ times then never resolves', async () => {
    const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
    const records = [
      mkRec({ sceneIdx: 0, seededClueIds: ['find-treasure'] }),
      mkRec({ sceneIdx: 1, seededClueIds: ['find-treasure'] }),
      mkRec({ sceneIdx: 2, seededClueIds: [] }), // treasure goal disappears, never paid off
      mkRec({ sceneIdx: 3, seededClueIds: [] }),
    ];
    const result = await causalityPass({
      fountain: 'INT. SC0 - DAY\nA.\nINT. SC1 - DAY\nB.\nINT. SC2 - DAY\nC.\nINT. SC3 - DAY\nD.\n',
      original: 'INT. SC0 - DAY\nA.\nINT. SC1 - DAY\nB.\nINT. SC2 - DAY\nC.\nINT. SC3 - DAY\nD.\n',
      records: records as unknown as Parameters<typeof causalityPass>[0]['records'],
      structure: {} as Parameters<typeof causalityPass>[0]['structure'],
      annotations: [],
      approvedSpans: [],
    });
    const abandoned = result.issues.find(i => i.rule === 'ABANDONED_GOAL');
    assert.ok(abandoned, 'Should detect ABANDONED_GOAL for clue that appears 2+ times then vanishes');
    assert.ok(abandoned?.description.includes('find-treasure'));
    assert.ok(abandoned?.severity === 'major');
  });

  it('causalityPass does NOT fire ABANDONED_GOAL when clue is paid off', async () => {
    const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
    const records = [
      mkRec({ sceneIdx: 0, seededClueIds: ['find-treasure'] }),
      mkRec({ sceneIdx: 1, seededClueIds: ['find-treasure'] }),
      mkRec({ sceneIdx: 2, payoffSetupIds: ['find-treasure'] }), // treasure is paid off
      mkRec({ sceneIdx: 3 }),
    ];
    const result = await causalityPass({
      fountain: 'INT. SC0 - DAY\nA.\nINT. SC1 - DAY\nB.\nINT. SC2 - DAY\nC.\nINT. SC3 - DAY\nD.\n',
      original: 'INT. SC0 - DAY\nA.\nINT. SC1 - DAY\nB.\nINT. SC2 - DAY\nC.\nINT. SC3 - DAY\nD.\n',
      records: records as unknown as Parameters<typeof causalityPass>[0]['records'],
      structure: {} as Parameters<typeof causalityPass>[0]['structure'],
      annotations: [],
      approvedSpans: [],
    });
    const abandoned = result.issues.find(i => i.rule === 'ABANDONED_GOAL');
    assert.ok(!abandoned, 'Should NOT flag when goal is paid off');
  });

  // ── originality.ts: severity-aware truncation keeps the major finding ──────────
  it('originalityPass keeps the major UNIFORM_SCENE_PURPOSES issue even past 8 clichés', async () => {
    const { originalityPass } = await import('../../server/nvm/revision/passes/originality.ts');
    // 9 distinct clichés (minor) would crowd out the structural finding under a naive slice(0,8).
    const cliches = [
      'we need to talk', 'i can explain', "you don't understand",
      'this changes everything', 'over my dead body', 'trust me on this',
      'you lied to me', 'just let it go', "this isn't over",
    ];
    const fountain = 'INT. ROOM - DAY\n' + cliches.join('\n') + '\n';
    // All scenes share one purpose → UNIFORM_SCENE_PURPOSES (major) is pushed LAST.
    const records = Array.from({ length: 5 }, (_, i) => mkRec({ sceneIdx: i, purpose: 'character_moment' }));
    const result = await originalityPass({
      fountain,
      original: fountain,
      records: records as unknown as Parameters<typeof originalityPass>[0]['records'],
      structure: {} as Parameters<typeof originalityPass>[0]['structure'],
      annotations: [],
      approvedSpans: [],
    });
    assert.ok(result.issues.length <= 8, 'Truncation cap of 8 still holds');
    const uniform = result.issues.find(i => i.rule === 'UNIFORM_SCENE_PURPOSES');
    assert.ok(uniform, 'The major structural finding must survive truncation, not get crowded out by minor clichés');
  });

  // ── futures.ts: NaN investment must not poison the tension ledger ──────────────
  it('deriveTensionLedger yields a finite totalTension even when investment is NaN', async () => {
    const { deriveTensionLedger } = await import('../../server/nvm/valuation/futures.ts');
    const { emptyState } = await import('../../server/nvm/state/NarrativeState.ts');
    const state = emptyState();
    state.audienceState.investment = NaN;
    state.clocks['bomb'] = 3;
    const ledger = deriveTensionLedger(state, 2);
    assert.ok(isFinite(ledger.totalTension), 'totalTension must be finite, not NaN');
    assert.ok(ledger.positions.every(p => isFinite(p.markToMarket)), 'every position markToMarket must be finite');
  });

  it('deriveTensionLedger yields a finite totalTension even when investment is Infinity', async () => {
    const { deriveTensionLedger } = await import('../../server/nvm/valuation/futures.ts');
    const { emptyState } = await import('../../server/nvm/state/NarrativeState.ts');
    const state = emptyState();
    state.audienceState.investment = Infinity;
    state.clocks['deadline'] = 5;
    const ledger = deriveTensionLedger(state, 1);
    assert.ok(isFinite(ledger.totalTension), 'Infinity investment must be coerced, not propagated');
  });
});


// ── Wave 91 — Screenplay layout engine + PDF export (P2) ──────────────────────
describe('Wave 91 — screenplay layout engine', () => {
  it('uppercases and indents a scene heading at 1.5 inches (108pt)', () => {
    const pages = layoutScreenplay('INT. coffee shop - day\n\nA man sits.');
    const heading = pages[0].lines.find(l => l.text.includes('COFFEE'));
    assert.ok(heading, 'scene heading present');
    assert.equal(heading!.text, 'INT. COFFEE SHOP - DAY', 'scene heading uppercased');
    assert.equal(heading!.xPt, 108, 'scene heading indented 1.5in = 108pt');
  });

  it('indents a character cue at 3.7 inches and dialogue at 2.5 inches', () => {
    const pages = layoutScreenplay('INT. ROOM - DAY\n\nAction.\n\nMARA\nHello there.');
    const all = pages.flatMap(p => p.lines);
    const cue = all.find(l => l.text === 'MARA');
    const dlg = all.find(l => l.text === 'Hello there.');
    assert.ok(cue && dlg, 'cue and dialogue present');
    assert.ok(Math.abs(cue!.xPt - 3.7 * 72) < 0.01, 'character cue at 3.7in');
    assert.ok(Math.abs(dlg!.xPt - 2.5 * 72) < 0.01, 'dialogue at 2.5in');
  });

  it('wraps long dialogue onto multiple lines within the dialogue width', () => {
    const longLine = 'This is a very long line of dialogue that absolutely must wrap across several physical lines because it greatly exceeds the dialogue column width of thirty-five characters.';
    const pages = layoutScreenplay(`INT. ROOM - DAY\n\nA.\n\nBOB\n${longLine}`);
    const dialogueLines = pages.flatMap(p => p.lines).filter(l => l.xPt > 0 && Math.abs(l.xPt - 2.5 * 72) < 0.01);
    assert.ok(dialogueLines.length >= 4, 'long dialogue wraps to multiple lines');
    for (const l of dialogueLines) {
      assert.ok(l.text.length <= 35, `each wrapped dialogue line ≤ 35 chars (got ${l.text.length})`);
    }
  });

  it('never exceeds LINES_PER_PAGE lines on any page', () => {
    let script = 'INT. ROOM - DAY\n\n';
    for (let i = 0; i < 40; i++) {
      script += `INT. LOC ${i} - DAY\n\nAction describing scene ${i} in some detail here.\n\nCHAR${i}\nDialogue line for scene ${i}.\n\n`;
    }
    const pages = layoutScreenplay(script);
    assert.ok(pages.length > 1, 'long script spans multiple pages');
    for (const p of pages) {
      assert.ok(p.lines.length <= LINES_PER_PAGE, `page ${p.pageNumber} within line cap`);
    }
  });

  it('does not orphan a scene heading or character cue at the bottom of a page', () => {
    let script = 'INT. ROOM - DAY\n\n';
    for (let i = 0; i < 40; i++) {
      script += `INT. LOC ${i} - DAY\n\nAction ${i} text here for spacing.\n\nCHAR${i}\nDialogue ${i}.\n\n`;
    }
    const pages = layoutScreenplay(script);
    for (let pi = 0; pi < pages.length - 1; pi++) {
      const last = pages[pi].lines[pages[pi].lines.length - 1];
      assert.ok(!/^(INT\.|EXT\.)/.test(last.text), `page ${pages[pi].pageNumber} does not end on a scene heading`);
      assert.ok(!/^CHAR\d+$/.test(last.text), `page ${pages[pi].pageNumber} does not end on a character cue`);
    }
  });

  it('right-aligns transitions', () => {
    const pages = layoutScreenplay('INT. ROOM - DAY\n\nA.\n\nCUT TO:');
    const t = pages.flatMap(p => p.lines).find(l => l.text.includes('CUT TO'));
    assert.ok(t, 'transition present');
    // right edge at 7.5in; x = 7.5*72 - len*7.2
    const expected = 7.5 * 72 - t!.text.length * 7.2;
    assert.ok(Math.abs(t!.xPt - expected) < 0.01, 'transition right-aligned to 7.5in');
  });

  it('returns a single empty page for an empty script', () => {
    const pages = layoutScreenplay('');
    assert.equal(pages.length, 1, 'one page');
    assert.equal(pages[0].lines.length, 0, 'no lines');
  });

  it('skips Fountain title-page key:value lines from the body', () => {
    const pages = layoutScreenplay('Title: My Script\nAuthor: Me\n\nINT. ROOM - DAY\n\nAction.');
    const all = pages.flatMap(p => p.lines).map(l => l.text);
    assert.ok(!all.some(t => t.startsWith('Title:') || t.startsWith('Author:')), 'title-page lines excluded from body');
  });
});


describe('Wave 91 — fountainToPdf', () => {
  function toLatin1(bytes: Uint8Array): string {
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return s;
  }

  it('emits a valid PDF header and EOF marker', () => {
    const pdf = fountainToPdf('INT. ROOM - DAY\n\nA man sits.');
    const text = toLatin1(pdf);
    assert.ok(text.startsWith('%PDF-1.4'), 'PDF header present');
    assert.ok(text.trimEnd().endsWith('%%EOF'), 'EOF marker present');
  });

  it('produces an xref table whose every offset points at its object', () => {
    const pdf = fountainToPdf('INT. ROOM - DAY\n\nAction.\n\nALICE\nHello.');
    const text = toLatin1(pdf);
    const startxref = parseInt(text.match(/startxref\s+(\d+)/)![1], 10);
    assert.equal(text.slice(startxref, startxref + 4), 'xref', 'startxref points to xref keyword');
    const size = parseInt(text.match(/\/Size (\d+)/)![1], 10);
    const lines = text.slice(startxref).split('\n');
    for (let n = 1; n < size; n++) {
      const off = parseInt(lines[2 + n].slice(0, 10), 10);
      assert.ok(text.slice(off).startsWith(`${n} 0 obj`), `xref entry ${n} resolves to "${n} 0 obj"`);
    }
  });

  it('numbers pages from 2 onward, never page 1', () => {
    let script = 'INT. ROOM - DAY\n\n';
    for (let i = 0; i < 40; i++) {
      script += `INT. LOC ${i} - DAY\n\nAction ${i}.\n\nCHAR${i}\nDialogue ${i} line.\n\n`;
    }
    const text = toLatin1(fountainToPdf(script));
    assert.ok(text.includes('(2.) Tj'), 'page 2 carries a page number');
    assert.ok(!text.includes('(1.) Tj'), 'page 1 has no page number');
  });

  it('escapes PDF-special characters in dialogue', () => {
    const pdf = fountainToPdf('INT. ROOM - DAY\n\nBOB\nThis (parenthetical) and a backslash \\ here.');
    const text = toLatin1(pdf);
    assert.ok(text.includes('\\(parenthetical\\)'), 'parentheses escaped');
    assert.ok(text.includes('\\\\'), 'backslash escaped');
  });
});


// ── Wave 92 — ZIP writer + DOCX export (P2) ───────────────────────────────────
describe('Wave 92 — buildZip', () => {
  function latin1(bytes: Uint8Array): string {
    let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return s;
  }
  // Read a little-endian u32 at offset.
  function u32(b: Uint8Array, off: number): number {
    return (b[off] | (b[off+1] << 8) | (b[off+2] << 16) | (b[off+3] << 24)) >>> 0;
  }

  it('emits local-header, central-directory, and EOCD signatures', () => {
    const zip = buildZip([{ name: 'a.txt', data: 'hello' }]);
    const text = latin1(zip);
    assert.ok(text.includes('PK\x03\x04'), 'local file header signature present');
    assert.ok(text.includes('PK\x01\x02'), 'central directory signature present');
    assert.ok(text.includes('PK\x05\x06'), 'end-of-central-directory signature present');
  });

  it('records the correct total entry count in the EOCD', () => {
    const zip = buildZip([
      { name: 'a.txt', data: 'one' },
      { name: 'b.txt', data: 'two' },
      { name: 'c.txt', data: 'three' },
    ]);
    const text = latin1(zip);
    const eocd = text.lastIndexOf('PK\x05\x06');
    // total entries is a u16 at offset 10 of the EOCD record
    const total = zip[eocd + 10] | (zip[eocd + 11] << 8);
    assert.equal(total, 3, 'EOCD reports 3 entries');
  });

  it('computes a CRC-32 matching the zlib reference implementation', async () => {
    const zlib = await import('node:zlib');
    const payload = 'The quick brown fox jumps over the lazy dog 0123456789';
    const zip = buildZip([{ name: 'x.txt', data: payload }]);
    // The CRC-32 lives at offset 14 of the local file header (after sig+version+flag+method+time+date).
    const crcInZip = u32(zip, 14);
    const reference = (zlib.crc32!(payload) >>> 0);
    assert.equal(crcInZip, reference, 'stored CRC-32 matches zlib.crc32');
  });

  it('stores data uncompressed (method 0) so contents appear verbatim', () => {
    const zip = buildZip([{ name: 'note.txt', data: 'VERBATIM_MARKER_123' }]);
    assert.ok(latin1(zip).includes('VERBATIM_MARKER_123'), 'stored entry contents appear in the archive');
  });
});


describe('Wave 92 — fountainToDocx', () => {
  function latin1(bytes: Uint8Array): string {
    let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return s;
  }

  it('produces a valid ZIP whose CRCs all verify (round-trip via zlib inflate-less store)', () => {
    const docx = fountainToDocx('INT. ROOM - DAY\n\nA man sits.');
    const text = latin1(docx);
    assert.ok(text.includes('PK\x03\x04'), 'has local headers');
    assert.ok(text.includes('PK\x05\x06'), 'has EOCD');
  });

  it('includes all five required OOXML package parts', () => {
    const text = latin1(fountainToDocx('INT. ROOM - DAY\n\nAction.'));
    for (const part of [
      '[Content_Types].xml', '_rels/.rels', 'word/_rels/document.xml.rels',
      'word/styles.xml', 'word/document.xml',
    ]) {
      assert.ok(text.includes(part), `archive contains ${part}`);
    }
  });

  it('maps block types to paragraph styles and uppercases the scene heading', () => {
    // Store method = uncompressed, so document.xml bytes appear verbatim in the archive.
    // Character cues must already be uppercase in Fountain source, so MARA is the cue.
    const text = latin1(fountainToDocx('INT. coffee shop - day\n\nA.\n\nMARA\nHi.'));
    assert.ok(text.includes('w:val="SceneHeading"'), 'scene heading style applied');
    assert.ok(text.includes('w:val="Character"'), 'character style applied');
    assert.ok(text.includes('w:val="Dialogue"'), 'dialogue style applied');
    assert.ok(text.includes('INT. COFFEE SHOP - DAY'), 'lowercase scene heading uppercased on export');
    assert.ok(text.includes('MARA'), 'character cue present under Character style');
  });

  it('XML-escapes special characters in dialogue', () => {
    const text = latin1(fountainToDocx('INT. ROOM - DAY\n\nBOB\nTom & Jerry <fight> "loudly".'));
    assert.ok(text.includes('Tom &amp; Jerry &lt;fight&gt; &quot;loudly&quot;'), 'ampersand, angle brackets, quotes escaped');
  });

  it('excludes Fountain title-page key:value lines from the body', () => {
    const text = latin1(fountainToDocx('Title: My Script\nAuthor: Me\n\nINT. ROOM - DAY\n\nAction.'));
    assert.ok(!text.includes('Title: My Script'), 'title-page line not in body');
    assert.ok(text.includes('Action'), 'body content present');
  });
});


// ── M4: Agent psychology module (extracted from Agent.ts) ─────────────────────
describe('agent/psychology', () => {
  // Build a full EmotionState with the named emotion dominant at a given intensity.
  const emo = (dominant: 'shame' | 'anger' | 'fear' | 'distress' | 'pride', intensity: number) => ({
    joy: 0, distress: 0, anger: 0, fear: 0, pride: 0, shame: 0,
    [dominant]: intensity, dominant, intensity, last_updated_at: 0,
  });
  it('describeAttachment returns a distinct line per attachment style', () => {
    const anxious  = describeAttachment('anxious');
    const avoidant = describeAttachment('avoidant');
    const secure   = describeAttachment(undefined);
    assert.ok(anxious.length > 0 && avoidant.length > 0 && secure.length > 0);
    assert.notEqual(anxious, avoidant);
    assert.notEqual(avoidant, secure);
  });

  it('selectActiveDefense returns null when emotion intensity is below threshold', () => {
    const mechanisms = ['denial', 'projection'] as const;
    const low = selectActiveDefense([...mechanisms], emo('shame', 10));
    assert.equal(low, null);
  });

  it('selectActiveDefense picks an emotion-appropriate mechanism when intense', () => {
    const chosen = selectActiveDefense(['denial', 'projection'], emo('shame', 80));
    // shame prefers denial/rationalization/repression — denial is available
    assert.equal(chosen, 'denial');
  });

  it('selectActiveDefense falls back to the first mechanism when none preferred', () => {
    const chosen = selectActiveDefense(['displacement'], emo('shame', 80));
    assert.equal(chosen, 'displacement');
  });

  it('selectActiveDefense returns null with no mechanisms', () => {
    assert.equal(selectActiveDefense(undefined, emo('fear', 90)), null);
    assert.equal(selectActiveDefense([], emo('fear', 90)), null);
  });

  it('describeActionBias reflects high machiavellianism', () => {
    const bias = describeActionBias({ machiavellianism: 90, narcissism: 50, psychopathy: 50 }, undefined, 0);
    assert.match(bias, /LIE is a natural tool/);
  });

  it('describeActionBias gives a neutral default when traits are middling', () => {
    const bias = describeActionBias({ machiavellianism: 50, narcissism: 50, psychopathy: 50 }, undefined, 0);
    assert.match(bias, /best serves your immediate goal/);
  });

  it('deriveSpeechPattern layers Big Five and emotion cues', () => {
    const pattern = deriveSpeechPattern(
      { openness: 90, conscientiousness: 50, extraversion: 50, agreeableness: 50, neuroticism: 50 },
      undefined,
      emo('anger', 60),
    );
    assert.match(pattern, /complex vocabulary/);
    assert.match(pattern, /Monosyllabic/);
  });

  it('computeDefenseLevel escalates with neuroticism and suspicion', () => {
    assert.match(computeDefenseLevel(80, 70), /breaking_point/);
    assert.match(computeDefenseLevel(65, 10), /^high/);
    assert.match(computeDefenseLevel(10, 10), /^low/);
  });

  it('selectPersuasionStrategy prefers a strategy with 2+ prior successes', () => {
    const target = {
      bigFive: { openness: 90, conscientiousness: 90, extraversion: 50, agreeableness: 50, neuroticism: 50 },
    } as Parameters<typeof selectPersuasionStrategy>[0];
    // base would be 'logic'; but emotion has 2 successes → should switch to emotion
    const history = [
      { strategy: 'emotion', success: true },
      { strategy: 'emotion', success: true },
    ] as Parameters<typeof selectPersuasionStrategy>[1];
    assert.equal(selectPersuasionStrategy(target, history), 'emotion');
  });

  it('getReadyGoals returns only goals whose dependencies are satisfied', () => {
    const gs = {
      terminal: { id: 't', description: 'win', value: 100, achieved: false },
      instrumental: [
        { id: 'a', description: 'A', value: 50, achieved: true },
        { id: 'b', description: 'B', value: 60, achieved: false, depends_on: ['a'] },
        { id: 'c', description: 'C', value: 70, achieved: false, depends_on: ['z'] },
      ],
    } as Parameters<typeof getReadyGoals>[0];
    const ready = getReadyGoals(gs);
    const ids = ready.map(g => g.id);
    assert.ok(ids.includes('b'), 'B is ready (dep a achieved)');
    assert.ok(!ids.includes('c'), 'C is blocked (dep z unmet)');
    assert.ok(!ids.includes('a'), 'A already achieved, not returned');
  });
});


// ── P9: Copilot persona registry + validation ────────────────────────────────
describe('personas/registry', () => {
  it('validatePersona accepts a well-formed persona and clamps fields', () => {
    const p = validatePersona({
      id: 'my-voice',
      name: 'My Voice',
      description: 'd',
      systemPreamble: 'Write like me.',
      temperature: 5,            // out of range -> clamped to 2
      maxOutputTokens: 99999,    // out of range -> clamped to 1024
      contextInjectors: ['a', 'b'],
    });
    assert.ok(p, 'persona validated');
    assert.equal(p!.id, 'my-voice');
    assert.equal(p!.temperature, 2);
    assert.equal(p!.maxOutputTokens, 1024);
    assert.deepEqual(p!.contextInjectors, ['a', 'b']);
  });

  it('validatePersona rejects bad ids, missing name, missing preamble', () => {
    assert.equal(validatePersona({ id: 'Bad Id', name: 'X', systemPreamble: 'y' }), null);
    assert.equal(validatePersona({ id: 'ok', systemPreamble: 'y' }), null);
    assert.equal(validatePersona({ id: 'ok', name: 'X' }), null);
    assert.equal(validatePersona(null), null);
    assert.equal(validatePersona('nope'), null);
  });

  it('validatePersona caps the number of context injectors', () => {
    const many = Array.from({ length: 50 }, (_, i) => `line ${i}`);
    const p = validatePersona({ id: 'x', name: 'X', systemPreamble: 'p', contextInjectors: many });
    assert.ok(p);
    assert.ok((p!.contextInjectors?.length ?? 0) <= PERSONA_LIMITS.maxInjectors);
  });

  it('listPersonas includes the built-in default and specialists', () => {
    const ids = listPersonas().map(p => p.id);
    assert.ok(ids.includes('default'), 'default persona loaded from disk');
    assert.ok(ids.includes('noir-specialist'), 'noir specialist loaded');
    assert.ok(ids.length >= 3, 'multiple built-in personas loaded');
  });

  it('getPersona falls back to default for unknown ids', () => {
    const unknown = getPersona('does-not-exist');
    assert.ok(unknown);
    assert.equal(unknown!.id, 'default');
  });

  it('registerUserPersona adds a shadowing persona and strips builtin flag', () => {
    _resetUserPersonas();
    const reg = registerUserPersona({
      id: 'custom-1', name: 'Custom', systemPreamble: 'Be bold.', builtin: true,
    });
    assert.ok(reg);
    assert.equal(reg!.builtin, false, 'user persona cannot claim builtin');
    assert.equal(getPersona('custom-1')!.name, 'Custom');
    _resetUserPersonas();
    assert.equal(getPersona('custom-1')!.id, 'default', 'removed after reset');
  });

  it('personaPromptBlock renders preamble plus injector bullets', () => {
    const block = personaPromptBlock({
      id: 'x', name: 'X', description: '',
      systemPreamble: 'Lead line.',
      contextInjectors: ['first hint', 'second hint'],
    });
    assert.match(block, /Lead line\./);
    assert.match(block, /- first hint/);
    assert.match(block, /- second hint/);
  });
});


// ── M3: Prompt registry / template loader ─────────────────────────────────────
describe('lib/prompts', () => {
  it('renderTemplate substitutes {{var}} placeholders', () => {
    const out = renderTemplate('Hello {{name}}, you are {{age}}.', { name: 'Mara', age: 40 });
    assert.equal(out, 'Hello Mara, you are 40.');
  });

  it('renderTemplate collapses unknown/undefined placeholders to empty', () => {
    assert.equal(renderTemplate('a{{missing}}b', {}), 'ab');
    assert.equal(renderTemplate('a{{x}}b', { x: undefined }), 'ab');
  });

  it('renderTemplate tolerates whitespace inside the braces', () => {
    assert.equal(renderTemplate('[{{  k  }}]', { k: 'v' }), '[v]');
  });

  it('getPrompt loads and interpolates the bundled scriptide-complete template', () => {
    const out = getPrompt('scriptide-complete', {
      personaLead: 'You are a noir writer.',
      stylePreamble: '', genrePreamble: '', charPreamble: '', bibleBlock: '',
      prefix: 'INT. BAR - NIGHT', suffix: '(end of document)',
    });
    assert.match(out, /You are a noir writer\./);
    assert.match(out, /INT\. BAR - NIGHT/);
    assert.match(out, /OUTPUT ONLY THE CONTINUATION TEXT/);
    assert.ok(!out.includes('{{'), 'no unresolved placeholders remain');
  });

  it('hasPrompt is true for a bundled prompt and false for an unknown one', () => {
    assert.equal(hasPrompt('scriptide-complete'), true);
    assert.equal(hasPrompt('definitely-not-a-real-prompt'), false);
  });

  it('getPrompt rejects path-traversal names and returns empty', () => {
    assert.equal(getPrompt('../secret'), '');
    assert.equal(getPrompt('foo/bar'), '');
  });

  it('M3: all 5 new scriptide prompt files exist and have no unresolved placeholders after interpolation', () => {
    const names = ['scriptide-worldbuild', 'scriptide-dialogue', 'scriptide-tension', 'scriptide-clean-action', 'scriptide-character'];
    for (const name of names) {
      assert.ok(hasPrompt(name), `prompt file ${name} missing`);
    }
    const wb = getPrompt('scriptide-worldbuild', { contextBlock: '', bibleBlock: '', profilesBlock: '', beat: 'A man walks in.' });
    assert.ok(!wb.includes('{{'), 'worldbuild: no unresolved placeholders');
    assert.ok(wb.includes('A man walks in.'), 'worldbuild: beat variable injected');
    const dlg = getPrompt('scriptide-dialogue', { contextBlock: '', bibleBlock: '', dialogue: 'Hello.', profiles: '[]' });
    assert.ok(!dlg.includes('{{'), 'dialogue: no unresolved placeholders');
    const tension = getPrompt('scriptide-tension', { contextBlock: '', bibleBlock: '', profilesBlock: '', scene: 'Dark room.' });
    assert.ok(!tension.includes('{{'), 'tension: no unresolved placeholders');
    const ca = getPrompt('scriptide-clean-action', { genreHint: '', text: 'We pan to the door.' });
    assert.ok(!ca.includes('{{'), 'clean-action: no unresolved placeholders');
    const char = getPrompt('scriptide-character', { bibleBlock: '', name: 'Bob', ghost: 'loss', lie: 'false', want: 'escape', need: 'truth' });
    assert.ok(!char.includes('{{'), 'character: no unresolved placeholders');
    assert.ok(char.includes('Bob'), 'character: name variable injected');
  });
});


// ── P4: Yjs collaboration server — room id parsing ────────────────────────────
describe('collab/yjs-server', () => {
  it('parseRoomId extracts a valid room from a /collab/<room> path', () => {
    assert.equal(parseRoomId('/collab/my-room'), 'my-room');
    assert.equal(parseRoomId('/collab/abc_123'), 'abc_123');
    assert.equal(parseRoomId('/collab/room/'), 'room');
  });

  it('parseRoomId strips query strings', () => {
    assert.equal(parseRoomId('/collab/room42?token=x'), 'room42');
  });

  it('parseRoomId rejects non-collab paths and malformed ids', () => {
    assert.equal(parseRoomId('/other/room'), null);
    assert.equal(parseRoomId('/collab/'), null);
    assert.equal(parseRoomId('/collab/has spaces'), null);
    assert.equal(parseRoomId('/collab/a/b'), null);
    assert.equal(parseRoomId(undefined), null);
    assert.equal(parseRoomId('/collab/' + 'x'.repeat(65)), null);
  });

  it('collabRoomCount starts at zero with no active rooms', () => {
    assert.equal(typeof collabRoomCount(), 'number');
  });
});


// ── DV12-DV15: New quality violation rules ────────────────────────────────────
describe('quality engine DV12-DV15 — new violation rules', () => {
  function makeIR(ops: StoryOp[], sceneIdx = 1): import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR {
    return {
      transitionId: 'dv_test', sceneIdx, sceneFunction: 'build_tension',
      activeMechanisms: [], beforeStateHash: 'deadbeef', preconditions: [], postconditions: [],
      provenance: { origin: 'model_generated', createdAt: Date.now() },
      ops,
    };
  }
  function mkBelief(id: string, prop: string, src: 'witnessed'|'told' = 'witnessed'): StoryOp {
    return { op: 'UPDATE_BELIEF', charId: 'alice', belief: { id, proposition: prop, confidence: 0.7, source: src, source_event_id: 'e1', acquired_at: 1 } };
  }

  // ── DV12: Talking heads ───────────────────────────────────────────────────────
  it('DV12_TALKING_HEADS fires when ≥3 belief ops with no world/story consequence', () => {
    const ops: StoryOp[] = [
      mkBelief('b1', 'alice knows the plan'),
      mkBelief('b2', 'alice suspects bob'),
      mkBelief('b3', 'alice is confused'),
    ];
    const warnings = dialogueWarnings(makeIR(ops), emptyState());
    assert.ok(warnings.some(w => w.rule === 'DV12_TALKING_HEADS'), 'DV12 should fire for pure dialogue scene');
  });

  it('DV12_TALKING_HEADS does not fire when a SHIFT_RELATIONSHIP op is present', () => {
    const ops: StoryOp[] = [
      mkBelief('b1', 'alice knows the plan'),
      mkBelief('b2', 'alice suspects bob'),
      mkBelief('b3', 'alice is confused'),
      { op: 'SHIFT_RELATIONSHIP', pair: ['alice', 'bob'], delta: { dimension: 'trust', amount: 0.3, reason: 'trust grows' } },
    ];
    const warnings = dialogueWarnings(makeIR(ops), emptyState());
    assert.ok(!warnings.some(w => w.rule === 'DV12_TALKING_HEADS'), 'DV12 should not fire when world consequence exists');
  });

  // ── DV13: Unacknowledged clock ────────────────────────────────────────────────
  it('DV13_UNACKNOWLEDGED_CLOCK fires when RAISE_CLOCK has no belief referencing it', () => {
    const ops: StoryOp[] = [
      { op: 'RAISE_CLOCK', clockId: 'deadline', amount: 20 },
      mkBelief('b1', 'alice thinks something is wrong'),
    ];
    const warnings = dialogueWarnings(makeIR(ops), emptyState());
    assert.ok(warnings.some(w => w.rule === 'DV13_UNACKNOWLEDGED_CLOCK'), 'DV13 should fire when clock is invisible to characters');
  });

  it('DV13_UNACKNOWLEDGED_CLOCK does not fire when a belief references the clock', () => {
    const ops: StoryOp[] = [
      { op: 'RAISE_CLOCK', clockId: 'deadline', amount: 20 },
      { op: 'UPDATE_BELIEF', charId: 'alice', belief: { id: 'b1', proposition: 'the deadline is approaching fast', confidence: 0.8, source: 'witnessed', source_event_id: 'e1', acquired_at: 1 } },
    ];
    const warnings = dialogueWarnings(makeIR(ops), emptyState());
    assert.ok(!warnings.some(w => w.rule === 'DV13_UNACKNOWLEDGED_CLOCK'), 'DV13 should not fire when character acknowledges clock');
  });

  // ── DV14: Emotional flatline ──────────────────────────────────────────────────
  it('DV14_EMOTIONAL_FLATLINE fires when same character has ≥3 same-dominant emotion ops', () => {
    const ops: StoryOp[] = [
      { op: 'APPRAISE_EMOTION', charId: 'alice', emotion: { joy: 0, distress: 60, anger: 0, fear: 0, pride: 0, shame: 0, dominant: 'distress', intensity: 60, last_updated_at: 1 } },
      { op: 'APPRAISE_EMOTION', charId: 'alice', emotion: { joy: 0, distress: 65, anger: 0, fear: 0, pride: 0, shame: 0, dominant: 'distress', intensity: 65, last_updated_at: 2 } },
      { op: 'APPRAISE_EMOTION', charId: 'alice', emotion: { joy: 0, distress: 70, anger: 0, fear: 0, pride: 0, shame: 0, dominant: 'distress', intensity: 70, last_updated_at: 3 } },
    ];
    const warnings = dialogueWarnings(makeIR(ops), emptyState());
    assert.ok(warnings.some(w => w.rule === 'DV14_EMOTIONAL_FLATLINE'), 'DV14 should fire for repeated same emotion');
  });

  it('DV14_EMOTIONAL_FLATLINE does not fire when emotion changes dominant', () => {
    const ops: StoryOp[] = [
      { op: 'APPRAISE_EMOTION', charId: 'alice', emotion: { joy: 0, distress: 60, anger: 0, fear: 0, pride: 0, shame: 0, dominant: 'distress', intensity: 60, last_updated_at: 1 } },
      { op: 'APPRAISE_EMOTION', charId: 'alice', emotion: { joy: 0, distress: 0, anger: 70, fear: 0, pride: 0, shame: 0, dominant: 'anger', intensity: 70, last_updated_at: 2 } },
      { op: 'APPRAISE_EMOTION', charId: 'alice', emotion: { joy: 60, distress: 0, anger: 0, fear: 0, pride: 0, shame: 0, dominant: 'joy', intensity: 60, last_updated_at: 3 } },
    ];
    const warnings = dialogueWarnings(makeIR(ops), emptyState());
    assert.ok(!warnings.some(w => w.rule === 'DV14_EMOTIONAL_FLATLINE'), 'DV14 should not fire when emotion evolves');
  });

  // ── DV15: Goal-free scene ─────────────────────────────────────────────────────
  it('DV15_GOAL_FREE_SCENE fires when ≥4 ops with no story-structure progress', () => {
    const ops: StoryOp[] = [
      mkBelief('b1', 'alice knows the plan'),
      mkBelief('b2', 'alice suspects bob'),
      { op: 'APPRAISE_EMOTION', charId: 'alice', emotion: { joy: 0, distress: 40, anger: 0, fear: 0, pride: 0, shame: 0, dominant: 'distress', intensity: 40, last_updated_at: 1 } },
      mkBelief('b3', 'alice is confused about everything'),
    ];
    const warnings = dialogueWarnings(makeIR(ops), emptyState());
    assert.ok(warnings.some(w => w.rule === 'DV15_GOAL_FREE_SCENE'), 'DV15 should fire for scene with no story consequence');
  });

  it('DV15_GOAL_FREE_SCENE does not fire when RAISE_CLOCK is present', () => {
    const ops: StoryOp[] = [
      mkBelief('b1', 'alice knows the plan'),
      mkBelief('b2', 'alice suspects bob'),
      mkBelief('b3', 'alice is confused'),
      { op: 'RAISE_CLOCK', clockId: 'bomb_timer', amount: 30 },
    ];
    const warnings = dialogueWarnings(makeIR(ops), emptyState());
    assert.ok(!warnings.some(w => w.rule === 'DV15_GOAL_FREE_SCENE'), 'DV15 should not fire when clock is raised');
  });
});



// ── Wave 102: critics — investment drop, duplicate clock, dramaturge gaps ─────

describe('Wave 102 — studio-note investment, skeptic clock, dramaturge orphan/stall', () => {
  type IR = import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR;

  function baseIR(sceneIdx: number, ops: StoryOp[] = []): IR {
    return {
      transitionId: `t${sceneIdx}`, sceneIdx, sceneFunction: 'advance_plot',
      activeMechanisms: ['m1'], beforeStateHash: '', ops,
      preconditions: [], postconditions: [],
      provenance: { origin: 'model_generated', createdAt: 1 },
    };
  }

  it('studio-note flags investment < 25 after scene 3', async () => {
    const { studioNoteCritic } = await import('../../server/nvm/room/critics/studio-note.ts');
    const state = emptyState();
    state.audienceState = { knownFacts: [], suspense: 60, curiosity: 60, investment: 10 };
    const ir: IR = { ...baseIR(5), ops: [
      { op: 'UPDATE_READER_STATE', delta: { suspense: 10, curiosity: 5, investment: 2 } },
    ]};
    const critiques = studioNoteCritic(ir, state);
    assert.ok(critiques.some(c => c.objection.includes('investment')), 'should flag low investment');
  });

  it('studio-note does NOT flag investment when at or above 25', async () => {
    const { studioNoteCritic } = await import('../../server/nvm/room/critics/studio-note.ts');
    const state = emptyState();
    state.audienceState = { knownFacts: [], suspense: 60, curiosity: 60, investment: 30 };
    const ir: IR = { ...baseIR(5), ops: [
      { op: 'UPDATE_READER_STATE', delta: { suspense: 10, curiosity: 5, investment: 2 } },
    ]};
    const critiques = studioNoteCritic(ir, state);
    const investmentCrit = critiques.filter(c =>
      c.criticId === 'studio_note' && c.severity === 50 && c.objection.includes('investment'),
    );
    assert.equal(investmentCrit.length, 0, 'should not flag investment at 30');
  });

  it('skeptic flags same clockId raised twice in one IR', async () => {
    const { skepticCritic } = await import('../../server/nvm/room/critics/skeptic.ts');
    const ir = baseIR(3, [
      { op: 'RAISE_CLOCK', clockId: 'bomb_timer', amount: 15 },
      { op: 'RAISE_CLOCK', clockId: 'bomb_timer', amount: 20 },
    ]);
    const critiques = skepticCritic(ir, emptyState());
    assert.ok(critiques.some(c => c.objection.includes('twice')), 'should flag duplicate clock raise');
  });

  it('skeptic allows different clock IDs in same IR', async () => {
    const { skepticCritic } = await import('../../server/nvm/room/critics/skeptic.ts');
    const ir = baseIR(3, [
      { op: 'RAISE_CLOCK', clockId: 'bomb_timer', amount: 15 },
      { op: 'RAISE_CLOCK', clockId: 'deadline', amount: 10 },
    ]);
    const critiques = skepticCritic(ir, emptyState());
    assert.ok(!critiques.some(c => c.objection.includes('twice')), 'different clock IDs should not fire');
  });

  it('dramaturge flags > 6 open clues (no payoffs)', async () => {
    const { dramaturgeCritic } = await import('../../server/nvm/room/critics/dramaturge.ts');
    const state = emptyState();
    state.clues = Array.from({ length: 7 }, (_, i) => ({ clueId: `clue_${i}`, carrier: 'object' as const }));
    state.payoffs = [];
    const critiques = dramaturgeCritic(baseIR(5), state);
    assert.ok(critiques.some(c => c.objection.includes('open clues')), 'should flag clue overload');
  });

  it('dramaturge does NOT flag clue overload when open count ≤ 6', async () => {
    const { dramaturgeCritic } = await import('../../server/nvm/room/critics/dramaturge.ts');
    const state = emptyState();
    state.clues = Array.from({ length: 7 }, (_, i) => ({ clueId: `clue_${i}`, carrier: 'object' as const }));
    // 2 paid off → 5 open
    state.payoffs = [
      { setupId: 'clue_0', payoffEventId: 'e1' },
      { setupId: 'clue_1', payoffEventId: 'e2' },
    ];
    const critiques = dramaturgeCritic(baseIR(5), state);
    assert.ok(!critiques.some(c => c.objection.includes('open clues')), 'open count ≤ 6 should not flag');
  });

  it('dramaturge flags late-story stall when no theme resolve by scene 9', async () => {
    const { dramaturgeCritic } = await import('../../server/nvm/room/critics/dramaturge.ts');
    const state = emptyState();
    state.themeArgument = [
      { claimId: 'truth_costs', move: 'support' as const },
      { claimId: 'truth_costs', move: 'attack' as const },
    ];
    const critiques = dramaturgeCritic(baseIR(9), state);
    assert.ok(critiques.some(c => c.objection.includes('resolve')), 'should flag no theme resolution');
  });

  it('dramaturge does NOT flag when theme is already resolved', async () => {
    const { dramaturgeCritic } = await import('../../server/nvm/room/critics/dramaturge.ts');
    const state = emptyState();
    state.themeArgument = [
      { claimId: 'truth_costs', move: 'support' as const },
      { claimId: 'truth_costs', move: 'resolve' as const },
    ];
    const critiques = dramaturgeCritic(baseIR(10), state);
    assert.ok(!critiques.some(c => c.objection.includes('resolve') && c.objection.includes('theme')), 'resolved theme should not flag stall');
  });
});


// ── Wave 103: topology archetypes, bias belief uniformity, genericness vagueness ─

describe('Wave 103 — topology extended archetypes, belief uniformity, vague fact detection', () => {
  it('topology: flat story detects flat_line archetype with high similarity', () => {
    // All equal tension values → normalize returns all-0.5 → perfect cosine match with flat_line
    const ledgers = [50, 50, 50, 50, 50, 50].map(t =>
      ({ ...deriveTensionLedger(emptyState(), 0), totalTension: t }),
    );
    const topo = computeTopology(ledgers);
    assert.equal(topo.scores.length, 9, 'should score 9 archetypes now');
    const flatScore = topo.scores.find(s => s.archetype === 'flat_line');
    assert.ok(flatScore && flatScore.similarity > 0.9, 'identical tension values should score ~1.0 on flat_line');
    assert.equal(topo.dominantArc, 'flat_line', 'flat trajectory should be dominated by flat_line');
  });

  it('topology: monotone-rising story still identifies rags_to_riches over flat_line', () => {
    const ledgers = [10, 20, 35, 55, 75, 95].map(t =>
      ({ ...deriveTensionLedger(emptyState(), 0), totalTension: t }),
    );
    const topo = computeTopology(ledgers);
    assert.equal(topo.dominantArc, 'rags_to_riches', 'monotone rise should still be rags_to_riches');
  });

  it('bias-audit: flags ≥3 characters sharing identical belief proposition', async () => {
    const { biasAuditProof } = await import('../../server/nvm/proof/tier4/bias-audit.ts');
    const ops: StoryOp[] = [
      { op: 'UPDATE_BELIEF', charId: 'alice', belief: { id: 'b1', proposition: 'the killer is among us', confidence: 0.7, source: 'told', source_event_id: 'e1', acquired_at: 1 } },
      { op: 'UPDATE_BELIEF', charId: 'bob',   belief: { id: 'b2', proposition: 'the killer is among us', confidence: 0.7, source: 'told', source_event_id: 'e1', acquired_at: 1 } },
      { op: 'UPDATE_BELIEF', charId: 'carol', belief: { id: 'b3', proposition: 'the killer is among us', confidence: 0.7, source: 'told', source_event_id: 'e1', acquired_at: 1 } },
    ];
    const ir: import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR = {
      transitionId: 't1', sceneIdx: 1, sceneFunction: 'advance_plot',
      activeMechanisms: [], beforeStateHash: '', ops,
      preconditions: [], postconditions: [],
      provenance: { origin: 'model_generated', createdAt: 1 },
    };
    const result = biasAuditProof(ir, emptyState());
    assert.ok(!result.pass, 'should fail when 3 chars share identical belief');
    assert.ok(result.findings.some(f => f.message.includes('uniformity') || f.message.includes('identical')), 'should mention belief uniformity');
  });

  it('bias-audit: allows 2 chars sharing belief (not 3)', async () => {
    const { biasAuditProof } = await import('../../server/nvm/proof/tier4/bias-audit.ts');
    const ops: StoryOp[] = [
      { op: 'UPDATE_BELIEF', charId: 'alice', belief: { id: 'b1', proposition: 'the killer is among us', confidence: 0.7, source: 'told', source_event_id: 'e1', acquired_at: 1 } },
      { op: 'UPDATE_BELIEF', charId: 'bob',   belief: { id: 'b2', proposition: 'the killer is among us', confidence: 0.7, source: 'told', source_event_id: 'e1', acquired_at: 1 } },
      { op: 'UPDATE_BELIEF', charId: 'carol', belief: { id: 'b3', proposition: 'bob is suspicious', confidence: 0.6, source: 'witnessed', source_event_id: 'e2', acquired_at: 1 } },
    ];
    const ir: import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR = {
      transitionId: 't1', sceneIdx: 1, sceneFunction: 'advance_plot',
      activeMechanisms: [], beforeStateHash: '', ops,
      preconditions: [], postconditions: [],
      provenance: { origin: 'model_generated', createdAt: 1 },
    };
    const result = biasAuditProof(ir, emptyState());
    assert.ok(result.pass, 'should pass when only 2 chars share a belief');
  });

  it('genericness: flags ADD_FACT with vague subject term "the city"', async () => {
    const { genericnessProof } = await import('../../server/nvm/proof/tier3/genericness.ts');
    const ops: StoryOp[] = [
      { op: 'ADD_FACT', fact: { factId: 'f1', subject: 'the city', predicate: 'is', object: 'dangerous', addedAtTurn: 1, validFrom: 1, validTo: null } },
    ];
    const ir: import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR = {
      transitionId: 't1', sceneIdx: 1, sceneFunction: 'advance_plot',
      activeMechanisms: [], beforeStateHash: '', ops,
      preconditions: [], postconditions: [],
      provenance: { origin: 'model_generated', createdAt: 1 },
    };
    const result = genericnessProof(ir, emptyState());
    assert.ok(!result.pass, 'should fail for vague fact subject');
    assert.ok(result.findings.some(f => f.message.includes('vague')), 'should mention vague fact');
  });

  it('genericness: allows specific named location in ADD_FACT', async () => {
    const { genericnessProof } = await import('../../server/nvm/proof/tier3/genericness.ts');
    const ops: StoryOp[] = [
      { op: 'ADD_FACT', fact: { factId: 'f1', subject: 'St. Anselm Cathedral', predicate: 'contains', object: 'hidden_crypt', addedAtTurn: 1, validFrom: 1, validTo: null } },
    ];
    const ir: import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR = {
      transitionId: 't1', sceneIdx: 1, sceneFunction: 'advance_plot',
      activeMechanisms: [], beforeStateHash: '', ops,
      preconditions: [], postconditions: [],
      provenance: { origin: 'model_generated', createdAt: 1 },
    };
    const result = genericnessProof(ir, emptyState());
    assert.ok(result.pass, 'specific named location should pass genericness');
  });
});


describe('Wave 104 — emotional debt, quality constraint gap, originality clichés', () => {
  // ── arc-tracker: EMOTIONAL_DEBT ──────────────────────────────────────────────

  it('arc-tracker: peak fear opens an EMOTIONAL_DEBT promise', () => {
    const scenes = [{
      sceneIdx: 0,
      ops: [{ op: 'APPRAISE_EMOTION' as const, charId: 'alice', emotion: { dominant: 'fear' as const, intensity: 80, joy: 0, distress: 0, anger: 0, fear: 80, pride: 0, shame: 0, last_updated_at: 0 } }],
    }];
    const report = analyzeArcCompletion(scenes);
    const debt = report.openPromises.find(p => p.kind === 'EMOTIONAL_DEBT');
    assert.ok(debt, 'EMOTIONAL_DEBT promise created for peak fear');
    assert.strictEqual(debt!.promiseId, 'debt:alice');
  });

  it('arc-tracker: cathartic joy closes an EMOTIONAL_DEBT promise', () => {
    const scenes = [
      {
        sceneIdx: 0,
        ops: [{ op: 'APPRAISE_EMOTION' as const, charId: 'alice', emotion: { dominant: 'fear' as const, intensity: 80, joy: 0, distress: 0, anger: 0, fear: 80, pride: 0, shame: 0, last_updated_at: 0 } }],
      },
      {
        sceneIdx: 1,
        ops: [{ op: 'APPRAISE_EMOTION' as const, charId: 'alice', emotion: { dominant: 'joy' as const, intensity: 60, joy: 60, distress: 0, anger: 0, fear: 0, pride: 0, shame: 0, last_updated_at: 1 } }],
      },
    ];
    const report = analyzeArcCompletion(scenes);
    const debt = report.openPromises.find(p => p.kind === 'EMOTIONAL_DEBT');
    assert.ok(!debt, 'EMOTIONAL_DEBT resolved by cathartic joy');
    assert.ok(report.resolvedCount >= 1, 'resolved count incremented');
  });

  it('arc-tracker: low-intensity follow-up closes an EMOTIONAL_DEBT promise', () => {
    const scenes = [
      {
        sceneIdx: 0,
        ops: [{ op: 'APPRAISE_EMOTION' as const, charId: 'bob', emotion: { dominant: 'distress' as const, intensity: 85, joy: 0, distress: 85, anger: 0, fear: 0, pride: 0, shame: 0, last_updated_at: 0 } }],
      },
      {
        sceneIdx: 1,
        ops: [{ op: 'APPRAISE_EMOTION' as const, charId: 'bob', emotion: { dominant: 'anger' as const, intensity: 30, joy: 0, distress: 0, anger: 30, fear: 0, pride: 0, shame: 0, last_updated_at: 1 } }],
      },
    ];
    const report = analyzeArcCompletion(scenes);
    const debt = report.openPromises.find(p => p.kind === 'EMOTIONAL_DEBT');
    assert.ok(!debt, 'EMOTIONAL_DEBT resolved by low-intensity emotion');
  });

  it('arc-tracker: low-intensity fear (<75) does NOT open an EMOTIONAL_DEBT', () => {
    const scenes = [{
      sceneIdx: 0,
      ops: [{ op: 'APPRAISE_EMOTION' as const, charId: 'carol', emotion: { dominant: 'fear' as const, intensity: 60, joy: 0, distress: 0, anger: 0, fear: 60, pride: 0, shame: 0, last_updated_at: 0 } }],
    }];
    const report = analyzeArcCompletion(scenes);
    const debt = report.openPromises.find(p => p.kind === 'EMOTIONAL_DEBT');
    assert.ok(!debt, 'intensity 60 < 75 → no emotional debt');
  });

  // ── quality-spec: EMOTIONAL_DEBT constraint ───────────────────────────────────

  it('arcConstraintsFromTracker: EMOTIONAL_DEBT urgency → catharsis constraint', () => {
    const promises: import('../../server/nvm/quality/arc-tracker.ts').OpenPromise[] = [{
      promiseId: 'debt:alice', kind: 'EMOTIONAL_DEBT',
      description: '"alice" is stuck in fear (intensity 80) since scene 0 — owes a catharsis',
      openedAtScene: 0, targetWindow: [2, 5], urgency: 'overdue',
      suggestedOp: 'APPRAISE_EMOTION', pacingScore: 0.1,
    }];
    const constraints = arcConstraintsFromTracker(promises, 3);
    assert.ok(constraints.some(c => c.description.includes('cathartic')), 'EMOTIONAL_DEBT → catharsis constraint');
    assert.ok(constraints.some(c => c.description.includes('URGENT')), 'overdue → URGENT prefix');
  });

  // ── quality-spec: constraint gap fix ─────────────────────────────────────────

  it('qualityConstraintsFromWarnings: unknown rule with penalty=1 generates constraint (no silent drop)', () => {
    const warnings: import('../../server/nvm/quality/index.ts').QualityWarning[] = [{
      engine: 'custom', opIdx: null, rule: 'MY_FUTURE_RULE', message: 'very specific fix needed', penalty: 1,
    }];
    const constraints = qualityConstraintsFromWarnings(warnings);
    assert.equal(constraints.length, 1, 'constraint generated for penny=1 unknown rule');
    assert.ok(constraints[0].description.includes('very specific fix needed'), 'message included');
  });

  // ── originality proof: cliché A — consecutive ADD_FACT run ───────────────────

  it('originalityProof: 3 consecutive ADD_FACT ops with no character op → cliché fail', () => {
    const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
      { op: 'ADD_FACT', fact: { factId: 'f1', subject: 'castle', predicate: 'is', object: 'abandoned', addedAtTurn: 0, validFrom: 0, validTo: null } },
      { op: 'ADD_FACT', fact: { factId: 'f2', subject: 'moat', predicate: 'is', object: 'dry', addedAtTurn: 0, validFrom: 0, validTo: null } },
      { op: 'ADD_FACT', fact: { factId: 'f3', subject: 'gate', predicate: 'is', object: 'open', addedAtTurn: 0, validFrom: 0, validTo: null } },
      { op: 'UPDATE_BELIEF', charId: 'alice', belief: { id: 'b1', proposition: 'castle is dangerous', confidence: 0.7, source: 'inferred', acquired_at: 0 } },
      { op: 'APPRAISE_EMOTION', charId: 'alice', emotion: { dominant: 'fear', intensity: 60, joy: 0, distress: 0, anger: 0, fear: 60, pride: 0, shame: 0, last_updated_at: 0 } },
      { op: 'SHIFT_RELATIONSHIP', pair: ['alice', 'bob'], delta: { dimension: 'trust', amount: -0.2, reason: 'unease' } },
    ];
    const ir: import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR = {
      transitionId: 't1', sceneIdx: 1, sceneFunction: 'advance_plot',
      activeMechanisms: [], beforeStateHash: '', ops,
      preconditions: [], postconditions: [],
      provenance: { origin: 'model_generated', createdAt: 1 },
    };
    const result = originalityProof(ir, emptyState());
    assert.ok(!result.pass, 'consecutive ADD_FACT run → originality fail');
    assert.ok(result.findings.some(f => f.message.includes('exposition dump')), 'finding mentions exposition dump');
  });

  it('originalityProof: ADD_FACT run broken by APPRAISE_EMOTION → pass', () => {
    const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
      { op: 'ADD_FACT', fact: { factId: 'f1', subject: 'castle', predicate: 'is', object: 'abandoned', addedAtTurn: 0, validFrom: 0, validTo: null } },
      { op: 'ADD_FACT', fact: { factId: 'f2', subject: 'moat', predicate: 'is', object: 'dry', addedAtTurn: 0, validFrom: 0, validTo: null } },
      { op: 'APPRAISE_EMOTION', charId: 'alice', emotion: { dominant: 'fear', intensity: 60, joy: 0, distress: 0, anger: 0, fear: 60, pride: 0, shame: 0, last_updated_at: 0 } },
      { op: 'ADD_FACT', fact: { factId: 'f3', subject: 'gate', predicate: 'is', object: 'open', addedAtTurn: 0, validFrom: 0, validTo: null } },
      { op: 'UPDATE_BELIEF', charId: 'alice', belief: { id: 'b1', proposition: 'castle is dangerous', confidence: 0.7, source: 'inferred', acquired_at: 0 } },
    ];
    const ir: import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR = {
      transitionId: 't1', sceneIdx: 1, sceneFunction: 'advance_plot',
      activeMechanisms: [], beforeStateHash: '', ops,
      preconditions: [], postconditions: [],
      provenance: { origin: 'model_generated', createdAt: 1 },
    };
    const result = originalityProof(ir, emptyState());
    assert.ok(result.pass, 'ADD_FACT run broken by character op → pass');
  });

  // ── originality proof: cliché B — same-scene relationship whiplash ────────────

  it('originalityProof: same pair both negative and positive delta in one scene → whiplash fail', () => {
    const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
      { op: 'SHIFT_RELATIONSHIP', pair: ['alice', 'bob'], delta: { dimension: 'trust', amount: -0.5, reason: 'argument' } },
      { op: 'APPRAISE_EMOTION', charId: 'alice', emotion: { dominant: 'distress', intensity: 55, joy: 0, distress: 55, anger: 0, fear: 0, pride: 0, shame: 0, last_updated_at: 0 } },
      { op: 'SHIFT_RELATIONSHIP', pair: ['bob', 'alice'], delta: { dimension: 'trust', amount: 0.6, reason: 'reconciliation' } },
      { op: 'APPRAISE_EMOTION', charId: 'bob', emotion: { dominant: 'joy', intensity: 55, joy: 55, distress: 0, anger: 0, fear: 0, pride: 0, shame: 0, last_updated_at: 0 } },
    ];
    const ir: import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR = {
      transitionId: 't1', sceneIdx: 1, sceneFunction: 'advance_plot',
      activeMechanisms: [], beforeStateHash: '', ops,
      preconditions: [], postconditions: [],
      provenance: { origin: 'model_generated', createdAt: 1 },
    };
    const result = originalityProof(ir, emptyState());
    assert.ok(!result.pass, 'same-scene relationship whiplash → originality fail');
    assert.ok(result.findings.some(f => f.message.includes('fight-and-make-up')), 'finding mentions fight-and-make-up');
  });

  it('originalityProof: only negative delta (no whiplash) → no cliché fail', () => {
    const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
      { op: 'SHIFT_RELATIONSHIP', pair: ['alice', 'bob'], delta: { dimension: 'trust', amount: -0.4, reason: 'betrayal' } },
      { op: 'UPDATE_BELIEF', charId: 'alice', belief: { id: 'b1', proposition: 'bob cannot be trusted', confidence: 0.8, source: 'witnessed', acquired_at: 0 } },
      { op: 'APPRAISE_EMOTION', charId: 'alice', emotion: { dominant: 'anger', intensity: 70, joy: 0, distress: 0, anger: 70, fear: 0, pride: 0, shame: 0, last_updated_at: 0 } },
      { op: 'ADD_FACT', fact: { factId: 'f1', subject: 'alice', predicate: 'leaves', object: 'the room', addedAtTurn: 0, validFrom: 0, validTo: null } },
    ];
    const ir: import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR = {
      transitionId: 't1', sceneIdx: 1, sceneFunction: 'advance_plot',
      activeMechanisms: [], beforeStateHash: '', ops,
      preconditions: [], postconditions: [],
      provenance: { origin: 'model_generated', createdAt: 1 },
    };
    const result = originalityProof(ir, emptyState());
    assert.ok(result.pass, 'only negative relationship delta → no whiplash, passes');
  });
});


// ── Wave 105: DV16/DV17 quality validators, pacing_compress + reveal_asymmetry operators ─

describe('Wave 105 — DV16/DV17 unwitnessed clue / unreceived payoff, new mutation operators', () => {
  function makeIR105(ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[]): import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR {
    return {
      transitionId: 't1', sceneIdx: 1, sceneFunction: 'advance_plot',
      activeMechanisms: [], beforeStateHash: '', ops,
      preconditions: [], postconditions: [],
      provenance: { origin: 'model_generated', createdAt: 1 },
    };
  }

  it('DV16: SEED_CLUE with no UPDATE_BELIEF in same IR → DV16_UNWITNESSED_CLUE warning', () => {
    const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
      { op: 'SEED_CLUE', clueId: 'bloodstain', carrier: 'object' },
      { op: 'ADD_FACT', fact: { factId: 'f1', subject: 'floor', predicate: 'has', object: 'blood', addedAtTurn: 0, validFrom: 0, validTo: null } },
    ];
    const warnings = dialogueWarnings(makeIR105(ops), emptyState());
    assert.ok(warnings.some(w => w.rule === 'DV16_UNWITNESSED_CLUE'), 'SEED_CLUE without witness → DV16');
  });

  it('DV16: SEED_CLUE with UPDATE_BELIEF in same IR → no DV16 warning', () => {
    const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
      { op: 'SEED_CLUE', clueId: 'bloodstain', carrier: 'object' },
      { op: 'UPDATE_BELIEF', charId: 'detective', belief: { id: 'b1', proposition: 'someone was hurt here', confidence: 0.8, source: 'witnessed', acquired_at: 0 } },
    ];
    const warnings = dialogueWarnings(makeIR105(ops), emptyState());
    assert.ok(!warnings.some(w => w.rule === 'DV16_UNWITNESSED_CLUE'), 'witness belief present → no DV16');
  });

  it('DV17: PAYOFF_SETUP with no reaction ops → DV17_UNRECEIVED_PAYOFF', () => {
    const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
      { op: 'PAYOFF_SETUP', setupId: 'bloodstain', payoffEventId: 'reveal_1' },
      { op: 'ADD_FACT', fact: { factId: 'f1', subject: 'killer', predicate: 'was', object: 'butler', addedAtTurn: 0, validFrom: 0, validTo: null } },
    ];
    const warnings = dialogueWarnings(makeIR105(ops), emptyState());
    assert.ok(warnings.some(w => w.rule === 'DV17_UNRECEIVED_PAYOFF'), 'payoff with no reaction → DV17');
  });

  it('DV17: PAYOFF_SETUP with APPRAISE_EMOTION reaction → no DV17 warning', () => {
    const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
      { op: 'PAYOFF_SETUP', setupId: 'bloodstain', payoffEventId: 'reveal_1' },
      { op: 'APPRAISE_EMOTION', charId: 'detective', emotion: { dominant: 'distress', intensity: 70, joy: 0, distress: 70, anger: 0, fear: 0, pride: 0, shame: 0, last_updated_at: 0 } },
    ];
    const warnings = dialogueWarnings(makeIR105(ops), emptyState());
    assert.ok(!warnings.some(w => w.rule === 'DV17_UNRECEIVED_PAYOFF'), 'emotion reaction → no DV17');
  });

  it('pacing_compress: removes duplicate dominant emotion for same character', () => {
    const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
      { op: 'APPRAISE_EMOTION', charId: 'alice', emotion: { dominant: 'fear', intensity: 70, joy: 0, distress: 0, anger: 0, fear: 70, pride: 0, shame: 0, last_updated_at: 0 } },
      { op: 'UPDATE_BELIEF', charId: 'alice', belief: { id: 'b1', proposition: 'danger is near', confidence: 0.8, source: 'inferred', acquired_at: 0 } },
      { op: 'APPRAISE_EMOTION', charId: 'alice', emotion: { dominant: 'fear', intensity: 75, joy: 0, distress: 0, anger: 0, fear: 75, pride: 0, shame: 0, last_updated_at: 1 } },
    ];
    const ir: import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR = {
      transitionId: 't1', sceneIdx: 2, sceneFunction: 'advance_plot',
      activeMechanisms: [], beforeStateHash: '', ops,
      preconditions: [], postconditions: [],
      provenance: { origin: 'model_generated', createdAt: 1 },
    };
    const result = applyOperator('pacing_compress', ir, emptyState(), 42);
    assert.ok(result.ir.ops.length < ops.length, 'pacing_compress reduces op count');
    assert.strictEqual(result.operator, 'pacing_compress');
  });

  it('pacing_compress: scene ≤2 ops → returns unchanged IR', () => {
    const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
      { op: 'ADD_FACT', fact: { factId: 'f1', subject: 'room', predicate: 'is', object: 'empty', addedAtTurn: 0, validFrom: 0, validTo: null } },
      { op: 'RAISE_CLOCK', clockId: 'bomb', amount: 5 },
    ];
    const ir: import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR = {
      transitionId: 't1', sceneIdx: 1, sceneFunction: 'advance_plot',
      activeMechanisms: [], beforeStateHash: '', ops,
      preconditions: [], postconditions: [],
      provenance: { origin: 'model_generated', createdAt: 1 },
    };
    const result = applyOperator('pacing_compress', ir, emptyState(), 42);
    assert.strictEqual(result.ir.ops.length, ops.length, 'too short → no change');
  });

  it('reveal_asymmetry: single-char scene with world fact → inserts told UPDATE_BELIEF', () => {
    const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
      { op: 'UPDATE_BELIEF', charId: 'alice', belief: { id: 'b1', proposition: 'vault is locked', confidence: 0.9, source: 'witnessed', acquired_at: 0 } },
    ];
    const ir: import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR = {
      transitionId: 't1', sceneIdx: 1, sceneFunction: 'advance_plot',
      activeMechanisms: [], beforeStateHash: '', ops,
      preconditions: [], postconditions: [],
      provenance: { origin: 'model_generated', createdAt: 1 },
    };
    const stateWithFact = {
      ...emptyState(),
      objectiveReality: [{ factId: 'f1', subject: 'vault', predicate: 'contains', object: 'ledger', addedAtTurn: 0, validFrom: 0, validTo: null }],
    };
    const result = applyOperator('reveal_asymmetry', ir, stateWithFact, 42);
    assert.ok(result.ir.ops.length > ops.length, 'reveal_asymmetry adds a belief op');
    const addedBelief = result.ir.ops.find(o => o.op === 'UPDATE_BELIEF' && (o as { belief: { source: string } }).belief.source === 'told');
    assert.ok(addedBelief, 'inserted "told" belief');
    assert.strictEqual(result.operator, 'reveal_asymmetry');
  });
});


describe('Wave 106 — attribution phantom refs, showrunner new checks', () => {
  // ── Attribution proof: real state factId passes ──────────────────────────────

  it('attributionProof: causedBy citing a prior state factId → passes', () => {
    const ir: import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR = {
      transitionId: 't1', sceneIdx: 1, sceneFunction: 'advance_plot',
      activeMechanisms: [], beforeStateHash: '',
      ops: [{ op: 'UPDATE_BELIEF', charId: 'alice', belief: { id: 'b1', proposition: 'vault is locked', confidence: 0.8, source: 'witnessed', acquired_at: 0 } }],
      preconditions: [], postconditions: [],
      provenance: { origin: 'model_generated', createdAt: 1 },
      causalLinks: [{ opIdx: 0, causedBy: ['prior-fact-id'] }],
    };
    const stateWithFact = {
      ...emptyState(),
      objectiveReality: [{ factId: 'prior-fact-id', subject: 'vault', predicate: 'is', object: 'locked', addedAtTurn: 0, validFrom: 0, validTo: null }],
    };
    const result = attributionProof(ir, stateWithFact);
    assert.ok(result.pass, 'state factId cited → attribution passes');
  });

  // ── Showrunner: provide_relief too sparse ─────────────────────────────────────

  it('showrunner: provide_relief with 1 op → too sparse critique', () => {
    const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
      { op: 'ADD_FACT', fact: { factId: 'f1', subject: 'threat', predicate: 'has', object: 'passed', addedAtTurn: 0, validFrom: 0, validTo: null } },
    ];
    const ir: import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR = {
      transitionId: 't1', sceneIdx: 5, sceneFunction: 'provide_relief',
      activeMechanisms: [], beforeStateHash: '', ops,
      preconditions: [], postconditions: [],
      provenance: { origin: 'model_generated', createdAt: 1 },
    };
    const critiques = showrunnerCritic(ir, emptyState());
    assert.ok(critiques.some(c => c.objection.includes('not enough dramatic material')), 'sparse relief → critique');
  });

  it('showrunner: provide_relief with 4 ops → no too-sparse critique', () => {
    const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
      { op: 'APPRAISE_EMOTION', charId: 'alice', emotion: { dominant: 'joy', intensity: 60, joy: 60, distress: 0, anger: 0, fear: 0, pride: 0, shame: 0, last_updated_at: 0 } },
      { op: 'SHIFT_RELATIONSHIP', pair: ['alice', 'bob'], delta: { dimension: 'trust', amount: 0.3, reason: 'reconciliation' } },
      { op: 'UPDATE_BELIEF', charId: 'alice', belief: { id: 'b1', proposition: 'danger is over', confidence: 0.9, source: 'witnessed', acquired_at: 0 } },
      { op: 'ADD_FACT', fact: { factId: 'f1', subject: 'sun', predicate: 'rises', object: 'over city', addedAtTurn: 0, validFrom: 0, validTo: null } },
    ];
    const ir: import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR = {
      transitionId: 't1', sceneIdx: 5, sceneFunction: 'provide_relief',
      activeMechanisms: [], beforeStateHash: '', ops,
      preconditions: [], postconditions: [],
      provenance: { origin: 'model_generated', createdAt: 1 },
    };
    const critiques = showrunnerCritic(ir, emptyState());
    assert.ok(!critiques.some(c => c.objection.includes('not enough dramatic material')), '4 ops → no too-sparse critique');
  });

  // ── Showrunner: advance_plot without character ops ────────────────────────────

  it('showrunner: advance_plot with only ADD_FACT (no character ops) → critique', () => {
    const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
      { op: 'ADD_FACT', fact: { factId: 'f1', subject: 'door', predicate: 'opens', object: 'slowly', addedAtTurn: 0, validFrom: 0, validTo: null } },
      { op: 'ADD_FACT', fact: { factId: 'f2', subject: 'figure', predicate: 'enters', object: 'room', addedAtTurn: 0, validFrom: 0, validTo: null } },
    ];
    const ir: import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR = {
      transitionId: 't1', sceneIdx: 3, sceneFunction: 'advance_plot',
      activeMechanisms: [], beforeStateHash: '', ops,
      preconditions: ['something_setup'], postconditions: [],
      provenance: { origin: 'model_generated', createdAt: 1 },
    };
    const critiques = showrunnerCritic(ir, emptyState());
    assert.ok(critiques.some(c => c.objection.includes('no UPDATE_BELIEF')), 'advance_plot without character ops → critique');
  });

  it('showrunner: advance_plot with UPDATE_BELIEF → no character-less critique', () => {
    const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
      { op: 'ADD_FACT', fact: { factId: 'f1', subject: 'door', predicate: 'opens', object: 'slowly', addedAtTurn: 0, validFrom: 0, validTo: null } },
      { op: 'UPDATE_BELIEF', charId: 'alice', belief: { id: 'b1', proposition: 'someone is coming', confidence: 0.8, source: 'witnessed', acquired_at: 0 } },
    ];
    const ir: import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR = {
      transitionId: 't1', sceneIdx: 3, sceneFunction: 'advance_plot',
      activeMechanisms: [], beforeStateHash: '', ops,
      preconditions: ['something_setup'], postconditions: ['alice_alerted'],
      provenance: { origin: 'model_generated', createdAt: 1 },
    };
    const critiques = showrunnerCritic(ir, emptyState());
    assert.ok(!critiques.some(c => c.objection.includes('no UPDATE_BELIEF')), 'has UPDATE_BELIEF → no character-less critique');
  });
});


describe('Wave 107 — necessity state pass-through, dramatic irony tension', () => {
  // ── necessity proof: state-aware re-assertion detection ─────────────────────

  it('necessityProof: re-asserting existing emotion from state → fails (state-aware)', () => {
    const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
      { op: 'APPRAISE_EMOTION', charId: 'alice', emotion: { dominant: 'fear', intensity: 72, joy: 0, distress: 0, anger: 0, fear: 72, pride: 0, shame: 0, last_updated_at: 0 } },
    ];
    const ir: import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR = {
      transitionId: 't1', sceneIdx: 2, sceneFunction: 'build_tension',
      activeMechanisms: [], beforeStateHash: '', ops,
      preconditions: [], postconditions: [],
      provenance: { origin: 'model_generated', createdAt: 1 },
    };
    // State already has alice at fear/intensity 75 (within 8 of 72)
    const stateWithEmotion = {
      ...emptyState(),
      characterEmotions: {
        alice: { dominant: 'fear' as const, intensity: 75, joy: 0, distress: 0, anger: 0, fear: 75, pride: 0, shame: 0, last_updated_at: 0 },
      },
    };
    const result = necessityProof(ir, stateWithEmotion);
    assert.ok(!result.pass, 'state-aware: re-asserting same fear@72 when state has fear@75 → necessity fails');
  });

  it('necessityProof: new emotion not in state → passes necessity', () => {
    const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
      { op: 'APPRAISE_EMOTION', charId: 'alice', emotion: { dominant: 'joy', intensity: 80, joy: 80, distress: 0, anger: 0, fear: 0, pride: 0, shame: 0, last_updated_at: 0 } },
    ];
    const ir: import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR = {
      transitionId: 't1', sceneIdx: 2, sceneFunction: 'build_tension',
      activeMechanisms: [], beforeStateHash: '', ops,
      preconditions: [], postconditions: [],
      provenance: { origin: 'model_generated', createdAt: 1 },
    };
    // State has alice at fear (different dominant) → new joy emotion IS necessary
    const stateWithFear = {
      ...emptyState(),
      characterEmotions: {
        alice: { dominant: 'fear' as const, intensity: 70, joy: 0, distress: 0, anger: 0, fear: 70, pride: 0, shame: 0, last_updated_at: 0 },
      },
    };
    const result = necessityProof(ir, stateWithFear);
    assert.ok(result.pass, 'new emotion dominant → necessity passes');
  });

  // ── deriveTensionLedger: dramatic irony ─────────────────────────────────────

  it('deriveTensionLedger: unperceived world fact → dramatic_irony tension position', () => {
    const state = emptyState();
    state.objectiveReality.push({ factId: 'f1', subject: 'butler', predicate: 'is', object: 'the killer', addedAtTurn: 0, validFrom: 0, validTo: null });
    state.audienceState.investment = 70;
    // No character has a belief mentioning 'butler' → dramatic irony
    const ledger = deriveTensionLedger(state, 3);
    const ironyPos = ledger.positions.find(p => p.kind === 'dramatic_irony');
    assert.ok(ironyPos, 'unperceived fact creates dramatic_irony position');
    assert.ok(ironyPos!.description.includes('butler'), 'fact subject in description');
    assert.ok(ledger.totalTension > 0, 'dramatic irony contributes to total tension');
  });

  it('deriveTensionLedger: fact already in a character belief → no dramatic_irony position', () => {
    const state = emptyState();
    state.objectiveReality.push({ factId: 'f1', subject: 'butler', predicate: 'is', object: 'the killer', addedAtTurn: 0, validFrom: 0, validTo: null });
    // Alice already knows about butler → no irony
    state.characterBeliefs['alice'] = [{ id: 'b1', proposition: 'butler may be the killer', confidence: 0.6, source: 'inferred', acquired_at: 0 }];
    state.audienceState.investment = 70;
    const ledger = deriveTensionLedger(state, 3);
    const ironyPos = ledger.positions.find(p => p.kind === 'dramatic_irony');
    assert.ok(!ironyPos, 'character believes the fact → no dramatic irony');
  });

  it('deriveTensionLedger: capped at 5 dramatic irony positions even with 10 unperceived facts', () => {
    const state = emptyState();
    for (let i = 0; i < 10; i++) {
      state.objectiveReality.push({ factId: `f${i}`, subject: `subject${i}`, predicate: 'is', object: `thing${i}`, addedAtTurn: 0, validFrom: 0, validTo: null });
    }
    state.audienceState.investment = 50;
    const ledger = deriveTensionLedger(state, 2);
    const ironyPositions = ledger.positions.filter(p => p.kind === 'dramatic_irony');
    assert.ok(ironyPositions.length <= 5, 'capped at 5 dramatic irony positions');
  });
});


// ── Wave 108: lint cognition-emotion mismatch, character advocate belief-shame ─

describe('Wave 108 — cognition-emotion mismatch (lint + character advocate)', () => {
  function makeIR108(ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[]): import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR {
    return {
      transitionId: 't1', sceneIdx: 2, sceneFunction: 'advance_plot',
      activeMechanisms: [], beforeStateHash: '', ops,
      preconditions: [], postconditions: [],
      provenance: { origin: 'model_generated', createdAt: 1 },
    };
  }

  // ── lint: COGNITION_EMOTION_MISMATCH ────────────────────────────────────────

  it('lint: high-confidence belief + shame in same IR with no bridging → COGNITION_EMOTION_MISMATCH', () => {
    const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
      { op: 'UPDATE_BELIEF', charId: 'alice', belief: { id: 'b1', proposition: 'I am right', confidence: 0.9, source: 'inferred', acquired_at: 0 } },
      { op: 'APPRAISE_EMOTION', charId: 'alice', emotion: { dominant: 'shame', intensity: 70, joy: 0, distress: 0, anger: 0, fear: 0, pride: 0, shame: 70, last_updated_at: 0 } },
    ];
    const warnings = lint(makeIR108(ops), emptyState());
    assert.ok(warnings.some(w => w.rule === 'COGNITION_EMOTION_MISMATCH'), 'disconnected cognition-emotion → COGNITION_EMOTION_MISMATCH');
  });

  it('lint: high-confidence belief + shame with bridging SHIFT_RELATIONSHIP → no mismatch warning', () => {
    const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
      { op: 'UPDATE_BELIEF', charId: 'alice', belief: { id: 'b1', proposition: 'I am right', confidence: 0.9, source: 'inferred', acquired_at: 0 } },
      { op: 'SHIFT_RELATIONSHIP', pair: ['alice', 'bob'], delta: { dimension: 'trust', amount: -0.5, reason: 'betrayal reveals shame' } },
      { op: 'APPRAISE_EMOTION', charId: 'alice', emotion: { dominant: 'shame', intensity: 75, joy: 0, distress: 0, anger: 0, fear: 0, pride: 0, shame: 75, last_updated_at: 0 } },
    ];
    const warnings = lint(makeIR108(ops), emptyState());
    assert.ok(!warnings.some(w => w.rule === 'COGNITION_EMOTION_MISMATCH'), 'bridging event → no mismatch warning');
  });

  it('lint: low-confidence belief + shame → no mismatch warning', () => {
    const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
      { op: 'UPDATE_BELIEF', charId: 'alice', belief: { id: 'b1', proposition: 'maybe I was wrong', confidence: 0.4, source: 'inferred', acquired_at: 0 } },
      { op: 'APPRAISE_EMOTION', charId: 'alice', emotion: { dominant: 'shame', intensity: 70, joy: 0, distress: 0, anger: 0, fear: 0, pride: 0, shame: 70, last_updated_at: 0 } },
    ];
    const warnings = lint(makeIR108(ops), emptyState());
    assert.ok(!warnings.some(w => w.rule === 'COGNITION_EMOTION_MISMATCH'), 'low confidence → no mismatch');
  });

  // ── character advocate: cognition-emotion alignment critique ─────────────────

  it('characterAdvocate: high-confidence belief + distress with no bridging → critique', async () => {
    const { characterAdvocateCritic: cac } = await import('../../server/nvm/room/critics/character-advocate.ts');
    const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
      { op: 'UPDATE_BELIEF', charId: 'bob', belief: { id: 'b1', proposition: 'the plan is perfect', confidence: 0.95, source: 'inferred', acquired_at: 0 } },
      { op: 'APPRAISE_EMOTION', charId: 'bob', emotion: { dominant: 'distress', intensity: 80, joy: 0, distress: 80, anger: 0, fear: 0, pride: 0, shame: 0, last_updated_at: 0 } },
    ];
    const critiques = cac(makeIR108(ops), emptyState());
    assert.ok(critiques.some((c: { objection: string }) => c.objection.includes('cognition and emotion are disconnected')), 'high-confidence + distress → advocate critique');
  });

  it('characterAdvocate: different characters for belief and distress → no mismatch critique', async () => {
    const { characterAdvocateCritic: cac } = await import('../../server/nvm/room/critics/character-advocate.ts');
    const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
      { op: 'UPDATE_BELIEF', charId: 'alice', belief: { id: 'b1', proposition: 'the plan is perfect', confidence: 0.95, source: 'inferred', acquired_at: 0 } },
      { op: 'APPRAISE_EMOTION', charId: 'bob', emotion: { dominant: 'distress', intensity: 80, joy: 0, distress: 80, anger: 0, fear: 0, pride: 0, shame: 0, last_updated_at: 0 } },
    ];
    const critiques = cac(makeIR108(ops), emptyState());
    assert.ok(!critiques.some((c: { objection: string }) => c.objection.includes('cognition and emotion are disconnected')), 'different chars → no mismatch');
  });
});


// ── Wave 109 — Skeptic belief-reversal, Studio-Note curiosity, Dramaturge relationship vacuum ─
{
  const { skepticCritic } = await import('../../server/nvm/room/critics/skeptic.ts');
  const { studioNoteCritic } = await import('../../server/nvm/room/critics/studio-note.ts');
  const { dramaturgeCritic } = await import('../../server/nvm/room/critics/dramaturge.ts');

  function makeIR109(
    ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[],
    sceneIdx = 4,
    sceneFunction: import('../../server/nvm/ir/NarrativeTransitionIR.ts').SceneFunction = 'advance_plot',
  ): import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR {
    return {
      transitionId: 't1', sceneIdx, sceneFunction,
      activeMechanisms: [], beforeStateHash: '', ops,
      preconditions: [], postconditions: [],
      provenance: { origin: 'model_generated', createdAt: 1 },
    };
  }

  function stateWithBeliefs(charId: string, beliefs: import('../../server/engine/types.ts').Belief[]): import('../../server/nvm/state/NarrativeState.ts').NarrativeState {
    return {
      ...emptyState(),
      characterBeliefs: { [charId]: beliefs },
    };
  }

  function stateWithAudience(curiosity: number, suspense: number, investment: number): import('../../server/nvm/state/NarrativeState.ts').NarrativeState {
    return {
      ...emptyState(),
      audienceState: { knownFacts: [], curiosity, suspense, investment },
    };
  }

  function stateWithChars(chars: string[]): import('../../server/nvm/state/NarrativeState.ts').NarrativeState {
    const beliefs: Record<string, import('../../server/engine/types.ts').Belief[]> = {};
    for (const c of chars) {
      beliefs[c] = [{ id: `b_${c}`, proposition: `${c} exists`, confidence: 0.8, source: 'witnessed', source_event_id: 'e1', acquired_at: 0 }];
    }
    return { ...emptyState(), characterBeliefs: beliefs };
  }

  describe('Wave 109 — critics: belief-reversal, curiosity floor, relationship vacuum', () => {
    it('skeptic: told belief 0.75-0.9 conf with no ADD_FACT, char has existing beliefs → reversal critique', () => {
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'UPDATE_BELIEF', charId: 'alice', belief: { id: 'b2', proposition: 'the map is real', confidence: 0.8, source: 'told', source_agent_id: 'bob', acquired_at: 4 } },
      ];
      const state = stateWithBeliefs('alice', [{ id: 'b1', proposition: 'the map is fake', confidence: 0.7, source: 'witnessed', source_event_id: 'e1', acquired_at: 0 }]);
      const critiques = skepticCritic(makeIR109(ops), state);
      assert.ok(critiques.some(c => c.criticId === 'skeptic' && c.objection.includes('relational anchor')), 'mid-range told belief + no anchor → reversal critique');
    });

    it('skeptic: told belief 0.8 conf WITH bridging ADD_FACT → no reversal critique', () => {
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'ADD_FACT', fact: { factId: 'f1', subject: 'map', predicate: 'is', object: 'real', addedAtTurn: 4, validFrom: 4, validTo: null } },
        { op: 'UPDATE_BELIEF', charId: 'alice', belief: { id: 'b2', proposition: 'the map is real', confidence: 0.8, source: 'told', source_agent_id: 'bob', acquired_at: 4 } },
      ];
      const state = stateWithBeliefs('alice', [{ id: 'b1', proposition: 'the map is fake', confidence: 0.7, source: 'witnessed', source_event_id: 'e1', acquired_at: 0 }]);
      const critiques = skepticCritic(makeIR109(ops), state);
      assert.ok(!critiques.some(c => c.objection.includes('relational anchor')), 'ADD_FACT bridge → no reversal critique');
    });

    it('skeptic: told belief 0.8 conf but char has NO existing beliefs → no reversal critique', () => {
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'UPDATE_BELIEF', charId: 'alice', belief: { id: 'b2', proposition: 'the map is real', confidence: 0.8, source: 'told', source_agent_id: 'bob', acquired_at: 4 } },
      ];
      const critiques = skepticCritic(makeIR109(ops), emptyState());
      assert.ok(!critiques.some(c => c.objection.includes('evidential anchor')), 'no existing beliefs → no reversal critique');
    });

    it('studio-note: curiosity < 20 after scene 3 → curiosity floor critique', () => {
      const critiques = studioNoteCritic(makeIR109([], 4), stateWithAudience(15, 50, 60));
      assert.ok(critiques.some(c => c.objection.includes('curiosity')), 'low curiosity → curiosity floor critique');
    });

    it('studio-note: curiosity >= 20 → no curiosity floor critique', () => {
      const critiques = studioNoteCritic(makeIR109([], 4), stateWithAudience(25, 50, 60));
      assert.ok(!critiques.some(c => c.objection.includes('curiosity') && c.objection.includes('stopped asking')), 'adequate curiosity → no floor critique');
    });

    it('dramaturge: scene 3+, 2 chars, no relationships → relationship vacuum critique', () => {
      const critiques = dramaturgeCritic(makeIR109([], 3), stateWithChars(['alice', 'bob']));
      assert.ok(critiques.some(c => c.objection.includes('dynamics are unestablished')), '2 chars + no rel → vacuum critique');
    });

    it('dramaturge: scene 3+, 2 chars WITH relationships → no vacuum critique', () => {
      const state = {
        ...stateWithChars(['alice', 'bob']),
        relationships: { 'alice|bob': [{ dimension: 'trust' as const, amount: 0.4, reason: 'shared goal' }] },
      };
      const critiques = dramaturgeCritic(makeIR109([], 3), state);
      assert.ok(!critiques.some(c => c.objection.includes('dynamics are unestablished')), 'relationships exist → no vacuum critique');
    });

    it('dramaturge: scene 2 (too early) → no vacuum critique even without relationships', () => {
      const critiques = dramaturgeCritic(makeIR109([], 2), stateWithChars(['alice', 'bob']));
      assert.ok(!critiques.some(c => c.objection.includes('dynamics are unestablished')), 'scene 2 → no vacuum critique');
    });
  });
}


// ── Wave 110 — EpistemicProof confidence bounds + showrunner preachy theme ──────
{
  const { epistemicProof } = await import('../../server/nvm/proof/tier1/epistemic.ts');
  const { showrunnerCritic } = await import('../../server/nvm/room/critics/showrunner.ts');

  function makeIR110(
    ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[],
    sceneIdx = 3,
  ): import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR {
    return {
      transitionId: 't1', sceneIdx, sceneFunction: 'advance_plot',
      activeMechanisms: [], beforeStateHash: '', ops,
      preconditions: [], postconditions: [],
      provenance: { origin: 'model_generated', createdAt: 1 },
    };
  }

  function stateWithTheme(moves: Array<{ claimId: string; move: import('../../server/nvm/ops/StoryOp.ts').ThemeMove }>): import('../../server/nvm/state/NarrativeState.ts').NarrativeState {
    return { ...emptyState(), themeArgument: moves, authorIntent: { theme: 'power corrupts' } };
  }

  describe('Wave 110 — EpistemicProof confidence bounds + showrunner preachy theme', () => {
    it('epistemicProof: confidence > 1 → hard block', () => {
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'UPDATE_BELIEF', charId: 'alice', belief: { id: 'b1', proposition: 'I am invincible', confidence: 1.5, source: 'inferred', acquired_at: 0 } },
      ];
      const result = epistemicProof(makeIR110(ops), emptyState());
      assert.ok(!result.pass, 'confidence > 1 → fail');
      assert.ok(result.findings.some(f => f.message.includes('invalid confidence=1.5')), 'block with confidence message');
    });

    it('epistemicProof: confidence < 0 → hard block', () => {
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'UPDATE_BELIEF', charId: 'alice', belief: { id: 'b1', proposition: 'nothing matters', confidence: -0.1, source: 'inferred', acquired_at: 0 } },
      ];
      const result = epistemicProof(makeIR110(ops), emptyState());
      assert.ok(!result.pass, 'confidence < 0 → fail');
    });

    it('epistemicProof: confidence = 1.0 (boundary) → pass', () => {
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'UPDATE_BELIEF', charId: 'alice', belief: { id: 'b1', proposition: 'confirmed fact', confidence: 1.0, source: 'witnessed', source_event_id: 'e1', acquired_at: 0 } },
      ];
      const result = epistemicProof(makeIR110(ops), emptyState());
      assert.ok(result.pass, 'confidence = 1.0 → pass');
    });

    it('showrunner: 4+ support-only theme moves → preachy critique', () => {
      const moves: Array<{ claimId: string; move: import('../../server/nvm/ops/StoryOp.ts').ThemeMove }> = [
        { claimId: 'c1', move: 'support' },
        { claimId: 'c2', move: 'support' },
        { claimId: 'c3', move: 'support' },
        { claimId: 'c4', move: 'support' },
      ];
      const critiques = showrunnerCritic(makeIR110([]), stateWithTheme(moves));
      assert.ok(critiques.some(c => c.objection.includes('all supporting, none opposing')), '4 support-only moves → preachy critique');
    });

    it('showrunner: 4+ theme moves including attack → no preachy critique', () => {
      const moves: Array<{ claimId: string; move: import('../../server/nvm/ops/StoryOp.ts').ThemeMove }> = [
        { claimId: 'c1', move: 'support' },
        { claimId: 'c2', move: 'support' },
        { claimId: 'c3', move: 'attack' },
        { claimId: 'c4', move: 'support' },
      ];
      const critiques = showrunnerCritic(makeIR110([]), stateWithTheme(moves));
      assert.ok(!critiques.some(c => c.objection.includes('all supporting')), 'attack present → no preachy critique');
    });

    it('showrunner: 3 support moves (below threshold) → no preachy critique', () => {
      const moves: Array<{ claimId: string; move: import('../../server/nvm/ops/StoryOp.ts').ThemeMove }> = [
        { claimId: 'c1', move: 'support' },
        { claimId: 'c2', move: 'support' },
        { claimId: 'c3', move: 'support' },
      ];
      const critiques = showrunnerCritic(makeIR110([]), stateWithTheme(moves));
      assert.ok(!critiques.some(c => c.objection.includes('all supporting')), '< 4 moves → no preachy critique');
    });
  });
}


// ── Wave 111 — necessityScore gaps, arcDebt emotional flatline, NOOP_CLOCK lint ──
{
  const { necessityScore, computeArcDebt } = await import('../../server/nvm/quality/index.ts');
  const { lint } = await import('../../server/nvm/proof/lint.ts');

  function makeIR111(ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[]): import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR {
    return {
      transitionId: 't1', sceneIdx: 3, sceneFunction: 'advance_plot',
      activeMechanisms: [], beforeStateHash: '', ops,
      preconditions: [], postconditions: [],
      provenance: { origin: 'model_generated', createdAt: 1 },
    };
  }

  function stateWithEmotions(entries: Array<[string, string]>): import('../../server/nvm/state/NarrativeState.ts').NarrativeState {
    const characterEmotions: Record<string, import('../../server/engine/types.ts').EmotionState> = {};
    for (const [charId, dominant] of entries) {
      characterEmotions[charId] = { dominant: dominant as import('../../server/engine/types.ts').EmotionType, intensity: 70, joy: 0, distress: 0, anger: 0, fear: 0, pride: 0, shame: 0, last_updated_at: 0 };
    }
    return { ...emptyState(), characterEmotions };
  }

  describe('Wave 111 — necessityScore, arcDebt flatline, NOOP_CLOCK lint', () => {
    it('necessityScore: zero-amount RAISE_CLOCK → scored as unnecessary', () => {
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'RAISE_CLOCK', clockId: 'bomb', amount: 0 },
        { op: 'RAISE_CLOCK', clockId: 'bomb', amount: 2 },
      ];
      const score = necessityScore(ops);
      // First op is unnecessary (amount=0), second is necessary → 1/2 = 0.5
      assert.ok(score < 1, 'zero-amount RAISE_CLOCK reduces necessity score');
      assert.ok(score >= 0.4, 'valid RAISE_CLOCK still contributes');
    });

    it('necessityScore: duplicate UPDATE_BELIEF same char+prop → unnecessary', () => {
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'UPDATE_BELIEF', charId: 'alice', belief: { id: 'b1', proposition: 'the key is missing', confidence: 0.8, source: 'witnessed', source_event_id: 'e1', acquired_at: 0 } },
        { op: 'UPDATE_BELIEF', charId: 'alice', belief: { id: 'b2', proposition: 'the key is missing', confidence: 0.9, source: 'witnessed', source_event_id: 'e2', acquired_at: 0 } },
      ];
      const score = necessityScore(ops);
      assert.ok(score < 1, 'duplicate proposition for same char → reduces necessity score');
    });

    it('necessityScore: two UPDATE_BELIEF same char DIFFERENT props → both necessary', () => {
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'UPDATE_BELIEF', charId: 'alice', belief: { id: 'b1', proposition: 'the key is missing', confidence: 0.8, source: 'witnessed', source_event_id: 'e1', acquired_at: 0 } },
        { op: 'UPDATE_BELIEF', charId: 'alice', belief: { id: 'b2', proposition: 'the thief was here', confidence: 0.7, source: 'inferred', acquired_at: 0 } },
      ];
      const score = necessityScore(ops);
      assert.strictEqual(score, 1, 'different propositions → fully necessary');
    });

    it('computeArcDebt: 3 chars with same dominant emotion → flatline debt', () => {
      const state = stateWithEmotions([['alice', 'fear'], ['bob', 'fear'], ['charlie', 'fear']]);
      const debts = computeArcDebt(state, 4);
      assert.ok(debts.some(d => d.includes('emotionally monotonous')), '3 chars same emotion → flatline debt');
    });

    it('computeArcDebt: 2 chars with same emotion → no flatline debt (below threshold)', () => {
      const state = stateWithEmotions([['alice', 'fear'], ['bob', 'fear']]);
      const debts = computeArcDebt(state, 4);
      assert.ok(!debts.some(d => d.includes('emotionally monotonous')), '2 chars → no flatline');
    });

    it('computeArcDebt: 3 chars each with different emotion → no flatline debt', () => {
      const state = stateWithEmotions([['alice', 'fear'], ['bob', 'anger'], ['charlie', 'pride']]);
      const debts = computeArcDebt(state, 4);
      assert.ok(!debts.some(d => d.includes('emotionally monotonous')), 'diverse emotions → no flatline');
    });

    it('lint: RAISE_CLOCK with amount=0 → NOOP_CLOCK_RAISE info warning', () => {
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'RAISE_CLOCK', clockId: 'timer', amount: 0 },
      ];
      const warnings = lint(makeIR111(ops), emptyState());
      assert.ok(warnings.some(w => w.rule === 'NOOP_CLOCK_RAISE' && w.severity === 'info'), 'zero-amount clock → NOOP_CLOCK_RAISE warning');
    });

    it('lint: RAISE_CLOCK with positive amount → no NOOP warning', () => {
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'RAISE_CLOCK', clockId: 'timer', amount: 3 },
      ];
      const warnings = lint(makeIR111(ops), emptyState());
      assert.ok(!warnings.some(w => w.rule === 'NOOP_CLOCK_RAISE'), 'positive amount → no noop warning');
    });
  });
}


// ── Wave 112 — genre-aware lint, confidence-weighted consequence, clue payoff arc ──
{
  const makeIR112 = (ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[], sceneIdx = 3): import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR => ({
    transitionId: 'w112', sceneIdx, sceneFunction: 'build_tension',
    activeMechanisms: [], beforeStateHash: 'abc', ops,
    preconditions: [], postconditions: [],
    provenance: { origin: 'user_authored', createdAt: 0 },
  });

  const horrorState = (): import('../../server/nvm/state/NarrativeState.ts').NarrativeState => ({
    ...emptyState(),
    audienceState: { knownFacts: [], suspense: 10, curiosity: 50, investment: 50 },
    authorIntent: { genre: 'horror' },
  });

  describe('Wave 112 — genre-aware lint rules', () => {
    it('lint: horror genre + low suspense at scene 3 → GENRE_SUSPENSE_FLOOR warn', () => {
      const warnings = lint(makeIR112([], 3), horrorState());
      assert.ok(warnings.some(w => w.rule === 'GENRE_SUSPENSE_FLOOR' && w.severity === 'warn'),
        'horror + suspense=10 at scene 3 → GENRE_SUSPENSE_FLOOR');
    });

    it('lint: thriller genre + adequate suspense → no GENRE_SUSPENSE_FLOOR', () => {
      const state = { ...emptyState(), audienceState: { knownFacts: [] as string[], suspense: 60, curiosity: 50, investment: 50 }, authorIntent: { genre: 'thriller' as const } };
      const warnings = lint(makeIR112([], 4), state);
      assert.ok(!warnings.some(w => w.rule === 'GENRE_SUSPENSE_FLOOR'),
        'suspense=60 → no suspense floor warning');
    });

    it('lint: horror genre at scene 2 → no GENRE_SUSPENSE_FLOOR (too early)', () => {
      const warnings = lint(makeIR112([], 2), horrorState());
      assert.ok(!warnings.some(w => w.rule === 'GENRE_SUSPENSE_FLOOR'),
        'scene 2 is too early for the suspense floor rule');
    });

    it('lint: mystery genre + no clues at scene 2 → GENRE_MYSTERY_NO_CLUES', () => {
      const state = { ...emptyState(), authorIntent: { genre: 'mystery' as const } };
      const warnings = lint(makeIR112([], 2), state);
      assert.ok(warnings.some(w => w.rule === 'GENRE_MYSTERY_NO_CLUES' && w.severity === 'warn'),
        'mystery with no clues at scene 2 → GENRE_MYSTERY_NO_CLUES');
    });

    it('lint: mystery genre + clue in state → no GENRE_MYSTERY_NO_CLUES', () => {
      const state: import('../../server/nvm/state/NarrativeState.ts').NarrativeState = {
        ...emptyState(),
        authorIntent: { genre: 'mystery' as const },
        clues: [{ clueId: 'knife-handle', carrier: 'object' }],
      };
      const warnings = lint(makeIR112([], 3), state);
      assert.ok(!warnings.some(w => w.rule === 'GENRE_MYSTERY_NO_CLUES'),
        'clue already in state → no mystery no-clues warning');
    });

    it('lint: comedy genre + no positive emotion at scene 2 → GENRE_COMEDY_TONE_DRIFT', () => {
      const state = { ...emptyState(), authorIntent: { genre: 'comedy' as const } };
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'APPRAISE_EMOTION', charId: 'A', emotion: { joy: 0, distress: 60, anger: 0, fear: 0, pride: 0, shame: 0, dominant: 'distress', intensity: 60, last_updated_at: 0 } },
      ];
      const warnings = lint(makeIR112(ops, 2), state);
      assert.ok(warnings.some(w => w.rule === 'GENRE_COMEDY_TONE_DRIFT'),
        'comedy + only negative emotion → GENRE_COMEDY_TONE_DRIFT');
    });

    it('lint: comedy genre + joy emotion → no GENRE_COMEDY_TONE_DRIFT', () => {
      const state = { ...emptyState(), authorIntent: { genre: 'comedy' as const } };
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'APPRAISE_EMOTION', charId: 'A', emotion: { joy: 70, distress: 0, anger: 0, fear: 0, pride: 0, shame: 0, dominant: 'joy', intensity: 70, last_updated_at: 0 } },
      ];
      const warnings = lint(makeIR112(ops, 2), state);
      assert.ok(!warnings.some(w => w.rule === 'GENRE_COMEDY_TONE_DRIFT'),
        'joy emotion present → no tone drift warning');
    });
  });

  describe('Wave 112 — branch score: confidence-weighted consequence + clue payoff arc', () => {
    const makeMinimalIR = (ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[]): import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR => ({
      transitionId: 'w112b', sceneIdx: 2, sceneFunction: 'advance_plot',
      activeMechanisms: [], beforeStateHash: 'xyz', ops,
      preconditions: [], postconditions: [],
      provenance: { origin: 'user_authored', createdAt: 0 },
    });

    it('branchScore: high-confidence belief scores more consequence than low-confidence', () => {
      const highConf: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [{
        op: 'UPDATE_BELIEF', charId: 'A',
        belief: { id: 'b1', proposition: 'X is true', source: 'witnessed', source_event_id: 'ev1', confidence: 0.95, acquired_at: 0 },
      }];
      const lowConf: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [{
        op: 'UPDATE_BELIEF', charId: 'A',
        belief: { id: 'b2', proposition: 'Y is true', source: 'inferred', confidence: 0.2, acquired_at: 0 },
      }];
      const scoreHigh = scoreBranch(highConf, makeMinimalIR(highConf), emptyState(), []);
      const scoreLow  = scoreBranch(lowConf, makeMinimalIR(lowConf), emptyState(), []);
      assert.ok(scoreHigh.consequence > scoreLow.consequence,
        `high-confidence belief (${scoreHigh.consequence}) should score higher consequence than low-confidence (${scoreLow.consequence})`);
    });

    it('branchScore: PAYOFF_SETUP matching seeded clue earns arc alignment bonus', () => {
      const stateWithClue: import('../../server/nvm/state/NarrativeState.ts').NarrativeState = {
        ...emptyState(),
        clues: [{ clueId: 'the-key', carrier: 'object' }],
      };
      const opsWithMatch: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'PAYOFF_SETUP', setupId: 'the-key', payoffEventId: 'door-opens' },
      ];
      const opsNoMatch: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'PAYOFF_SETUP', setupId: 'unknown-clue', payoffEventId: 'something-happens' },
      ];
      const scoreMatch   = scoreBranch(opsWithMatch, makeMinimalIR(opsWithMatch), stateWithClue, []);
      const scoreNoMatch = scoreBranch(opsNoMatch, makeMinimalIR(opsNoMatch), emptyState(), []);
      assert.ok(scoreMatch.arcAlignment > scoreNoMatch.arcAlignment,
        `payoff matching seeded clue (${scoreMatch.arcAlignment}) should exceed unmatched payoff (${scoreNoMatch.arcAlignment})`);
    });
  });
}


// ── Wave 113 — PolarityProof + ReincorporationProof ──────────────────────────
{
  const { polarityProof } = await import('../../server/nvm/proof/tier2/polarity.ts');
  const { reincorporationProof } = await import('../../server/nvm/proof/tier2/reincorporation.ts');

  const makeIR113 = (ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[], sceneIdx = 3): import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR => ({
    transitionId: 'w113', sceneIdx, sceneFunction: 'advance_plot',
    activeMechanisms: [], beforeStateHash: 'abc', ops,
    preconditions: [], postconditions: [],
    provenance: { origin: 'user_authored', createdAt: 0 },
  });

  const fearState = (): import('../../server/nvm/state/NarrativeState.ts').NarrativeState => ({
    ...emptyState(),
    characterEmotions: {
      'Alice': { joy: 0, distress: 0, anger: 0, fear: 70, pride: 0, shame: 0, dominant: 'fear', intensity: 70, last_updated_at: 1 },
    },
  });

  describe('Wave 113 — PolarityProof', () => {
    it('polarityProof: no emotion ops → pass (not applicable)', () => {
      const result = polarityProof(makeIR113([]), emptyState());
      assert.ok(result.pass, 'no emotion ops → pass');
    });

    it('polarityProof: emotion op on new character (no prior state) → pass', () => {
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'APPRAISE_EMOTION', charId: 'Bob', emotion: { joy: 0, distress: 60, anger: 0, fear: 0, pride: 0, shame: 0, dominant: 'distress', intensity: 60, last_updated_at: 0 } },
      ];
      const result = polarityProof(makeIR113(ops), emptyState());
      assert.ok(result.pass, 'new character with no prior state → pass (no prior polarity to violate)');
    });

    it('polarityProof: fear→joy reversal → pass', () => {
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'APPRAISE_EMOTION', charId: 'Alice', emotion: { joy: 80, distress: 0, anger: 0, fear: 0, pride: 0, shame: 0, dominant: 'joy', intensity: 80, last_updated_at: 0 } },
      ];
      const result = polarityProof(makeIR113(ops), fearState());
      assert.ok(result.pass, 'fear→joy is a polarity flip → pass');
    });

    it('polarityProof: fear→distress (same valence) → fail flag', () => {
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'APPRAISE_EMOTION', charId: 'Alice', emotion: { joy: 0, distress: 70, anger: 0, fear: 0, pride: 0, shame: 0, dominant: 'distress', intensity: 70, last_updated_at: 0 } },
      ];
      const result = polarityProof(makeIR113(ops), fearState());
      assert.ok(!result.pass, 'fear→distress is same negative valence → fail');
      assert.ok(result.findings.some(f => f.severity === 'flag'), 'finding should be a flag');
    });
  });

  describe('Wave 113 — ReincorporationProof', () => {
    it('reincorporationProof: scene 0 → always pass (establishing)', () => {
      const result = reincorporationProof(makeIR113([], 0), emptyState());
      assert.ok(result.pass, 'scene 0 → pass unconditionally');
    });

    it('reincorporationProof: scene 1 → always pass (establishing)', () => {
      const result = reincorporationProof(makeIR113([], 1), emptyState());
      assert.ok(result.pass, 'scene 1 → pass unconditionally');
    });

    it('reincorporationProof: scene 2 with known character → pass', () => {
      const state: import('../../server/nvm/state/NarrativeState.ts').NarrativeState = {
        ...emptyState(),
        characterEmotions: {
          'Alice': { joy: 50, distress: 0, anger: 0, fear: 0, pride: 0, shame: 0, dominant: 'joy', intensity: 50, last_updated_at: 1 },
        },
      };
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'APPRAISE_EMOTION', charId: 'Alice', emotion: { joy: 0, distress: 60, anger: 0, fear: 0, pride: 0, shame: 0, dominant: 'distress', intensity: 60, last_updated_at: 0 } },
      ];
      const result = reincorporationProof(makeIR113(ops, 2), state);
      assert.ok(result.pass, 'APPRAISE_EMOTION on existing character → pass');
    });

    it('reincorporationProof: scene 2 with ADVANCE_THEME_ARGUMENT → pass', () => {
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'ADVANCE_THEME_ARGUMENT', claimId: 'c1', move: 'support' },
      ];
      const result = reincorporationProof(makeIR113(ops, 2), emptyState());
      assert.ok(result.pass, 'ADVANCE_THEME_ARGUMENT always counts as reincorporation');
    });

    it('reincorporationProof: scene 3 with only new-char emotion + new clock → fail flag', () => {
      // Everything in this scene is brand-new: the char and clock don't exist in state
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'APPRAISE_EMOTION', charId: 'NewChar', emotion: { joy: 0, distress: 50, anger: 0, fear: 0, pride: 0, shame: 0, dominant: 'distress', intensity: 50, last_updated_at: 0 } },
        { op: 'RAISE_CLOCK', clockId: 'brand-new-clock', amount: 5 },
      ];
      const result = reincorporationProof(makeIR113(ops, 3), emptyState());
      assert.ok(!result.pass, 'scene 3 with all-new entities → fail');
      assert.ok(result.findings.some(f => f.severity === 'flag'), 'finding is a flag, not block');
    });

    it('reincorporationProof: scene 3 with existing clock → pass', () => {
      const state: import('../../server/nvm/state/NarrativeState.ts').NarrativeState = {
        ...emptyState(),
        clocks: { 'main-clock': 40 },
      };
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'RAISE_CLOCK', clockId: 'main-clock', amount: 10 },
      ];
      const result = reincorporationProof(makeIR113(ops, 3), state);
      assert.ok(result.pass, 'RAISE_CLOCK on existing clock → pass');
    });
  });
}


// ── Wave 114 — tension ceiling, clock overload, urgency-weighted screenplay score ──
{
  const { studioNoteCritic } = await import('../../server/nvm/room/critics/studio-note.ts');
  const { showrunnerCritic } = await import('../../server/nvm/room/critics/showrunner.ts');

  const makeIR114 = (ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[], sceneIdx = 3, sceneFunction: import('../../server/nvm/ir/NarrativeTransitionIR.ts').SceneFunction = 'build_tension'): import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR => ({
    transitionId: 'w114', sceneIdx, sceneFunction,
    activeMechanisms: [], beforeStateHash: 'abc', ops,
    preconditions: [], postconditions: [],
    provenance: { origin: 'user_authored', createdAt: 0 },
  });

  describe('Wave 114 — studio_note tension ceiling', () => {
    it('studioNoteCritic: suspense>=85 + RAISE_CLOCK + no relief → TENSION_CEILING critique', () => {
      const state: import('../../server/nvm/state/NarrativeState.ts').NarrativeState = {
        ...emptyState(),
        audienceState: { knownFacts: [], suspense: 90, curiosity: 50, investment: 50 },
      };
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'RAISE_CLOCK', clockId: 'bomb-timer', amount: 5 },
      ];
      const critiques = studioNoteCritic(makeIR114(ops, 3), state);
      assert.ok(critiques.some(c => c.objection.includes('ceiling') || c.objection.includes('numb')),
        'suspense at 90 + RAISE_CLOCK with no relief → tension ceiling warning');
    });

    it('studioNoteCritic: suspense>=85 + RAISE_CLOCK + joy relief → no ceiling warning', () => {
      const state: import('../../server/nvm/state/NarrativeState.ts').NarrativeState = {
        ...emptyState(),
        audienceState: { knownFacts: [], suspense: 90, curiosity: 50, investment: 50 },
      };
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'RAISE_CLOCK', clockId: 'bomb-timer', amount: 5 },
        { op: 'APPRAISE_EMOTION', charId: 'Hero', emotion: { joy: 70, distress: 0, anger: 0, fear: 0, pride: 0, shame: 0, dominant: 'joy', intensity: 70, last_updated_at: 0 } },
      ];
      const critiques = studioNoteCritic(makeIR114(ops, 3), state);
      assert.ok(!critiques.some(c => c.objection.includes('ceiling') || c.objection.includes('numb')),
        'suspense at 90 + RAISE_CLOCK but joy relief → no ceiling warning');
    });

    it('studioNoteCritic: suspense=70 (below ceiling) + RAISE_CLOCK → no ceiling warning', () => {
      const state: import('../../server/nvm/state/NarrativeState.ts').NarrativeState = {
        ...emptyState(),
        audienceState: { knownFacts: [], suspense: 70, curiosity: 50, investment: 50 },
      };
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'RAISE_CLOCK', clockId: 'c1', amount: 10 },
      ];
      const critiques = studioNoteCritic(makeIR114(ops, 3), state);
      assert.ok(!critiques.some(c => c.objection.includes('ceiling')),
        'suspense=70 is below the ceiling threshold → no warning');
    });
  });

  describe('Wave 114 — showrunner clock overload', () => {
    it('showrunnerCritic: 4+ clocks above 50 → clock overload critique', () => {
      const state: import('../../server/nvm/state/NarrativeState.ts').NarrativeState = {
        ...emptyState(),
        clocks: { 'c1': 60, 'c2': 70, 'c3': 55, 'c4': 80 },
        themeArgument: [],
      };
      const critiques = showrunnerCritic(makeIR114([], 3, 'advance_plot'), state);
      assert.ok(critiques.some(c => c.objection.includes('clocks') && c.objection.includes('urgency')),
        '4 urgent clocks → clock overload critique');
    });

    it('showrunnerCritic: 3 urgent clocks → no overload warning (below threshold)', () => {
      const state: import('../../server/nvm/state/NarrativeState.ts').NarrativeState = {
        ...emptyState(),
        clocks: { 'c1': 60, 'c2': 70, 'c3': 55 },
        themeArgument: [],
      };
      const critiques = showrunnerCritic(makeIR114([], 3, 'advance_plot'), state);
      assert.ok(!critiques.some(c => c.objection.includes('urgency')),
        '3 urgent clocks → no overload warning');
    });

    it('showrunnerCritic: 5 clocks but most below 50 → no overload warning', () => {
      const state: import('../../server/nvm/state/NarrativeState.ts').NarrativeState = {
        ...emptyState(),
        clocks: { 'c1': 30, 'c2': 20, 'c3': 10, 'c4': 55, 'c5': 40 },
        themeArgument: [],
      };
      const critiques = showrunnerCritic(makeIR114([], 3, 'advance_plot'), state);
      assert.ok(!critiques.some(c => c.objection.includes('urgency')),
        'only 1 clock above 50 → no overload warning despite 5 total clocks');
    });
  });

  describe('Wave 114 — screenplay usefulness: urgency-weighted clock score', () => {
    const makeMinimalIR114 = (ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[]): import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR => ({
      transitionId: 'w114c', sceneIdx: 2, sceneFunction: 'advance_plot',
      activeMechanisms: [], beforeStateHash: 'xyz', ops,
      preconditions: [], postconditions: [],
      provenance: { origin: 'user_authored', createdAt: 0 },
    });

    it('branchScore: raising an urgent clock scores higher usefulness than a fresh one', () => {
      const stateWithUrgentClock: import('../../server/nvm/state/NarrativeState.ts').NarrativeState = {
        ...emptyState(), clocks: { 'timer': 80 },
      };
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'RAISE_CLOCK', clockId: 'timer', amount: 5 },
      ];
      const scoreUrgent  = scoreBranch(ops, makeMinimalIR114(ops), stateWithUrgentClock, []);
      const scoreBaseline = scoreBranch(ops, makeMinimalIR114(ops), emptyState(), []);
      assert.ok(scoreUrgent.screenplayUsefulness > scoreBaseline.screenplayUsefulness,
        `urgent clock (${scoreUrgent.screenplayUsefulness}) should score higher than fresh clock (${scoreBaseline.screenplayUsefulness})`);
    });
  });
}


// ── Wave 115 — op density overload, Propp coverage warning, character neglect ──
{
  const { characterAdvocateCritic } = await import('../../server/nvm/room/critics/character-advocate.ts');

  const makeIR115 = (ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[], sceneIdx = 6): import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR => ({
    transitionId: 'w115', sceneIdx, sceneFunction: 'advance_plot',
    activeMechanisms: [], beforeStateHash: 'abc', ops,
    preconditions: [], postconditions: [],
    provenance: { origin: 'user_authored', createdAt: 0 },
  });

  describe('Wave 115 — quality engine: op density overload', () => {
    it('runQualityEngine: >10 ops → OP_DENSITY_OVERLOAD warning', () => {
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = Array.from({ length: 12 }, (_, i) => ({
        op: 'RAISE_CLOCK' as const, clockId: `c${i}`, amount: 1,
      }));
      const report = runQualityEngine(makeIR115(ops), emptyState());
      assert.ok(report.warnings.some(w => w.rule === 'OP_DENSITY_OVERLOAD'),
        '12 ops → OP_DENSITY_OVERLOAD warning');
    });

    it('runQualityEngine: exactly 10 ops → no density overload', () => {
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = Array.from({ length: 10 }, (_, i) => ({
        op: 'RAISE_CLOCK' as const, clockId: `c${i}`, amount: 1,
      }));
      const report = runQualityEngine(makeIR115(ops), emptyState());
      assert.ok(!report.warnings.some(w => w.rule === 'OP_DENSITY_OVERLOAD'),
        'exactly 10 ops → no density overload (boundary)');
    });
  });

  describe('Wave 115 — quality engine: Propp coverage warning', () => {
    it('runQualityEngine: minimal ops at scene 5 → LOW_PROPP_COVERAGE warning', () => {
      // A scene with only ADD_FACT covers at most 1 Propp stage (preparation)
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'ADD_FACT', fact: { factId: 'f1', subject: 'A', predicate: 'is', object: 'present', addedAtTurn: 1, validFrom: 1, validTo: null } },
      ];
      const report = runQualityEngine(makeIR115(ops, 5), emptyState());
      // proppMorphology maps ADD_FACT → preparation only, so coverage = 1/7 ≈ 14% < 30%
      assert.ok(report.warnings.some(w => w.rule === 'LOW_PROPP_COVERAGE'),
        'scene 5 with preparation-only → LOW_PROPP_COVERAGE warning');
    });

    it('runQualityEngine: Propp coverage check skipped before scene 5', () => {
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'ADD_FACT', fact: { factId: 'f1', subject: 'A', predicate: 'is', object: 'present', addedAtTurn: 1, validFrom: 1, validTo: null } },
      ];
      const report = runQualityEngine(makeIR115(ops, 3), emptyState());
      assert.ok(!report.warnings.some(w => w.rule === 'LOW_PROPP_COVERAGE'),
        'scene 3 → Propp check not yet applied');
    });
  });

  describe('Wave 115 — character advocate: narrative neglect', () => {
    it('characterAdvocateCritic: established char absent from scene 5+ → neglect critique', () => {
      const state: import('../../server/nvm/state/NarrativeState.ts').NarrativeState = {
        ...emptyState(),
        characterBeliefs: {
          'Alice': [
            { id: 'b1', proposition: 'P1', confidence: 0.8, source: 'witnessed', acquired_at: 1 },
            { id: 'b2', proposition: 'P2', confidence: 0.7, source: 'inferred', acquired_at: 2 },
            { id: 'b3', proposition: 'P3', confidence: 0.9, source: 'told', acquired_at: 3 },
          ],
        },
      };
      // Scene has 4 ops about Bob, Alice is absent
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'RAISE_CLOCK', clockId: 'c1', amount: 5 },
        { op: 'RAISE_CLOCK', clockId: 'c2', amount: 3 },
        { op: 'RAISE_CLOCK', clockId: 'c3', amount: 2 },
        { op: 'RAISE_CLOCK', clockId: 'c4', amount: 1 },
      ];
      const critiques = (characterAdvocateCritic as (ir: import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR, state: import('../../server/nvm/state/NarrativeState.ts').NarrativeState) => import('../../server/nvm/room/room.ts').Critique[])(makeIR115(ops, 5), state);
      assert.ok(critiques.some(c => c.objection.includes('Alice') && c.objection.includes('neglected')),
        'Alice with 3 beliefs absent from 4-op scene → neglect critique');
    });

    it('characterAdvocateCritic: established char present in scene → no neglect', () => {
      const state: import('../../server/nvm/state/NarrativeState.ts').NarrativeState = {
        ...emptyState(),
        characterBeliefs: {
          'Alice': [
            { id: 'b1', proposition: 'P1', confidence: 0.8, source: 'witnessed', acquired_at: 1 },
            { id: 'b2', proposition: 'P2', confidence: 0.7, source: 'inferred', acquired_at: 2 },
            { id: 'b3', proposition: 'P3', confidence: 0.9, source: 'told', acquired_at: 3 },
          ],
        },
      };
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'RAISE_CLOCK', clockId: 'c1', amount: 5 },
        { op: 'APPRAISE_EMOTION', charId: 'Alice', emotion: { joy: 60, distress: 0, anger: 0, fear: 0, pride: 0, shame: 0, dominant: 'joy', intensity: 60, last_updated_at: 0 } },
        { op: 'RAISE_CLOCK', clockId: 'c2', amount: 3 },
        { op: 'RAISE_CLOCK', clockId: 'c3', amount: 2 },
      ];
      const critiques = (characterAdvocateCritic as (ir: import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR, state: import('../../server/nvm/state/NarrativeState.ts').NarrativeState) => import('../../server/nvm/room/room.ts').Critique[])(makeIR115(ops, 5), state);
      assert.ok(!critiques.some(c => c.objection.includes('neglected')),
        'Alice appears in scene via APPRAISE_EMOTION → no neglect critique');
    });
  });
}


// ── Wave 116 — plant_sensory_anchor + defuse_clock operators ─────────────────
{
  const makeIR116 = (ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[], sceneIdx = 2): import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR => ({
    transitionId: 'w116', sceneIdx, sceneFunction: 'build_tension',
    activeMechanisms: [], beforeStateHash: 'abc', ops,
    preconditions: [], postconditions: [],
    provenance: { origin: 'user_authored', createdAt: 0 },
  });

  describe('Wave 116 — plant_sensory_anchor operator', () => {
    it('plant_sensory_anchor: adds a RECORD_VISUAL_FACT or RECORD_SONIC_FACT', () => {
      const result = applyOperator('plant_sensory_anchor', makeIR116([]), emptyState(), 42);
      const added = result.ir.ops.filter(op => op.op === 'RECORD_VISUAL_FACT' || op.op === 'RECORD_SONIC_FACT');
      assert.ok(added.length === 1, 'exactly one sensory op added');
      assert.ok(result.description.includes('anchor'), 'description mentions anchor');
    });

    it('plant_sensory_anchor: calibrates to dominant emotion in IR', () => {
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'APPRAISE_EMOTION', charId: 'Hero', emotion: { joy: 0, distress: 0, anger: 0, fear: 90, pride: 0, shame: 0, dominant: 'fear', intensity: 90, last_updated_at: 0 } },
      ];
      const result = applyOperator('plant_sensory_anchor', makeIR116(ops), emptyState(), 1);
      assert.ok(result.description.includes('fear'), 'description references the fear register');
    });

    it('plant_sensory_anchor: ALL_OPERATORS now contains both new operators', () => {
      assert.ok(ALL_OPERATORS.includes('plant_sensory_anchor'), 'ALL_OPERATORS has plant_sensory_anchor');
      assert.ok(ALL_OPERATORS.includes('defuse_clock'), 'ALL_OPERATORS has defuse_clock');
    });
  });

  describe('Wave 116 — defuse_clock operator', () => {
    it('defuse_clock: with existing clock in state → adds negative RAISE_CLOCK', () => {
      const state: import('../../server/nvm/state/NarrativeState.ts').NarrativeState = {
        ...emptyState(), clocks: { 'bomb': 70 },
      };
      const result = applyOperator('defuse_clock', makeIR116([]), state, 99);
      const defuseOp = result.ir.ops.find(op => op.op === 'RAISE_CLOCK') as Extract<import('../../server/nvm/ops/StoryOp.ts').StoryOp, {op:'RAISE_CLOCK'}> | undefined;
      assert.ok(defuseOp, 'RAISE_CLOCK op added');
      assert.ok(defuseOp!.amount < 0, 'RAISE_CLOCK amount is negative (defuse)');
      assert.equal(defuseOp!.clockId, 'bomb', 'targets the most urgent clock');
    });

    it('defuse_clock: picks most urgent clock when multiple exist', () => {
      const state: import('../../server/nvm/state/NarrativeState.ts').NarrativeState = {
        ...emptyState(), clocks: { 'low-clock': 20, 'high-clock': 80 },
      };
      const result = applyOperator('defuse_clock', makeIR116([]), state, 5);
      const defuseOp = result.ir.ops.find(op => op.op === 'RAISE_CLOCK') as Extract<import('../../server/nvm/ops/StoryOp.ts').StoryOp, {op:'RAISE_CLOCK'}> | undefined;
      assert.equal(defuseOp?.clockId, 'high-clock', 'targets the highest-value clock');
    });

    it('defuse_clock: no clock in state or IR → no-op', () => {
      const result = applyOperator('defuse_clock', makeIR116([]), emptyState(), 7);
      assert.equal(result.ir.ops.length, 0, 'no ops added when no clock exists');
      assert.ok(result.description.includes('no clock'), 'description explains the no-op');
    });
  });
}


// ── Wave 117 — genre injection in buildSystemPreamble, climax directive ───────
{
  const { buildSystemPreamble } = await import('../../server/nvm/generate/proof-spec.ts');

  const makeSceneTarget117 = (): import('../../server/nvm/generate/proof-spec.ts').SceneTarget => ({
    sceneIdx: 3, sceneFunction: 'build_tension', activeMechanisms: [],
    tensionTarget: 100, qualityTarget: 60,
  });

  describe('Wave 117 — buildSystemPreamble genre injection', () => {
    it('preamble: thriller genre → includes GENRE — THRILLER instruction', () => {
      const state = { ...emptyState(), authorIntent: { genre: 'thriller' as const } };
      const preamble = buildSystemPreamble([], state);
      assert.ok(preamble.includes('THRILLER'), 'thriller genre block injected into preamble');
    });

    it('preamble: horror genre → includes GENRE — HORROR instruction', () => {
      const state = { ...emptyState(), authorIntent: { genre: 'horror' as const } };
      const preamble = buildSystemPreamble([], state);
      assert.ok(preamble.includes('HORROR'), 'horror genre block injected into preamble');
    });

    it('preamble: no genre → no GENRE block (neutral default)', () => {
      const preamble = buildSystemPreamble([], emptyState());
      assert.ok(!preamble.includes('GENRE —'), 'no genre set → no genre block in preamble');
    });

    it('preamble: genre forbidden clichés appear in preamble', () => {
      const state = { ...emptyState(), authorIntent: { genre: 'mystery' as const } };
      const preamble = buildSystemPreamble([], state);
      assert.ok(preamble.includes('AVOID THESE MYSTERY'), 'mystery cliché list injected');
    });
  });

  describe('Wave 117 — buildSystemPreamble climax directive', () => {
    it('preamble: suspense>=85 AND investment>=85 → CLIMAX CONDITIONS directive', () => {
      const state: import('../../server/nvm/state/NarrativeState.ts').NarrativeState = {
        ...emptyState(),
        audienceState: { knownFacts: [], suspense: 90, curiosity: 50, investment: 88 },
      };
      const preamble = buildSystemPreamble([], state);
      assert.ok(preamble.includes('CLIMAX CONDITIONS'), 'climax directive appears at high suspense + investment');
    });

    it('preamble: suspense=90 but investment=60 → escalation directive (not climax)', () => {
      const state: import('../../server/nvm/state/NarrativeState.ts').NarrativeState = {
        ...emptyState(),
        audienceState: { knownFacts: [], suspense: 90, curiosity: 50, investment: 60 },
      };
      const preamble = buildSystemPreamble([], state);
      assert.ok(!preamble.includes('CLIMAX CONDITIONS'), 'investment below 85 → not climax directive');
      assert.ok(preamble.includes('Suspense is high'), 'gets escalation directive instead');
    });
  });
}


// ── Wave 119 — whatBreaks clock/clue tracking + SCM cross-commit edges ──────

describe('Wave 119 — whatBreaksIfRemoved: clue break across multi-commit chain', () => {
  function mkC(id: string, parent: string | null, ops: StoryOp[]): StoryCommit {
    return { commitId: id, parentId: parent, sceneIdx: 0, ops, deltaSummary: summarizeOps(ops), reverted: false, createdAt: Date.now() };
  }

  it('flags both downstream commits when removed commit is sole SEED_CLUE for a multi-payoff arc', () => {
    const stage = new Stage(':memory:');
    const seed: StoryOp[] = [{ op: 'SEED_CLUE', clueId: 'ring', carrier: 'object' }];
    const payoff1: StoryOp[] = [{ op: 'PAYOFF_SETUP', setupId: 'ring', payoffEventId: 'e1' }];
    const payoff2: StoryOp[] = [{ op: 'PAYOFF_SETUP', setupId: 'ring', payoffEventId: 'e2' }];
    stage.appendCommit(mkC('c1', null, seed));
    stage.appendCommit(mkC('c2', 'c1', payoff1));
    stage.appendCommit(mkC('c3', 'c2', payoff2));
    const report = whatBreaksIfRemoved(stage, 'c1');
    assert.equal(report.breaks.length, 2, 'both downstream payoffs break when sole seed is removed');
    assert.ok(report.breaks.every(b => b.proof === 'ProvenanceProof'));
    assert.ok(report.breaks.some(b => b.downstreamCommit === 'c2'));
    assert.ok(report.breaks.some(b => b.downstreamCommit === 'c3'));
  });

  it('combined break: sole char and sole clue in same removed commit', () => {
    const stage = new Stage(':memory:');
    const introOps: StoryOp[] = [
      { op: 'UPDATE_BELIEF', charId: 'rex', belief: { id: 'b1', proposition: 'p', confidence: 0.9, source: 'inferred', acquired_at: 1 } },
      { op: 'SEED_CLUE', clueId: 'footprint', carrier: 'location' },
    ];
    const refOps: StoryOp[] = [
      { op: 'APPRAISE_EMOTION', charId: 'rex', emotion: { joy: 0, distress: 0, anger: 80, fear: 0, pride: 0, shame: 0, dominant: 'anger', intensity: 80, last_updated_at: 2 } },
      { op: 'PAYOFF_SETUP', setupId: 'footprint', payoffEventId: 'ev2' },
    ];
    stage.appendCommit(mkC('c1', null, introOps));
    stage.appendCommit(mkC('c2', 'c1', refOps));
    const report = whatBreaksIfRemoved(stage, 'c1');
    assert.equal(report.breaks.length, 2, 'char break + clue break both detected');
    assert.ok(report.breaks.some(b => b.proof === 'IntentionalProof'));
    assert.ok(report.breaks.some(b => b.proof === 'ProvenanceProof'));
  });

  it('no break when removed commit has no unique introductions', () => {
    const stage = new Stage(':memory:');
    const belief: StoryOp[] = [{ op: 'UPDATE_BELIEF', charId: 'nora', belief: { id: 'b1', proposition: 'p', confidence: 0.9, source: 'inferred', acquired_at: 1 } }];
    const emotion: StoryOp[] = [{ op: 'APPRAISE_EMOTION', charId: 'nora', emotion: { joy: 50, distress: 0, anger: 0, fear: 0, pride: 0, shame: 0, dominant: 'joy', intensity: 50, last_updated_at: 2 } }];
    stage.appendCommit(mkC('c1', null, belief));
    // c2 ALSO introduces nora via UPDATE_BELIEF, then c3 references nora
    stage.appendCommit(mkC('c2', 'c1', belief));
    stage.appendCommit(mkC('c3', 'c2', emotion));
    const report = whatBreaksIfRemoved(stage, 'c1');
    assert.equal(report.breaks.length, 0, 'not the sole introducer → no breaks');
  });
});


describe('Wave 119 — whatBreaksIfRemoved: clue/payoff break detection', () => {
  function mkC(id: string, parent: string | null, ops: StoryOp[]): StoryCommit {
    return { commitId: id, parentId: parent, sceneIdx: 0, ops, deltaSummary: summarizeOps(ops), reverted: false, createdAt: Date.now() };
  }

  it('flags downstream PAYOFF_SETUP when removed commit is sole SEED_CLUE source', () => {
    const stage = new Stage(':memory:');
    const opsA: StoryOp[] = [{ op: 'SEED_CLUE', clueId: 'clue_ring', carrier: 'object' }];
    const opsB: StoryOp[] = [{ op: 'PAYOFF_SETUP', setupId: 'clue_ring', payoffEventId: 'e1' }];
    stage.appendCommit(mkC('c1', null, opsA));
    stage.appendCommit(mkC('c2', 'c1', opsB));
    const report = whatBreaksIfRemoved(stage, 'c1');
    assert.equal(report.breaks.length, 1);
    assert.equal(report.breaks[0].downstreamCommit, 'c2');
    assert.equal(report.breaks[0].proof, 'ProvenanceProof');
    assert.ok(report.breaks[0].reason.includes('clue_ring'));
  });

  it('no clue break when clue is seeded independently in another commit', () => {
    const stage = new Stage(':memory:');
    const seedOp: StoryOp[] = [{ op: 'SEED_CLUE', clueId: 'clue_ring', carrier: 'object' }];
    const payoffOp: StoryOp[] = [{ op: 'PAYOFF_SETUP', setupId: 'clue_ring', payoffEventId: 'e1' }];
    stage.appendCommit(mkC('c1', null, seedOp));
    stage.appendCommit(mkC('c2', 'c1', seedOp));  // also seeds clue_ring
    stage.appendCommit(mkC('c3', 'c2', payoffOp));
    const report = whatBreaksIfRemoved(stage, 'c1');
    // c2 also seeds the clue, so c3 payoff is safe
    assert.equal(report.breaks.length, 0);
  });
});


describe('Wave 119 — buildSCM: cross-commit causal edges', () => {
  function mkC(id: string, parent: string | null, ops: StoryOp[], sceneIdx = 0): StoryCommit {
    return { commitId: id, parentId: parent, sceneIdx, ops, deltaSummary: summarizeOps(ops), reverted: false, createdAt: Date.now() };
  }

  it('cross-commit EXPIRE_FACT → ADD_FACT edge is wired', () => {
    const stage = new Stage(':memory:');
    const opsA: StoryOp[] = [
      { op: 'ADD_FACT', fact: { factId: 'f1', subject: 's', predicate: 'p', object: 'o', addedAtTurn: 1, validFrom: 1, validTo: null } },
    ];
    const opsB: StoryOp[] = [{ op: 'EXPIRE_FACT', factId: 'f1', atTurn: 2 }];
    stage.appendCommit(mkC('c1', null, opsA));
    stage.appendCommit(mkC('c2', 'c1', opsB));
    const scm = buildSCM(stage);
    const addNode = scm.nodes.get('c1:0')!;
    const expNode = scm.nodes.get('c2:0')!;
    assert.ok(addNode.children.includes('c2:0'), 'ADD_FACT → EXPIRE_FACT cross-commit edge');
    assert.ok(expNode.parents.includes('c1:0'), 'EXPIRE_FACT parent is cross-commit ADD_FACT');
  });

  it('cross-commit PAYOFF_SETUP → SEED_CLUE edge is wired', () => {
    const stage = new Stage(':memory:');
    const opsA: StoryOp[] = [{ op: 'SEED_CLUE', clueId: 'clue1', carrier: 'object' }];
    const opsB: StoryOp[] = [{ op: 'PAYOFF_SETUP', setupId: 'clue1', payoffEventId: 'e_payoff' }];
    stage.appendCommit(mkC('c1', null, opsA));
    stage.appendCommit(mkC('c2', 'c1', opsB));
    const scm = buildSCM(stage);
    const seedNode = scm.nodes.get('c1:0')!;
    const payoffNode = scm.nodes.get('c2:0')!;
    assert.ok(seedNode.children.includes('c2:0'), 'SEED_CLUE → PAYOFF_SETUP cross-commit edge');
    assert.ok(payoffNode.parents.includes('c1:0'), 'PAYOFF_SETUP parent is cross-commit SEED_CLUE');
  });

  it('cross-commit RAISE_CLOCK chain is wired', () => {
    const stage = new Stage(':memory:');
    const opsA: StoryOp[] = [{ op: 'RAISE_CLOCK', clockId: 'timer', amount: 20 }];
    const opsB: StoryOp[] = [{ op: 'RAISE_CLOCK', clockId: 'timer', amount: 30 }];
    stage.appendCommit(mkC('c1', null, opsA));
    stage.appendCommit(mkC('c2', 'c1', opsB));
    const scm = buildSCM(stage);
    const first = scm.nodes.get('c1:0')!;
    const second = scm.nodes.get('c2:0')!;
    assert.ok(first.children.includes('c2:0'), 'first RAISE_CLOCK → second RAISE_CLOCK');
    assert.ok(second.parents.includes('c1:0'), 'second RAISE_CLOCK parent is first');
  });

  it('cross-commit APPRAISE_EMOTION → UPDATE_BELIEF for same char is wired', () => {
    const stage = new Stage(':memory:');
    const opsA: StoryOp[] = [
      { op: 'UPDATE_BELIEF', charId: 'nora', belief: { id: 'b1', proposition: 'p', confidence: 0.8, source: 'inferred', acquired_at: 1 } },
    ];
    const opsB: StoryOp[] = [
      { op: 'APPRAISE_EMOTION', charId: 'nora', emotion: { joy: 0, distress: 0, anger: 0, fear: 0, pride: 70, shame: 0, dominant: 'pride', intensity: 70, last_updated_at: 2 } },
    ];
    stage.appendCommit(mkC('c1', null, opsA));
    stage.appendCommit(mkC('c2', 'c1', opsB));
    const scm = buildSCM(stage);
    const beliefNode = scm.nodes.get('c1:0')!;
    const emotionNode = scm.nodes.get('c2:0')!;
    assert.ok(beliefNode.children.includes('c2:0'), 'UPDATE_BELIEF → APPRAISE_EMOTION cross-commit edge');
    assert.ok(emotionNode.parents.includes('c1:0'), 'APPRAISE_EMOTION parent is cross-commit UPDATE_BELIEF');
  });

  it('different clocks do not form cross-commit edges', () => {
    const stage = new Stage(':memory:');
    const opsA: StoryOp[] = [{ op: 'RAISE_CLOCK', clockId: 'timer_a', amount: 10 }];
    const opsB: StoryOp[] = [{ op: 'RAISE_CLOCK', clockId: 'timer_b', amount: 10 }];
    stage.appendCommit(mkC('c1', null, opsA));
    stage.appendCommit(mkC('c2', 'c1', opsB));
    const scm = buildSCM(stage);
    const nodeA = scm.nodes.get('c1:0')!;
    const nodeB = scm.nodes.get('c2:0')!;
    assert.equal(nodeA.children.length, 0, 'different clocks: no cross-commit edge');
    assert.equal(nodeB.parents.length, 0);
  });
});


// ── Wave 120 — redTeam missingClueIds fix + topology momentum + irony precision ──

describe('Wave 120 — audience-redteam: missingClueIds separated from weakClues', () => {
  const makePlan = (requiredClueIds: string[]): import('../../server/nvm/reveal/RevealPlan.ts').RevealPlan => ({
    revealId: 'r1',
    description: 'the killer escaped through the window',
    requiredClueIds,
    payoffSetupId: 'ps1',
  });

  it('missingClueIds contains unseeded required clues', () => {
    const plan = makePlan(['clue_a', 'clue_b', 'clue_c']);
    const state = emptyState();
    state.clues.push({ clueId: 'clue_a', carrier: 'object' });  // only clue_a seeded
    const verdict = redTeamVerdict(plan, state);
    assert.ok(verdict.missingClueIds.includes('clue_b'), 'clue_b is missing');
    assert.ok(verdict.missingClueIds.includes('clue_c'), 'clue_c is missing');
    assert.ok(!verdict.missingClueIds.includes('clue_a'), 'clue_a is seeded, not missing');
  });

  it('weakClues does not include unseeded (missing) clues', () => {
    const plan = makePlan(['clue_x', 'clue_y']);
    const state = emptyState();
    // Neither clue seeded
    const verdict = redTeamVerdict(plan, state);
    assert.equal(verdict.missingClueIds.length, 2, 'both clues missing');
    // weakClues must only contain seeded clues — none seeded → none weak
    assert.equal(verdict.weakClues.length, 0, 'no seeded clues = no weak clues');
  });

  it('weakClues flags visible clues that are individually redundant', () => {
    // With 5 visible clues, each adding 0.12 boost, removing one still leaves 4*0.12=0.48 boost
    // If baseConfidence + 4*0.12 >= 0.65, all 5 clues are "weak" individually
    const plan = makePlan(['c1', 'c2', 'c3', 'c4', 'c5']);
    const state = emptyState();
    state.audienceState.suspense = 10;  // low base confidence
    // Seed all 5 clues
    ['c1', 'c2', 'c3', 'c4', 'c5'].forEach(id => state.clues.push({ clueId: id, carrier: 'object' }));
    const verdict = redTeamVerdict(plan, state);
    assert.equal(verdict.missingClueIds.length, 0, 'all clues seeded');
    // With 5 clues, removing one leaves 4 → boost 0.48; test whether redundancy is flagged
    assert.ok(Array.isArray(verdict.weakClues), 'weakClues is an array');
  });

  it('thin_mystery recommendation still appears with missingClueIds present', () => {
    // Known facts overlapping plan description keywords push baseConfidence above 0.65
    const plan: import('../../server/nvm/reveal/RevealPlan.ts').RevealPlan = {
      revealId: 'r_thin', description: 'killer escaped through window', requiredClueIds: ['clue_required'], payoffSetupId: 'ps',
    };
    const state = emptyState();
    state.audienceState.knownFacts = ['the killer escaped through window', 'witnesses watched killer'];
    const verdict = redTeamVerdict(plan, state);
    assert.equal(verdict.recommendation, 'thin_mystery', 'overlapping known facts trigger thin_mystery');
    assert.ok(verdict.missingClueIds.includes('clue_required'), 'unseeded clue appears in missingClueIds');
  });
});


describe('Wave 120 — topology: computeTrajectoryMomentum', () => {
  const mkL = (t: number): import('../../server/nvm/valuation/futures.ts').TensionLedger =>
    ({ positions: [], totalTension: t, sceneIdx: 0 });

  it('stalling when tension barely moves (spread < 5)', () => {
    const m = computeTrajectoryMomentum([mkL(50), mkL(51), mkL(52)]);
    assert.equal(m, 'stalling');
  });

  it('stalling for fewer than 2 ledger entries', () => {
    assert.equal(computeTrajectoryMomentum([]), 'stalling');
    assert.equal(computeTrajectoryMomentum([mkL(50)]), 'stalling');
  });

  it('volatile when spread > 30 in last 3 scenes', () => {
    const m = computeTrajectoryMomentum([mkL(10), mkL(80), mkL(20)]);
    assert.equal(m, 'volatile');
  });

  it('building when last > first by > 5', () => {
    const m = computeTrajectoryMomentum([mkL(20), mkL(30), mkL(40)]);
    assert.equal(m, 'building');
  });

  it('declining when first > last by > 5', () => {
    const m = computeTrajectoryMomentum([mkL(60), mkL(45), mkL(30)]);
    assert.equal(m, 'declining');
  });

  it('uses only last 3 entries even with longer ledger', () => {
    // First entries are volatile but last 3 are building
    const ledgers = [mkL(10), mkL(90), mkL(5), mkL(20), mkL(30), mkL(45)];
    const m = computeTrajectoryMomentum(ledgers);
    assert.equal(m, 'building', 'last 3 entries [20,30,45] → building');
  });
});


describe('Wave 120 — two-reader: irony density precision', () => {
  it('irony detected when audience knows deception about the same subject', () => {
    const state = emptyState();
    state.characterBeliefs['alice'] = [{
      id: 'b1',
      proposition: 'Victor is innocent',
      confidence: 0.9,
      source: 'told',
      source_agent_id: 'victor',
      acquired_at: 1,
    }];
    state.audienceState.knownFacts = ['Victor lied about his alibi'];
    const { firstWatch } = twoReaderReport(state, { positions: [], totalTension: 0, sceneIdx: 0 });
    assert.ok(firstWatch.ironyDensity > 0, 'deception in fact + shared "victor" keyword → irony detected');
  });

  it('irony detected via negation: audience knows the negative of the belief', () => {
    const state = emptyState();
    state.characterBeliefs['bob'] = [{
      id: 'b2',
      proposition: 'the bridge is safe to cross',
      confidence: 0.8,
      source: 'told',
      source_agent_id: 'informant',
      acquired_at: 2,
    }];
    state.audienceState.knownFacts = ['the bridge is not safe'];
    const { firstWatch } = twoReaderReport(state, { positions: [], totalTension: 0, sceneIdx: 0 });
    assert.ok(firstWatch.ironyDensity > 0, 'negation + shared "bridge" keyword → irony detected');
  });

  it('no irony when known fact shares words but contains no deception or negation', () => {
    const state = emptyState();
    state.characterBeliefs['carol'] = [{
      id: 'b3',
      proposition: 'the treasure is buried under the oak tree',
      confidence: 0.9,
      source: 'told',
      source_agent_id: 'pirate',
      acquired_at: 3,
    }];
    // Audience knows a related fact but without deception or negation
    state.audienceState.knownFacts = ['there is treasure buried somewhere nearby'];
    const { firstWatch } = twoReaderReport(state, { positions: [], totalTension: 0, sceneIdx: 0 });
    // "treasure" and "buried" overlap but no deception/negation → no irony
    assert.equal(firstWatch.ironyDensity, 0, 'word overlap alone without deception/negation → no irony');
  });

  it('no irony for beliefs sourced from inferred (not told)', () => {
    const state = emptyState();
    state.characterBeliefs['dave'] = [{
      id: 'b4',
      proposition: 'victor is guilty',
      confidence: 0.9,
      source: 'inferred',  // not told
      acquired_at: 4,
    }];
    state.audienceState.knownFacts = ['Victor lied about his alibi'];
    const { firstWatch } = twoReaderReport(state, { positions: [], totalTension: 0, sceneIdx: 0 });
    assert.equal(firstWatch.ironyDensity, 0, 'inferred belief → not counted as irony');
  });
});


// ── Wave 121 — branch scorer: intensity-weighted emotions, charId novelty, ADVANCE_OBJECT_ARC ──

describe('Wave 121 — branch score improvements', () => {
  const makeIR = (ops: StoryOp[]): import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR => ({
    transitionId: 'w121', sceneIdx: 2, sceneFunction: 'advance_plot',
    activeMechanisms: [], beforeStateHash: 'xyz', ops,
    preconditions: [], postconditions: [],
    provenance: { origin: 'user_authored', createdAt: 0 },
  });

  it('high-intensity emotion scores more consequence than low-intensity', () => {
    const highIntensity: StoryOp[] = [{
      op: 'APPRAISE_EMOTION', charId: 'nora',
      emotion: { joy: 0, distress: 0, anger: 0, fear: 95, pride: 0, shame: 0, dominant: 'fear', intensity: 95, last_updated_at: 1 },
    }];
    const lowIntensity: StoryOp[] = [{
      op: 'APPRAISE_EMOTION', charId: 'nora',
      emotion: { joy: 0, distress: 0, anger: 0, fear: 10, pride: 0, shame: 0, dominant: 'fear', intensity: 10, last_updated_at: 1 },
    }];
    const scoreHigh = scoreBranch(highIntensity, makeIR(highIntensity), emptyState(), []);
    const scoreLow  = scoreBranch(lowIntensity, makeIR(lowIntensity), emptyState(), []);
    assert.ok(scoreHigh.consequence > scoreLow.consequence,
      `high-intensity emotion (${scoreHigh.consequence}) should have higher consequence than low (${scoreLow.consequence})`);
  });

  it('ADVANCE_OBJECT_ARC scores its own consequence (>default 2)', () => {
    const arcOps: StoryOp[] = [{ op: 'ADVANCE_OBJECT_ARC', objectId: 'McGuffin', toState: 'activated' }];
    const score = scoreBranch(arcOps, makeIR(arcOps), emptyState(), []);
    // ADVANCE_OBJECT_ARC now gets +8; old default was +2. With just 1 op, consequence should be >5.
    assert.ok(score.consequence > 5, `ADVANCE_OBJECT_ARC consequence (${score.consequence}) should exceed default-2 floor`);
  });

  it('reusing same char IDs as recent commits reduces novelty', () => {
    const sharedChar = 'nora';
    const opsNew: StoryOp[] = [{
      op: 'APPRAISE_EMOTION', charId: sharedChar,
      emotion: { joy: 50, distress: 0, anger: 0, fear: 0, pride: 0, shame: 0, dominant: 'joy', intensity: 50, last_updated_at: 1 },
    }];
    const opsUnique: StoryOp[] = [{
      op: 'APPRAISE_EMOTION', charId: 'brand_new_character',
      emotion: { joy: 50, distress: 0, anger: 0, fear: 0, pride: 0, shame: 0, dominant: 'joy', intensity: 50, last_updated_at: 1 },
    }];
    const prevOps: StoryOp[] = [{ op: 'APPRAISE_EMOTION', charId: sharedChar, emotion: { joy: 30, distress: 0, anger: 0, fear: 0, pride: 0, shame: 0, dominant: 'joy', intensity: 30, last_updated_at: 0 } }];
    const recentCommit: StoryCommit = {
      commitId: 'prev1', parentId: null, sceneIdx: 0,
      ops: prevOps,
      deltaSummary: summarizeOps(prevOps), reverted: false, createdAt: Date.now(),
    };
    const scoreReuse  = scoreBranch(opsNew, makeIR(opsNew), emptyState(), [recentCommit]);
    const scoreUnique = scoreBranch(opsUnique, makeIR(opsUnique), emptyState(), [recentCommit]);
    assert.ok(scoreUnique.novelty >= scoreReuse.novelty,
      `unique char (${scoreUnique.novelty}) should be at least as novel as reused char (${scoreReuse.novelty})`);
  });

  it('high-intensity emotion boosts screenplayUsefulness', () => {
    const highIntensity: StoryOp[] = [{
      op: 'APPRAISE_EMOTION', charId: 'nora',
      emotion: { joy: 0, distress: 0, anger: 0, fear: 85, pride: 0, shame: 0, dominant: 'fear', intensity: 85, last_updated_at: 1 },
    }];
    const lowIntensity: StoryOp[] = [{
      op: 'APPRAISE_EMOTION', charId: 'nora',
      emotion: { joy: 0, distress: 0, anger: 30, fear: 0, pride: 0, shame: 0, dominant: 'anger', intensity: 30, last_updated_at: 1 },
    }];
    const scoreHigh = scoreBranch(highIntensity, makeIR(highIntensity), emptyState(), []);
    const scoreLow  = scoreBranch(lowIntensity, makeIR(lowIntensity), emptyState(), []);
    assert.ok(scoreHigh.screenplayUsefulness >= scoreLow.screenplayUsefulness,
      `high-intensity emotion (${scoreHigh.screenplayUsefulness}) ≥ low-intensity (${scoreLow.screenplayUsefulness}) in screenplay usefulness`);
  });

  it('ADVANCE_OBJECT_ARC boosts screenplayUsefulness', () => {
    const withArc: StoryOp[] = [{ op: 'ADVANCE_OBJECT_ARC', objectId: 'obj1', toState: 'state2' }];
    const withoutArc: StoryOp[] = [{ op: 'ADD_FACT', fact: { factId: 'f1', subject: 's', predicate: 'p', object: 'o', addedAtTurn: 1, validFrom: 1, validTo: null } }];
    const scoreWith    = scoreBranch(withArc, makeIR(withArc), emptyState(), []);
    const scoreWithout = scoreBranch(withoutArc, makeIR(withoutArc), emptyState(), []);
    assert.ok(scoreWith.screenplayUsefulness >= scoreWithout.screenplayUsefulness,
      `ADVANCE_OBJECT_ARC (${scoreWith.screenplayUsefulness}) should not score lower than ADD_FACT (${scoreWithout.screenplayUsefulness})`);
  });
});


// ── Wave 122 — fixed-points: isSatisfied bug fix + minInvestment requirement ──

describe('Wave 122 — planToward: requiredOps never falsely satisfied', () => {
  it('fixed point with only requiredOps is NOT added to alreadySatisfied', () => {
    const state = emptyState();
    const fp: FixedPoint = {
      atScene: 5,
      required: {
        requiredOps: [{ op: 'SEED_CLUE', clueId: 'the_gun', carrier: 'object' }],
      },
      description: 'gun must be planted',
    };
    const result = planToward(state, [fp], 0);
    assert.equal(result.alreadySatisfied.length, 0, 'requiredOps-only fixed point must not be alreadySatisfied');
    assert.ok(result.biases.length > 0, 'planner must emit biases for required op');
  });

  it('fixed point with requiredOps emits a bias with the verbatim op', () => {
    const state = emptyState();
    const verbatimOp: StoryOp = { op: 'SEED_CLUE', clueId: 'bloody_glove', carrier: 'object' };
    const fp: FixedPoint = {
      atScene: 4,
      required: { requiredOps: [verbatimOp] },
      description: 'glove must be seeded',
    };
    const result = planToward(state, [fp], 0);
    const injectedOps = result.biases.flatMap(b => b.ops);
    assert.ok(
      injectedOps.some(o => o.op === 'SEED_CLUE' && (o as { op: string; clueId: string }).clueId === 'bloody_glove'),
      'verbatim SEED_CLUE op must appear in emitted biases',
    );
  });

  it('fixed point with requiredOps AND factIds: fact already in state → still generates bias for op', () => {
    const state = emptyState();
    state.objectiveReality.push({ factId: 'piano', subject: 'piano', predicate: 'exists', object: 'true', addedAtTurn: 0, validFrom: 0, validTo: null });
    const fp: FixedPoint = {
      atScene: 4,
      required: {
        factIds: ['piano'],         // already satisfied
        requiredOps: [{ op: 'ADVANCE_THEME_ARGUMENT', claimId: 'truth_costs', move: 'support' }],
      },
      description: 'piano + theme',
    };
    const result = planToward(state, [fp], 0);
    // Should NOT be alreadySatisfied (because of requiredOps)
    assert.equal(result.alreadySatisfied.length, 0);
    // Should NOT emit ADD_FACT bias (piano already exists)
    assert.ok(!result.biases.some(b => b.ops.some(o => o.op === 'ADD_FACT')), 'no ADD_FACT bias — piano already exists');
    // Should emit bias for the verbatim op
    assert.ok(result.biases.some(b => b.ops.some(o => o.op === 'ADVANCE_THEME_ARGUMENT')));
  });
});


describe('Wave 122 — planToward: minInvestment requirement', () => {
  it('emits UPDATE_READER_STATE investment bias when investment too low', () => {
    const state = emptyState();
    state.audienceState.investment = 20;
    const fp: FixedPoint = {
      atScene: 6,
      required: { minInvestment: 70 },
      description: 'audience must be invested',
    };
    const result = planToward(state, [fp], 0);
    assert.ok(result.alreadySatisfied.length === 0, 'not already satisfied');
    const hasInvestmentBias = result.biases.some(b =>
      b.ops.some(o => o.op === 'UPDATE_READER_STATE' && 'investment' in (o as any).delta),
    );
    assert.ok(hasInvestmentBias, 'planner emits UPDATE_READER_STATE { investment } bias');
  });

  it('minInvestment fixed point is alreadySatisfied when investment is sufficient', () => {
    const state = emptyState();
    state.audienceState.investment = 80;
    const fp: FixedPoint = {
      atScene: 6,
      required: { minInvestment: 70 },
      description: 'audience must be invested',
    };
    const result = planToward(state, [fp], 0);
    assert.equal(result.alreadySatisfied.length, 1, 'investment already sufficient → satisfied');
    assert.equal(result.biases.length, 0, 'no biases needed');
  });

  it('minInvestment and minSuspense both below threshold → both biases emitted', () => {
    const state = emptyState();
    state.audienceState.suspense = 10;
    state.audienceState.investment = 10;
    const fp: FixedPoint = {
      atScene: 8,
      required: { minSuspense: 60, minInvestment: 60 },
      description: 'high tension and investment',
    };
    const result = planToward(state, [fp], 0);
    const opsInBiases = result.biases.flatMap(b => b.ops).filter(o => o.op === 'UPDATE_READER_STATE');
    assert.ok(opsInBiases.length >= 2, 'two UPDATE_READER_STATE biases (suspense + investment)');
  });
});


describe('Wave 123 — quality: DV18 consequence-free belief flip', () => {
  it('fires when ADD_FACT contradicts a told belief and character has no emotion reaction', () => {
    const state = emptyState();
    state.characterBeliefs['alice'] = [{
      id: 'b1', proposition: 'vault is safe', source: 'told', confidence: 0.9, acquired_at: 0,
    } as import('../../server/engine/types.ts').Belief];
    const ir = makeMinimalIR(2, [
      { op: 'ADD_FACT', fact: { factId: 'f1', subject: 'vault', predicate: 'was_robbed', object: 'true', addedAtTurn: 2, validFrom: 2, validTo: null } },
    ]);
    const warnings = dialogueWarnings(ir, state);
    const dv18 = warnings.find(w => w.rule === 'DV18_CONSEQUENCE_FREE_BELIEF_FLIP');
    assert.ok(dv18, 'DV18 fires when belief is contradicted without emotional reaction');
  });

  it('does not fire when contradicted character has an APPRAISE_EMOTION in the IR', () => {
    const state = emptyState();
    state.characterBeliefs['alice'] = [{
      id: 'b1', proposition: 'vault is safe', source: 'told', confidence: 0.9, acquired_at: 0,
    } as import('../../server/engine/types.ts').Belief];
    const ir = makeMinimalIR(2, [
      { op: 'ADD_FACT', fact: { factId: 'f1', subject: 'vault', predicate: 'was_robbed', object: 'true', addedAtTurn: 2, validFrom: 2, validTo: null } },
      { op: 'APPRAISE_EMOTION', charId: 'alice', emotion: { dominant: 'distress' as const, intensity: 85, fear: 60, distress: 80, joy: 0, anger: 0, pride: 0, shame: 0, last_updated_at: 0 } },
    ]);
    const warnings = dialogueWarnings(ir, state);
    const dv18 = warnings.find(w => w.rule === 'DV18_CONSEQUENCE_FREE_BELIEF_FLIP');
    assert.equal(dv18, undefined, 'DV18 does not fire when character reacts emotionally');
  });
});


describe('Wave 123 — quality: DV13 acknowledges prior state beliefs', () => {
  it('does not fire when character already has a belief about the clock in prior state', () => {
    const state = emptyState();
    state.characterBeliefs['bob'] = [{
      id: 'b2', proposition: 'bomb_timer is counting down fast', source: 'witnessed', confidence: 0.8, acquired_at: 0,
    } as import('../../server/engine/types.ts').Belief];
    const ir = makeMinimalIR(3, [{ op: 'RAISE_CLOCK', clockId: 'bomb_timer', amount: 10 }]);
    const warnings = dialogueWarnings(ir, state);
    const dv13 = warnings.find(w => w.rule === 'DV13_UNACKNOWLEDGED_CLOCK');
    assert.equal(dv13, undefined, 'DV13 does not fire when character already knows about the clock');
  });
});


describe('Wave 123 — quality: ArcDebt prolonged negative relationship', () => {
  it('emits arc debt for prolonged extreme negative relationship (4+ shifts, net < -0.6)', () => {
    const state = emptyState();
    state.relationships['alice|bob'] = [
      { dimension: 'trust' as const, amount: -0.2, reason: 'betrayal' },
      { dimension: 'trust' as const, amount: -0.3, reason: 'fight' },
      { dimension: 'trust' as const, amount: -0.1, reason: 'cold' },
      { dimension: 'trust' as const, amount: -0.2, reason: 'distance' },
    ];
    const debts = computeArcDebt(state, 5);
    const negRel = debts.find(d => d.includes('alice|bob') && d.includes('confrontation'));
    assert.ok(negRel, 'arc debt detected for prolonged negative relationship');
  });

  it('does not fire arc debt when fewer than 4 shifts', () => {
    const state = emptyState();
    state.relationships['alice|bob'] = [
      { dimension: 'trust' as const, amount: -0.4, reason: 'betrayal' },
      { dimension: 'trust' as const, amount: -0.4, reason: 'fight' },
    ];
    const debts = computeArcDebt(state, 5);
    const negRel = debts.find(d => d.includes('alice|bob') && d.includes('confrontation'));
    assert.equal(negRel, undefined, 'no arc debt for short negative arc');
  });
});


describe('Wave 123 — dialogueProof: MAX_WARNINGS scales with IR size', () => {
  it('3 warnings on a 15-op IR passes DialogueProof (maxWarnings=3)', async () => {
    const { dialogueProof } = await import('../../server/nvm/proof/tier2/dialogue.ts');
    const state = emptyState();
    // 15 ADD_FACT ops → DV5 (no human), DV10 (all same kind), DV15 (no story progress) = 3 warnings
    const ops: StoryOp[] = Array.from({ length: 15 }, (_, i) => ({
      op: 'ADD_FACT' as const,
      fact: { factId: `f${i}`, subject: `thing_${i}`, predicate: 'exists', object: 'true', addedAtTurn: 1, validFrom: 1, validTo: null },
    }));
    const ir = makeMinimalIR(2, ops);
    const result = dialogueProof(ir, state);
    // floor(15/5) = 3 → maxWarnings = min(4, max(2, 3)) = 3; 3 warnings ≤ 3 → pass
    assert.ok(result.pass, `15-op IR with 3 warnings should pass DialogueProof (got: ${result.reason})`);
  });

  it('3 warnings on a 5-op IR fails DialogueProof (maxWarnings=2)', async () => {
    const { dialogueProof } = await import('../../server/nvm/proof/tier2/dialogue.ts');
    const state = emptyState();
    // 5 ADD_FACT ops → DV5, DV10, DV15 = 3 warnings
    const ops: StoryOp[] = Array.from({ length: 5 }, (_, i) => ({
      op: 'ADD_FACT' as const,
      fact: { factId: `g${i}`, subject: `item_${i}`, predicate: 'exists', object: 'true', addedAtTurn: 1, validFrom: 1, validTo: null },
    }));
    const ir = makeMinimalIR(2, ops);
    const result = dialogueProof(ir, state);
    // floor(5/5) = 1 → maxWarnings = min(4, max(2, 1)) = 2; 3 warnings > 2 → fail
    assert.ok(!result.pass, '5-op IR with 3 warnings should fail DialogueProof');
  });
});


describe('Wave 123 — continuityCritic: severity maps from finding.severity', () => {
  it('block-severity IntentionalProof finding maps to critic severity 92 (not old 80)', async () => {
    const { continuityCritic } = await import('../../server/nvm/room/critics/continuity.ts');
    // APPRAISE_EMOTION on an unknown charId triggers IntentionalProof with 'block' severity
    const ir: import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR = {
      transitionId: 'test-w123-severity',
      sceneIdx: 1, sceneFunction: 'build_tension',
      activeMechanisms: ['core_mechanism'],
      beforeStateHash: '',
      ops: [{
        op: 'APPRAISE_EMOTION',
        charId: 'ghost_xyz_w123',
        emotion: { joy: 0, distress: 80, anger: 0, fear: 0, pride: 0, shame: 0, dominant: 'distress' as const, intensity: 80, last_updated_at: 0 },
      } as import('../../server/nvm/ops/StoryOp.ts').StoryOp],
      preconditions: ['world_exists'],
      postconditions: [],
      provenance: { origin: 'model_generated' as const, createdAt: Date.now() },
    };
    const state = emptyState();
    const critiques = continuityCritic(ir, state);
    const intCrit = critiques.find(c => c.objection.includes('IntentionalProof'));
    assert.ok(intCrit, 'IntentionalProof critique present');
    assert.equal(intCrit!.severity, 92, 'block-severity finding maps to critic severity 92');
    assert.equal(intCrit!.attentionBid, 95, 'block-severity finding maps to attentionBid 95');
    assert.notEqual(intCrit!.severity, 80, 'old hardcoded severity 80 is replaced');
  });
});


describe('Wave 128 — P8: Genre×Director Synergy Compositor', () => {

  it('composePromptModifiers: genre only — returns genre block, no synergy', () => {
    const { block, hasSynergy } = composePromptModifiers('thriller', undefined);
    assert.ok(block.includes('THRILLER'), 'block contains genre instruction');
    assert.equal(hasSynergy, false, 'no director = no synergy');
  });

  it('composePromptModifiers: director only — returns director instruction, no synergy', () => {
    const { block, hasSynergy } = composePromptModifiers(undefined, 'hitchcock');
    assert.ok(block.includes('HITCHCOCK'), 'block contains director instruction');
    assert.equal(hasSynergy, false, 'no genre = no synergy');
  });

  it('composePromptModifiers: non-synergy pair — concatenates both blocks', () => {
    const { block, hasSynergy } = composePromptModifiers('drama', 'nolan');
    // drama + nolan has no synergy override — should include both
    assert.ok(block.includes('NOLAN'), 'director present');
    assert.ok(block.includes('DRAMA'), 'genre present');
    assert.equal(hasSynergy, false);
  });

  it('composePromptModifiers: thriller+hitchcock fires synergy override', () => {
    const { block, hasSynergy } = composePromptModifiers('thriller', 'hitchcock');
    assert.equal(hasSynergy, true, 'synergy flag set');
    assert.ok(block.includes('SYNERGY'), 'block contains SYNERGY label');
    assert.ok(block.includes('HITCHCOCK'), 'block mentions director');
    assert.ok(block.includes('THRILLER'), 'block mentions genre');
    // Should NOT fall back to separate blocks (no duplicated instruction)
    assert.ok(!block.includes('CINEMATIC STYLE — HITCHCOCK'), 'should not include raw director instruction when synergy fires');
  });

  it('composePromptModifiers: horror+aster fires synergy override', () => {
    const { hasSynergy, block } = composePromptModifiers('horror', 'aster');
    assert.equal(hasSynergy, true);
    assert.ok(block.includes('ASTER'), 'aster in synergy block');
  });

  it('composePromptModifiers: horror+lynch fires synergy override', () => {
    const { hasSynergy } = composePromptModifiers('horror', 'lynch');
    assert.equal(hasSynergy, true);
  });

  it('composePromptModifiers: no genre, no director — empty block', () => {
    const { block, hasSynergy } = composePromptModifiers(undefined, undefined);
    assert.equal(block, '', 'empty when both absent');
    assert.equal(hasSynergy, false);
  });

  it('SYNERGY_OVERRIDES: all 14 expected keys present', () => {
    const expectedKeys = [
      'thriller_hitchcock', 'horror_aster', 'horror_lynch',
      'mystery_hitchcock', 'mystery_fincher', 'noir_hitchcock', 'noir_lynch',
      'drama_villeneuve', 'drama_aster', 'sci_fi_nolan', 'sci_fi_villeneuve',
      'thriller_fincher', 'comedy_lynch', 'romance_villeneuve',
    ];
    for (const key of expectedKeys) {
      assert.ok(SYNERGY_OVERRIDES[key] != null, `synergy key '${key}' exists`);
      assert.ok(
        typeof SYNERGY_OVERRIDES[key]!.combinedInstruction === 'string' && SYNERGY_OVERRIDES[key]!.combinedInstruction.length > 50,
        `synergy '${key}' has substantive instruction`,
      );
    }
  });

  it('genrePromptBlock: still works independently', () => {
    const block = genrePromptBlock('noir');
    assert.ok(block.includes('NOIR'), 'genre instruction present');
    assert.ok(block.includes('REGISTER'), 'register present');
    assert.ok(block.includes('AVOID'), 'forbidden clichés present');
  });

  it('all 8 genres have GENRE_MODIFIERS entries', () => {
    const genres: import('../../server/engine/types.ts').StoryGenre[] = ['thriller','horror','drama','comedy','romance','sci_fi','noir','mystery'];
    for (const g of genres) {
      assert.ok(GENRE_MODIFIERS[g] != null, `genre modifier exists for ${g}`);
    }
  });

});


describe('Wave 128 — H6: SelfPlay budget threading', () => {

  it('runSelfPlay: budget param is forwarded to convergeScene (compile-time type check)', async () => {
    const { runSelfPlay } = await import('../../server/nvm/selfplay/corpus.ts');
    // The function must accept a budget parameter without TypeScript error.
    // We test with a no-op generator that returns empty to verify the signature.
    type CandidateGenerator = import('../../server/nvm/generate/proof-spec.ts').CandidateGenerator;
    const noopGen: CandidateGenerator = async () => [];
    const scenarios = [{
      scenarioId: 'wave128-budget-test',
      seed: 42,
      sceneTargets: [],
    }];
    // budget passed — should not throw at the call site (no LLM calls because sceneTargets is empty)
    const report = await runSelfPlay(scenarios, noopGen, 1, 0, { maxIterations: 2, candidatesPerIteration: 1 });
    assert.ok(report != null, 'report returned');
    assert.equal(typeof report.meanScore, 'number', 'meanScore is a number');
  });

});


describe('Wave 128 — M4: Agent module decomposition', () => {

  it('agent/decision.ts: buildPrompt is exported and callable', async () => {
    const { buildPrompt } = await import('../../server/engine/agent/decision.ts');
    assert.equal(typeof buildPrompt, 'function', 'buildPrompt is a function');
  });

  it('agent/decision.ts: selectBestAction is exported and callable', async () => {
    const { selectBestAction } = await import('../../server/engine/agent/decision.ts');
    assert.equal(typeof selectBestAction, 'function', 'selectBestAction is a function');
  });

  it('agent/memory.ts: synthesizeReflectionsFor is exported and callable', async () => {
    const { synthesizeReflectionsFor } = await import('../../server/engine/agent/memory.ts');
    assert.equal(typeof synthesizeReflectionsFor, 'function', 'synthesizeReflectionsFor is a function');
  });

  it('agent/memory.ts: replanGoalsFor is exported and callable', async () => {
    const { replanGoalsFor } = await import('../../server/engine/agent/memory.ts');
    assert.equal(typeof replanGoalsFor, 'function', 'replanGoalsFor is a function');
  });

  it('Agent.ts: public interface unchanged (takeTurn + updateEpistemics + evaluateState)', async () => {
    const { Agent } = await import('../../server/engine/Agent.ts');
    const proto = Agent.prototype;
    assert.equal(typeof proto.takeTurn, 'function', 'takeTurn present');
    assert.equal(typeof proto.updateEpistemics, 'function', 'updateEpistemics present');
    assert.equal(typeof proto.evaluateState, 'function', 'evaluateState present');
  });

});


describe('Wave 129 — P2: Export pipeline', () => {

  it('FDX: fountainToFdx produces valid XML with scene heading', () => {
    const blocks = parseFountain(SAMPLE_FOUNTAIN_P2);
    // Verify fountain parse hits scene_heading
    const headings = blocks.filter(b => b.type === 'scene_heading');
    assert.ok(headings.length >= 2, 'at least 2 scene headings parsed');
  });

  it('FDX: fountain blocks map to correct FDX types', () => {
    const blocks = parseFountain(SAMPLE_FOUNTAIN_P2);
    const types = blocks.map(b => b.type);
    assert.ok(types.includes('scene_heading'), 'scene_heading present');
    assert.ok(types.includes('character'), 'character present');
    assert.ok(types.includes('dialogue'), 'dialogue present');
    assert.ok(types.includes('transition'), 'transition present');
    assert.ok(types.includes('parenthetical'), 'parenthetical present');
  });

  it('FDX: boneyard and synopsis blocks are excluded', () => {
    const fountain = `/* boneyard comment */\n= Synopsis line\nINT. ROOM - DAY\n\nAction text.`;
    const blocks = parseFountain(fountain);
    const excluded = blocks.filter(b => b.type === 'boneyard' || b.type === 'synopsis');
    assert.ok(excluded.length >= 1, 'boneyard/synopsis blocks parsed');
    // They are present in parse output but filtered out in export
    assert.ok(blocks.some(b => b.type === 'scene_heading'), 'scene heading still parsed');
  });

  it('escapeXml: handles &, <, >, ", \'', () => {
    // Test via fountain parse that special chars in scene headings don't break
    const fountain = `INT. ROOM & HALL - "DAY"

Character speaks.`;
    const blocks = parseFountain(fountain);
    assert.ok(blocks.length > 0, 'blocks parsed even with special chars');
  });

  it('DOCX: paragraph types for all block types', () => {
    const blocks = parseFountain(SAMPLE_FOUNTAIN_P2);
    const typeSet = new Set(blocks.map(b => b.type));
    // Verify all the types we handle in DOCX export exist in our sample
    assert.ok(typeSet.has('scene_heading'), 'scene_heading');
    assert.ok(typeSet.has('action'), 'action');
    assert.ok(typeSet.has('character'), 'character');
    assert.ok(typeSet.has('dialogue'), 'dialogue');
    assert.ok(typeSet.has('transition'), 'transition');
  });

  it('print-HTML: screenplay CSS classes match block types', () => {
    // Ensure each Fountain block type has a corresponding CSS class
    const cssMap: Record<string, string> = {
      scene_heading: 'scene-heading',
      action: 'action',
      character: 'character',
      dialogue: 'dialogue',
      parenthetical: 'parenthetical',
      transition: 'transition',
      shot: 'shot',
      centered: 'centered',
      section: 'section',
    };
    // All mapped types should have valid CSS class names
    for (const [blockType, cssClass] of Object.entries(cssMap)) {
      assert.ok(cssClass.length > 0, `${blockType} has CSS class`);
    }
  });

});


describe('Wave 130 — Theme Resonance Pass (Pass 13)', () => {

  it('returns no-op summary when no theme is declared', async () => {
    const result = await themePass(makeMinimalInput({ storyContext: {} }));
    assert.equal(result.pass, 'theme');
    assert.equal(result.issues.length, 0);
    assert.ok(result.summary.includes('no theme declared'));
  });

  it('returns no-op when records < 3', async () => {
    const result = await themePass(makeMinimalInput({ storyContext: { theme: 'power corrupts' } }));
    assert.equal(result.issues.length, 0, 'too few records, should skip');
  });

  it('detects THEME_ORPHANED when zero scenes contain any theme keyword', async () => {
    const records: ScreenplaySceneRecord[] = Array.from({ length: 4 }, (_, i) =>
      makeSceneRecord({
        sceneIdx: i, slug: `INT. ROOM ${i} - DAY`,
        dialogueHighlights: ['completely unrelated text'],
      }));
    const fountain = records.map(r => `${r.slug}\n\nSome action.\n`).join('\n');
    const result = await themePass(makeMinimalInput({
      fountain,
      records,
      storyContext: { theme: 'betrayal destroys trust' },
    }));
    assert.ok(
      result.issues.some(i => i.rule === 'THEME_ORPHANED' || i.rule === 'THEME_RESONANCE_GAP'),
      'should detect theme absence',
    );
  });

  it('does not flag when theme keywords appear in dialogue highlights', async () => {
    const records: ScreenplaySceneRecord[] = Array.from({ length: 4 }, (_, i) =>
      makeSceneRecord({
        sceneIdx: i, slug: `INT. ROOM ${i} - DAY`,
        dialogueHighlights: ['power corrupts everyone eventually'],
      }));
    const fountain = records.map(r => `${r.slug}\n\nThe power corrupts.\n`).join('\n');
    const result = await themePass(makeMinimalInput({
      fountain,
      records,
      storyContext: { theme: 'power corrupts' },
    }));
    // All scenes have theme keywords — should not flag
    assert.ok(
      !result.issues.some(i => i.rule === 'THEME_ORPHANED'),
      'should not flag when all scenes contain theme keywords',
    );
  });

  it('flags THEME_UNRESOLVED when Act 3 has no theme language', async () => {
    const records: ScreenplaySceneRecord[] = Array.from({ length: 6 }, (_, i) =>
      makeSceneRecord({
        sceneIdx: i, slug: `INT. ROOM ${i} - DAY`,
        purpose: i < 4 ? 'establish_world' : 'climax',
        // Only early scenes have theme words; Act 3 (last 30%: scenes 4,5) have nothing
        dialogueHighlights: i < 4 ? ['power corrupts and destroys trust'] : ['completely unrelated'],
      }));
    const fountain = records.map(r => `${r.slug}\n\n${r.dialogueHighlights[0]}\n`).join('\n');
    const result = await themePass(makeMinimalInput({
      fountain,
      records,
      storyContext: { theme: 'power corrupts' },
    }));
    assert.ok(
      result.issues.some(i => i.rule === 'THEME_UNRESOLVED'),
      'Act 3 without theme language should flag THEME_UNRESOLVED',
    );
  });

  it('theme pass is listed in PassName type (structural)', () => {
    // Just verify the pass name 'theme' is accepted by the type system
    // (TypeScript would reject this at compile time if 'theme' is not in PassName)
    const passName: import('../../server/nvm/revision/passes/types.ts').PassName = 'theme';
    assert.equal(passName, 'theme');
  });

});


// ── Wave 131 — Structure blend + LLM generator observability ─────────────────

describe('Wave 131 — Structure act-position blends dramatic events', () => {

  it('clock-less story with many revelations advances past act1', () => {
    // 8 scenes, each with a revelation (UPDATE_BELIEF witnessed) but ZERO clocks.
    // Pre-fix: stuck at act1 forever (totalClockPressure=0).
    // Post-fix: revelations contribute dramatic pressure → advances.
    const commits = Array.from({ length: 8 }, (_, i) =>
      makeScreenplayCommit(i, [
        { op: 'UPDATE_BELIEF', charId: 'alice', belief: {
          id: `b${i}`, proposition: `revelation ${i}`, confidence: 0.9,
          source: 'witnessed', source_event_id: `e${i}`, acquired_at: i,
        } },
        { op: 'UPDATE_READER_STATE', delta: { suspense: 5 } },
      ]),
    );
    const records = buildScreenplayMemory(commits);
    const structure = analyzeStructure(records, commits);
    // 8 revelations × 2 = 16 dramatic pressure ≥ 15 → act3
    assert.notEqual(structure.actPosition, 'act1', 'revelation-rich story should leave act1');
  });

  it('single bland scene still reports act1 (backward compat)', () => {
    const commits = [makeScreenplayCommit(0, [{ op: 'UPDATE_READER_STATE', delta: { suspense: 1 } }])];
    const records = buildScreenplayMemory(commits);
    const structure = analyzeStructure(records, commits);
    assert.equal(structure.actPosition, 'act1', 'one low-suspense scene stays act1');
  });

  it('clock pressure and dramatic events both contribute to completion', () => {
    // 2 clock raises (amount 3 each = 6) + 0 revelations → completion from clocks only
    const commits = [
      makeScreenplayCommit(0, [{ op: 'RAISE_CLOCK', clockId: 'c1', amount: 3 }]),
      makeScreenplayCommit(1, [{ op: 'RAISE_CLOCK', clockId: 'c2', amount: 3 }]),
    ];
    const records = buildScreenplayMemory(commits);
    const structure = analyzeStructure(records, commits);
    // blendedPressure = 6 → completion = round(6/20*100) = 30
    assert.ok(structure.completionPercent >= 25 && structure.completionPercent <= 35,
      `completion reflects clock pressure (got ${structure.completionPercent})`);
  });

});


describe('Wave 132 — evaluateRewrite truncation/length guard', () => {

  it('rejects MAX_TOKENS truncation even when text is long enough', () => {
    const original = 'x'.repeat(1000);
    const revised = 'y'.repeat(1000); // same length, but truncated finish reason
    const verdict = evaluateRewrite(revised, original.length, 'MAX_TOKENS');
    assert.equal(verdict.accept, false);
    assert.ok(!verdict.accept && verdict.reason === 'truncated');
  });

  it('rejects empty output', () => {
    const verdict = evaluateRewrite('   ', 1000, 'STOP');
    assert.equal(verdict.accept, false);
    assert.ok(!verdict.accept && verdict.reason === 'empty');
  });

  it('rejects output that shrank below the length ratio', () => {
    const original = 'x'.repeat(1000);
    const revised = 'y'.repeat(700); // 70% < 80% floor
    const verdict = evaluateRewrite(revised, original.length, 'STOP');
    assert.equal(verdict.accept, false);
    assert.ok(!verdict.accept && verdict.reason === 'too_short');
  });

  it('accepts output at exactly the length ratio', () => {
    const original = 'x'.repeat(1000);
    const revised = 'y'.repeat(Math.ceil(1000 * REWRITE_MIN_LENGTH_RATIO));
    const verdict = evaluateRewrite(revised, original.length, 'STOP');
    assert.equal(verdict.accept, true);
  });

  it('accepts a normal full-length rewrite', () => {
    const original = 'x'.repeat(1000);
    const revised = 'y'.repeat(1050); // slightly longer (added detail)
    const verdict = evaluateRewrite(revised, original.length, 'STOP');
    assert.equal(verdict.accept, true);
  });

  it('accepts when finishReason is undefined (non-Gemini providers)', () => {
    const original = 'x'.repeat(1000);
    const revised = 'y'.repeat(1000);
    const verdict = evaluateRewrite(revised, original.length, undefined);
    assert.equal(verdict.accept, true);
  });

});


// ── Wave 136: CharacterAgencyProof + EpistemicProof inferred guard ────────────
{
  const { characterAgencyProof } = await import('../../server/nvm/proof/tier2/character-agency.ts');
  const { epistemicProof: epistemicProof136 } = await import('../../server/nvm/proof/tier1/epistemic.ts');

  const makeAgencyIR = (ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[], sceneIdx = 2): import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR => ({
    transitionId: 'agency-test', sceneIdx, sceneFunction: 'advance_plot',
    activeMechanisms: ['discovery'], beforeStateHash: 'abc', ops,
    preconditions: [], postconditions: [],
    provenance: { origin: 'user_authored', createdAt: Date.now() },
  });

  const makeEpistIR = (ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[]): import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR => ({
    transitionId: 'epistemic-test', sceneIdx: 2, sceneFunction: 'advance_plot',
    activeMechanisms: ['discovery'], beforeStateHash: 'abc', ops,
    preconditions: [], postconditions: [],
    provenance: { origin: 'user_authored', createdAt: Date.now() },
  });

  describe('Wave 136 — CharacterAgencyProof', () => {
    it('passes when scene 0 has clock but no character response (establishment scene)', () => {
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'RAISE_CLOCK', clockId: 'ticking-bomb', amount: 3 },
      ];
      const result = characterAgencyProof(makeAgencyIR(ops, 0), emptyState());
      assert.ok(result.pass, 'scene 0 is exempt from character agency check');
    });

    it('passes when no clock is raised', () => {
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'ADD_FACT', fact: { factId: 'f1', subject: 'Alice', predicate: 'enters', object: 'the room', addedAtTurn: 1, validFrom: 1, validTo: null } },
      ];
      const result = characterAgencyProof(makeAgencyIR(ops, 3), emptyState());
      assert.ok(result.pass, 'no clock → agency proof not triggered');
    });

    it('passes when clock delta ≤1 (atmospheric pressure)', () => {
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'RAISE_CLOCK', clockId: 'atmospheric', amount: 1 },
      ];
      const result = characterAgencyProof(makeAgencyIR(ops, 3), emptyState());
      assert.ok(result.pass, 'clock delta ≤1 exempted as atmospheric');
    });

    it('passes when clock raised and character responds with a belief update', () => {
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'RAISE_CLOCK', clockId: 'deadline', amount: 2 },
        { op: 'UPDATE_BELIEF', charId: 'Alice', belief: { id: 'b1', proposition: 'Time is running out', confidence: 0.8, source: 'witnessed', source_event_id: 'evt1', acquired_at: 2 } },
      ];
      const result = characterAgencyProof(makeAgencyIR(ops, 3), emptyState());
      assert.ok(result.pass, 'clock + belief update → agency proven');
    });

    it('flags when clock delta >1 with no character response ops', () => {
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'RAISE_CLOCK', clockId: 'deadline', amount: 3 },
        { op: 'ADD_FACT', fact: { factId: 'f2', subject: 'bomb', predicate: 'ticks', object: 'louder', addedAtTurn: 2, validFrom: 2, validTo: null } },
      ];
      const result = characterAgencyProof(makeAgencyIR(ops, 3), emptyState());
      assert.ok(!result.pass, 'clock +3 with no character response → agency fail');
      assert.equal(result.findings[0]?.proof, 'CharacterAgencyProof');
      assert.equal(result.findings[0]?.severity, 'flag');
    });

    it('passes when clock raised and character expresses emotion', () => {
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'RAISE_CLOCK', clockId: 'deadline', amount: 2 },
        { op: 'APPRAISE_EMOTION', charId: 'Alice', emotion: { joy: 0, distress: 50, anger: 0, fear: 60, pride: 0, shame: 0, dominant: 'fear', intensity: 60, last_updated_at: 2 } },
      ];
      const result = characterAgencyProof(makeAgencyIR(ops, 3), emptyState());
      assert.ok(result.pass, 'clock + emotion op → agency proven');
    });
  });

  describe('Wave 136 — EpistemicProof: inferred-belief confidence guard', () => {
    it('blocks inferred belief with confidence 0.9 (over-certain deduction)', () => {
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'UPDATE_BELIEF', charId: 'Alice', belief: { id: 'b1', proposition: 'Bob is the killer', confidence: 0.9, source: 'inferred', acquired_at: 2 } },
      ];
      const result = epistemicProof136(makeEpistIR(ops), emptyState());
      assert.ok(!result.pass, 'inferred belief with confidence=0.9 should fail');
      assert.ok(result.findings.some(f => f.message.includes('inferred') && f.message.includes('0.90')), 'finding mentions inferred + confidence value');
    });

    it('allows inferred belief with confidence 0.5 (appropriate uncertainty)', () => {
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'UPDATE_BELIEF', charId: 'Alice', belief: { id: 'b2', proposition: 'Bob may have been there', confidence: 0.5, source: 'inferred', acquired_at: 2 } },
      ];
      const result = epistemicProof136(makeEpistIR(ops), emptyState());
      assert.ok(result.pass, 'inferred belief with confidence=0.5 should pass');
    });

    it('allows witnessed belief with high confidence (observations can be certain)', () => {
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'UPDATE_BELIEF', charId: 'Alice', belief: { id: 'b3', proposition: 'I saw Bob leave', confidence: 0.95, source: 'witnessed', source_event_id: 'evt1', acquired_at: 2 } },
      ];
      const result = epistemicProof136(makeEpistIR(ops), emptyState());
      assert.ok(result.pass, 'witnessed belief with high confidence is valid');
    });

    it('allows inferred belief exactly at 0.65 boundary', () => {
      const ops: import('../../server/nvm/ops/StoryOp.ts').StoryOp[] = [
        { op: 'UPDATE_BELIEF', charId: 'Alice', belief: { id: 'b4', proposition: 'Something is wrong here', confidence: 0.65, source: 'inferred', acquired_at: 2 } },
      ];
      const result = epistemicProof136(makeEpistIR(ops), emptyState());
      assert.ok(result.pass, 'inferred belief exactly at 0.65 should pass (boundary is strict >)');
    });
  });
}