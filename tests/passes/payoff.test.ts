// Extracted from the former monolithic test.ts (audit M2.1 — split for maintainability).
// payoffPass revision-rule tests. Shared imports/helpers below are duplicated verbatim across every split
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
// Aliased: this file already has its own local makeSceneRecord (below, a pre-existing
// single-argument factory used by earlier waves) — importing under the shared name would collide.
import { makeSceneRecord as makeSharedRecord, buildPlainFountain } from './helpers.ts';

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


  // ── payoffPass PAYOFF_TOO_QUICK now fires correctly ────────────────────────

  it('payoffPass detects PAYOFF_TOO_QUICK when clue planted and resolved in consecutive scenes', async () => {
    const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
    const makeStructure = () => ({
      actPosition: 'act1' as const, completionPercent: 20, totalClockPressure: 0,
      midpointPressure: 0, reversalCount: 0, tightestScene: null,
      avgSuspensePerScene: 0, escalating: false, reversalDensity: 0,
      approachingClimax: false, openClues: 0, revelationCount: 0,
    });
    const records = [
      makeRecord79({ sceneIdx: 0, seededClueIds: ['clue-x'] }),
      makeRecord79({ sceneIdx: 1, payoffSetupIds: ['clue-x'], purpose: 'revelation' }),
      makeRecord79({ sceneIdx: 2 }),
      makeRecord79({ sceneIdx: 3 }),
    ];
    const stub = {
      fountain: 'INT. A - DAY\n\nAction.\n\nINT. B - DAY\n\nResolve.',
      original: 'INT. A - DAY\n\nAction.\n\nINT. B - DAY\n\nResolve.',
      annotations: [], approvedSpans: [],
      structure: makeStructure(),
      records,
    };
    const result = await payoffPass(stub as import('../../server/nvm/revision/passes/types.ts').PassInput);
    assert.ok(result.issues.some(i => i.rule === 'PAYOFF_TOO_QUICK'), 'PAYOFF_TOO_QUICK should fire for consecutive plant→payoff');
  });


  // ── Wave 154: Payoff pass enhancements ────────────────────────────────────
  describe('Wave 154 — payoffPass: clustered payoffs, premature resolution, setup gap', async () => {
    const baseStructure = {
      actPosition: 'act3' as const, completionPercent: 85, totalClockPressure: 5,
      midpointPressure: 2, reversalCount: 1, tightestScene: 6, avgSuspensePerScene: 1.5,
      escalating: true, reversalDensity: 0.1, approachingClimax: true,
      openClues: 0, revelationCount: 1,
    };
    const makeRec = (idx: number, override: Partial<any> = {}): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      purpose: 'dialogue', dramaticTurn: 'nothing', revelation: null,
      clockRaised: false, clockDelta: 0, emotionalShift: 'neutral', suspenseDelta: 1,
      dialogueHighlights: [], unresolvedClues: [], seededClueIds: [],
      payoffSetupIds: [], visualBeats: [], relationshipShifts: [],
      ...override,
    });
    const blankFountain = (n: number) =>
      Array.from({ length: n }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join('');

    it('payoffPass detects CLUSTERED_PAYOFFS when 3+ setups resolve in one scene', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      const records = [
        makeRec(0, { seededClueIds: ['c1'] }),
        makeRec(1, { seededClueIds: ['c2'] }),
        makeRec(2, { seededClueIds: ['c3'] }),
        makeRec(3),
        makeRec(4),
        makeRec(5),
        makeRec(6),
        makeRec(7, { payoffSetupIds: ['c1', 'c2', 'c3'] }), // all 3 pay off here
      ];
      const result = await payoffPass({
        fountain: blankFountain(8), original: blankFountain(8),
        records: records as any, structure: baseStructure as any, annotations: [], approvedSpans: [],
      });
      const clustered = result.issues.filter(i => i.rule === 'CLUSTERED_PAYOFFS');
      assert.ok(clustered.length >= 1, 'Should detect CLUSTERED_PAYOFFS for 3+ payoffs in one scene');
      assert.ok(clustered[0].severity === 'minor');
    });

    it('payoffPass detects PAYOFF_BEFORE_CLIMAX when all clues resolve early', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      // 10 scenes, climax zone starts at scene 8. All payoffs land by scene 5.
      const records = [
        makeRec(0, { seededClueIds: ['c1'] }),
        makeRec(1, { seededClueIds: ['c2'] }),
        makeRec(2),
        makeRec(3, { payoffSetupIds: ['c1'] }),
        makeRec(4),
        makeRec(5, { payoffSetupIds: ['c2'] }), // last payoff well before climax zone
        makeRec(6),
        makeRec(7),
        makeRec(8),
        makeRec(9),
      ];
      const result = await payoffPass({
        fountain: blankFountain(10), original: blankFountain(10),
        records: records as any, structure: baseStructure as any, annotations: [], approvedSpans: [],
      });
      const premature = result.issues.filter(i => i.rule === 'PAYOFF_BEFORE_CLIMAX');
      assert.ok(premature.length >= 1, 'Should detect PAYOFF_BEFORE_CLIMAX when all loops close early');
      assert.ok(premature[0].severity === 'major');
    });

    it('payoffPass detects SETUP_FRONT_GAP when no clue planted in Act 1', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      // 8 scenes, Act 1 ends ~scene 2. Earliest plant at scene 4.
      const records = [
        makeRec(0),
        makeRec(1),
        makeRec(2),
        makeRec(3),
        makeRec(4, { seededClueIds: ['c1'] }), // first plant — too late
        makeRec(5, { seededClueIds: ['c2'] }),
        makeRec(6),
        makeRec(7),
      ];
      const result = await payoffPass({
        fountain: blankFountain(8), original: blankFountain(8),
        records: records as any,
        structure: { ...baseStructure, completionPercent: 60, actPosition: 'act2b' as const } as any,
        annotations: [], approvedSpans: [],
      });
      const gap = result.issues.filter(i => i.rule === 'SETUP_FRONT_GAP');
      assert.ok(gap.length >= 1, 'Should detect SETUP_FRONT_GAP when no clue planted in Act 1');
      assert.ok(gap[0].severity === 'minor');
    });

    it('payoffPass does NOT fire SETUP_FRONT_GAP when a clue is planted early', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      const records = [
        makeRec(0, { seededClueIds: ['c1'] }), // early plant
        makeRec(1),
        makeRec(2),
        makeRec(3),
        makeRec(4, { seededClueIds: ['c2'] }),
        makeRec(5),
        makeRec(6),
        makeRec(7),
      ];
      const result = await payoffPass({
        fountain: blankFountain(8), original: blankFountain(8),
        records: records as any,
        structure: { ...baseStructure, completionPercent: 60, actPosition: 'act2b' as const } as any,
        annotations: [], approvedSpans: [],
      });
      const gap = result.issues.filter(i => i.rule === 'SETUP_FRONT_GAP');
      assert.ok(gap.length === 0, 'Should NOT fire when a clue is planted in Act 1');
    });
  });


  // ── Wave 167: Payoff pass enhancements ────────────────────────────────────
  describe('Wave 167 — payoffPass: payoff-before-setup, setup clustering, payoff rate decline', async () => {
    const makeRec = (idx: number, override: Partial<any> = {}): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      purpose: 'dialogue', dramaticTurn: 'nothing', revelation: null,
      clockRaised: false, clockDelta: 0, emotionalShift: 'neutral', suspenseDelta: 1,
      dialogueHighlights: [], unresolvedClues: [], seededClueIds: [],
      payoffSetupIds: [], visualBeats: [], relationshipShifts: [],
      ...override,
    });
    const blankFountain = (n: number) =>
      Array.from({ length: n }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join('');
    const baseStructure = {
      completionPercent: 50, actPosition: 'act2a' as const,
      openClues: 0, reversalCount: 1, midpointPressure: 2, tightestScene: null,
    };

    // ── PAYOFF_BEFORE_SETUP ──────────────────────────────────────────────────
    it('payoffPass detects PAYOFF_BEFORE_SETUP when payoff precedes setup in timeline', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      // Scene 0 pays off 'gun', but 'gun' isn't seeded until scene 3 — temporal inversion
      const records = [
        makeRec(0, { payoffSetupIds: ['gun'] }),
        makeRec(1),
        makeRec(2),
        makeRec(3, { seededClueIds: ['gun'] }),
        makeRec(4),
        makeRec(5),
      ];
      const result = await payoffPass({
        fountain: blankFountain(6), original: blankFountain(6),
        records: records as any, structure: baseStructure as any,
        annotations: [], approvedSpans: [],
      });
      const before = result.issues.filter(i => i.rule === 'PAYOFF_BEFORE_SETUP');
      assert.ok(before.length >= 1, `Expected PAYOFF_BEFORE_SETUP; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(before[0].severity === 'critical');
    });

    it('payoffPass does NOT fire PAYOFF_BEFORE_SETUP when setup precedes payoff', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      // Scene 1 seeds 'gun', scene 4 pays it off — correct temporal order
      const records = [
        makeRec(0),
        makeRec(1, { seededClueIds: ['gun'] }),
        makeRec(2),
        makeRec(3),
        makeRec(4, { payoffSetupIds: ['gun'] }),
        makeRec(5),
      ];
      const result = await payoffPass({
        fountain: blankFountain(6), original: blankFountain(6),
        records: records as any, structure: baseStructure as any,
        annotations: [], approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'PAYOFF_BEFORE_SETUP'),
        'Should NOT fire when setup precedes payoff in correct order',
      );
    });

    // ── SETUP_CLUSTERING ─────────────────────────────────────────────────────
    it('payoffPass detects SETUP_CLUSTERING when 70%+ of clues are in one act zone', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      // 8 scenes; act2b = scenes 4-5 (50%-75%); 4 clues all planted in scenes 4,5
      const records = [
        makeRec(0), makeRec(1), makeRec(2), makeRec(3),
        makeRec(4, { seededClueIds: ['c1', 'c2'] }),
        makeRec(5, { seededClueIds: ['c3', 'c4'] }),
        makeRec(6), makeRec(7),
      ];
      const result = await payoffPass({
        fountain: blankFountain(8), original: blankFountain(8),
        records: records as any, structure: baseStructure as any,
        annotations: [], approvedSpans: [],
      });
      const clustered = result.issues.filter(i => i.rule === 'SETUP_CLUSTERING');
      assert.ok(clustered.length >= 1, `Expected SETUP_CLUSTERING; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(clustered[0].severity === 'minor');
    });

    it('payoffPass does NOT fire SETUP_CLUSTERING when clues are spread across all acts', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      // 8 scenes; one clue per act zone
      const records = [
        makeRec(0, { seededClueIds: ['c1'] }),  // act1
        makeRec(1), makeRec(2),
        makeRec(3, { seededClueIds: ['c2'] }),  // act2a
        makeRec(4),
        makeRec(5, { seededClueIds: ['c3'] }),  // act2b
        makeRec(6, { seededClueIds: ['c4'] }),  // act3
        makeRec(7),
      ];
      const result = await payoffPass({
        fountain: blankFountain(8), original: blankFountain(8),
        records: records as any, structure: baseStructure as any,
        annotations: [], approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'SETUP_CLUSTERING'),
        'Should NOT fire when clues are distributed across all act zones',
      );
    });

    // ── PAYOFF_RATE_DECLINE ──────────────────────────────────────────────────
    it('payoffPass detects PAYOFF_RATE_DECLINE when Act 2 has payoffs but Act 3 has none', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      // 8 scenes; act2=scenes 2-5; act3=scenes 6-7; 2 payoffs in act2, 0 in act3
      const records = [
        makeRec(0, { seededClueIds: ['c1', 'c2'] }),
        makeRec(1),
        makeRec(2, { payoffSetupIds: ['c1'] }),  // act2 payoff
        makeRec(3),
        makeRec(4, { payoffSetupIds: ['c2'] }),  // act2 payoff
        makeRec(5),
        makeRec(6),  // act3 — no payoffs
        makeRec(7),  // act3 — no payoffs
      ];
      const result = await payoffPass({
        fountain: blankFountain(8), original: blankFountain(8),
        records: records as any, structure: baseStructure as any,
        annotations: [], approvedSpans: [],
      });
      const decline = result.issues.filter(i => i.rule === 'PAYOFF_RATE_DECLINE');
      assert.ok(decline.length >= 1, `Expected PAYOFF_RATE_DECLINE; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(decline[0].severity === 'major');
    });

    it('payoffPass does NOT fire PAYOFF_RATE_DECLINE when Act 3 has at least one payoff', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      const records = [
        makeRec(0, { seededClueIds: ['c1', 'c2'] }),
        makeRec(1),
        makeRec(2, { payoffSetupIds: ['c1'] }),  // act2 payoff
        makeRec(3),
        makeRec(4),
        makeRec(5),
        makeRec(6, { payoffSetupIds: ['c2'] }),  // act3 payoff
        makeRec(7),
      ];
      const result = await payoffPass({
        fountain: blankFountain(8), original: blankFountain(8),
        records: records as any, structure: baseStructure as any,
        annotations: [], approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'PAYOFF_RATE_DECLINE'),
        'Should NOT fire when Act 3 contains at least one payoff',
      );
    });
  });


  describe('Wave 181 — payoffPass: flat payoffs, clue glut, scrambled order', async () => {
    const makeRec = (idx: number, override: Partial<any> = {}): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      purpose: 'dialogue', dramaticTurn: 'nothing', revelation: null,
      clockRaised: false, clockDelta: 0, emotionalShift: 'neutral', suspenseDelta: 1,
      dialogueHighlights: [], unresolvedClues: [], seededClueIds: [],
      payoffSetupIds: [], visualBeats: [], relationshipShifts: [],
      ...override,
    });
    const blankFountain = (n: number) =>
      Array.from({ length: n }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join('');
    const baseStructure = {
      completionPercent: 50, actPosition: 'act2a' as const,
      openClues: 0, reversalCount: 1, midpointPressure: 2, tightestScene: null,
    };
    const payoffInput = (records: any[], n: number) => ({
      fountain: blankFountain(n), original: blankFountain(n),
      records: records as any, structure: baseStructure as any, annotations: [], approvedSpans: [],
    });

    // ── FLAT_PAYOFF ───────────────────────────────────────────────────────────
    it('payoffPass detects FLAT_PAYOFF when payoffs resolve with no emotional weight', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      const records = [
        makeRec(0, { seededClueIds: ['c1'] }),
        makeRec(1, { seededClueIds: ['c2'] }),
        makeRec(2),
        makeRec(3),
        makeRec(4, { payoffSetupIds: ['c1'] }), // flat
        makeRec(5, { payoffSetupIds: ['c2'] }), // flat
      ];
      const result = await payoffPass(payoffInput(records, 6));
      const flat = result.issues.filter(i => i.rule === 'FLAT_PAYOFF');
      assert.ok(flat.length >= 1, `Should detect FLAT_PAYOFF; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(flat[0].severity === 'major');
    });

    it('payoffPass does NOT fire FLAT_PAYOFF when payoffs carry emotional weight', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      const records = [
        makeRec(0, { seededClueIds: ['c1'] }),
        makeRec(1, { seededClueIds: ['c2'] }),
        makeRec(2),
        makeRec(3),
        makeRec(4, { payoffSetupIds: ['c1'], emotionalShift: 'negative' }),
        makeRec(5, { payoffSetupIds: ['c2'], suspenseDelta: 2 }),
      ];
      const result = await payoffPass(payoffInput(records, 6));
      assert.ok(
        !result.issues.some(i => i.rule === 'FLAT_PAYOFF'),
        'Should NOT fire when payoff scenes carry emotional or suspense weight',
      );
    });

    // ── CLUE_GLUT ─────────────────────────────────────────────────────────────
    it('payoffPass detects CLUE_GLUT when too many clues are open at once', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      const records = Array.from({ length: 6 }, (_, i) =>
        i < 5 ? makeRec(i, { seededClueIds: [`c${i}`] }) : makeRec(i),
      );
      const result = await payoffPass(payoffInput(records, 6));
      const glut = result.issues.filter(i => i.rule === 'CLUE_GLUT');
      assert.ok(glut.length >= 1, `Should detect CLUE_GLUT; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(glut[0].severity === 'minor');
    });

    it('payoffPass does NOT fire CLUE_GLUT when open threads stay manageable', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      const records = Array.from({ length: 6 }, (_, i) =>
        i < 3 ? makeRec(i, { seededClueIds: [`c${i}`] }) : makeRec(i),
      );
      const result = await payoffPass(payoffInput(records, 6));
      assert.ok(
        !result.issues.some(i => i.rule === 'CLUE_GLUT'),
        'Should NOT fire when only a few clues are open simultaneously',
      );
    });

    // ── SETUP_PAYOFF_ORDER_SCRAMBLED ──────────────────────────────────────────
    it('payoffPass detects SETUP_PAYOFF_ORDER_SCRAMBLED when payoff order inverts setup order', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      // Plant c1,c2,c3 at 0,1,2; pay off in reverse at 8,7,6
      const records = Array.from({ length: 10 }, (_, i) => {
        if (i === 0) return makeRec(i, { seededClueIds: ['c1'] });
        if (i === 1) return makeRec(i, { seededClueIds: ['c2'] });
        if (i === 2) return makeRec(i, { seededClueIds: ['c3'] });
        if (i === 6) return makeRec(i, { payoffSetupIds: ['c3'] });
        if (i === 7) return makeRec(i, { payoffSetupIds: ['c2'] });
        if (i === 8) return makeRec(i, { payoffSetupIds: ['c1'] });
        return makeRec(i);
      });
      const result = await payoffPass(payoffInput(records, 10));
      const scrambled = result.issues.filter(i => i.rule === 'SETUP_PAYOFF_ORDER_SCRAMBLED');
      assert.ok(scrambled.length >= 1, `Should detect SETUP_PAYOFF_ORDER_SCRAMBLED; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(scrambled[0].severity === 'minor');
    });

    it('payoffPass does NOT fire SETUP_PAYOFF_ORDER_SCRAMBLED when payoffs follow setup order', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      const records = Array.from({ length: 10 }, (_, i) => {
        if (i === 0) return makeRec(i, { seededClueIds: ['c1'] });
        if (i === 1) return makeRec(i, { seededClueIds: ['c2'] });
        if (i === 2) return makeRec(i, { seededClueIds: ['c3'] });
        if (i === 6) return makeRec(i, { payoffSetupIds: ['c1'] });
        if (i === 7) return makeRec(i, { payoffSetupIds: ['c2'] });
        if (i === 8) return makeRec(i, { payoffSetupIds: ['c3'] });
        return makeRec(i);
      });
      const result = await payoffPass(payoffInput(records, 10));
      assert.ok(
        !result.issues.some(i => i.rule === 'SETUP_PAYOFF_ORDER_SCRAMBLED'),
        'Should NOT fire when payoffs resolve in the same order as their setups',
      );
    });
  });


  describe('Wave 233 — payoffPass: payoff orphan rate, post-climax cluster, setup-payoff gap uniformity', async () => {
    const makeRec233 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 1, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, dialogueHighlights: [],
      revelation: null, purpose: 'development', dramaticTurn: '',
      seededClueIds: [], payoffSetupIds: [], relationshipShifts: [],
      ...overrides,
    });

    it('PAYOFF_ORPHAN_RATE fires when >50% of planted clues are never paid off', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      // 4 clues planted; only 1 paid off → 75% orphan rate
      const records233a = [
        makeRec233(0, { seededClueIds: ['c1', 'c2'] }),
        makeRec233(1, { seededClueIds: ['c3', 'c4'] }),
        makeRec233(2, { payoffSetupIds: ['c1'] }),  // only c1 paid off
        makeRec233(3),
        makeRec233(4),
        makeRec233(5),
        makeRec233(6),
        makeRec233(7),
      ];
      const fountain233a = records233a.map(r => `INT. SC${r.sceneIdx} - DAY\nAction line.`).join('\n');
      const result = await payoffPass({
        fountain: fountain233a, original: fountain233a,
        records: records233a,
        structure: { openClues: 3, completionPercent: 80 } as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'PAYOFF_ORPHAN_RATE');
      assert.ok(match.length >= 1, `Expected PAYOFF_ORPHAN_RATE, got: ${JSON.stringify(result.issues.map((i:any)=>i.rule))}`);
    });

    it('PAYOFF_ORPHAN_RATE does NOT fire when most clues are paid off', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      // 4 clues; 3 paid off → 25% orphan rate
      const records233b = [
        makeRec233(0, { seededClueIds: ['c1', 'c2'] }),
        makeRec233(1, { seededClueIds: ['c3', 'c4'] }),
        makeRec233(2, { payoffSetupIds: ['c1'] }),
        makeRec233(3, { payoffSetupIds: ['c2'] }),
        makeRec233(4, { payoffSetupIds: ['c3'] }),
        makeRec233(5),
        makeRec233(6),
        makeRec233(7),
      ];
      const fountain233b = records233b.map(r => `INT. SC${r.sceneIdx} - DAY\nAction line.`).join('\n');
      const result = await payoffPass({
        fountain: fountain233b, original: fountain233b,
        records: records233b,
        structure: { openClues: 1, completionPercent: 80 } as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'PAYOFF_ORPHAN_RATE');
      assert.strictEqual(match.length, 0, 'Should NOT fire when most clues are paid off');
    });

    it('PAYOFF_POST_CLIMAX_CLUSTER fires when 2+ payoffs land in the final 20%', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      // 10 scenes; 3 payoffs; all 3 in scenes 8-9 (final 20% = scenes 8+)
      const records233c = [
        makeRec233(0, { seededClueIds: ['x1'] }),
        makeRec233(1, { seededClueIds: ['x2'] }),
        makeRec233(2, { seededClueIds: ['x3'] }),
        makeRec233(3),
        makeRec233(4),
        makeRec233(5),
        makeRec233(6),
        makeRec233(7),
        makeRec233(8, { payoffSetupIds: ['x1'] }),
        makeRec233(9, { payoffSetupIds: ['x2', 'x3'] }),
      ];
      const fountain233c = records233c.map(r => `INT. SC${r.sceneIdx} - DAY\nAction.`).join('\n');
      const result = await payoffPass({
        fountain: fountain233c, original: fountain233c,
        records: records233c,
        structure: { openClues: 0, completionPercent: 90 } as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'PAYOFF_POST_CLIMAX_CLUSTER');
      assert.ok(match.length >= 1, `Expected PAYOFF_POST_CLIMAX_CLUSTER, got: ${JSON.stringify(result.issues.map((i:any)=>i.rule))}`);
    });

    it('PAYOFF_POST_CLIMAX_CLUSTER does NOT fire when payoffs are distributed earlier', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      // 10 scenes; payoffs in scenes 3, 5, 8 — only 1 in final 20%
      const records233d = [
        makeRec233(0, { seededClueIds: ['y1'] }),
        makeRec233(1, { seededClueIds: ['y2'] }),
        makeRec233(2, { seededClueIds: ['y3'] }),
        makeRec233(3, { payoffSetupIds: ['y1'] }),
        makeRec233(4),
        makeRec233(5, { payoffSetupIds: ['y2'] }),
        makeRec233(6),
        makeRec233(7),
        makeRec233(8, { payoffSetupIds: ['y3'] }),
        makeRec233(9),
      ];
      const fountain233d = records233d.map(r => `INT. SC${r.sceneIdx} - DAY\nAction.`).join('\n');
      const result = await payoffPass({
        fountain: fountain233d, original: fountain233d,
        records: records233d,
        structure: { openClues: 0, completionPercent: 90 } as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'PAYOFF_POST_CLIMAX_CLUSTER');
      assert.strictEqual(match.length, 0, 'Should NOT fire when payoffs are distributed across the arc');
    });

    it('SETUP_PAYOFF_GAP_UNIFORMITY fires when all setup→payoff gaps are the same', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      // 4 resolved setups all with gap=2: plant at 0→payoff 2, plant 2→payoff 4, plant 4→payoff 6, plant 6→payoff 8
      const records233e = [
        makeRec233(0, { seededClueIds: ['z1'] }),
        makeRec233(1),
        makeRec233(2, { seededClueIds: ['z2'], payoffSetupIds: ['z1'] }),
        makeRec233(3),
        makeRec233(4, { seededClueIds: ['z3'], payoffSetupIds: ['z2'] }),
        makeRec233(5),
        makeRec233(6, { seededClueIds: ['z4'], payoffSetupIds: ['z3'] }),
        makeRec233(7),
        makeRec233(8, { payoffSetupIds: ['z4'] }),
        makeRec233(9),
      ];
      const fountain233e = records233e.map(r => `INT. SC${r.sceneIdx} - DAY\nAction.`).join('\n');
      const result = await payoffPass({
        fountain: fountain233e, original: fountain233e,
        records: records233e,
        structure: { openClues: 0, completionPercent: 90 } as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'SETUP_PAYOFF_GAP_UNIFORMITY');
      assert.ok(match.length >= 1, `Expected SETUP_PAYOFF_GAP_UNIFORMITY, got: ${JSON.stringify(result.issues.map((i:any)=>i.rule))}`);
    });

    it('SETUP_PAYOFF_GAP_UNIFORMITY does NOT fire when gap lengths vary', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      // gaps: 1, 1, 2, 6 → max-min=5 → doesn't fire
      const records233f = [
        makeRec233(0, { seededClueIds: ['w1'] }),
        makeRec233(1, { seededClueIds: ['w2'], payoffSetupIds: ['w1'] }),
        makeRec233(2, { seededClueIds: ['w3'] }),
        makeRec233(3, { seededClueIds: ['w4'], payoffSetupIds: ['w2'] }),
        makeRec233(4, { payoffSetupIds: ['w3'] }),
        makeRec233(5),
        makeRec233(6),
        makeRec233(7),
        makeRec233(8),
        makeRec233(9, { payoffSetupIds: ['w4'] }),
      ];
      const fountain233f = records233f.map(r => `INT. SC${r.sceneIdx} - DAY\nAction.`).join('\n');
      const result = await payoffPass({
        fountain: fountain233f, original: fountain233f,
        records: records233f,
        structure: { openClues: 0, completionPercent: 90 } as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'SETUP_PAYOFF_GAP_UNIFORMITY');
      assert.strictEqual(match.length, 0, 'Should NOT fire when setup→payoff gap lengths vary significantly');
    });
  });


  describe('Wave 552 — payoffPass: payoff drought run, seed relationship valence uniform, payoff emotional valence uniform', async () => {
    const makeRec552 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runPY552 = async (records: any[]) => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      return payoffPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    it('PAYOFF_DROUGHT_RUN fires when 5+ consecutive scenes have no payoff among 4+ payoffs', async () => {
      // 10 scenes: payoffs at 0,1,8,9 (4 payoffs); drought 2-7 = 6 consecutive non-payoff scenes.
      // Payoffs given suspenseDelta:1, curiosityDelta:1 to avoid suspense/curiosity mismatch checks.
      // revelation on payoff scenes to avoid PAYOFF_REVELATION_DISCONNECT.
      // sc2 has emotionalShift:'negative' to prevent PAYOFF_EMOTIONAL_RECOIL_ABSENT.
      const recs552a = Array.from({ length: 10 }, (_, i) =>
        makeRec552(i, {
          payoffSetupIds: [0, 1, 8, 9].includes(i) ? [`p${i}`] : [],
          suspenseDelta: [0, 1, 8, 9].includes(i) ? 1 : 0,
          curiosityDelta: [0, 1, 8, 9].includes(i) ? 1 : 0,
          revelation: [0, 1, 8, 9].includes(i) ? 'found' : null,
          emotionalShift: i === 2 ? 'negative' : 'neutral',
        }),
      );
      const res = await runPY552(recs552a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_DROUGHT_RUN'), 'PAYOFF_DROUGHT_RUN should fire');
    });

    it('PAYOFF_DROUGHT_RUN does not fire when longest non-payoff run is only 4', async () => {
      // 10 scenes: payoffs at 0,5,7,9 (4 payoffs); longest drought = scenes 1-4 = 4 consecutive.
      const recs552an = Array.from({ length: 10 }, (_, i) =>
        makeRec552(i, {
          payoffSetupIds: [0, 5, 7, 9].includes(i) ? [`p${i}`] : [],
          suspenseDelta: [0, 5, 7, 9].includes(i) ? 1 : 0,
          curiosityDelta: [0, 5, 7, 9].includes(i) ? 1 : 0,
          revelation: [0, 5, 7, 9].includes(i) ? 'found' : null,
          emotionalShift: i === 6 ? 'negative' : 'neutral',
        }),
      );
      const res = await runPY552(recs552an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_DROUGHT_RUN'), 'PAYOFF_DROUGHT_RUN should not fire');
    });

    it('SEED_RELATIONSHIP_VALENCE_UNIFORM fires when all seed-with-relationship scenes share one relational sign', async () => {
      // 8 scenes: seeds at 0,1 each with positive relShift. Other scenes neutral/no-seeds.
      // Seeds have suspenseDelta:1, curiosityDelta:1, emotionalShift:'positive' to avoid flat checks.
      const recs552b = Array.from({ length: 8 }, (_, i) =>
        makeRec552(i, {
          seededClueIds: [0, 1].includes(i) ? [`c${i}`] : [],
          relationshipShifts: [0, 1].includes(i)
            ? [{ pairKey: 'A|B', dimension: 'trust', amount: 0.5 }]
            : [],
          suspenseDelta: [0, 1].includes(i) ? 1 : 0,
          curiosityDelta: [0, 1].includes(i) ? 1 : 0,
          emotionalShift: [0, 1].includes(i) ? 'positive' : 'neutral',
        }),
      );
      const res = await runPY552(recs552b);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_RELATIONSHIP_VALENCE_UNIFORM'), 'SEED_RELATIONSHIP_VALENCE_UNIFORM should fire');
    });

    it('SEED_RELATIONSHIP_VALENCE_UNIFORM does not fire when seed-with-relationship scenes have mixed valence', async () => {
      // 8 scenes: seed at 0 with positive relShift, seed at 1 with negative relShift → mixed.
      const recs552bn = Array.from({ length: 8 }, (_, i) =>
        makeRec552(i, {
          seededClueIds: [0, 1].includes(i) ? [`c${i}`] : [],
          relationshipShifts: i === 0
            ? [{ pairKey: 'A|B', dimension: 'trust', amount: 0.5 }]
            : i === 1
              ? [{ pairKey: 'A|B', dimension: 'trust', amount: -0.4 }]
              : [],
          suspenseDelta: [0, 1].includes(i) ? 1 : 0,
          curiosityDelta: [0, 1].includes(i) ? 1 : 0,
          emotionalShift: [0, 1].includes(i) ? 'positive' : 'neutral',
        }),
      );
      const res = await runPY552(recs552bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_RELATIONSHIP_VALENCE_UNIFORM'), 'SEED_RELATIONSHIP_VALENCE_UNIFORM should not fire');
    });

    it('PAYOFF_EMOTIONAL_VALENCE_UNIFORM fires when all non-neutral payoffs share one emotional valence', async () => {
      // 8 scenes: payoffs at 2,4,6; sc2 and sc6 have emotionalShift:'positive'; sc4 neutral.
      // 2 non-neutral payoffs, both positive → fire.
      // revelation on payoff scenes to avoid PAYOFF_REVELATION_DISCONNECT.
      // sc3 has emotionalShift:'negative' to avoid PAYOFF_EMOTIONAL_RECOIL_ABSENT.
      // sc4 payoff has suspenseDelta:1 so sc2's aftermath (sc3,sc4) has suspense rise → avoids PAYOFF_SUSPENSE_RECOIL_ABSENT.
      const recs552c = Array.from({ length: 8 }, (_, i) =>
        makeRec552(i, {
          payoffSetupIds: [2, 4, 6].includes(i) ? [`p${i}`] : [],
          emotionalShift: [2, 6].includes(i) ? 'positive' : i === 3 ? 'negative' : 'neutral',
          suspenseDelta: [2, 4, 6].includes(i) ? 1 : 0,
          curiosityDelta: [2, 4, 6].includes(i) ? 1 : 0,
          revelation: [2, 4, 6].includes(i) ? 'found' : null,
        }),
      );
      const res = await runPY552(recs552c);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_EMOTIONAL_VALENCE_UNIFORM'), 'PAYOFF_EMOTIONAL_VALENCE_UNIFORM should fire');
    });

    it('PAYOFF_EMOTIONAL_VALENCE_UNIFORM does not fire when non-neutral payoffs have mixed valence', async () => {
      // 8 scenes: payoffs at 2,4,6; sc2 positive, sc4 negative, sc6 positive → mixed.
      const recs552cn = Array.from({ length: 8 }, (_, i) =>
        makeRec552(i, {
          payoffSetupIds: [2, 4, 6].includes(i) ? [`p${i}`] : [],
          emotionalShift: i === 2 ? 'positive' : i === 4 ? 'negative' : i === 6 ? 'positive' : 'neutral',
          suspenseDelta: [2, 4, 6].includes(i) ? 1 : 0,
          curiosityDelta: [2, 4, 6].includes(i) ? 1 : 0,
          revelation: [2, 4, 6].includes(i) ? 'found' : null,
        }),
      );
      const res = await runPY552(recs552cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_EMOTIONAL_VALENCE_UNIFORM'), 'PAYOFF_EMOTIONAL_VALENCE_UNIFORM should not fire');
    });
  });


  describe('Wave 538 — payoffPass: payoff dramatic turn aftermath absent, seed relationship aftermath absent, seed clock aftermath absent', async () => {
    const makeRec538 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runPY538 = async (records: any[]) => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      return payoffPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    it('PAYOFF_DRAMATIC_TURN_AFTERMATH_ABSENT fires when no payoff is followed by a dramatic turn', async () => {
      // 10 scenes: payoffs at 0,2,4 (not last 2); dramatic turns at 8,9 (outside aftermath windows 1-2, 3-4, 5-6)
      const recs538a = Array.from({ length: 10 }, (_, i) =>
        makeRec538(i, {
          payoffSetupIds: [0, 2, 4].includes(i) ? ['s1'] : [],
          dramaticTurn: [8, 9].includes(i) ? 'reversal' : 'nothing',
        }),
      );
      const res = await runPY538(recs538a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_DRAMATIC_TURN_AFTERMATH_ABSENT'), 'PAYOFF_DRAMATIC_TURN_AFTERMATH_ABSENT should fire');
    });

    it('PAYOFF_DRAMATIC_TURN_AFTERMATH_ABSENT does not fire when a payoff is followed by a dramatic turn', async () => {
      // 10 scenes: payoffs at 0,2,4; dramatic turn at 1 (within aftermath window of payoff at 0)
      const recs538an = Array.from({ length: 10 }, (_, i) =>
        makeRec538(i, {
          payoffSetupIds: [0, 2, 4].includes(i) ? ['s1'] : [],
          dramaticTurn: [1, 9].includes(i) ? 'reversal' : 'nothing',
        }),
      );
      const res = await runPY538(recs538an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_DRAMATIC_TURN_AFTERMATH_ABSENT'), 'PAYOFF_DRAMATIC_TURN_AFTERMATH_ABSENT should not fire');
    });

    it('SEED_RELATIONSHIP_AFTERMATH_ABSENT fires when no seed is followed by a relationship shift', async () => {
      // 10 scenes: seeds at 0,2,4; relationship shifts at 8,9 (outside aftermath windows 1-2, 3-4, 5-6)
      const recs538b = Array.from({ length: 10 }, (_, i) =>
        makeRec538(i, {
          seededClueIds: [0, 2, 4].includes(i) ? ['c1'] : [],
          relationshipShifts: [8, 9].includes(i) ? [{ pairKey: 'A|B', dimension: 'trust', amount: 0.4 }] : [],
        }),
      );
      const res = await runPY538(recs538b);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_RELATIONSHIP_AFTERMATH_ABSENT'), 'SEED_RELATIONSHIP_AFTERMATH_ABSENT should fire');
    });

    it('SEED_RELATIONSHIP_AFTERMATH_ABSENT does not fire when a seed is followed by a relationship shift', async () => {
      // 10 scenes: seeds at 0,2,4; relationship shift at 1 (within aftermath window of seed at 0)
      const recs538bn = Array.from({ length: 10 }, (_, i) =>
        makeRec538(i, {
          seededClueIds: [0, 2, 4].includes(i) ? ['c1'] : [],
          relationshipShifts: [1, 8].includes(i) ? [{ pairKey: 'A|B', dimension: 'trust', amount: 0.4 }] : [],
        }),
      );
      const res = await runPY538(recs538bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_RELATIONSHIP_AFTERMATH_ABSENT'), 'SEED_RELATIONSHIP_AFTERMATH_ABSENT should not fire');
    });

    it('SEED_CLOCK_AFTERMATH_ABSENT fires when no seed is followed by a clock raise', async () => {
      // 10 scenes: seeds at 0,2,4; clock at 8,9 (outside aftermath windows 1-2, 3-4, 5-6)
      const recs538c = Array.from({ length: 10 }, (_, i) =>
        makeRec538(i, {
          seededClueIds: [0, 2, 4].includes(i) ? ['c1'] : [],
          clockRaised: [8, 9].includes(i),
        }),
      );
      const res = await runPY538(recs538c);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_CLOCK_AFTERMATH_ABSENT'), 'SEED_CLOCK_AFTERMATH_ABSENT should fire');
    });

    it('SEED_CLOCK_AFTERMATH_ABSENT does not fire when a seed is followed by a clock raise', async () => {
      // 10 scenes: seeds at 0,2,4; clock at 1 (within aftermath window of seed at 0)
      const recs538cn = Array.from({ length: 10 }, (_, i) =>
        makeRec538(i, {
          seededClueIds: [0, 2, 4].includes(i) ? ['c1'] : [],
          clockRaised: [1, 9].includes(i),
        }),
      );
      const res = await runPY538(recs538cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_CLOCK_AFTERMATH_ABSENT'), 'SEED_CLOCK_AFTERMATH_ABSENT should not fire');
    });
  });


  describe('Wave 734 — payoffPass: payoff relationship zone cluster, payoff seed zone cluster, payoff clock delta drought run', async () => {
    const runPY734 = async (records: ScreenplaySceneRecord[]) => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      return payoffPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // PAYOFF_RELATIONSHIP_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; relationship-shift scenes at 0,1,2 → 100% opening third
    it('PAYOFF_RELATIONSHIP_ZONE_CLUSTER fires when >75% of relationship-shift scenes cluster in one third', async () => {
      const recs734a = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs734a[0] = makeSharedRecord(0, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
      recs734a[1] = makeSharedRecord(1, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
      recs734a[2] = makeSharedRecord(2, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
      const res = await runPY734(recs734a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_RELATIONSHIP_ZONE_CLUSTER'), 'PAYOFF_RELATIONSHIP_ZONE_CLUSTER should fire');
    });

    // PAYOFF_RELATIONSHIP_ZONE_CLUSTER no-fire:
    // relationship-shift scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('PAYOFF_RELATIONSHIP_ZONE_CLUSTER does not fire when relationship-shift scenes are distributed across thirds', async () => {
      const recs734an = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs734an[0] = makeSharedRecord(0, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
      recs734an[4] = makeSharedRecord(4, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
      recs734an[7] = makeSharedRecord(7, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
      const res = await runPY734(recs734an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_RELATIONSHIP_ZONE_CLUSTER'), 'PAYOFF_RELATIONSHIP_ZONE_CLUSTER should not fire');
    });

    // PAYOFF_SEED_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; seed scenes at 0,1,2 → 100% opening third
    it('PAYOFF_SEED_ZONE_CLUSTER fires when >75% of seed scenes cluster in one third', async () => {
      const recs734b = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs734b[0] = makeSharedRecord(0, { seededClueIds: ['clue-a'] });
      recs734b[1] = makeSharedRecord(1, { seededClueIds: ['clue-b'] });
      recs734b[2] = makeSharedRecord(2, { seededClueIds: ['clue-c'] });
      const res = await runPY734(recs734b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_SEED_ZONE_CLUSTER'), 'PAYOFF_SEED_ZONE_CLUSTER should fire');
    });

    // PAYOFF_SEED_ZONE_CLUSTER no-fire:
    // seed scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('PAYOFF_SEED_ZONE_CLUSTER does not fire when seed scenes are distributed across thirds', async () => {
      const recs734bn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs734bn[0] = makeSharedRecord(0, { seededClueIds: ['clue-a'] });
      recs734bn[4] = makeSharedRecord(4, { seededClueIds: ['clue-b'] });
      recs734bn[7] = makeSharedRecord(7, { seededClueIds: ['clue-c'] });
      const res = await runPY734(recs734bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_SEED_ZONE_CLUSTER'), 'PAYOFF_SEED_ZONE_CLUSTER should not fire');
    });

    // PAYOFF_CLOCK_DELTA_DROUGHT_RUN fire:
    // n=10; scenes 0,1,2 shift the clock (>=3 present overall); scenes 3-9 (7 scenes) have none
    it('PAYOFF_CLOCK_DELTA_DROUGHT_RUN fires when the longest no-clock-movement run reaches 6', async () => {
      const recs734c = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs734c[0] = makeSharedRecord(0, { clockDelta: 1 });
      recs734c[1] = makeSharedRecord(1, { clockDelta: -1 });
      recs734c[2] = makeSharedRecord(2, { clockDelta: 1 });
      const res = await runPY734(recs734c);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_CLOCK_DELTA_DROUGHT_RUN'), 'PAYOFF_CLOCK_DELTA_DROUGHT_RUN should fire');
    });

    // PAYOFF_CLOCK_DELTA_DROUGHT_RUN no-fire:
    // clock-shifting scenes spread out so no gap reaches 6 consecutive scenes
    it('PAYOFF_CLOCK_DELTA_DROUGHT_RUN does not fire when clock movement is spread through the story', async () => {
      const recs734cn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs734cn[0] = makeSharedRecord(0, { clockDelta: 1 });
      recs734cn[3] = makeSharedRecord(3, { clockDelta: -1 });
      recs734cn[6] = makeSharedRecord(6, { clockDelta: 1 });
      recs734cn[9] = makeSharedRecord(9, { clockDelta: -1 });
      const res = await runPY734(recs734cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_CLOCK_DELTA_DROUGHT_RUN'), 'PAYOFF_CLOCK_DELTA_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 720 — payoffPass: payoff highlight peak uncaused, payoff open thread drought run, payoff relationship drought run', async () => {
    const runPY720 = async (records: ScreenplaySceneRecord[]) => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      return payoffPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // PAYOFF_HIGHLIGHT_PEAK_UNCAUSED fire:
    // 8 scenes; highlights at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('PAYOFF_HIGHLIGHT_PEAK_UNCAUSED fires when the peak highlighted-dialogue scene has no dramatic turn or revelation nearby', async () => {
      const recs720a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs720a[2] = makeSharedRecord(2, { dialogueHighlights: ['line-a'] });
      recs720a[6] = makeSharedRecord(6, { dialogueHighlights: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runPY720(recs720a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_HIGHLIGHT_PEAK_UNCAUSED'), 'PAYOFF_HIGHLIGHT_PEAK_UNCAUSED should fire');
    });

    // PAYOFF_HIGHLIGHT_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('PAYOFF_HIGHLIGHT_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs720an = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs720an[2] = makeSharedRecord(2, { dialogueHighlights: ['line-a'] });
      recs720an[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs720an[6] = makeSharedRecord(6, { dialogueHighlights: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runPY720(recs720an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_HIGHLIGHT_PEAK_UNCAUSED'), 'PAYOFF_HIGHLIGHT_PEAK_UNCAUSED should not fire');
    });

    // PAYOFF_OPEN_THREAD_DROUGHT_RUN fire:
    // 10 scenes; open threads at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('PAYOFF_OPEN_THREAD_DROUGHT_RUN fires when the longest no-open-thread run is ≥6', async () => {
      const recs720b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs720b[0] = makeSharedRecord(0, { unresolvedClues: ['a'] });
      recs720b[1] = makeSharedRecord(1, { unresolvedClues: ['b'] });
      recs720b[2] = makeSharedRecord(2, { unresolvedClues: ['c'] });
      recs720b[9] = makeSharedRecord(9, { unresolvedClues: ['d'] });
      const res = await runPY720(recs720b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_OPEN_THREAD_DROUGHT_RUN'), 'PAYOFF_OPEN_THREAD_DROUGHT_RUN should fire');
    });

    // PAYOFF_OPEN_THREAD_DROUGHT_RUN no-fire:
    // open threads at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('PAYOFF_OPEN_THREAD_DROUGHT_RUN does not fire when open threads are distributed without a long drought', async () => {
      const recs720bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs720bn[0] = makeSharedRecord(0, { unresolvedClues: ['a'] });
      recs720bn[4] = makeSharedRecord(4, { unresolvedClues: ['b'] });
      recs720bn[9] = makeSharedRecord(9, { unresolvedClues: ['c'] });
      const res = await runPY720(recs720bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_OPEN_THREAD_DROUGHT_RUN'), 'PAYOFF_OPEN_THREAD_DROUGHT_RUN should not fire');
    });

    // PAYOFF_RELATIONSHIP_DROUGHT_RUN fire:
    // 10 scenes; shifts at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('PAYOFF_RELATIONSHIP_DROUGHT_RUN fires when the longest no-shift run is ≥6', async () => {
      const recs720c = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs720c[0] = makeSharedRecord(0, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs720c[1] = makeSharedRecord(1, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs720c[2] = makeSharedRecord(2, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs720c[9] = makeSharedRecord(9, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      const res = await runPY720(recs720c);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_RELATIONSHIP_DROUGHT_RUN'), 'PAYOFF_RELATIONSHIP_DROUGHT_RUN should fire');
    });

    // PAYOFF_RELATIONSHIP_DROUGHT_RUN no-fire:
    // shifts at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('PAYOFF_RELATIONSHIP_DROUGHT_RUN does not fire when shifts are distributed without a long drought', async () => {
      const recs720cn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs720cn[0] = makeSharedRecord(0, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs720cn[4] = makeSharedRecord(4, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs720cn[9] = makeSharedRecord(9, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      const res = await runPY720(recs720cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_RELATIONSHIP_DROUGHT_RUN'), 'PAYOFF_RELATIONSHIP_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 706 — payoffPass: payoff staging drought run, payoff highlight zone cluster, payoff open thread peak uncaused', async () => {
    const runPY706 = async (records: ScreenplaySceneRecord[]) => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      return payoffPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // PAYOFF_STAGING_DROUGHT_RUN fire:
    // 10 scenes; visual beats at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('PAYOFF_STAGING_DROUGHT_RUN fires when the longest no-visual-beat run is ≥6', async () => {
      const recs706a = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs706a[0] = makeSharedRecord(0, { visualBeats: ['a beat'] });
      recs706a[1] = makeSharedRecord(1, { visualBeats: ['a beat'] });
      recs706a[2] = makeSharedRecord(2, { visualBeats: ['a beat'] });
      recs706a[9] = makeSharedRecord(9, { visualBeats: ['a beat'] });
      const res = await runPY706(recs706a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_STAGING_DROUGHT_RUN'), 'PAYOFF_STAGING_DROUGHT_RUN should fire');
    });

    // PAYOFF_STAGING_DROUGHT_RUN no-fire:
    // visual beats at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('PAYOFF_STAGING_DROUGHT_RUN does not fire when visual beats are distributed without a long drought', async () => {
      const recs706an = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs706an[0] = makeSharedRecord(0, { visualBeats: ['a beat'] });
      recs706an[4] = makeSharedRecord(4, { visualBeats: ['a beat'] });
      recs706an[9] = makeSharedRecord(9, { visualBeats: ['a beat'] });
      const res = await runPY706(recs706an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_STAGING_DROUGHT_RUN'), 'PAYOFF_STAGING_DROUGHT_RUN should not fire');
    });

    // PAYOFF_HIGHLIGHT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; highlighted-dialogue scenes at 0,1,2 → 100% opening third
    it('PAYOFF_HIGHLIGHT_ZONE_CLUSTER fires when >75% of highlighted-dialogue scenes cluster in one third', async () => {
      const recs706b = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs706b[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'] });
      recs706b[1] = makeSharedRecord(1, { dialogueHighlights: ['line-b'] });
      recs706b[2] = makeSharedRecord(2, { dialogueHighlights: ['line-c'] });
      const res = await runPY706(recs706b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_HIGHLIGHT_ZONE_CLUSTER'), 'PAYOFF_HIGHLIGHT_ZONE_CLUSTER should fire');
    });

    // PAYOFF_HIGHLIGHT_ZONE_CLUSTER no-fire:
    // highlighted-dialogue scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('PAYOFF_HIGHLIGHT_ZONE_CLUSTER does not fire when highlighted-dialogue scenes are distributed across thirds', async () => {
      const recs706bn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs706bn[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'] });
      recs706bn[4] = makeSharedRecord(4, { dialogueHighlights: ['line-b'] });
      recs706bn[7] = makeSharedRecord(7, { dialogueHighlights: ['line-c'] });
      const res = await runPY706(recs706bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_HIGHLIGHT_ZONE_CLUSTER'), 'PAYOFF_HIGHLIGHT_ZONE_CLUSTER should not fire');
    });

    // PAYOFF_OPEN_THREAD_PEAK_UNCAUSED fire:
    // 8 scenes; open threads at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('PAYOFF_OPEN_THREAD_PEAK_UNCAUSED fires when the peak open-thread scene has no dramatic turn or revelation nearby', async () => {
      const recs706c = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs706c[2] = makeSharedRecord(2, { unresolvedClues: ['a'] });
      recs706c[6] = makeSharedRecord(6, { unresolvedClues: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runPY706(recs706c);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_OPEN_THREAD_PEAK_UNCAUSED'), 'PAYOFF_OPEN_THREAD_PEAK_UNCAUSED should fire');
    });

    // PAYOFF_OPEN_THREAD_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('PAYOFF_OPEN_THREAD_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs706cn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs706cn[2] = makeSharedRecord(2, { unresolvedClues: ['a'] });
      recs706cn[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs706cn[6] = makeSharedRecord(6, { unresolvedClues: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runPY706(recs706cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_OPEN_THREAD_PEAK_UNCAUSED'), 'PAYOFF_OPEN_THREAD_PEAK_UNCAUSED should not fire');
    });
  });

  describe('Wave 692 — payoffPass: payoff seed peak uncaused, payoff setup peak uncaused, payoff stakes zone cluster', async () => {
    const runPY692 = async (records: ScreenplaySceneRecord[]) => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      return payoffPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // PAYOFF_SEED_PEAK_UNCAUSED fire:
    // 8 scenes; seeds at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('PAYOFF_SEED_PEAK_UNCAUSED fires when the peak seed scene has no dramatic turn or revelation nearby', async () => {
      const recs692a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs692a[2] = makeSharedRecord(2, { seededClueIds: ['clue-a'] });
      recs692a[6] = makeSharedRecord(6, { seededClueIds: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runPY692(recs692a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_SEED_PEAK_UNCAUSED'), 'PAYOFF_SEED_PEAK_UNCAUSED should fire');
    });

    // PAYOFF_SEED_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('PAYOFF_SEED_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs692an = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs692an[2] = makeSharedRecord(2, { seededClueIds: ['clue-a'] });
      recs692an[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs692an[6] = makeSharedRecord(6, { seededClueIds: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runPY692(recs692an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_SEED_PEAK_UNCAUSED'), 'PAYOFF_SEED_PEAK_UNCAUSED should not fire');
    });

    // PAYOFF_SETUP_PEAK_UNCAUSED fire:
    // 8 scenes; payoffs at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('PAYOFF_SETUP_PEAK_UNCAUSED fires when the peak payoff scene has no dramatic turn or revelation nearby', async () => {
      const recs692b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs692b[2] = makeSharedRecord(2, { payoffSetupIds: ['thread-a'] });
      recs692b[6] = makeSharedRecord(6, { payoffSetupIds: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runPY692(recs692b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_SETUP_PEAK_UNCAUSED'), 'PAYOFF_SETUP_PEAK_UNCAUSED should fire');
    });

    // PAYOFF_SETUP_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('PAYOFF_SETUP_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs692bn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs692bn[2] = makeSharedRecord(2, { payoffSetupIds: ['thread-a'] });
      recs692bn[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs692bn[6] = makeSharedRecord(6, { payoffSetupIds: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runPY692(recs692bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_SETUP_PEAK_UNCAUSED'), 'PAYOFF_SETUP_PEAK_UNCAUSED should not fire');
    });

    // PAYOFF_STAKES_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; stakes-raising scenes at 0,1,2 → 100% opening third
    it('PAYOFF_STAKES_ZONE_CLUSTER fires when >75% of stakes-raising scenes cluster in one third', async () => {
      const recs692c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs692c[0] = makeSharedRecord(0, { purpose: 'raise_stakes' });
      recs692c[1] = makeSharedRecord(1, { purpose: 'raise_stakes' });
      recs692c[2] = makeSharedRecord(2, { purpose: 'raise_stakes' });
      const res = await runPY692(recs692c);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_STAKES_ZONE_CLUSTER'), 'PAYOFF_STAKES_ZONE_CLUSTER should fire');
    });

    // PAYOFF_STAKES_ZONE_CLUSTER no-fire:
    // stakes-raising scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('PAYOFF_STAKES_ZONE_CLUSTER does not fire when stakes-raising scenes are distributed across thirds', async () => {
      const recs692cn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs692cn[0] = makeSharedRecord(0, { purpose: 'raise_stakes' });
      recs692cn[4] = makeSharedRecord(4, { purpose: 'raise_stakes' });
      recs692cn[7] = makeSharedRecord(7, { purpose: 'raise_stakes' });
      const res = await runPY692(recs692cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_STAKES_ZONE_CLUSTER'), 'PAYOFF_STAKES_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 678 — payoffPass: payoff clock delta peak uncaused, payoff turn drought run, payoff negative emotion zone cluster', async () => {
    const runPY678 = async (records: ScreenplaySceneRecord[]) => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      return payoffPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // PAYOFF_CLOCK_DELTA_PEAK_UNCAUSED fire:
    // 8 scenes; clockDelta at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('PAYOFF_CLOCK_DELTA_PEAK_UNCAUSED fires when the peak clockDelta scene has no dramatic turn or revelation nearby', async () => {
      const recs678a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs678a[2] = makeSharedRecord(2, { clockDelta: 1 });
      recs678a[6] = makeSharedRecord(6, { clockDelta: 5 });
      const res = await runPY678(recs678a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_CLOCK_DELTA_PEAK_UNCAUSED'), 'PAYOFF_CLOCK_DELTA_PEAK_UNCAUSED should fire');
    });

    // PAYOFF_CLOCK_DELTA_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('PAYOFF_CLOCK_DELTA_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs678an = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs678an[2] = makeSharedRecord(2, { clockDelta: 1 });
      recs678an[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs678an[6] = makeSharedRecord(6, { clockDelta: 5 });
      const res = await runPY678(recs678an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_CLOCK_DELTA_PEAK_UNCAUSED'), 'PAYOFF_CLOCK_DELTA_PEAK_UNCAUSED should not fire');
    });

    // PAYOFF_TURN_DROUGHT_RUN fire:
    // 10 scenes; dramatic turns at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('PAYOFF_TURN_DROUGHT_RUN fires when the longest no-turn run is ≥6', async () => {
      const recs678b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs678b[0] = makeSharedRecord(0, { dramaticTurn: 'reversal' });
      recs678b[1] = makeSharedRecord(1, { dramaticTurn: 'reversal' });
      recs678b[2] = makeSharedRecord(2, { dramaticTurn: 'reversal' });
      recs678b[9] = makeSharedRecord(9, { dramaticTurn: 'reversal' });
      const res = await runPY678(recs678b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_TURN_DROUGHT_RUN'), 'PAYOFF_TURN_DROUGHT_RUN should fire');
    });

    // PAYOFF_TURN_DROUGHT_RUN no-fire:
    // dramatic turns at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('PAYOFF_TURN_DROUGHT_RUN does not fire when dramatic turns are distributed without a long drought', async () => {
      const recs678bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs678bn[0] = makeSharedRecord(0, { dramaticTurn: 'reversal' });
      recs678bn[4] = makeSharedRecord(4, { dramaticTurn: 'reversal' });
      recs678bn[9] = makeSharedRecord(9, { dramaticTurn: 'reversal' });
      const res = await runPY678(recs678bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_TURN_DROUGHT_RUN'), 'PAYOFF_TURN_DROUGHT_RUN should not fire');
    });

    // PAYOFF_NEGATIVE_EMOTION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; negative-emotion scenes at 0,1,2 → 100% opening third
    it('PAYOFF_NEGATIVE_EMOTION_ZONE_CLUSTER fires when >75% of negative-emotion scenes cluster in one third', async () => {
      const recs678c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs678c[0] = makeSharedRecord(0, { emotionalShift: 'negative' });
      recs678c[1] = makeSharedRecord(1, { emotionalShift: 'negative' });
      recs678c[2] = makeSharedRecord(2, { emotionalShift: 'negative' });
      const res = await runPY678(recs678c);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_NEGATIVE_EMOTION_ZONE_CLUSTER'), 'PAYOFF_NEGATIVE_EMOTION_ZONE_CLUSTER should fire');
    });

    // PAYOFF_NEGATIVE_EMOTION_ZONE_CLUSTER no-fire:
    // negative-emotion scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('PAYOFF_NEGATIVE_EMOTION_ZONE_CLUSTER does not fire when negative-emotion scenes are distributed across thirds', async () => {
      const recs678cn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs678cn[0] = makeSharedRecord(0, { emotionalShift: 'negative' });
      recs678cn[4] = makeSharedRecord(4, { emotionalShift: 'negative' });
      recs678cn[7] = makeSharedRecord(7, { emotionalShift: 'negative' });
      const res = await runPY678(recs678cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_NEGATIVE_EMOTION_ZONE_CLUSTER'), 'PAYOFF_NEGATIVE_EMOTION_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 664 — payoffPass: payoff relationship peak uncaused, payoff clock drought run, payoff staging zone cluster', async () => {
    const runPY664 = async (records: ScreenplaySceneRecord[]) => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      return payoffPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // PAYOFF_RELATIONSHIP_PEAK_UNCAUSED fire:
    // 8 scenes; shifts at 2 (1 shift) and 6 (5 shifts, the peak); no dramaticTurn or revelation at
    // 6, 5, or 4
    it('PAYOFF_RELATIONSHIP_PEAK_UNCAUSED fires when the peak relationship-shift scene has no dramatic turn or revelation nearby', async () => {
      const recs664a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs664a[2] = makeSharedRecord(2, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs664a[6] = makeSharedRecord(6, { relationshipShifts: [0, 1, 2, 3, 4].map(n => ({ pairKey: `a|${n}`, dimension: 'trust', amount: 0.2 })) });
      const res = await runPY664(recs664a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_RELATIONSHIP_PEAK_UNCAUSED'), 'PAYOFF_RELATIONSHIP_PEAK_UNCAUSED should fire');
    });

    // PAYOFF_RELATIONSHIP_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('PAYOFF_RELATIONSHIP_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs664an = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs664an[2] = makeSharedRecord(2, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs664an[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs664an[6] = makeSharedRecord(6, { relationshipShifts: [0, 1, 2, 3, 4].map(n => ({ pairKey: `a|${n}`, dimension: 'trust', amount: 0.2 })) });
      const res = await runPY664(recs664an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_RELATIONSHIP_PEAK_UNCAUSED'), 'PAYOFF_RELATIONSHIP_PEAK_UNCAUSED should not fire');
    });

    // PAYOFF_CLOCK_DROUGHT_RUN fire:
    // 10 scenes; clock raised at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('PAYOFF_CLOCK_DROUGHT_RUN fires when the longest no-clock run is ≥6', async () => {
      const recs664b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs664b[0] = makeSharedRecord(0, { clockRaised: true });
      recs664b[1] = makeSharedRecord(1, { clockRaised: true });
      recs664b[2] = makeSharedRecord(2, { clockRaised: true });
      recs664b[9] = makeSharedRecord(9, { clockRaised: true });
      const res = await runPY664(recs664b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_CLOCK_DROUGHT_RUN'), 'PAYOFF_CLOCK_DROUGHT_RUN should fire');
    });

    // PAYOFF_CLOCK_DROUGHT_RUN no-fire:
    // clock raised at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('PAYOFF_CLOCK_DROUGHT_RUN does not fire when clock raises are distributed without a long drought', async () => {
      const recs664bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs664bn[0] = makeSharedRecord(0, { clockRaised: true });
      recs664bn[4] = makeSharedRecord(4, { clockRaised: true });
      recs664bn[9] = makeSharedRecord(9, { clockRaised: true });
      const res = await runPY664(recs664bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_CLOCK_DROUGHT_RUN'), 'PAYOFF_CLOCK_DROUGHT_RUN should not fire');
    });

    // PAYOFF_STAGING_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; visually dense scenes (visualBeats≥2) at 0,1,2 → 100% opening
    // third
    it('PAYOFF_STAGING_ZONE_CLUSTER fires when >75% of visually dense scenes cluster in one third', async () => {
      const recs664c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs664c[0] = makeSharedRecord(0, { visualBeats: ['a', 'b'] });
      recs664c[1] = makeSharedRecord(1, { visualBeats: ['a', 'b'] });
      recs664c[2] = makeSharedRecord(2, { visualBeats: ['a', 'b'] });
      const res = await runPY664(recs664c);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_STAGING_ZONE_CLUSTER'), 'PAYOFF_STAGING_ZONE_CLUSTER should fire');
    });

    // PAYOFF_STAGING_ZONE_CLUSTER no-fire:
    // visually dense scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('PAYOFF_STAGING_ZONE_CLUSTER does not fire when visually dense scenes are distributed across thirds', async () => {
      const recs664cn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs664cn[0] = makeSharedRecord(0, { visualBeats: ['a', 'b'] });
      recs664cn[4] = makeSharedRecord(4, { visualBeats: ['a', 'b'] });
      recs664cn[7] = makeSharedRecord(7, { visualBeats: ['a', 'b'] });
      const res = await runPY664(recs664cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_STAGING_ZONE_CLUSTER'), 'PAYOFF_STAGING_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 650 — payoffPass: payoff staging peak uncaused, payoff highlight drought run, payoff open thread zone cluster', async () => {
    const runPY650 = async (records: ScreenplaySceneRecord[]) => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      return payoffPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // PAYOFF_STAGING_PEAK_UNCAUSED fire:
    // 8 scenes; staging at 2 (1 beat) and 6 (5 beats, the peak); no dramaticTurn or revelation at
    // 6, 5, or 4
    it('PAYOFF_STAGING_PEAK_UNCAUSED fires when the peak physical-staging scene has no dramatic turn or revelation nearby', async () => {
      const recs650a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs650a[2] = makeSharedRecord(2, { visualBeats: ['glances at the clock'] });
      recs650a[6] = makeSharedRecord(6, { visualBeats: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runPY650(recs650a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_STAGING_PEAK_UNCAUSED'), 'PAYOFF_STAGING_PEAK_UNCAUSED should fire');
    });

    // PAYOFF_STAGING_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('PAYOFF_STAGING_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs650an = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs650an[2] = makeSharedRecord(2, { visualBeats: ['glances at the clock'] });
      recs650an[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs650an[6] = makeSharedRecord(6, { visualBeats: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runPY650(recs650an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_STAGING_PEAK_UNCAUSED'), 'PAYOFF_STAGING_PEAK_UNCAUSED should not fire');
    });

    // PAYOFF_HIGHLIGHT_DROUGHT_RUN fire:
    // 10 scenes; highlights at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('PAYOFF_HIGHLIGHT_DROUGHT_RUN fires when the longest no-highlighted-dialogue run is ≥6', async () => {
      const recs650b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs650b[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'] });
      recs650b[1] = makeSharedRecord(1, { dialogueHighlights: ['line-b'] });
      recs650b[2] = makeSharedRecord(2, { dialogueHighlights: ['line-c'] });
      recs650b[9] = makeSharedRecord(9, { dialogueHighlights: ['line-d'] });
      const res = await runPY650(recs650b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_HIGHLIGHT_DROUGHT_RUN'), 'PAYOFF_HIGHLIGHT_DROUGHT_RUN should fire');
    });

    // PAYOFF_HIGHLIGHT_DROUGHT_RUN no-fire:
    // highlights at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('PAYOFF_HIGHLIGHT_DROUGHT_RUN does not fire when highlighted dialogue is distributed without a long drought', async () => {
      const recs650bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs650bn[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'] });
      recs650bn[4] = makeSharedRecord(4, { dialogueHighlights: ['line-b'] });
      recs650bn[9] = makeSharedRecord(9, { dialogueHighlights: ['line-c'] });
      const res = await runPY650(recs650bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_HIGHLIGHT_DROUGHT_RUN'), 'PAYOFF_HIGHLIGHT_DROUGHT_RUN should not fire');
    });

    // PAYOFF_OPEN_THREAD_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; open-thread scenes at 0,1,2 → 100% opening third
    it('PAYOFF_OPEN_THREAD_ZONE_CLUSTER fires when >75% of open-thread scenes cluster in one third', async () => {
      const recs650c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs650c[0] = makeSharedRecord(0, { unresolvedClues: ['a'] });
      recs650c[1] = makeSharedRecord(1, { unresolvedClues: ['b'] });
      recs650c[2] = makeSharedRecord(2, { unresolvedClues: ['c'] });
      const res = await runPY650(recs650c);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_OPEN_THREAD_ZONE_CLUSTER'), 'PAYOFF_OPEN_THREAD_ZONE_CLUSTER should fire');
    });

    // PAYOFF_OPEN_THREAD_ZONE_CLUSTER no-fire:
    // open-thread scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('PAYOFF_OPEN_THREAD_ZONE_CLUSTER does not fire when open-thread scenes are distributed across thirds', async () => {
      const recs650cn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs650cn[0] = makeSharedRecord(0, { unresolvedClues: ['a'] });
      recs650cn[4] = makeSharedRecord(4, { unresolvedClues: ['b'] });
      recs650cn[7] = makeSharedRecord(7, { unresolvedClues: ['c'] });
      const res = await runPY650(recs650cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_OPEN_THREAD_ZONE_CLUSTER'), 'PAYOFF_OPEN_THREAD_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 636 — payoffPass: payoff highlight open thread decoupled, payoff turn highlight aftermath void, payoff dialogue highlight zone imbalance', async () => {
    const runPY636 = async (records: ScreenplaySceneRecord[]) => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      return payoffPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // PAYOFF_HIGHLIGHT_OPEN_THREAD_DECOUPLED fire:
    // n=6; highlights at 0,1 (no debt); debt at 4,5 (no highlight) → zero overlap → fires
    it('PAYOFF_HIGHLIGHT_OPEN_THREAD_DECOUPLED fires when dialogue-highlight scenes and open-thread scenes never overlap', async () => {
      const recs636a = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs636a[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'] });
      recs636a[1] = makeSharedRecord(1, { dialogueHighlights: ['line-b'] });
      recs636a[4] = makeSharedRecord(4, { unresolvedClues: ['unpaid-clue'] });
      recs636a[5] = makeSharedRecord(5, { unresolvedClues: ['unpaid-clue'] });
      const res = await runPY636(recs636a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_HIGHLIGHT_OPEN_THREAD_DECOUPLED'), 'PAYOFF_HIGHLIGHT_OPEN_THREAD_DECOUPLED should fire');
    });

    // PAYOFF_HIGHLIGHT_OPEN_THREAD_DECOUPLED no-fire:
    // scene 0 carries BOTH a highlight and open debt → overlap exists
    it('PAYOFF_HIGHLIGHT_OPEN_THREAD_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs636an = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs636an[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'], unresolvedClues: ['unpaid-clue'] });
      recs636an[1] = makeSharedRecord(1, { dialogueHighlights: ['line-b'] });
      recs636an[5] = makeSharedRecord(5, { unresolvedClues: ['unpaid-clue'] });
      const res = await runPY636(recs636an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_HIGHLIGHT_OPEN_THREAD_DECOUPLED'), 'PAYOFF_HIGHLIGHT_OPEN_THREAD_DECOUPLED should not fire');
    });

    // PAYOFF_TURN_HIGHLIGHT_AFTERMATH_VOID fire:
    // n=8, window=2; turn triggers at 0,1; their windows {1,2} and {2,3} carry no dialogue
    // highlight; highlights exist elsewhere at 5,6,7 → fires
    it('PAYOFF_TURN_HIGHLIGHT_AFTERMATH_VOID fires when no dramatic turn is followed by a dialogue highlight within 2 scenes', async () => {
      const recs636b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs636b[0] = makeSharedRecord(0, { dramaticTurn: 'reversal' });
      recs636b[1] = makeSharedRecord(1, { dramaticTurn: 'revelation' });
      recs636b[5] = makeSharedRecord(5, { dialogueHighlights: ['line-a'] });
      recs636b[6] = makeSharedRecord(6, { dialogueHighlights: ['line-b'] });
      recs636b[7] = makeSharedRecord(7, { dialogueHighlights: ['line-c'] });
      const res = await runPY636(recs636b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_TURN_HIGHLIGHT_AFTERMATH_VOID'), 'PAYOFF_TURN_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    // PAYOFF_TURN_HIGHLIGHT_AFTERMATH_VOID no-fire:
    // scene 3 (inside trigger 1's window {2,3}) now carries a highlight → that trigger's
    // aftermath is no longer void
    it('PAYOFF_TURN_HIGHLIGHT_AFTERMATH_VOID does not fire when a trigger window contains a dialogue highlight', async () => {
      const recs636bn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs636bn[0] = makeSharedRecord(0, { dramaticTurn: 'reversal' });
      recs636bn[1] = makeSharedRecord(1, { dramaticTurn: 'revelation' });
      recs636bn[3] = makeSharedRecord(3, { dialogueHighlights: ['line-a'] });
      recs636bn[5] = makeSharedRecord(5, { dialogueHighlights: ['line-b'] });
      recs636bn[6] = makeSharedRecord(6, { dialogueHighlights: ['line-c'] });
      recs636bn[7] = makeSharedRecord(7, { dialogueHighlights: ['line-d'] });
      const res = await runPY636(recs636bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_TURN_HIGHLIGHT_AFTERMATH_VOID'), 'PAYOFF_TURN_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });

    // PAYOFF_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE fire:
    // n=12 (three scenes per zone); highlights at 6,7,8,9; zone 2 (6-8)=3, zone 3 (9)=1, total=4;
    // zones 0,1 empty; bloatZoneIdx=zone2, 3/4=75% ≥ 50% → fires
    it('PAYOFF_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE fires when one zone is empty of dialogue highlights while another is bloated', async () => {
      const recs636c = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs636c[6] = makeSharedRecord(6, { dialogueHighlights: ['line-a'] });
      recs636c[7] = makeSharedRecord(7, { dialogueHighlights: ['line-b'] });
      recs636c[8] = makeSharedRecord(8, { dialogueHighlights: ['line-c'] });
      recs636c[9] = makeSharedRecord(9, { dialogueHighlights: ['line-d'] });
      const res = await runPY636(recs636c);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE'), 'PAYOFF_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE should fire');
    });

    // PAYOFF_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE no-fire:
    // one highlight per zone (1,4,7,10) → no zone is empty
    it('PAYOFF_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE does not fire when highlights are spread across all zones', async () => {
      const recs636cn = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs636cn[1] = makeSharedRecord(1, { dialogueHighlights: ['line-a'] });
      recs636cn[4] = makeSharedRecord(4, { dialogueHighlights: ['line-b'] });
      recs636cn[7] = makeSharedRecord(7, { dialogueHighlights: ['line-c'] });
      recs636cn[10] = makeSharedRecord(10, { dialogueHighlights: ['line-d'] });
      const res = await runPY636(recs636cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE'), 'PAYOFF_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 622 — payoffPass: visual beat open thread decoupled, clock staging aftermath void, payoff open thread zone imbalance', async () => {
    const runPY622 = async (records: ScreenplaySceneRecord[]) => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      return payoffPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // VISUAL_BEAT_OPEN_THREAD_DECOUPLED fire:
    // n=6; staged at 0,1 (no debt); debt at 4,5 (no staging) → zero overlap → fires
    it('VISUAL_BEAT_OPEN_THREAD_DECOUPLED fires when visually-staged scenes and open-thread scenes never overlap', async () => {
      const recs622a = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs622a[0] = makeSharedRecord(0, { visualBeats: ['opens the safe', 'counts the cash'] });
      recs622a[1] = makeSharedRecord(1, { visualBeats: ['opens the safe', 'counts the cash'] });
      recs622a[4] = makeSharedRecord(4, { unresolvedClues: ['unpaid-clue'] });
      recs622a[5] = makeSharedRecord(5, { unresolvedClues: ['unpaid-clue'] });
      const res = await runPY622(recs622a);
      assert.ok(res.issues.some((i: any) => i.rule === 'VISUAL_BEAT_OPEN_THREAD_DECOUPLED'), 'VISUAL_BEAT_OPEN_THREAD_DECOUPLED should fire');
    });

    // VISUAL_BEAT_OPEN_THREAD_DECOUPLED no-fire:
    // scene 0 carries BOTH staging and open debt → overlap exists
    it('VISUAL_BEAT_OPEN_THREAD_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs622an = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs622an[0] = makeSharedRecord(0, { visualBeats: ['opens the safe', 'counts the cash'], unresolvedClues: ['unpaid-clue'] });
      recs622an[1] = makeSharedRecord(1, { visualBeats: ['opens the safe', 'counts the cash'] });
      recs622an[5] = makeSharedRecord(5, { unresolvedClues: ['unpaid-clue'] });
      const res = await runPY622(recs622an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VISUAL_BEAT_OPEN_THREAD_DECOUPLED'), 'VISUAL_BEAT_OPEN_THREAD_DECOUPLED should not fire');
    });

    // CLOCK_STAGING_AFTERMATH_VOID fire:
    // n=8, window=2; clock triggers at 0,1; their windows {1,2} and {2,3} carry no visually
    // dense scene; staged scenes exist elsewhere at 5,6,7 → fires
    it('CLOCK_STAGING_AFTERMATH_VOID fires when no clock-raising scene is followed by a visually dense scene within 2 scenes', async () => {
      const recs622b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs622b[0] = makeSharedRecord(0, { clockRaised: true });
      recs622b[1] = makeSharedRecord(1, { clockRaised: true });
      recs622b[5] = makeSharedRecord(5, { visualBeats: ['opens the safe', 'counts the cash'] });
      recs622b[6] = makeSharedRecord(6, { visualBeats: ['opens the safe', 'counts the cash'] });
      recs622b[7] = makeSharedRecord(7, { visualBeats: ['opens the safe', 'counts the cash'] });
      const res = await runPY622(recs622b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLOCK_STAGING_AFTERMATH_VOID'), 'CLOCK_STAGING_AFTERMATH_VOID should fire');
    });

    // CLOCK_STAGING_AFTERMATH_VOID no-fire:
    // scene 3 (inside trigger 1's window {2,3}) now carries staging → that trigger's aftermath
    // is no longer void
    it('CLOCK_STAGING_AFTERMATH_VOID does not fire when a trigger window contains a visually dense scene', async () => {
      const recs622bn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs622bn[0] = makeSharedRecord(0, { clockRaised: true });
      recs622bn[1] = makeSharedRecord(1, { clockRaised: true });
      recs622bn[3] = makeSharedRecord(3, { visualBeats: ['opens the safe', 'counts the cash'] });
      recs622bn[5] = makeSharedRecord(5, { visualBeats: ['opens the safe', 'counts the cash'] });
      recs622bn[6] = makeSharedRecord(6, { visualBeats: ['opens the safe', 'counts the cash'] });
      recs622bn[7] = makeSharedRecord(7, { visualBeats: ['opens the safe', 'counts the cash'] });
      const res = await runPY622(recs622bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLOCK_STAGING_AFTERMATH_VOID'), 'CLOCK_STAGING_AFTERMATH_VOID should not fire');
    });

    // PAYOFF_OPEN_THREAD_ZONE_IMBALANCE fire:
    // n=12 (three scenes per zone); debt at 6,7,8,9; zone 2 (6-8)=3, zone 3 (9)=1, total=4;
    // zones 0,1 empty; bloatZoneIdx=zone2, 3/4=75% ≥ 50% → fires
    it('PAYOFF_OPEN_THREAD_ZONE_IMBALANCE fires when one zone is empty of open-thread scenes while another is bloated', async () => {
      const recs622c = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs622c[6] = makeSharedRecord(6, { unresolvedClues: ['a'] });
      recs622c[7] = makeSharedRecord(7, { unresolvedClues: ['b'] });
      recs622c[8] = makeSharedRecord(8, { unresolvedClues: ['c'] });
      recs622c[9] = makeSharedRecord(9, { unresolvedClues: ['d'] });
      const res = await runPY622(recs622c);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_OPEN_THREAD_ZONE_IMBALANCE'), 'PAYOFF_OPEN_THREAD_ZONE_IMBALANCE should fire');
    });

    // PAYOFF_OPEN_THREAD_ZONE_IMBALANCE no-fire:
    // one open-thread scene per zone (1,4,7,10) → no zone is empty
    it('PAYOFF_OPEN_THREAD_ZONE_IMBALANCE does not fire when open-thread scenes are spread across all zones', async () => {
      const recs622cn = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs622cn[1] = makeSharedRecord(1, { unresolvedClues: ['a'] });
      recs622cn[4] = makeSharedRecord(4, { unresolvedClues: ['b'] });
      recs622cn[7] = makeSharedRecord(7, { unresolvedClues: ['c'] });
      recs622cn[10] = makeSharedRecord(10, { unresolvedClues: ['d'] });
      const res = await runPY622(recs622cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_OPEN_THREAD_ZONE_IMBALANCE'), 'PAYOFF_OPEN_THREAD_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 608 — payoffPass: payoff dialogue highlight decoupled, visual staging zone imbalance, seed dialogue highlight aftermath void', async () => {
    const runPY608 = async (records: ScreenplaySceneRecord[]) => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      return payoffPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // PAYOFF_DIALOGUE_HIGHLIGHT_DECOUPLED fire:
    // n=8; payoffs at 0,1 (no highlight); highlights at 2,3 (no payoff) → zero overlap → fires
    it('PAYOFF_DIALOGUE_HIGHLIGHT_DECOUPLED fires when payoff scenes and dialogue highlights never overlap', async () => {
      const recs608a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs608a[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs608a[1] = makeSharedRecord(1, { payoffSetupIds: ['thread-b'] });
      recs608a[2] = makeSharedRecord(2, { dialogueHighlights: ['a memorable line'] });
      recs608a[3] = makeSharedRecord(3, { dialogueHighlights: ['another line'] });
      const res = await runPY608(recs608a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_DIALOGUE_HIGHLIGHT_DECOUPLED'), 'PAYOFF_DIALOGUE_HIGHLIGHT_DECOUPLED should fire');
    });

    // PAYOFF_DIALOGUE_HIGHLIGHT_DECOUPLED no-fire:
    // scene 1 carries BOTH a payoff and a dialogue highlight → overlap exists
    it('PAYOFF_DIALOGUE_HIGHLIGHT_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs608an = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs608an[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs608an[1] = makeSharedRecord(1, { payoffSetupIds: ['thread-b'], dialogueHighlights: ['a memorable line'] });
      recs608an[3] = makeSharedRecord(3, { dialogueHighlights: ['another line'] });
      const res = await runPY608(recs608an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_DIALOGUE_HIGHLIGHT_DECOUPLED'), 'PAYOFF_DIALOGUE_HIGHLIGHT_DECOUPLED should not fire');
    });

    // VISUAL_STAGING_ZONE_IMBALANCE fire:
    // n=12 (three scenes per zone); visually dense scenes (visualBeats≥2) at 6,9,10,11;
    // zones 0 (0-2) and 1 (3-5) are empty; zone 3 (9-11) holds 3/4 = 75% ≥ 50% → fires
    it('VISUAL_STAGING_ZONE_IMBALANCE fires when one zone is empty of visually dense scenes while another is bloated', async () => {
      const recs608b = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs608b[6] = makeSharedRecord(6, { visualBeats: ['opens the case', 'reads the label'] });
      recs608b[9] = makeSharedRecord(9, { visualBeats: ['opens the case', 'reads the label'] });
      recs608b[10] = makeSharedRecord(10, { visualBeats: ['opens the case', 'reads the label'] });
      recs608b[11] = makeSharedRecord(11, { visualBeats: ['opens the case', 'reads the label'] });
      const res = await runPY608(recs608b);
      assert.ok(res.issues.some((i: any) => i.rule === 'VISUAL_STAGING_ZONE_IMBALANCE'), 'VISUAL_STAGING_ZONE_IMBALANCE should fire');
    });

    // VISUAL_STAGING_ZONE_IMBALANCE no-fire:
    // one visually dense scene per zone (1,4,7,10) → no zone is empty
    it('VISUAL_STAGING_ZONE_IMBALANCE does not fire when every zone has a visually dense scene', async () => {
      const recs608bn = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs608bn[1] = makeSharedRecord(1, { visualBeats: ['opens the case', 'reads the label'] });
      recs608bn[4] = makeSharedRecord(4, { visualBeats: ['opens the case', 'reads the label'] });
      recs608bn[7] = makeSharedRecord(7, { visualBeats: ['opens the case', 'reads the label'] });
      recs608bn[10] = makeSharedRecord(10, { visualBeats: ['opens the case', 'reads the label'] });
      const res = await runPY608(recs608bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VISUAL_STAGING_ZONE_IMBALANCE'), 'VISUAL_STAGING_ZONE_IMBALANCE should not fire');
    });

    // SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fire:
    // n=8, window=2; seed triggers at 0,1; their windows {1,2} and {2,3} carry no dialogue
    // highlight; highlights exist elsewhere at 5,6,7 → fires
    it('SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fires when no seed is followed by a dialogue highlight within 2 scenes', async () => {
      const recs608c = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs608c[0] = makeSharedRecord(0, { seededClueIds: ['clue-a'] });
      recs608c[1] = makeSharedRecord(1, { seededClueIds: ['clue-b'] });
      recs608c[5] = makeSharedRecord(5, { dialogueHighlights: ['line-a'] });
      recs608c[6] = makeSharedRecord(6, { dialogueHighlights: ['line-b'] });
      recs608c[7] = makeSharedRecord(7, { dialogueHighlights: ['line-c'] });
      const res = await runPY608(recs608c);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    // SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID no-fire:
    // scene 3 (inside trigger 1's window {2,3}) now carries a highlight → that trigger's
    // aftermath is no longer void
    it('SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID does not fire when a trigger window contains a dialogue highlight', async () => {
      const recs608cn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs608cn[0] = makeSharedRecord(0, { seededClueIds: ['clue-a'] });
      recs608cn[1] = makeSharedRecord(1, { seededClueIds: ['clue-b'] });
      recs608cn[3] = makeSharedRecord(3, { dialogueHighlights: ['line-a'] });
      recs608cn[5] = makeSharedRecord(5, { dialogueHighlights: ['line-b'] });
      recs608cn[6] = makeSharedRecord(6, { dialogueHighlights: ['line-c'] });
      recs608cn[7] = makeSharedRecord(7, { dialogueHighlights: ['line-d'] });
      const res = await runPY608(recs608cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });
  });


  describe('Wave 594 — payoffPass: seed purpose monotone, payoff purpose monotone, clue seed zone imbalance', async () => {
    const runPY594 = async (records: ScreenplaySceneRecord[]) => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      return payoffPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    it('SEED_PURPOSE_MONOTONE fires when >70% of seed scenes share the same purpose', async () => {
      // 8 scenes; seeds at 0,1,2,4 (4 total) — 3 of them ('complicate') = 75% > 70%
      const recs594a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs594a[0] = makeSharedRecord(0, { purpose: 'complicate', seededClueIds: ['a'] });
      recs594a[1] = makeSharedRecord(1, { purpose: 'complicate', seededClueIds: ['b'] });
      recs594a[2] = makeSharedRecord(2, { purpose: 'complicate', seededClueIds: ['c'] });
      recs594a[4] = makeSharedRecord(4, { purpose: 'raise_stakes', seededClueIds: ['d'] });
      const res = await runPY594(recs594a);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_PURPOSE_MONOTONE'), 'SEED_PURPOSE_MONOTONE should fire');
    });

    it('SEED_PURPOSE_MONOTONE does not fire when seed scenes are spread across purposes', async () => {
      // 4 seeds, each with a distinct purpose — dominant share = 25% < 70%
      const recs594a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs594a[0] = makeSharedRecord(0, { purpose: 'complicate', seededClueIds: ['a'] });
      recs594a[1] = makeSharedRecord(1, { purpose: 'raise_stakes', seededClueIds: ['b'] });
      recs594a[2] = makeSharedRecord(2, { purpose: 'establish_world', seededClueIds: ['c'] });
      recs594a[4] = makeSharedRecord(4, { purpose: 'character_moment', seededClueIds: ['d'] });
      const res = await runPY594(recs594a);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_PURPOSE_MONOTONE'), 'SEED_PURPOSE_MONOTONE should not fire');
    });

    it('PAYOFF_PURPOSE_MONOTONE fires when >70% of payoff scenes share the same purpose', async () => {
      const recs594b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs594b[0] = makeSharedRecord(0, { purpose: 'resolution', payoffSetupIds: ['a'] });
      recs594b[1] = makeSharedRecord(1, { purpose: 'resolution', payoffSetupIds: ['b'] });
      recs594b[2] = makeSharedRecord(2, { purpose: 'resolution', payoffSetupIds: ['c'] });
      recs594b[4] = makeSharedRecord(4, { purpose: 'climax', payoffSetupIds: ['d'] });
      const res = await runPY594(recs594b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_PURPOSE_MONOTONE'), 'PAYOFF_PURPOSE_MONOTONE should fire');
    });

    it('PAYOFF_PURPOSE_MONOTONE does not fire when payoff scenes are spread across purposes', async () => {
      const recs594b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs594b[0] = makeSharedRecord(0, { purpose: 'resolution', payoffSetupIds: ['a'] });
      recs594b[1] = makeSharedRecord(1, { purpose: 'climax', payoffSetupIds: ['b'] });
      recs594b[2] = makeSharedRecord(2, { purpose: 'character_moment', payoffSetupIds: ['c'] });
      recs594b[4] = makeSharedRecord(4, { purpose: 'turning_point', payoffSetupIds: ['d'] });
      const res = await runPY594(recs594b);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_PURPOSE_MONOTONE'), 'PAYOFF_PURPOSE_MONOTONE should not fire');
    });

    it('CLUE_SEED_ZONE_IMBALANCE fires when one zone has zero seeds and another has ≥50%', async () => {
      // 12 scenes, 4 zones of 3 each: seeds at 6,7,8 (zone 2 = Act 2b, 3/4=75%) plus one more at 9
      // (zone 3) to meet minCount=4 — zones 0,1 remain empty, zone 2 still holds ≥50% of the total
      const recs594c = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs594c[6] = makeSharedRecord(6, { seededClueIds: ['a'] });
      recs594c[7] = makeSharedRecord(7, { seededClueIds: ['b'] });
      recs594c[8] = makeSharedRecord(8, { seededClueIds: ['c'] });
      recs594c[9] = makeSharedRecord(9, { seededClueIds: ['d'] });
      const res = await runPY594(recs594c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLUE_SEED_ZONE_IMBALANCE'), 'CLUE_SEED_ZONE_IMBALANCE should fire');
    });

    it('CLUE_SEED_ZONE_IMBALANCE does not fire when seeds are spread across all zones', async () => {
      // one seed per zone (12 scenes, zones of 3): 1,4,7,10 → no empty zone
      const recs594c = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs594c[1] = makeSharedRecord(1, { seededClueIds: ['a'] });
      recs594c[4] = makeSharedRecord(4, { seededClueIds: ['b'] });
      recs594c[7] = makeSharedRecord(7, { seededClueIds: ['c'] });
      recs594c[10] = makeSharedRecord(10, { seededClueIds: ['d'] });
      const res = await runPY594(recs594c);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLUE_SEED_ZONE_IMBALANCE'), 'CLUE_SEED_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 580 — payoffPass: seed opening zone absent, payoff seed decoupled, payoff consecutive valence run', async () => {
    const makeRec580 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runPY580 = async (records: any[]) => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      return payoffPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    // SEED_OPENING_ZONE_ABSENT fire: n=9; 4 seeds at idx 3,4,5,7 — none in opening third (idx 0-2) → fires
    it('SEED_OPENING_ZONE_ABSENT fires when all seed scenes fall outside the opening structural third', async () => {
      const recs580a = Array.from({ length: 9 }, (_, i) =>
        makeRec580(i, { seededClueIds: [3, 4, 5, 7].includes(i) ? ['clue1'] : [] }),
      );
      const res = await runPY580(recs580a);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_OPENING_ZONE_ABSENT'), 'SEED_OPENING_ZONE_ABSENT should fire');
    });

    // SEED_OPENING_ZONE_ABSENT no-fire: seed at idx 0 (opening third) → hasSeedInOpening=true → no fire
    it('SEED_OPENING_ZONE_ABSENT does not fire when at least one seed falls in the opening structural third', async () => {
      const recs580anr = Array.from({ length: 9 }, (_, i) =>
        makeRec580(i, { seededClueIds: [0, 3, 5, 7].includes(i) ? ['clue1'] : [] }),
      );
      const res = await runPY580(recs580anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_OPENING_ZONE_ABSENT'), 'SEED_OPENING_ZONE_ABSENT should not fire');
    });

    // PAYOFF_SEED_DECOUPLED fire: n=8; payoffs at idx 0,2,4 — seeds at idx 1,3,5 — no overlap → fires
    it('PAYOFF_SEED_DECOUPLED fires when no scene carries both a payoff and a seed', async () => {
      const recs580b = Array.from({ length: 8 }, (_, i) =>
        makeRec580(i, {
          payoffSetupIds: [0, 2, 4].includes(i) ? ['p1'] : [],
          seededClueIds: [1, 3, 5].includes(i) ? ['s1'] : [],
        }),
      );
      const res = await runPY580(recs580b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_SEED_DECOUPLED'), 'PAYOFF_SEED_DECOUPLED should fire');
    });

    // PAYOFF_SEED_DECOUPLED no-fire: idx 0 carries both a payoff and a seed → overlap exists → no fire
    it('PAYOFF_SEED_DECOUPLED does not fire when at least one scene carries both a payoff and a seed', async () => {
      const recs580bnr = Array.from({ length: 8 }, (_, i) =>
        makeRec580(i, {
          payoffSetupIds: [0, 2, 4].includes(i) ? ['p1'] : [],
          seededClueIds: [0, 3, 5].includes(i) ? ['s1'] : [],
        }),
      );
      const res = await runPY580(recs580bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_SEED_DECOUPLED'), 'PAYOFF_SEED_DECOUPLED should not fire');
    });

    // PAYOFF_CONSECUTIVE_VALENCE_RUN fire: n=8; 4 payoffs — idx 2,3,4 all positive → run=3 ≥ 3 → fires
    it('PAYOFF_CONSECUTIVE_VALENCE_RUN fires when 3+ consecutive payoffs share the same emotional valence', async () => {
      const recs580c = Array.from({ length: 8 }, (_, i) =>
        makeRec580(i, {
          payoffSetupIds: [0, 2, 3, 4].includes(i) ? ['p1'] : [],
          emotionalShift: i === 0 ? 'negative' : [2, 3, 4].includes(i) ? 'positive' : 'neutral',
        }),
      );
      const res = await runPY580(recs580c);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_CONSECUTIVE_VALENCE_RUN'), 'PAYOFF_CONSECUTIVE_VALENCE_RUN should fire');
    });

    // PAYOFF_CONSECUTIVE_VALENCE_RUN no-fire: 4 payoffs alternating valence — max run=1 → no fire
    it('PAYOFF_CONSECUTIVE_VALENCE_RUN does not fire when payoff emotional valences alternate', async () => {
      const recs580cnr = Array.from({ length: 8 }, (_, i) =>
        makeRec580(i, {
          payoffSetupIds: [0, 2, 4, 6].includes(i) ? ['p1'] : [],
          emotionalShift: i === 0 ? 'positive' : i === 2 ? 'negative' : i === 4 ? 'positive' : i === 6 ? 'positive' : 'neutral',
        }),
      );
      const res = await runPY580(recs580cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_CONSECUTIVE_VALENCE_RUN'), 'PAYOFF_CONSECUTIVE_VALENCE_RUN should not fire');
    });
  });


  describe('Wave 566 — payoffPass: payoff clock peak decoupled, seed emotional valence uniform, clue seed temporal cluster', async () => {
    const makeRec566 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runPY566 = async (records: any[]) => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      return payoffPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    // PAYOFF_CLOCK_PEAK_DECOUPLED fire:
    // n=8; peak clockDelta=3 at idx 2 (no payoff there); payoffs at idx 5,6 → peak-clock scene unpaid → fires
    it('PAYOFF_CLOCK_PEAK_DECOUPLED fires when the highest-clockDelta scene carries no payoff', async () => {
      const recs566a = Array.from({ length: 8 }, (_, i) =>
        makeRec566(i, {
          clockDelta: i === 2 ? 3 : 0,
          payoffSetupIds: [5, 6].includes(i) ? ['p1'] : [],
        }),
      );
      const res = await runPY566(recs566a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_CLOCK_PEAK_DECOUPLED'), 'PAYOFF_CLOCK_PEAK_DECOUPLED should fire');
    });

    // PAYOFF_CLOCK_PEAK_DECOUPLED no-fire:
    // n=8; peak clockDelta=3 at idx 2 which DOES carry a payoff; another payoff at idx 6 → peak-clock paid → no fire
    it('PAYOFF_CLOCK_PEAK_DECOUPLED does not fire when the peak-clock scene carries a payoff', async () => {
      const recs566an = Array.from({ length: 8 }, (_, i) =>
        makeRec566(i, {
          clockDelta: i === 2 ? 3 : 0,
          payoffSetupIds: [2, 6].includes(i) ? ['p1'] : [],
        }),
      );
      const res = await runPY566(recs566an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_CLOCK_PEAK_DECOUPLED'), 'PAYOFF_CLOCK_PEAK_DECOUPLED should not fire');
    });

    // SEED_EMOTIONAL_VALENCE_UNIFORM fire:
    // n=8; seeds at idx 1,3,5 all with emotionalShift='negative' → all one valence → fires
    it('SEED_EMOTIONAL_VALENCE_UNIFORM fires when all emotionally-charged seed scenes share one valence', async () => {
      const recs566b = Array.from({ length: 8 }, (_, i) =>
        makeRec566(i, {
          seededClueIds: [1, 3, 5].includes(i) ? ['c1'] : [],
          emotionalShift: [1, 3, 5].includes(i) ? 'negative' : 'neutral',
        }),
      );
      const res = await runPY566(recs566b);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_EMOTIONAL_VALENCE_UNIFORM'), 'SEED_EMOTIONAL_VALENCE_UNIFORM should fire');
    });

    // SEED_EMOTIONAL_VALENCE_UNIFORM no-fire:
    // n=8; seed at idx 1 negative, idx 3 positive → mixed valences → no fire
    it('SEED_EMOTIONAL_VALENCE_UNIFORM does not fire when seed emotions have mixed valences', async () => {
      const recs566bn = Array.from({ length: 8 }, (_, i) =>
        makeRec566(i, {
          seededClueIds: [1, 3, 5].includes(i) ? ['c1'] : [],
          emotionalShift: i === 1 ? 'negative' : i === 3 ? 'positive' : 'neutral',
        }),
      );
      const res = await runPY566(recs566bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_EMOTIONAL_VALENCE_UNIFORM'), 'SEED_EMOTIONAL_VALENCE_UNIFORM should not fire');
    });

    // CLUE_SEED_TEMPORAL_CLUSTER fire:
    // n=9; third=3; seeds at idx 3,4,5 (all middle third) → 3/3=100%>75% → fires
    it('CLUE_SEED_TEMPORAL_CLUSTER fires when >75% of seeds fall in a single structural third', async () => {
      const recs566c = Array.from({ length: 9 }, (_, i) =>
        makeRec566(i, { seededClueIds: [3, 4, 5].includes(i) ? ['c1'] : [] }),
      );
      const res = await runPY566(recs566c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLUE_SEED_TEMPORAL_CLUSTER'), 'CLUE_SEED_TEMPORAL_CLUSTER should fire');
    });

    // CLUE_SEED_TEMPORAL_CLUSTER no-fire:
    // n=9; seeds at idx 1,4,7 → one per third, max 1/3=33%≤75% → no fire
    it('CLUE_SEED_TEMPORAL_CLUSTER does not fire when seeds are spread across thirds', async () => {
      const recs566cn = Array.from({ length: 9 }, (_, i) =>
        makeRec566(i, { seededClueIds: [1, 4, 7].includes(i) ? ['c1'] : [] }),
      );
      const res = await runPY566(recs566cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLUE_SEED_TEMPORAL_CLUSTER'), 'CLUE_SEED_TEMPORAL_CLUSTER should not fire');
    });
  });


  describe('Wave 524 — payoffPass: seed suspense aftermath absent, seed emotion aftermath absent, payoff relational aftermath absent', async () => {
    const makeRec524 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runPY524 = async (records: any[]) => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      return payoffPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    it('SEED_SUSPENSE_AFTERMATH_ABSENT fires when all seeds have no suspense rise in their aftermath', async () => {
      // 10 scenes: seeds at 0,2,4 (not last 2); suspense at 8,9 (no overlap with aftermath windows 1-2, 3-4, 5-6)
      const recs524a = Array.from({ length: 10 }, (_, i) =>
        makeRec524(i, {
          seededClueIds: [0, 2, 4].includes(i) ? ['c1'] : [],
          suspenseDelta: [8, 9].includes(i) ? 1 : 0,
        }),
      );
      const res = await runPY524(recs524a);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_SUSPENSE_AFTERMATH_ABSENT'), 'SEED_SUSPENSE_AFTERMATH_ABSENT should fire');
    });

    it('SEED_SUSPENSE_AFTERMATH_ABSENT does not fire when a seed is followed by a suspense rise', async () => {
      // 10 scenes: seeds at 0,2,4; suspense at 1 (directly after seed 0) — falls in aftermath
      const recs524an = Array.from({ length: 10 }, (_, i) =>
        makeRec524(i, {
          seededClueIds: [0, 2, 4].includes(i) ? ['c1'] : [],
          suspenseDelta: [1, 8].includes(i) ? 1 : 0,
        }),
      );
      const res = await runPY524(recs524an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_SUSPENSE_AFTERMATH_ABSENT'), 'SEED_SUSPENSE_AFTERMATH_ABSENT should not fire');
    });

    it('SEED_EMOTION_AFTERMATH_ABSENT fires when all seeds have no emotional beat in their aftermath', async () => {
      // 10 scenes: seeds at 0,2,4; emotional at 8,9 (no overlap with aftermath windows 1-2, 3-4, 5-6)
      const recs524b = Array.from({ length: 10 }, (_, i) =>
        makeRec524(i, {
          seededClueIds: [0, 2, 4].includes(i) ? ['c1'] : [],
          emotionalShift: [8, 9].includes(i) ? 'positive' : 'neutral',
        }),
      );
      const res = await runPY524(recs524b);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_EMOTION_AFTERMATH_ABSENT'), 'SEED_EMOTION_AFTERMATH_ABSENT should fire');
    });

    it('SEED_EMOTION_AFTERMATH_ABSENT does not fire when a seed is followed by an emotional scene', async () => {
      // 10 scenes: seeds at 0,2,4; emotional at 1 (directly after seed 0) — falls in aftermath
      const recs524bn = Array.from({ length: 10 }, (_, i) =>
        makeRec524(i, {
          seededClueIds: [0, 2, 4].includes(i) ? ['c1'] : [],
          emotionalShift: i === 1 ? 'negative' : 'neutral',
        }),
      );
      const res = await runPY524(recs524bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_EMOTION_AFTERMATH_ABSENT'), 'SEED_EMOTION_AFTERMATH_ABSENT should not fire');
    });

    it('PAYOFF_RELATIONAL_AFTERMATH_ABSENT fires when all payoffs have no relational shift in their aftermath', async () => {
      // 10 scenes: payoffs at 0,2,4; relational shifts at 8,9 (outside aftermath windows)
      const recs524c = Array.from({ length: 10 }, (_, i) =>
        makeRec524(i, {
          payoffSetupIds: [0, 2, 4].includes(i) ? ['s1'] : [],
          relationshipShifts: [8, 9].includes(i) ? [{ pairKey: 'A|B', dimension: 'trust', amount: 0.3 }] : [],
        }),
      );
      const res = await runPY524(recs524c);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_RELATIONAL_AFTERMATH_ABSENT'), 'PAYOFF_RELATIONAL_AFTERMATH_ABSENT should fire');
    });

    it('PAYOFF_RELATIONAL_AFTERMATH_ABSENT does not fire when a payoff is followed by a relational shift', async () => {
      // 10 scenes: payoffs at 0,2,4; relational shift at 1 (directly after payoff 0)
      const recs524cn = Array.from({ length: 10 }, (_, i) =>
        makeRec524(i, {
          payoffSetupIds: [0, 2, 4].includes(i) ? ['s1'] : [],
          relationshipShifts: [1, 8].includes(i) ? [{ pairKey: 'A|B', dimension: 'trust', amount: 0.3 }] : [],
        }),
      );
      const res = await runPY524(recs524cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_RELATIONAL_AFTERMATH_ABSENT'), 'PAYOFF_RELATIONAL_AFTERMATH_ABSENT should not fire');
    });
  });


  describe('Wave 510 — payoffPass: seed revelation aftermath absent, payoff seed aftermath absent, seed drought run', async () => {
    const makeRec510 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeFountain510 = (n: number) =>
      Array.from({ length: n }, (_, i) => `INT. SC${i} - DAY\n\nAction line for scene ${i}.`).join('\n\n');
    const runP510 = async (records: any[]) => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      return payoffPass({ fountain: makeFountain510(records.length), original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // SEED_REVELATION_AFTERMATH_ABSENT fire: n=8; seeds at 0,1,2; revelations at 6,7 only
    // → no seed followed within 2 scenes by a revelation → fires
    it('SEED_REVELATION_AFTERMATH_ABSENT fires when no seed is followed within 2 scenes by a revelation', async () => {
      const recs510a: any[] = Array.from({ length: 8 }, (_, i) => makeRec510(i, {
        seededClueIds: [0, 1, 2].includes(i) ? ['C1'] : [],
        revelation: [6, 7].includes(i) ? 'something revealed' : null,
      }));
      const res = await runP510(recs510a);
      assert.ok(res.issues.some((x: any) => x.rule === 'SEED_REVELATION_AFTERMATH_ABSENT'), 'SEED_REVELATION_AFTERMATH_ABSENT should fire');
    });

    // SEED_REVELATION_AFTERMATH_ABSENT no-fire: revelation at 3 (within 2 of seed at 1 and 2) → no fire
    it('SEED_REVELATION_AFTERMATH_ABSENT does not fire when at least one seed is followed by a revelation', async () => {
      const recs510anr: any[] = Array.from({ length: 8 }, (_, i) => makeRec510(i, {
        seededClueIds: [0, 1, 2].includes(i) ? ['C1'] : [],
        revelation: i === 3 ? 'partial truth surfaces' : null,
      }));
      const res = await runP510(recs510anr);
      assert.ok(!res.issues.some((x: any) => x.rule === 'SEED_REVELATION_AFTERMATH_ABSENT'), 'SEED_REVELATION_AFTERMATH_ABSENT should not fire');
    });

    // PAYOFF_SEED_AFTERMATH_ABSENT fire: n=8; payoffs at 0,1,2; seeds only at 6,7
    // → no payoff followed within 2 scenes by a seed → fires
    it('PAYOFF_SEED_AFTERMATH_ABSENT fires when no payoff is followed within 2 scenes by a new seed', async () => {
      const recs510b: any[] = Array.from({ length: 8 }, (_, i) => makeRec510(i, {
        payoffSetupIds: [0, 1, 2].includes(i) ? ['P1'] : [],
        seededClueIds: [6, 7].includes(i) ? ['C2'] : [],
      }));
      const res = await runP510(recs510b);
      assert.ok(res.issues.some((x: any) => x.rule === 'PAYOFF_SEED_AFTERMATH_ABSENT'), 'PAYOFF_SEED_AFTERMATH_ABSENT should fire');
    });

    // PAYOFF_SEED_AFTERMATH_ABSENT no-fire: seed at 3 (within 2 of payoff at 1 and 2) → no fire
    it('PAYOFF_SEED_AFTERMATH_ABSENT does not fire when at least one payoff is followed by a new seed', async () => {
      const recs510bnr: any[] = Array.from({ length: 8 }, (_, i) => makeRec510(i, {
        payoffSetupIds: [0, 1, 2].includes(i) ? ['P1'] : [],
        seededClueIds: i === 3 ? ['C2'] : [],
      }));
      const res = await runP510(recs510bnr);
      assert.ok(!res.issues.some((x: any) => x.rule === 'PAYOFF_SEED_AFTERMATH_ABSENT'), 'PAYOFF_SEED_AFTERMATH_ABSENT should not fire');
    });

    // SEED_DROUGHT_RUN fire: n=8; seeds at 0,1,2; scenes 3-7 have no seeds → drought run of 5 → fires
    it('SEED_DROUGHT_RUN fires when 5+ consecutive scenes have no clue seeding', async () => {
      const recs510c: any[] = Array.from({ length: 8 }, (_, i) => makeRec510(i, {
        seededClueIds: i < 3 ? ['C3'] : [],
      }));
      const res = await runP510(recs510c);
      assert.ok(res.issues.some((x: any) => x.rule === 'SEED_DROUGHT_RUN'), 'SEED_DROUGHT_RUN should fire');
    });

    // SEED_DROUGHT_RUN no-fire: n=8; seeds at 0,1,2,7; max drought run = 4 (scenes 3-6) → no fire
    it('SEED_DROUGHT_RUN does not fire when the longest seed-free run is only 4', async () => {
      const recs510cnr: any[] = Array.from({ length: 8 }, (_, i) => makeRec510(i, {
        seededClueIds: [0, 1, 2, 7].includes(i) ? ['C3'] : [],
      }));
      const res = await runP510(recs510cnr);
      assert.ok(!res.issues.some((x: any) => x.rule === 'SEED_DROUGHT_RUN'), 'SEED_DROUGHT_RUN should not fire');
    });
  });


  describe('Wave 496 — payoffPass: payoff temporal cluster, seed dramatic turn aftermath absent, payoff clock aftermath absent', async () => {
    const makeRec496 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runPO496 = async (records: any[]) => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      return payoffPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // PAYOFF_TEMPORAL_CLUSTER fire: n=9; third=3; payoffs at 0,1,2,6 → zone1=3, zone3=1, 3/4=75%>75%? No: need >75%.
    // Use 5 payoffs: 0,1,2,3,8 → zone1=[0-2]=3, zone2=[3-5]=1, zone3=[6-8]=1; 3/5=60%... need >75%.
    // Use 4 payoffs all in zone1: 0,1,2,3 of n=12 (third=4): zone1=4, max=4/4=100% → fire
    it('PAYOFF_TEMPORAL_CLUSTER fires when >75% of payoffs are in one structural third', async () => {
      const recs496a: any[] = Array.from({ length: 12 }, (_, i) => makeRec496(i, {
        payoffSetupIds: [0, 1, 2, 3].includes(i) ? ['s1'] : [],
      }));
      const res = await runPO496(recs496a);
      assert.ok(res.issues.some((x: any) => x.rule === 'PAYOFF_TEMPORAL_CLUSTER'), 'PAYOFF_TEMPORAL_CLUSTER should fire');
    });

    // PAYOFF_TEMPORAL_CLUSTER no-fire: 4 payoffs spread across thirds (one each in zones 1-3 plus extra)
    it('PAYOFF_TEMPORAL_CLUSTER does not fire when payoffs are spread across thirds', async () => {
      // n=12; third=4; payoffs at 1,5,9,11 → zone1=1,zone2=2,zone3=1; max=2/4=50% → no fire
      const recs496an: any[] = Array.from({ length: 12 }, (_, i) => makeRec496(i, {
        payoffSetupIds: [1, 5, 9, 11].includes(i) ? ['s1'] : [],
      }));
      const res = await runPO496(recs496an);
      assert.ok(!res.issues.some((x: any) => x.rule === 'PAYOFF_TEMPORAL_CLUSTER'), 'PAYOFF_TEMPORAL_CLUSTER should not fire');
    });

    // SEED_DRAMATIC_TURN_AFTERMATH_ABSENT fire:
    // n=10; seeds at 1,3,5 (all qualify, not in last 2); turns at 8,9 (not within 2 of any seed)
    it('SEED_DRAMATIC_TURN_AFTERMATH_ABSENT fires when no seed is followed by a dramatic turn within 2 scenes', async () => {
      const recs496b: any[] = Array.from({ length: 10 }, (_, i) => makeRec496(i, {
        seededClueIds: [1, 3, 5].includes(i) ? ['clue1'] : [],
        dramaticTurn: [8, 9].includes(i) ? 'reversal' : 'nothing',
      }));
      const res = await runPO496(recs496b);
      assert.ok(res.issues.some((x: any) => x.rule === 'SEED_DRAMATIC_TURN_AFTERMATH_ABSENT'), 'SEED_DRAMATIC_TURN_AFTERMATH_ABSENT should fire');
    });

    // SEED_DRAMATIC_TURN_AFTERMATH_ABSENT no-fire: turn at scene 4 follows seed at scene 3
    it('SEED_DRAMATIC_TURN_AFTERMATH_ABSENT does not fire when at least one seed is followed by a dramatic turn', async () => {
      const recs496bn: any[] = Array.from({ length: 10 }, (_, i) => makeRec496(i, {
        seededClueIds: [1, 3, 5].includes(i) ? ['clue1'] : [],
        dramaticTurn: [4, 8].includes(i) ? 'reversal' : 'nothing',
      }));
      const res = await runPO496(recs496bn);
      assert.ok(!res.issues.some((x: any) => x.rule === 'SEED_DRAMATIC_TURN_AFTERMATH_ABSENT'), 'SEED_DRAMATIC_TURN_AFTERMATH_ABSENT should not fire');
    });

    // PAYOFF_CLOCK_AFTERMATH_ABSENT fire:
    // n=10; payoffs at 1,3,5; clock at 8 only (not within 2 of any payoff)
    it('PAYOFF_CLOCK_AFTERMATH_ABSENT fires when no payoff is followed by a clock raise within 2 scenes', async () => {
      const recs496c: any[] = Array.from({ length: 10 }, (_, i) => makeRec496(i, {
        payoffSetupIds: [1, 3, 5].includes(i) ? ['s1'] : [],
        clockRaised: i === 8,
        clockDelta: i === 9 ? 1 : 0,
      }));
      const res = await runPO496(recs496c);
      assert.ok(res.issues.some((x: any) => x.rule === 'PAYOFF_CLOCK_AFTERMATH_ABSENT'), 'PAYOFF_CLOCK_AFTERMATH_ABSENT should fire');
    });

    // PAYOFF_CLOCK_AFTERMATH_ABSENT no-fire: clock at scene 4 follows payoff at scene 3
    it('PAYOFF_CLOCK_AFTERMATH_ABSENT does not fire when at least one payoff is followed by a clock raise', async () => {
      const recs496cn: any[] = Array.from({ length: 10 }, (_, i) => makeRec496(i, {
        payoffSetupIds: [1, 3, 5].includes(i) ? ['s1'] : [],
        clockRaised: [4, 8].includes(i),
      }));
      const res = await runPO496(recs496cn);
      assert.ok(!res.issues.some((x: any) => x.rule === 'PAYOFF_CLOCK_AFTERMATH_ABSENT'), 'PAYOFF_CLOCK_AFTERMATH_ABSENT should not fire');
    });
  });


  describe('Wave 482 — payoffPass: seed curiosity aftermath absent, seed act 3 void, payoff aftermath relationship void', async () => {
    const makeRec482 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeFountain482 = (n: number) =>
      Array.from({ length: n }, (_, i) =>
        `INT. SC${i} - DAY\n\nAction line for scene ${i}.`
      ).join('\n\n');
    const runPay482 = async (records: any[]) => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      const fountain = makeFountain482(records.length);
      return payoffPass({ fountain, original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('SEED_CURIOSITY_AFTERMATH_ABSENT fires when no seed scene is followed by a curiosity rise within 2 scenes', async () => {
      // n=10; seeds at 2 and 6; aftermath 3-4 and 7-8 have curiosityDelta ≤ 0 → fires
      const recs482a = Array.from({ length: 10 }, (_, i) => makeRec482(i));
      recs482a[2] = makeRec482(2, { seededClueIds: ['c1'] });
      recs482a[6] = makeRec482(6, { seededClueIds: ['c2'] });
      const res = await runPay482(recs482a);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_CURIOSITY_AFTERMATH_ABSENT'), 'SEED_CURIOSITY_AFTERMATH_ABSENT should fire');
    });

    it('SEED_CURIOSITY_AFTERMATH_ABSENT does not fire when a seed is followed by a curiosity rise within 2 scenes', async () => {
      // n=10; seed at 2; scene 3 has curiosityDelta=0.5 → no fire
      const recs482anr = Array.from({ length: 10 }, (_, i) => makeRec482(i));
      recs482anr[2] = makeRec482(2, { seededClueIds: ['c1'] });
      recs482anr[3] = makeRec482(3, { curiosityDelta: 0.5 });
      recs482anr[6] = makeRec482(6, { seededClueIds: ['c2'] });
      const res = await runPay482(recs482anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_CURIOSITY_AFTERMATH_ABSENT'), 'SEED_CURIOSITY_AFTERMATH_ABSENT should not fire');
    });

    it('SEED_ACT3_VOID fires when 4+ seeds exist but none fall in the final 25%', async () => {
      // n=12 (act3=9); 4 seeds at scenes 1,3,5,7 — all before scene 9 → fires
      const recs482b = Array.from({ length: 12 }, (_, i) => makeRec482(i));
      recs482b[1] = makeRec482(1, { seededClueIds: ['c1'] });
      recs482b[3] = makeRec482(3, { seededClueIds: ['c2'] });
      recs482b[5] = makeRec482(5, { seededClueIds: ['c3'] });
      recs482b[7] = makeRec482(7, { seededClueIds: ['c4'] });
      const res = await runPay482(recs482b);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_ACT3_VOID'), 'SEED_ACT3_VOID should fire');
    });

    it('SEED_ACT3_VOID does not fire when at least one seed falls in the final 25%', async () => {
      // n=12 (act3=9); seed at scene 10 (in Act 3) → no fire
      const recs482bnr = Array.from({ length: 12 }, (_, i) => makeRec482(i));
      recs482bnr[1] = makeRec482(1, { seededClueIds: ['c1'] });
      recs482bnr[3] = makeRec482(3, { seededClueIds: ['c2'] });
      recs482bnr[5] = makeRec482(5, { seededClueIds: ['c3'] });
      recs482bnr[10] = makeRec482(10, { seededClueIds: ['c4'] });
      const res = await runPay482(recs482bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_ACT3_VOID'), 'SEED_ACT3_VOID should not fire');
    });

    it('PAYOFF_AFTERMATH_RELATIONSHIP_VOID fires when no payoff is followed by a relationship shift within 2 scenes', async () => {
      // n=10; payoffs at 2,5,8; aftermath scenes have no relationship shifts → fires
      const recs482c = Array.from({ length: 10 }, (_, i) => makeRec482(i));
      recs482c[2] = makeRec482(2, { payoffSetupIds: ['s1'] });
      recs482c[5] = makeRec482(5, { payoffSetupIds: ['s2'] });
      recs482c[8] = makeRec482(8, { payoffSetupIds: ['s3'] });
      const res = await runPay482(recs482c);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_AFTERMATH_RELATIONSHIP_VOID'), 'PAYOFF_AFTERMATH_RELATIONSHIP_VOID should fire');
    });

    it('PAYOFF_AFTERMATH_RELATIONSHIP_VOID does not fire when a payoff is followed by a relationship shift', async () => {
      // n=10; payoff at 2; scene 3 has a relationship shift → no fire
      const recs482cnr = Array.from({ length: 10 }, (_, i) => makeRec482(i));
      recs482cnr[2] = makeRec482(2, { payoffSetupIds: ['s1'] });
      recs482cnr[3] = makeRec482(3, { relationshipShifts: [{ pairKey: 'A|B', dimension: 'trust', amount: 0.3 }] });
      recs482cnr[5] = makeRec482(5, { payoffSetupIds: ['s2'] });
      recs482cnr[8] = makeRec482(8, { payoffSetupIds: ['s3'] });
      const res = await runPay482(recs482cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_AFTERMATH_RELATIONSHIP_VOID'), 'PAYOFF_AFTERMATH_RELATIONSHIP_VOID should not fire');
    });
  });


  describe('Wave 468 — payoffPass: payoff revelation aftermath absent, seed suspense aftermath absent, seed emotional aftermath absent', async () => {
    const makeRec468 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeFountain468 = (n: number) =>
      Array.from({ length: n }, (_, i) =>
        `INT. SC${i} - DAY\n\nAction line for scene ${i}.`
      ).join('\n\n');
    const runPay468 = async (records: any[]) => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      const fountain = makeFountain468(records.length);
      return payoffPass({ fountain, original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('PAYOFF_REVELATION_AFTERMATH_ABSENT fires when no payoff is followed by a revelation within 2 scenes', async () => {
      // n=10; payoffs at 2 and 6; aftermath scenes 3-4 and 7-8 all have revelation=null → fires
      const recs468a = Array.from({ length: 10 }, (_, i) => makeRec468(i));
      recs468a[2] = makeRec468(2, { payoffSetupIds: ['s1'] });
      recs468a[6] = makeRec468(6, { payoffSetupIds: ['s2'] });
      const res = await runPay468(recs468a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_REVELATION_AFTERMATH_ABSENT'), 'PAYOFF_REVELATION_AFTERMATH_ABSENT should fire');
    });

    it('PAYOFF_REVELATION_AFTERMATH_ABSENT does not fire when a payoff is followed by a revelation within 2 scenes', async () => {
      // n=10; payoff at 2; scene 3 has revelation → no fire
      const recs468anr = Array.from({ length: 10 }, (_, i) => makeRec468(i));
      recs468anr[2] = makeRec468(2, { payoffSetupIds: ['s1'] });
      recs468anr[3] = makeRec468(3, { revelation: 'the true identity' });
      recs468anr[6] = makeRec468(6, { payoffSetupIds: ['s2'] });
      const res = await runPay468(recs468anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_REVELATION_AFTERMATH_ABSENT'), 'PAYOFF_REVELATION_AFTERMATH_ABSENT should not fire');
    });

    it('SEED_SUSPENSE_AFTERMATH_ABSENT fires when no seed scene is followed by a suspense rise within 2 scenes', async () => {
      // n=10; seeds at 1 and 5; aftermath scenes 2-3 and 6-7 all have suspenseDelta=0 → fires
      const recs468b = Array.from({ length: 10 }, (_, i) => makeRec468(i));
      recs468b[1] = makeRec468(1, { seededClueIds: ['c1'] });
      recs468b[5] = makeRec468(5, { seededClueIds: ['c2'] });
      const res = await runPay468(recs468b);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_SUSPENSE_AFTERMATH_ABSENT'), 'SEED_SUSPENSE_AFTERMATH_ABSENT should fire');
    });

    it('SEED_SUSPENSE_AFTERMATH_ABSENT does not fire when a seed scene is followed by a suspense rise', async () => {
      // n=10; seed at 1; scene 2 has suspenseDelta=2 → no fire
      const recs468bnr = Array.from({ length: 10 }, (_, i) => makeRec468(i));
      recs468bnr[1] = makeRec468(1, { seededClueIds: ['c1'] });
      recs468bnr[2] = makeRec468(2, { suspenseDelta: 2 });
      recs468bnr[5] = makeRec468(5, { seededClueIds: ['c2'] });
      const res = await runPay468(recs468bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_SUSPENSE_AFTERMATH_ABSENT'), 'SEED_SUSPENSE_AFTERMATH_ABSENT should not fire');
    });

    it('SEED_EMOTIONAL_AFTERMATH_ABSENT fires when no seed scene is followed by an emotional shift within 2 scenes', async () => {
      // n=10; seeds at 1 and 5; aftermath scenes 2-3 and 6-7 all neutral → fires
      const recs468c = Array.from({ length: 10 }, (_, i) => makeRec468(i));
      recs468c[1] = makeRec468(1, { seededClueIds: ['c1'] });
      recs468c[5] = makeRec468(5, { seededClueIds: ['c2'] });
      const res = await runPay468(recs468c);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_EMOTIONAL_AFTERMATH_ABSENT'), 'SEED_EMOTIONAL_AFTERMATH_ABSENT should fire');
    });

    it('SEED_EMOTIONAL_AFTERMATH_ABSENT does not fire when a seed scene is followed by an emotional shift', async () => {
      // n=10; seed at 1; scene 3 has emotionalShift='negative' → no fire
      const recs468cnr = Array.from({ length: 10 }, (_, i) => makeRec468(i));
      recs468cnr[1] = makeRec468(1, { seededClueIds: ['c1'] });
      recs468cnr[3] = makeRec468(3, { emotionalShift: 'negative' });
      recs468cnr[5] = makeRec468(5, { seededClueIds: ['c2'] });
      const res = await runPay468(recs468cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_EMOTIONAL_AFTERMATH_ABSENT'), 'SEED_EMOTIONAL_AFTERMATH_ABSENT should not fire');
    });
  });


  describe('Wave 454 — payoffPass: payoff causeless, clue seed causeless, clue seed consecutive run', async () => {
    const makeRec454 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeFountain454 = (n: number) =>
      Array.from({ length: n }, (_, i) =>
        `INT. SC${i} - DAY\n\nAction line for scene ${i}.`
      ).join('\n\n');
    const runPay454 = async (records: any[]) => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      const fountain = makeFountain454(records.length);
      return payoffPass({ fountain, original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('PAYOFF_CAUSELESS fires when all payoffs lack an upstream trigger in prior 3 scenes', async () => {
      // 8 scenes: scenes 4 and 6 have payoffs; no scene in 1-3 or 3-5 has revelation/turn/suspense
      const recs454a = Array.from({ length: 8 }, (_, i) =>
        makeRec454(i, { payoffSetupIds: [4, 6].includes(i) ? ['s1'] : [] }),
      );
      const res = await runPay454(recs454a);
      assert.ok(res.issues.some((is: any) => is.rule === 'PAYOFF_CAUSELESS'), 'PAYOFF_CAUSELESS should fire');
    });

    it('PAYOFF_CAUSELESS does not fire when at least one payoff has an upstream dramatic turn', async () => {
      // 8 scenes: scene 3 has dramaticTurn='reversal'; scene 4 has payoff → upstream trigger present
      const recs454anr = Array.from({ length: 8 }, (_, i) =>
        makeRec454(i, {
          payoffSetupIds: [4, 6].includes(i) ? ['s1'] : [],
          dramaticTurn: i === 3 ? 'reversal' : 'nothing',
        }),
      );
      const res = await runPay454(recs454anr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'PAYOFF_CAUSELESS'), 'PAYOFF_CAUSELESS should not fire');
    });

    it('CLUE_SEED_CAUSELESS fires when all seed scenes lack upstream curiosity/emotion/revelation', async () => {
      // 8 scenes: scenes 3, 5, 6 plant clues; no preceding scene has curiosityDelta>0, emotionalShift, or revelation
      const recs454b = Array.from({ length: 8 }, (_, i) =>
        makeRec454(i, { seededClueIds: [3, 5, 6].includes(i) ? ['c1'] : [] }),
      );
      const res = await runPay454(recs454b);
      assert.ok(res.issues.some((is: any) => is.rule === 'CLUE_SEED_CAUSELESS'), 'CLUE_SEED_CAUSELESS should fire');
    });

    it('CLUE_SEED_CAUSELESS does not fire when at least one seed is preceded by a curiosity rise', async () => {
      // 8 scenes: scene 4 has curiosityDelta=1; scene 5 plants a clue → upstream momentum present
      const recs454bnr = Array.from({ length: 8 }, (_, i) =>
        makeRec454(i, {
          seededClueIds: [3, 5, 6].includes(i) ? ['c1'] : [],
          curiosityDelta: i === 4 ? 1 : 0,
        }),
      );
      const res = await runPay454(recs454bnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'CLUE_SEED_CAUSELESS'), 'CLUE_SEED_CAUSELESS should not fire');
    });

    it('CLUE_SEED_CONSECUTIVE_RUN fires when 3+ consecutive scenes each plant a clue', async () => {
      // 10 scenes: scenes 2, 3, 4 each plant a clue (run of 3) → should fire
      const recs454c = Array.from({ length: 10 }, (_, i) =>
        makeRec454(i, { seededClueIds: [2, 3, 4].includes(i) ? ['c1'] : [] }),
      );
      const res = await runPay454(recs454c);
      assert.ok(res.issues.some((is: any) => is.rule === 'CLUE_SEED_CONSECUTIVE_RUN'), 'CLUE_SEED_CONSECUTIVE_RUN should fire');
    });

    it('CLUE_SEED_CONSECUTIVE_RUN does not fire when max consecutive seed run is only 2', async () => {
      // 10 scenes: seeds at 2,3 (run=2), 6,7 (run=2) — max run = 2, should not fire
      const recs454cnr = Array.from({ length: 10 }, (_, i) =>
        makeRec454(i, { seededClueIds: [2, 3, 6, 7].includes(i) ? ['c1'] : [] }),
      );
      const res = await runPay454(recs454cnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'CLUE_SEED_CONSECUTIVE_RUN'), 'CLUE_SEED_CONSECUTIVE_RUN should not fire');
    });
  });


  describe('Wave 440 — payoffPass: payoff backloaded, payoff emotional recoil absent, payoff suspense recoil absent', async () => {
    const makeRec440 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runPO440 = async (records: any[]) => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      return payoffPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('PAYOFF_BACKLOADED fires when >70% of payoffs are in the second half', async () => {
      // n=8, midpoint=4; payoffs at 4,5,6 (3 in second half) + payoff at 0 (1 in first half)
      // backRatio = 3/4 = 75% > 70% → fires
      const recs440a = Array.from({ length: 8 }, (_, i) => makeRec440(i));
      recs440a[0] = makeRec440(0, { seededClueIds: ['c1'] });
      recs440a[4] = makeRec440(4, { payoffSetupIds: ['c1'] });
      recs440a[5] = makeRec440(5, { seededClueIds: ['c2'], payoffSetupIds: ['c2'] });
      recs440a[6] = makeRec440(6, { seededClueIds: ['c3'], payoffSetupIds: ['c3'] });
      // Need 4th payoff in second half: sceneIdx=7 is >= midpoint=4
      recs440a[7] = makeRec440(7, { payoffSetupIds: ['c4'] });
      // Now payoffs at 4,5,6,7 = 4 in second half; 0 in first half... wait, only 4 payoffs?
      // payoffInfo maps are built from seededClueIds/payoffSetupIds. Let me re-read:
      // payoffInfo: a Map from setupId to scene index where it was paid off.
      // payoffInfo.size = number of unique payoff events. Above: c1 at 4, c2 at 5, c3 at 6, c4 at 7
      // First half (idx < 4): 0 payoffs; second half (idx >= 4): 4 payoffs
      // backRatio = 4/4 = 100% > 70% → fires ✓
      // But we need to seed c4 somewhere for payoffInfo to register...
      // Actually payoffInfo only tracks payoffSetupIds across scenes; c4's plant location doesn't matter
      const res = await runPO440(recs440a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_BACKLOADED'), 'PAYOFF_BACKLOADED should fire');
    });

    it('PAYOFF_BACKLOADED does not fire when payoffs are balanced across halves', async () => {
      // n=8, midpoint=4; payoffs at 1,2 (first half) and 5,6 (second half)
      // backRatio = 2/4 = 50% ≤ 70% → no fire
      const recs440anr = Array.from({ length: 8 }, (_, i) => makeRec440(i));
      recs440anr[1] = makeRec440(1, { payoffSetupIds: ['c1'] });
      recs440anr[2] = makeRec440(2, { payoffSetupIds: ['c2'] });
      recs440anr[5] = makeRec440(5, { payoffSetupIds: ['c3'] });
      recs440anr[6] = makeRec440(6, { payoffSetupIds: ['c4'] });
      const res = await runPO440(recs440anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_BACKLOADED'), 'PAYOFF_BACKLOADED should not fire');
    });

    it('PAYOFF_EMOTIONAL_RECOIL_ABSENT fires when no payoff is followed by negative emotional shift', async () => {
      // n=8; payoffs at 1 and 4 (both have 2+ scenes after); scenes 2,3 and 5,6 all neutral → fires
      const recs440b = Array.from({ length: 8 }, (_, i) => makeRec440(i));
      recs440b[1] = makeRec440(1, { payoffSetupIds: ['c1'] });
      recs440b[4] = makeRec440(4, { payoffSetupIds: ['c2'] });
      const res = await runPO440(recs440b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_EMOTIONAL_RECOIL_ABSENT'), 'PAYOFF_EMOTIONAL_RECOIL_ABSENT should fire');
    });

    it('PAYOFF_EMOTIONAL_RECOIL_ABSENT does not fire when a payoff is followed by negative emotion', async () => {
      // n=8; payoffs at 1 and 4; scene 2 (after payoff at 1) has emotionalShift='negative' → no fire
      const recs440bnr = Array.from({ length: 8 }, (_, i) => makeRec440(i));
      recs440bnr[1] = makeRec440(1, { payoffSetupIds: ['c1'] });
      recs440bnr[2] = makeRec440(2, { emotionalShift: 'negative' });
      recs440bnr[4] = makeRec440(4, { payoffSetupIds: ['c2'] });
      const res = await runPO440(recs440bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_EMOTIONAL_RECOIL_ABSENT'), 'PAYOFF_EMOTIONAL_RECOIL_ABSENT should not fire');
    });

    it('PAYOFF_SUSPENSE_RECOIL_ABSENT fires when no payoff is followed by a suspense rise', async () => {
      // n=8; payoffs at 1 and 4; scenes 2,3 and 5,6 all have suspenseDelta=0 → fires
      const recs440c = Array.from({ length: 8 }, (_, i) => makeRec440(i));
      recs440c[1] = makeRec440(1, { payoffSetupIds: ['c1'] });
      recs440c[4] = makeRec440(4, { payoffSetupIds: ['c2'] });
      const res = await runPO440(recs440c);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_SUSPENSE_RECOIL_ABSENT'), 'PAYOFF_SUSPENSE_RECOIL_ABSENT should fire');
    });

    it('PAYOFF_SUSPENSE_RECOIL_ABSENT does not fire when a payoff is followed by a suspense rise', async () => {
      // n=8; payoffs at 1 and 4; scene 2 has suspenseDelta=1 → no fire
      const recs440cnr = Array.from({ length: 8 }, (_, i) => makeRec440(i));
      recs440cnr[1] = makeRec440(1, { payoffSetupIds: ['c1'] });
      recs440cnr[2] = makeRec440(2, { suspenseDelta: 1 });
      recs440cnr[4] = makeRec440(4, { payoffSetupIds: ['c2'] });
      const res = await runPO440(recs440cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_SUSPENSE_RECOIL_ABSENT'), 'PAYOFF_SUSPENSE_RECOIL_ABSENT should not fire');
    });
  });


  describe('Wave 426 — payoffPass: payoff aftermath question void, payoff consecutive run, payoff relationship valence uniform', async () => {
    const mkShift426 = (amount: number) => [{ pairKey: 'A|B', dimension: 'trust', amount }];
    const makeRec426 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runPay426 = async (records: any[]) => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      return payoffPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('PAYOFF_AFTERMATH_QUESTION_VOID fires when every payoff is followed by two curiosity-flat, seed-empty scenes', async () => {
      // n=10; payoffs at 2 and 5; scenes 3,4,6,7 default (curiosityDelta 0, no seeds) → all dead-ended
      const recs426a = Array.from({ length: 10 }, (_, i) => makeRec426(i));
      recs426a[2] = makeRec426(2, { payoffSetupIds: ['s1'] });
      recs426a[5] = makeRec426(5, { payoffSetupIds: ['s2'] });
      const res = await runPay426(recs426a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_AFTERMATH_QUESTION_VOID'), 'PAYOFF_AFTERMATH_QUESTION_VOID should fire');
    });

    it('PAYOFF_AFTERMATH_QUESTION_VOID does NOT fire when a payoff is re-engaged in its aftermath', async () => {
      // n=10; payoffs at 2 and 5; scene 3 raises curiosity → payoff at 2 is not dead-ended → no fire
      const recs426aNF = Array.from({ length: 10 }, (_, i) => makeRec426(i));
      recs426aNF[2] = makeRec426(2, { payoffSetupIds: ['s1'] });
      recs426aNF[3] = makeRec426(3, { curiosityDelta: 1.5 });
      recs426aNF[5] = makeRec426(5, { payoffSetupIds: ['s2'] });
      const res = await runPay426(recs426aNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_AFTERMATH_QUESTION_VOID'), 'PAYOFF_AFTERMATH_QUESTION_VOID should not fire');
    });

    it('PAYOFF_CONSECUTIVE_RUN fires when 3+ consecutive scenes each fire a payoff', async () => {
      // n=8; payoffs at 3,4,5 (consecutive run of 3) → fires
      const recs426b = Array.from({ length: 8 }, (_, i) => makeRec426(i));
      recs426b[3] = makeRec426(3, { payoffSetupIds: ['s1'] });
      recs426b[4] = makeRec426(4, { payoffSetupIds: ['s2'] });
      recs426b[5] = makeRec426(5, { payoffSetupIds: ['s3'] });
      const res = await runPay426(recs426b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_CONSECUTIVE_RUN'), 'PAYOFF_CONSECUTIVE_RUN should fire');
    });

    it('PAYOFF_CONSECUTIVE_RUN does NOT fire when payoffs are spaced apart', async () => {
      // n=8; payoffs at 3,5,7 (no 3 consecutive) → no fire
      const recs426bNF = Array.from({ length: 8 }, (_, i) => makeRec426(i));
      recs426bNF[3] = makeRec426(3, { payoffSetupIds: ['s1'] });
      recs426bNF[5] = makeRec426(5, { payoffSetupIds: ['s2'] });
      recs426bNF[7] = makeRec426(7, { payoffSetupIds: ['s3'] });
      const res = await runPay426(recs426bNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_CONSECUTIVE_RUN'), 'PAYOFF_CONSECUTIVE_RUN should not fire');
    });

    it('PAYOFF_RELATIONSHIP_VALENCE_UNIFORM fires when all payoff-scene relational shifts share one sign', async () => {
      // n=8; payoffs at 2,4,6 each with a -0.5 shift → 3 shifts all negative → fires
      const recs426c = Array.from({ length: 8 }, (_, i) => makeRec426(i));
      recs426c[2] = makeRec426(2, { payoffSetupIds: ['s1'], relationshipShifts: mkShift426(-0.5) });
      recs426c[4] = makeRec426(4, { payoffSetupIds: ['s2'], relationshipShifts: mkShift426(-0.5) });
      recs426c[6] = makeRec426(6, { payoffSetupIds: ['s3'], relationshipShifts: mkShift426(-0.5) });
      const res = await runPay426(recs426c);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_RELATIONSHIP_VALENCE_UNIFORM'), 'PAYOFF_RELATIONSHIP_VALENCE_UNIFORM should fire');
    });

    it('PAYOFF_RELATIONSHIP_VALENCE_UNIFORM does NOT fire when payoff-scene relational shifts are mixed', async () => {
      // n=8; payoffs at 2,4,6; scene 2 has +0.5, scenes 4,6 have -0.5 → mixed signs → no fire
      const recs426cNF = Array.from({ length: 8 }, (_, i) => makeRec426(i));
      recs426cNF[2] = makeRec426(2, { payoffSetupIds: ['s1'], relationshipShifts: mkShift426(0.5) });
      recs426cNF[4] = makeRec426(4, { payoffSetupIds: ['s2'], relationshipShifts: mkShift426(-0.5) });
      recs426cNF[6] = makeRec426(6, { payoffSetupIds: ['s3'], relationshipShifts: mkShift426(-0.5) });
      const res = await runPay426(recs426cNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_RELATIONSHIP_VALENCE_UNIFORM'), 'PAYOFF_RELATIONSHIP_VALENCE_UNIFORM should not fire');
    });
  });


  describe('Wave 412 — payoffPass: clue seed curiosity peak decoupled, clue seed suspense peak decoupled, payoff relationship peak decoupled', async () => {
    const mkShift412 = (amount: number) => [{ pairKey: 'A|B', dimension: 'trust', amount }];
    const makeRec412 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runPay412 = async (records: any[]) => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      return payoffPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('CLUE_SEED_CURIOSITY_PEAK_DECOUPLED fires when the highest-curiosity scene seeds no clue', async () => {
      const recs412a = Array.from({ length: 8 }, (_, i) => makeRec412(i));
      recs412a[2] = makeRec412(2, { seededClueIds: ['c1'] });
      recs412a[4] = makeRec412(4, { seededClueIds: ['c2'], curiosityDelta: 0.5 });
      recs412a[6] = makeRec412(6, { curiosityDelta: 3 }); // peak, no seed
      const res = await runPay412(recs412a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLUE_SEED_CURIOSITY_PEAK_DECOUPLED'), 'CLUE_SEED_CURIOSITY_PEAK_DECOUPLED should fire');
    });

    it('CLUE_SEED_CURIOSITY_PEAK_DECOUPLED does NOT fire when the peak-curiosity scene seeds a clue', async () => {
      const recs412aNF = Array.from({ length: 8 }, (_, i) => makeRec412(i));
      recs412aNF[2] = makeRec412(2, { seededClueIds: ['c1'] });
      recs412aNF[6] = makeRec412(6, { curiosityDelta: 3, seededClueIds: ['c2'] }); // peak seeds a clue
      const res = await runPay412(recs412aNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLUE_SEED_CURIOSITY_PEAK_DECOUPLED'), 'CLUE_SEED_CURIOSITY_PEAK_DECOUPLED should not fire');
    });

    it('CLUE_SEED_SUSPENSE_PEAK_DECOUPLED fires when the highest-suspense scene seeds no clue', async () => {
      const recs412b = Array.from({ length: 8 }, (_, i) => makeRec412(i));
      recs412b[2] = makeRec412(2, { seededClueIds: ['c1'] });
      recs412b[4] = makeRec412(4, { seededClueIds: ['c2'] });
      recs412b[6] = makeRec412(6, { suspenseDelta: 3 }); // peak, no seed
      const res = await runPay412(recs412b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLUE_SEED_SUSPENSE_PEAK_DECOUPLED'), 'CLUE_SEED_SUSPENSE_PEAK_DECOUPLED should fire');
    });

    it('CLUE_SEED_SUSPENSE_PEAK_DECOUPLED does NOT fire when the peak-suspense scene seeds a clue', async () => {
      const recs412bNF = Array.from({ length: 8 }, (_, i) => makeRec412(i));
      recs412bNF[2] = makeRec412(2, { seededClueIds: ['c1'] });
      recs412bNF[6] = makeRec412(6, { suspenseDelta: 3, seededClueIds: ['c2'] }); // peak seeds a clue
      const res = await runPay412(recs412bNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLUE_SEED_SUSPENSE_PEAK_DECOUPLED'), 'CLUE_SEED_SUSPENSE_PEAK_DECOUPLED should not fire');
    });

    it('PAYOFF_RELATIONSHIP_PEAK_DECOUPLED fires when the largest relational shift carries no payoff', async () => {
      const recs412c = Array.from({ length: 8 }, (_, i) => makeRec412(i));
      recs412c[1] = makeRec412(1, { payoffSetupIds: ['p1'], relationshipShifts: mkShift412(0.3) });
      recs412c[3] = makeRec412(3, { payoffSetupIds: ['p2'] });
      recs412c[5] = makeRec412(5, { relationshipShifts: mkShift412(-0.9) }); // peak shift, no payoff
      const res = await runPay412(recs412c);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_RELATIONSHIP_PEAK_DECOUPLED'), 'PAYOFF_RELATIONSHIP_PEAK_DECOUPLED should fire');
    });

    it('PAYOFF_RELATIONSHIP_PEAK_DECOUPLED does NOT fire when the largest shift is a payoff scene', async () => {
      const recs412cNF = Array.from({ length: 8 }, (_, i) => makeRec412(i));
      recs412cNF[1] = makeRec412(1, { payoffSetupIds: ['p1'], relationshipShifts: mkShift412(0.3) });
      recs412cNF[5] = makeRec412(5, { payoffSetupIds: ['p2'], relationshipShifts: mkShift412(-0.9) }); // peak shift is a payoff
      const res = await runPay412(recs412cNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_RELATIONSHIP_PEAK_DECOUPLED'), 'PAYOFF_RELATIONSHIP_PEAK_DECOUPLED should not fire');
    });
  });


  describe('Wave 398 — payoffPass: clue seed suspense flat, payoff midpoint void, clue seed revelation decoupled', async () => {
    const makeRec398 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runPay398 = async (records: any[]) => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      return payoffPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('CLUE_SEED_SUSPENSE_FLAT fires when all seed scenes have zero suspense and overall suspense is present', async () => {
      // Seeds at 2,4,6 with suspenseDelta=0; scene 7 has suspenseDelta=2 (overall > 0) → fires
      const recs398a = Array.from({ length: 8 }, (_, i) => makeRec398(i, {
        seededClueIds: [2, 4, 6].includes(i) ? ['c1'] : [],
        suspenseDelta: i === 7 ? 2 : 0,
      }));
      const res = await runPay398(recs398a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLUE_SEED_SUSPENSE_FLAT'), 'CLUE_SEED_SUSPENSE_FLAT should fire');
    });

    it('CLUE_SEED_SUSPENSE_FLAT does not fire when one seed scene has positive suspense', async () => {
      // Seeds at 2,4,6; scene 4 has suspenseDelta=1.5 (not all flat) → no fire
      const recs398anr = Array.from({ length: 8 }, (_, i) => makeRec398(i, {
        seededClueIds: [2, 4, 6].includes(i) ? ['c1'] : [],
        suspenseDelta: i === 4 ? 1.5 : 0,
      }));
      const res = await runPay398(recs398anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLUE_SEED_SUSPENSE_FLAT'), 'CLUE_SEED_SUSPENSE_FLAT should not fire');
    });

    it('PAYOFF_MIDPOINT_VOID fires when payoffs exist before and after the 40%–60% zone but not within it', async () => {
      // n=10, midzone=scenes 4-5; payoffs at 1,2 (early) and 7,8 (late), none at 4-5 → fires
      const recs398b = Array.from({ length: 10 }, (_, i) => makeRec398(i, {
        payoffSetupIds: [1, 2, 7, 8].includes(i) ? ['s1'] : [],
        seededClueIds: i === 0 ? ['s1'] : [],
      }));
      const res = await runPay398(recs398b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_MIDPOINT_VOID'), 'PAYOFF_MIDPOINT_VOID should fire');
    });

    it('PAYOFF_MIDPOINT_VOID does not fire when a payoff lands in the midpoint zone', async () => {
      // n=10, midzone=scenes 4-5; payoffs at 1 (early), 4 (in midzone), 7 (late) → no fire
      const recs398bnr = Array.from({ length: 10 }, (_, i) => makeRec398(i, {
        payoffSetupIds: [1, 4, 7].includes(i) ? ['s1'] : [],
        seededClueIds: i === 0 ? ['s1'] : [],
      }));
      const res = await runPay398(recs398bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_MIDPOINT_VOID'), 'PAYOFF_MIDPOINT_VOID should not fire');
    });

    it('CLUE_SEED_REVELATION_DECOUPLED fires when no seed scene coincides with a revelation', async () => {
      // Seeds at 1,3 (revelation=null); revelations at 5,7 (no seeds) → fires
      const recs398c = Array.from({ length: 8 }, (_, i) => makeRec398(i, {
        seededClueIds: [1, 3].includes(i) ? ['c1'] : [],
        revelation: [5, 7].includes(i) ? true : null,
      }));
      const res = await runPay398(recs398c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLUE_SEED_REVELATION_DECOUPLED'), 'CLUE_SEED_REVELATION_DECOUPLED should fire');
    });

    it('CLUE_SEED_REVELATION_DECOUPLED does not fire when a seed scene also carries a revelation', async () => {
      // Seeds at 1,3; scene 3 also has revelation=true → no fire
      const recs398cnr = Array.from({ length: 8 }, (_, i) => makeRec398(i, {
        seededClueIds: [1, 3].includes(i) ? ['c1'] : [],
        revelation: [3, 6].includes(i) ? true : null,
      }));
      const res = await runPay398(recs398cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLUE_SEED_REVELATION_DECOUPLED'), 'CLUE_SEED_REVELATION_DECOUPLED should not fire');
    });
  });


  describe('Wave 303 — payoffPass: clue replant, payoff double fire, thread convergence absent', async () => {
    const makeRec303 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runPF303 = async (records: any[]) => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      return payoffPass({ fountain: '', original: '', records, structure: { actPosition: 'act2', completionPercent: 50 } as any, annotations: [], approvedSpans: [] });
    };

    it('CLUE_REPLANT fires when the same clue ID is seeded in two scenes', async () => {
      const recs303cr = Array.from({ length: 8 }, (_, i) =>
        makeRec303(i, {
          seededClueIds: i === 1 || i === 3 ? ['clue-a'] : [],
          payoffSetupIds: i === 6 ? ['clue-a'] : [],
        })
      );
      const res = await runPF303(recs303cr);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLUE_REPLANT'), 'CLUE_REPLANT should fire');
    });

    it('CLUE_REPLANT does not fire when each clue is seeded once', async () => {
      const recs303ncr = Array.from({ length: 8 }, (_, i) =>
        makeRec303(i, {
          seededClueIds: i === 1 ? ['clue-a'] : i === 3 ? ['clue-b'] : [],
          payoffSetupIds: i === 6 ? ['clue-a', 'clue-b'] : [],
        })
      );
      const res = await runPF303(recs303ncr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLUE_REPLANT'), 'CLUE_REPLANT should not fire');
    });

    it('PAYOFF_DOUBLE_FIRE fires when the same setup is paid off in two scenes', async () => {
      const recs303df = Array.from({ length: 8 }, (_, i) =>
        makeRec303(i, {
          seededClueIds: i === 1 ? ['clue-a'] : [],
          payoffSetupIds: i === 4 || i === 6 ? ['clue-a'] : [],
        })
      );
      const res = await runPF303(recs303df);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_DOUBLE_FIRE'), 'PAYOFF_DOUBLE_FIRE should fire');
    });

    it('PAYOFF_DOUBLE_FIRE does not fire when each setup pays off once', async () => {
      const recs303ndf = Array.from({ length: 8 }, (_, i) =>
        makeRec303(i, {
          seededClueIds: i === 1 ? ['clue-a'] : [],
          payoffSetupIds: i === 4 ? ['clue-a'] : [],
        })
      );
      const res = await runPF303(recs303ndf);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_DOUBLE_FIRE'), 'PAYOFF_DOUBLE_FIRE should not fire');
    });

    it('THREAD_CONVERGENCE_ABSENT fires when 4+ payoffs all resolve in isolation', async () => {
      const recs303tc = Array.from({ length: 8 }, (_, i) =>
        makeRec303(i, {
          seededClueIds: i < 4 ? [`clue-${i}`] : [],
          payoffSetupIds: i >= 4 ? [`clue-${i - 4}`] : [],
        })
      );
      const res = await runPF303(recs303tc);
      assert.ok(res.issues.some((i: any) => i.rule === 'THREAD_CONVERGENCE_ABSENT'), 'THREAD_CONVERGENCE_ABSENT should fire');
    });

    it('THREAD_CONVERGENCE_ABSENT does not fire when one scene resolves two threads', async () => {
      const recs303ntc = Array.from({ length: 8 }, (_, i) =>
        makeRec303(i, {
          seededClueIds: i < 4 ? [`clue-${i}`] : [],
          payoffSetupIds:
            i === 5 ? ['clue-0']
            : i === 6 ? ['clue-1', 'clue-2']
            : i === 7 ? ['clue-3']
            : [],
        })
      );
      const res = await runPF303(recs303ntc);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THREAD_CONVERGENCE_ABSENT'), 'THREAD_CONVERGENCE_ABSENT should not fire');
    });
  });


  describe('Wave 384 — payoffPass: payoff suspense peak decoupled, clue seed clock decoupled, clue seed front-loaded', async () => {
    const makeRec384 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runPay384 = async (records: any[]) => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      return payoffPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('PAYOFF_SUSPENSE_PEAK_DECOUPLED fires when the peak-suspense scene carries no payoff', async () => {
      // scene 6 has peak suspenseDelta=2.0 (no payoff); payoffs at 2,4
      const recs384sp = Array.from({ length: 8 }, (_, i) =>
        makeRec384(i, {
          suspenseDelta: i === 6 ? 2.0 : 0,
          payoffSetupIds: [2, 4].includes(i) ? [`setup${i}`] : [],
        }),
      );
      const res = await runPay384(recs384sp);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_SUSPENSE_PEAK_DECOUPLED'), 'PAYOFF_SUSPENSE_PEAK_DECOUPLED should fire');
    });

    it('PAYOFF_SUSPENSE_PEAK_DECOUPLED does not fire when the peak-suspense scene carries a payoff', async () => {
      const recs384spn = Array.from({ length: 8 }, (_, i) =>
        makeRec384(i, {
          suspenseDelta: i === 6 ? 2.0 : 0,
          payoffSetupIds: [2, 4, 6].includes(i) ? [`setup${i}`] : [],
        }),
      );
      const res = await runPay384(recs384spn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_SUSPENSE_PEAK_DECOUPLED'), 'PAYOFF_SUSPENSE_PEAK_DECOUPLED should not fire');
    });

    it('CLUE_SEED_CLOCK_DECOUPLED fires when no clue-seeding scene raises a clock', async () => {
      // seeds at 1,3,5; clocks at 2,6 — no overlap
      const recs384cd = Array.from({ length: 8 }, (_, i) =>
        makeRec384(i, {
          seededClueIds: [1, 3, 5].includes(i) ? [`clue${i}`] : [],
          clockRaised: [2, 6].includes(i),
        }),
      );
      const res = await runPay384(recs384cd);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLUE_SEED_CLOCK_DECOUPLED'), 'CLUE_SEED_CLOCK_DECOUPLED should fire');
    });

    it('CLUE_SEED_CLOCK_DECOUPLED does not fire when a clue-seeding scene raises a clock', async () => {
      // scene 3 is both a seed scene and a clock scene
      const recs384cdn = Array.from({ length: 8 }, (_, i) =>
        makeRec384(i, {
          seededClueIds: [1, 3, 5].includes(i) ? [`clue${i}`] : [],
          clockRaised: [3, 6].includes(i),
        }),
      );
      const res = await runPay384(recs384cdn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLUE_SEED_CLOCK_DECOUPLED'), 'CLUE_SEED_CLOCK_DECOUPLED should not fire');
    });

    it('CLUE_SEED_FRONT_LOADED fires when >60% of clues are planted in the first half', async () => {
      // n=10 → mid=5; clues at 0,1,2 (first half) and 8 (second half) → 3/4 = 75%
      const recs384fl = Array.from({ length: 10 }, (_, i) =>
        makeRec384(i, { seededClueIds: [0, 1, 2, 8].includes(i) ? [`clue${i}`] : [] }),
      );
      const res = await runPay384(recs384fl);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLUE_SEED_FRONT_LOADED'), 'CLUE_SEED_FRONT_LOADED should fire');
    });

    it('CLUE_SEED_FRONT_LOADED does not fire when clues are balanced across halves', async () => {
      // clues at 1,2 (first half) and 6,8 (second half) → 2/4 = 50%
      const recs384fln = Array.from({ length: 10 }, (_, i) =>
        makeRec384(i, { seededClueIds: [1, 2, 6, 8].includes(i) ? [`clue${i}`] : [] }),
      );
      const res = await runPay384(recs384fln);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLUE_SEED_FRONT_LOADED'), 'CLUE_SEED_FRONT_LOADED should not fire');
    });
  });


  describe('Wave 370 — payoffPass: payoff curiosity peak decoupled, payoff Act 3 absent, clue seed midpoint void', async () => {
    const makeRec370 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runPay370 = async (records: any[]) => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      return payoffPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('PAYOFF_CURIOSITY_PEAK_DECOUPLED fires when the peak-curiosity scene carries no payoff', async () => {
      // scene 6 has peak curiosityDelta=2.0 (no payoff); payoffs at scenes 2,4
      const recs370cp = Array.from({ length: 8 }, (_, i) =>
        makeRec370(i, {
          curiosityDelta: i === 6 ? 2.0 : 0,
          payoffSetupIds: [2, 4].includes(i) ? [`setup${i}`] : [],
        }),
      );
      const res = await runPay370(recs370cp);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_CURIOSITY_PEAK_DECOUPLED'), 'PAYOFF_CURIOSITY_PEAK_DECOUPLED should fire');
    });

    it('PAYOFF_CURIOSITY_PEAK_DECOUPLED does not fire when the peak-curiosity scene carries a payoff', async () => {
      // scene 6 peak curiosity AND a payoff
      const recs370cpn = Array.from({ length: 8 }, (_, i) =>
        makeRec370(i, {
          curiosityDelta: i === 6 ? 2.0 : 0,
          payoffSetupIds: [2, 4, 6].includes(i) ? [`setup${i}`] : [],
        }),
      );
      const res = await runPay370(recs370cpn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_CURIOSITY_PEAK_DECOUPLED'), 'PAYOFF_CURIOSITY_PEAK_DECOUPLED should not fire');
    });

    it('PAYOFF_ACT3_ABSENT fires when 3+ payoffs land before Act 3 and none within it', async () => {
      // n=12 → act3Start=9; payoffs at 2,4,6 (all before 9)
      const recs370a3 = Array.from({ length: 12 }, (_, i) =>
        makeRec370(i, { payoffSetupIds: [2, 4, 6].includes(i) ? [`setup${i}`] : [] }),
      );
      const res = await runPay370(recs370a3);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_ACT3_ABSENT'), 'PAYOFF_ACT3_ABSENT should fire');
    });

    it('PAYOFF_ACT3_ABSENT does not fire when a payoff lands in Act 3', async () => {
      // payoff at scene 10 (Act 3)
      const recs370a3n = Array.from({ length: 12 }, (_, i) =>
        makeRec370(i, { payoffSetupIds: [2, 4, 6, 10].includes(i) ? [`setup${i}`] : [] }),
      );
      const res = await runPay370(recs370a3n);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_ACT3_ABSENT'), 'PAYOFF_ACT3_ABSENT should not fire');
    });

    it('CLUE_SEED_MIDPOINT_VOID fires when no clue is seeded in the 40-60% zone but seeds exist on both sides', async () => {
      // n=10 → mid zone [4,6); seeds at 1 (before), 8 (after); none at 4 or 5
      const recs370mv = Array.from({ length: 10 }, (_, i) =>
        makeRec370(i, { seededClueIds: [1, 2, 8].includes(i) ? [`clue${i}`] : [] }),
      );
      const res = await runPay370(recs370mv);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLUE_SEED_MIDPOINT_VOID'), 'CLUE_SEED_MIDPOINT_VOID should fire');
    });

    it('CLUE_SEED_MIDPOINT_VOID does not fire when a clue is seeded in the midpoint zone', async () => {
      // seed at scene 5 (within [4,6))
      const recs370mvn = Array.from({ length: 10 }, (_, i) =>
        makeRec370(i, { seededClueIds: [1, 5, 8].includes(i) ? [`clue${i}`] : [] }),
      );
      const res = await runPay370(recs370mvn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLUE_SEED_MIDPOINT_VOID'), 'CLUE_SEED_MIDPOINT_VOID should not fire');
    });
  });


  describe('Wave 356 — payoffPass: clue seed dramatic turn decoupled, payoff clock decoupled, late clue plant', async () => {
    const makeRec356 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0.5,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runPay356 = async (records: any[]) => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      return payoffPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('CLUE_SEED_DRAMATIC_TURN_DECOUPLED fires when no clue-seeding scene carries a dramatic turn', async () => {
      const recs356sd = Array.from({ length: 10 }, (_, i) =>
        makeRec356(i, { seededClueIds: [1, 3, 5].includes(i) ? [`clue${i}`] : [], dramaticTurn: 'nothing' })
      );
      const res = await runPay356(recs356sd);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLUE_SEED_DRAMATIC_TURN_DECOUPLED'), 'CLUE_SEED_DRAMATIC_TURN_DECOUPLED should fire');
    });

    it('CLUE_SEED_DRAMATIC_TURN_DECOUPLED does not fire when a clue-seeding scene pivots', async () => {
      const recs356sdn = Array.from({ length: 10 }, (_, i) =>
        makeRec356(i, { seededClueIds: [1, 3, 5].includes(i) ? [`clue${i}`] : [], dramaticTurn: i === 3 ? 'reversal' : 'nothing' })
      );
      const res = await runPay356(recs356sdn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLUE_SEED_DRAMATIC_TURN_DECOUPLED'), 'CLUE_SEED_DRAMATIC_TURN_DECOUPLED should not fire');
    });

    it('PAYOFF_CLOCK_DECOUPLED fires when no payoff lands under a clock', async () => {
      const recs356pc = Array.from({ length: 10 }, (_, i) =>
        makeRec356(i, {
          clockRaised: [1, 2].includes(i),
          payoffSetupIds: [4, 6, 8].includes(i) ? [`clue${i}`] : [],
        })
      );
      const res = await runPay356(recs356pc);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_CLOCK_DECOUPLED'), 'PAYOFF_CLOCK_DECOUPLED should fire');
    });

    it('PAYOFF_CLOCK_DECOUPLED does not fire when a payoff lands under a clock', async () => {
      const recs356pcn = Array.from({ length: 10 }, (_, i) =>
        makeRec356(i, {
          clockRaised: [1, 2, 6].includes(i),
          payoffSetupIds: [4, 6, 8].includes(i) ? [`clue${i}`] : [],
        })
      );
      const res = await runPay356(recs356pcn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_CLOCK_DECOUPLED'), 'PAYOFF_CLOCK_DECOUPLED should not fire');
    });

    it('LATE_CLUE_PLANT fires when a clue is seeded in the final 15%', async () => {
      // n=10 → lateStart = floor(8.5) = 8; seed at scene 9
      const recs356lc = Array.from({ length: 10 }, (_, i) =>
        makeRec356(i, { seededClueIds: [1, 9].includes(i) ? [`clue${i}`] : [] })
      );
      const res = await runPay356(recs356lc);
      assert.ok(res.issues.some((i: any) => i.rule === 'LATE_CLUE_PLANT'), 'LATE_CLUE_PLANT should fire');
    });

    it('LATE_CLUE_PLANT does not fire when all clues are seeded early', async () => {
      const recs356lcn = Array.from({ length: 10 }, (_, i) =>
        makeRec356(i, { seededClueIds: [1, 2, 3].includes(i) ? [`clue${i}`] : [] })
      );
      const res = await runPay356(recs356lcn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'LATE_CLUE_PLANT'), 'LATE_CLUE_PLANT should not fire');
    });
  });


  describe('Wave 342 — payoffPass: clue seed relationship decoupled, payoff dramatic turn decoupled, setup/payoff dead run', async () => {
    const makeRec342 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runPay342 = async (records: any[]) => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      return payoffPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };
    const relShift342 = [{ pairKey: 'A|B', dimension: 'trust', amount: -0.5 }];

    it('CLUE_SEED_RELATIONSHIP_DECOUPLED fires when no clue-seeding scene moves a bond', async () => {
      const recs342sr = Array.from({ length: 8 }, (_, i) =>
        makeRec342(i, { seededClueIds: [0, 1, 2].includes(i) ? [`clue${i}`] : [], relationshipShifts: [] })
      );
      const res = await runPay342(recs342sr);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLUE_SEED_RELATIONSHIP_DECOUPLED'), 'CLUE_SEED_RELATIONSHIP_DECOUPLED should fire');
    });

    it('CLUE_SEED_RELATIONSHIP_DECOUPLED does not fire when a clue-seeding scene shifts a relationship', async () => {
      const recs342srn = Array.from({ length: 8 }, (_, i) =>
        makeRec342(i, { seededClueIds: [0, 1, 2].includes(i) ? [`clue${i}`] : [], relationshipShifts: i === 1 ? relShift342 : [] })
      );
      const res = await runPay342(recs342srn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLUE_SEED_RELATIONSHIP_DECOUPLED'), 'CLUE_SEED_RELATIONSHIP_DECOUPLED should not fire');
    });

    it('PAYOFF_DRAMATIC_TURN_DECOUPLED fires when no payoff scene carries a dramatic turn', async () => {
      const recs342pt = Array.from({ length: 8 }, (_, i) =>
        makeRec342(i, { payoffSetupIds: [3, 5, 7].includes(i) ? [`clue${i}`] : [], dramaticTurn: 'nothing' })
      );
      const res = await runPay342(recs342pt);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_DRAMATIC_TURN_DECOUPLED'), 'PAYOFF_DRAMATIC_TURN_DECOUPLED should fire');
    });

    it('PAYOFF_DRAMATIC_TURN_DECOUPLED does not fire when a payoff scene pivots the story', async () => {
      const recs342ptn = Array.from({ length: 8 }, (_, i) =>
        makeRec342(i, { payoffSetupIds: [3, 5, 7].includes(i) ? [`clue${i}`] : [], dramaticTurn: i === 5 ? 'reversal' : 'nothing' })
      );
      const res = await runPay342(recs342ptn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_DRAMATIC_TURN_DECOUPLED'), 'PAYOFF_DRAMATIC_TURN_DECOUPLED should not fire');
    });

    it('SETUP_PAYOFF_DEAD_RUN fires when 6+ consecutive scenes have no setup or payoff', async () => {
      const recs342dr = Array.from({ length: 12 }, (_, i) =>
        makeRec342(i, {
          seededClueIds: [0, 1].includes(i) ? [`clue${i}`] : [],
          payoffSetupIds: [10, 11].includes(i) ? [`clue${i - 10}`] : [],
        })
      );
      // scenes 2-9 (8 consecutive) carry no seed and no payoff
      const res = await runPay342(recs342dr);
      assert.ok(res.issues.some((i: any) => i.rule === 'SETUP_PAYOFF_DEAD_RUN'), 'SETUP_PAYOFF_DEAD_RUN should fire');
    });

    it('SETUP_PAYOFF_DEAD_RUN does not fire when continuity activity is well distributed', async () => {
      const recs342drn = Array.from({ length: 12 }, (_, i) =>
        makeRec342(i, {
          seededClueIds: [0, 3, 6, 9].includes(i) ? [`clue${i}`] : [],
          payoffSetupIds: [2, 5, 8, 11].includes(i) ? [`clue${i}`] : [],
        })
      );
      // longest dead run is 2 scenes
      const res = await runPay342(recs342drn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SETUP_PAYOFF_DEAD_RUN'), 'SETUP_PAYOFF_DEAD_RUN should not fire');
    });
  });


  describe('Wave 328 — payoffPass: payoff relationship decoupled, clue seed curiosity flat, clue seed emotion flat', async () => {
    const makeRec328 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runPay328 = async (records: any[]) => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      return payoffPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('PAYOFF_RELATIONSHIP_DECOUPLED fires when no payoff scene moves a bond', async () => {
      const recs328rd = Array.from({ length: 8 }, (_, i) =>
        makeRec328(i, {
          seededClueIds: i < 3 ? [`clue${i}`] : [],
          payoffSetupIds: [3, 5, 7].includes(i) ? [`clue${[3, 5, 7].indexOf(i)}`] : [],
          relationshipShifts: [],
        })
      );
      const res = await runPay328(recs328rd);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_RELATIONSHIP_DECOUPLED'), 'PAYOFF_RELATIONSHIP_DECOUPLED should fire');
    });

    it('PAYOFF_RELATIONSHIP_DECOUPLED does not fire when a payoff scene shifts a relationship', async () => {
      const recs328nrd = Array.from({ length: 8 }, (_, i) =>
        makeRec328(i, {
          seededClueIds: i < 3 ? [`clue${i}`] : [],
          payoffSetupIds: [3, 5, 7].includes(i) ? [`clue${[3, 5, 7].indexOf(i)}`] : [],
          relationshipShifts: i === 5 ? [{ pairKey: 'A|B', dimension: 'trust', amount: -0.5 }] : [],
        })
      );
      const res = await runPay328(recs328nrd);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_RELATIONSHIP_DECOUPLED'), 'PAYOFF_RELATIONSHIP_DECOUPLED should not fire');
    });

    it('CLUE_SEED_CURIOSITY_FLAT fires when clue-seeding scenes raise no curiosity', async () => {
      const recs328cf = Array.from({ length: 8 }, (_, i) =>
        makeRec328(i, {
          seededClueIds: [1, 3, 5].includes(i) ? [`clue${i}`] : [],
          curiosityDelta: 0,
        })
      );
      const res = await runPay328(recs328cf);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLUE_SEED_CURIOSITY_FLAT'), 'CLUE_SEED_CURIOSITY_FLAT should fire');
    });

    it('CLUE_SEED_CURIOSITY_FLAT does not fire when clue-seeding scenes raise curiosity', async () => {
      const recs328ncf = Array.from({ length: 8 }, (_, i) =>
        makeRec328(i, {
          seededClueIds: [1, 3, 5].includes(i) ? [`clue${i}`] : [],
          curiosityDelta: [1, 3, 5].includes(i) ? 2 : 0,
        })
      );
      const res = await runPay328(recs328ncf);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLUE_SEED_CURIOSITY_FLAT'), 'CLUE_SEED_CURIOSITY_FLAT should not fire');
    });

    it('CLUE_SEED_EMOTION_FLAT fires when every clue-seeding scene is emotionally neutral', async () => {
      const recs328ef = Array.from({ length: 8 }, (_, i) =>
        makeRec328(i, {
          seededClueIds: [1, 3, 5].includes(i) ? [`clue${i}`] : [],
          curiosityDelta: 2,
          emotionalShift: 'neutral',
        })
      );
      const res = await runPay328(recs328ef);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLUE_SEED_EMOTION_FLAT'), 'CLUE_SEED_EMOTION_FLAT should fire');
    });

    it('CLUE_SEED_EMOTION_FLAT does not fire when a clue-seeding scene is emotionally charged', async () => {
      const recs328nef = Array.from({ length: 8 }, (_, i) =>
        makeRec328(i, {
          seededClueIds: [1, 3, 5].includes(i) ? [`clue${i}`] : [],
          curiosityDelta: 2,
          emotionalShift: i === 3 ? 'positive' : 'neutral',
        })
      );
      const res = await runPay328(recs328nef);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLUE_SEED_EMOTION_FLAT'), 'CLUE_SEED_EMOTION_FLAT should not fire');
    });
  });


  describe('Wave 317 — payoffPass: payoff emotion decoupled, unresolved clue ratio high, payoff curiosity mismatch', async () => {
    const makeRec317 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runPay317 = async (records: any[]) => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      return payoffPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('PAYOFF_EMOTION_DECOUPLED fires when all payoff scenes are emotionally neutral', async () => {
      const recs317ed = Array.from({ length: 8 }, (_, i) =>
        makeRec317(i, {
          seededClueIds: i < 3 ? [`clue${i}`] : [],
          payoffSetupIds: [3, 5, 7].includes(i) ? [`clue${[3, 5, 7].indexOf(i)}`] : [],
          emotionalShift: 'neutral',
        })
      );
      const res = await runPay317(recs317ed);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_EMOTION_DECOUPLED'), 'PAYOFF_EMOTION_DECOUPLED should fire');
    });

    it('PAYOFF_EMOTION_DECOUPLED does not fire when payoff scenes have emotional shifts', async () => {
      const recs317ned = Array.from({ length: 8 }, (_, i) =>
        makeRec317(i, {
          seededClueIds: i < 3 ? [`clue${i}`] : [],
          payoffSetupIds: [3, 5, 7].includes(i) ? [`clue${[3, 5, 7].indexOf(i)}`] : [],
          emotionalShift: [3, 5, 7].includes(i) ? 'positive' : 'neutral',
        })
      );
      const res = await runPay317(recs317ned);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_EMOTION_DECOUPLED'), 'PAYOFF_EMOTION_DECOUPLED should not fire');
    });

    it('UNRESOLVED_CLUE_RATIO_HIGH fires when 40%+ of planted clues remain open at the end', async () => {
      const recs317ur = Array.from({ length: 8 }, (_, i) =>
        makeRec317(i, {
          seededClueIds: i < 4 ? [`clue${i}`] : [],
          payoffSetupIds: i === 5 ? ['clue0'] : [],
          unresolvedClues: i === 7 ? ['clue1', 'clue2', 'clue3'] : [],
        })
      );
      const res = await runPay317(recs317ur);
      assert.ok(res.issues.some((i: any) => i.rule === 'UNRESOLVED_CLUE_RATIO_HIGH'), 'UNRESOLVED_CLUE_RATIO_HIGH should fire');
    });

    it('UNRESOLVED_CLUE_RATIO_HIGH does not fire when most clues are resolved', async () => {
      const recs317nur = Array.from({ length: 8 }, (_, i) =>
        makeRec317(i, {
          seededClueIds: i < 4 ? [`clue${i}`] : [],
          payoffSetupIds: [4, 5, 6, 7].includes(i) ? [`clue${i - 4}`] : [],
          unresolvedClues: [],
        })
      );
      const res = await runPay317(recs317nur);
      assert.ok(!res.issues.some((i: any) => i.rule === 'UNRESOLVED_CLUE_RATIO_HIGH'), 'UNRESOLVED_CLUE_RATIO_HIGH should not fire');
    });

    it('PAYOFF_CURIOSITY_MISMATCH fires when payoff scenes have avg curiosityDelta ≤ 0', async () => {
      const recs317cm = Array.from({ length: 8 }, (_, i) =>
        makeRec317(i, {
          seededClueIds: i < 3 ? [`clue${i}`] : [],
          payoffSetupIds: [3, 5, 7].includes(i) ? [`clue${[3, 5, 7].indexOf(i)}`] : [],
          curiosityDelta: 0,
        })
      );
      const res = await runPay317(recs317cm);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_CURIOSITY_MISMATCH'), 'PAYOFF_CURIOSITY_MISMATCH should fire');
    });

    it('PAYOFF_CURIOSITY_MISMATCH does not fire when payoff scenes raise curiosity', async () => {
      const recs317ncm = Array.from({ length: 8 }, (_, i) =>
        makeRec317(i, {
          seededClueIds: i < 3 ? [`clue${i}`] : [],
          payoffSetupIds: [3, 5, 7].includes(i) ? [`clue${[3, 5, 7].indexOf(i)}`] : [],
          curiosityDelta: [3, 5, 7].includes(i) ? 1.5 : 0,
        })
      );
      const res = await runPay317(recs317ncm);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_CURIOSITY_MISMATCH'), 'PAYOFF_CURIOSITY_MISMATCH should not fire');
    });
  });


  describe('Wave 289 — payoffPass: payoff-revelation disconnect, clue density front collapse, payoff suspense mismatch', async () => {
    const makeRec289 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runPF289 = async (records: any[]) => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      return payoffPass({ fountain: '', original: '', records, structure: { actPosition: 'act3', completionPercent: 80 } as any, annotations: [], approvedSpans: [] });
    };

    it('PAYOFF_REVELATION_DISCONNECT fires when payoffs have no adjacent revelations', async () => {
      // 10 scenes: payoffs at 5,6,7 (via payoffSetupIds); no revelations anywhere
      const recs289prd = Array.from({ length: 10 }, (_, i) =>
        makeRec289(i, {
          seededClueIds: i < 3 ? [`clue-${i}`] : [],
          payoffSetupIds: i >= 5 && i <= 7 ? [`clue-${i - 5}`] : [],
          revelation: null,
        })
      );
      const res = await runPF289(recs289prd);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_REVELATION_DISCONNECT'), 'PAYOFF_REVELATION_DISCONNECT should fire');
    });

    it('PAYOFF_REVELATION_DISCONNECT does not fire when a payoff scene has a revelation', async () => {
      const recs289nprd = Array.from({ length: 10 }, (_, i) =>
        makeRec289(i, {
          seededClueIds: i < 3 ? [`clue-${i}`] : [],
          payoffSetupIds: i >= 5 && i <= 7 ? [`clue-${i - 5}`] : [],
          revelation: i === 6 ? 'the truth revealed' : null,
        })
      );
      const res = await runPF289(recs289nprd);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_REVELATION_DISCONNECT'), 'PAYOFF_REVELATION_DISCONNECT should not fire');
    });

    it('CLUE_DENSITY_FRONT_COLLAPSE fires when all clues are in the first 20%', async () => {
      // 10 scenes: all 3 clues planted at sceneIdx 0,1 (both within first 20% = scenes 0-1)
      const recs289cdfc = Array.from({ length: 10 }, (_, i) =>
        makeRec289(i, {
          seededClueIds: i <= 1 ? [`clue-${i}`] : [],
          payoffSetupIds: i === 8 ? ['clue-0', 'clue-1'] : i === 9 ? ['clue-2'] : [],
        })
      );
      // Add a third clue at scene 1 to reach size>=3
      recs289cdfc[1].seededClueIds = ['clue-1', 'clue-2'];
      const res = await runPF289(recs289cdfc);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLUE_DENSITY_FRONT_COLLAPSE'), 'CLUE_DENSITY_FRONT_COLLAPSE should fire');
    });

    it('CLUE_DENSITY_FRONT_COLLAPSE does not fire when clues are spread across the story', async () => {
      const recs289ncdfc = Array.from({ length: 10 }, (_, i) =>
        makeRec289(i, {
          seededClueIds: i === 1 || i === 4 || i === 7 ? [`clue-${i}`] : [],
        })
      );
      const res = await runPF289(recs289ncdfc);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLUE_DENSITY_FRONT_COLLAPSE'), 'CLUE_DENSITY_FRONT_COLLAPSE should not fire');
    });

    it('PAYOFF_SUSPENSE_MISMATCH fires when payoff scenes avg suspenseDelta is ≤ 0', async () => {
      const recs289psm = Array.from({ length: 10 }, (_, i) =>
        makeRec289(i, {
          seededClueIds: i < 3 ? [`clue-${i}`] : [],
          payoffSetupIds: i >= 5 && i <= 7 ? [`clue-${i - 5}`] : [],
          suspenseDelta: i >= 5 && i <= 7 ? -0.5 : 1,
        })
      );
      const res = await runPF289(recs289psm);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_SUSPENSE_MISMATCH'), 'PAYOFF_SUSPENSE_MISMATCH should fire');
    });

    it('PAYOFF_SUSPENSE_MISMATCH does not fire when payoff scenes have positive avg suspenseDelta', async () => {
      const recs289npsm = Array.from({ length: 10 }, (_, i) =>
        makeRec289(i, {
          seededClueIds: i < 3 ? [`clue-${i}`] : [],
          payoffSetupIds: i >= 5 && i <= 7 ? [`clue-${i - 5}`] : [],
          suspenseDelta: 1.5,
        })
      );
      const res = await runPF289(recs289npsm);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_SUSPENSE_MISMATCH'), 'PAYOFF_SUSPENSE_MISMATCH should not fire');
    });
  });


  describe('Wave 275 — payoffPass: Act 2a payoff void, late-majority clue seeding, setup/payoff act skew', async () => {
    const makeRecP275 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 1, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runP275 = async (records: any[], structureOverrides: any = {}) => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      return payoffPass({
        fountain: '', original: '', records,
        structure: { actPosition: 'act2', completionPercent: 50, openClues: 0, ...structureOverrides } as any,
        annotations: [], approvedSpans: [],
      });
    };

    it('PAYOFF_ACT2A_VOID fires when no payoffs land in Act 2a (scenes 25%-50%)', async () => {
      // n=10, act2a=[2,4]; 3 clues at scene 0, payoffs at 1, 7, 8 — none in [2,4]
      const recs275a = Array.from({ length: 10 }, (_, i) => makeRecP275(i, {
        ...(i === 0 ? { seededClueIds: ['av-a', 'av-b', 'av-c'] } : {}),
        ...(i === 1 ? { payoffSetupIds: ['av-a'] } : {}),
        ...(i === 7 ? { payoffSetupIds: ['av-b'] } : {}),
        ...(i === 8 ? { payoffSetupIds: ['av-c'] } : {}),
      }));
      const result275a = await runP275(recs275a);
      const void275a = result275a.issues.filter((i: any) => i.rule === 'PAYOFF_ACT2A_VOID');
      assert.ok(void275a.length >= 1, `Should detect PAYOFF_ACT2A_VOID, got: ${JSON.stringify(result275a.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(void275a[0].severity, 'minor');
    });

    it('PAYOFF_ACT2A_VOID does NOT fire when a payoff lands in Act 2a', async () => {
      // n=10, act2a=[2,4]; payoffs at 3 (in act2a), 7, 8 → has act2a payoff
      const recs275b = Array.from({ length: 10 }, (_, i) => makeRecP275(i, {
        ...(i === 0 ? { seededClueIds: ['av2-a', 'av2-b', 'av2-c'] } : {}),
        ...(i === 3 ? { payoffSetupIds: ['av2-a'] } : {}),
        ...(i === 7 ? { payoffSetupIds: ['av2-b'] } : {}),
        ...(i === 8 ? { payoffSetupIds: ['av2-c'] } : {}),
      }));
      const result275b = await runP275(recs275b);
      const void275b = result275b.issues.filter((i: any) => i.rule === 'PAYOFF_ACT2A_VOID');
      assert.strictEqual(void275b.length, 0, 'Should NOT fire PAYOFF_ACT2A_VOID when Act 2a has a payoff');
    });

    it('CLUE_SEED_LATE_MAJORITY fires when more than 60% of clues are seeded in the second half', async () => {
      // n=10, midpoint=5; 1 clue at scene 1 (early), 3 clues at scene 5 (late) → 3/4=75% late
      const recs275c = Array.from({ length: 10 }, (_, i) => makeRecP275(i, {
        ...(i === 1 ? { seededClueIds: ['lm-a'] } : {}),
        ...(i === 5 ? { seededClueIds: ['lm-b', 'lm-c', 'lm-d'] } : {}),
      }));
      const result275c = await runP275(recs275c);
      const lm275c = result275c.issues.filter((i: any) => i.rule === 'CLUE_SEED_LATE_MAJORITY');
      assert.ok(lm275c.length >= 1, `Should detect CLUE_SEED_LATE_MAJORITY, got: ${JSON.stringify(result275c.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(lm275c[0].severity, 'minor');
    });

    it('CLUE_SEED_LATE_MAJORITY does NOT fire when no more than 60% of clues are late-seeded', async () => {
      // n=10, midpoint=5; 2 clues at scenes 1,2 (early), 2 at scenes 6,7 (late) → 2/4=50%
      const recs275d = Array.from({ length: 10 }, (_, i) => makeRecP275(i, {
        ...(i === 1 ? { seededClueIds: ['lm2-a'] } : {}),
        ...(i === 2 ? { seededClueIds: ['lm2-b'] } : {}),
        ...(i === 6 ? { seededClueIds: ['lm2-c'] } : {}),
        ...(i === 7 ? { seededClueIds: ['lm2-d'] } : {}),
      }));
      const result275d = await runP275(recs275d);
      const lm275d = result275d.issues.filter((i: any) => i.rule === 'CLUE_SEED_LATE_MAJORITY');
      assert.strictEqual(lm275d.length, 0, 'Should NOT fire CLUE_SEED_LATE_MAJORITY when late clues ≤60%');
    });

    it('SETUP_PAYOFF_ACT_SKEW fires when setups and payoffs operate in completely separate act zones', async () => {
      // n=8; 3 clues in Act 1 (zone 0, scenes 0); 2 payoffs in Act 3 (zone 3, scenes 6-7)
      const recs275e = Array.from({ length: 8 }, (_, i) => makeRecP275(i, {
        ...(i === 0 ? { seededClueIds: ['sk-a', 'sk-b', 'sk-c'] } : {}),
        ...(i === 6 ? { payoffSetupIds: ['sk-a'] } : {}),
        ...(i === 7 ? { payoffSetupIds: ['sk-b'] } : {}),
      }));
      const result275e = await runP275(recs275e);
      const skew275e = result275e.issues.filter((i: any) => i.rule === 'SETUP_PAYOFF_ACT_SKEW');
      assert.ok(skew275e.length >= 1, `Should detect SETUP_PAYOFF_ACT_SKEW, got: ${JSON.stringify(result275e.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(skew275e[0].severity, 'minor');
    });

    it('SETUP_PAYOFF_ACT_SKEW does NOT fire when setups and payoffs share the same dominant act zone', async () => {
      // n=8; 3 clues in Act 2b (zone 2), 2 payoffs also landing in Act 2b (zone 2)
      const recs275f = Array.from({ length: 8 }, (_, i) => makeRecP275(i, {
        ...(i === 4 ? { seededClueIds: ['sk2-a'] } : {}),
        ...(i === 5 ? { seededClueIds: ['sk2-b', 'sk2-c'], payoffSetupIds: ['sk2-a'] } : {}),
        ...(i === 6 ? { payoffSetupIds: ['sk2-b'] } : {}),
      }));
      const result275f = await runP275(recs275f);
      const skew275f = result275f.issues.filter((i: any) => i.rule === 'SETUP_PAYOFF_ACT_SKEW');
      assert.strictEqual(skew275f.length, 0, 'Should NOT fire SETUP_PAYOFF_ACT_SKEW when setups and payoffs share the dominant act zone');
    });
  });


  describe('Wave 261 — payoffPass: payoff precedes setup, payoff gap excessive, payoff front-loaded', async () => {
    const makeRec261 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeInput261 = (records: any[]) => ({
      fountain: 'INT. SC - DAY\nAction line.\n', original: '...',
      records: records as any, structure: { completionPercent: 50, actPosition: 'act2a' } as any,
      storyContext: {} as any, annotations: records.map(() => null) as any,
      approvedSpans: [],
    });

    it('PAYOFF_PRECEDES_SETUP fires when a payoff lands before its setup', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      // payoff for 'x' at scene 2, but 'x' is first seeded at scene 5
      const records261a = [
        makeRec261(0), makeRec261(1),
        makeRec261(2, { payoffSetupIds: ['x'] }),
        makeRec261(3), makeRec261(4),
        makeRec261(5, { seededClueIds: ['x'] }),
      ];
      const result261a = await payoffPass(makeInput261(records261a));
      const inv = result261a.issues.filter((i: any) => i.rule === 'PAYOFF_PRECEDES_SETUP');
      assert.ok(inv.length >= 1, `Should detect PAYOFF_PRECEDES_SETUP, got: ${JSON.stringify(result261a.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(inv[0].severity, 'major');
    });

    it('PAYOFF_PRECEDES_SETUP does NOT fire when setup precedes payoff', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      const records261b = [
        makeRec261(0, { seededClueIds: ['x'] }),
        makeRec261(1), makeRec261(2), makeRec261(3),
        makeRec261(4, { payoffSetupIds: ['x'] }),
        makeRec261(5),
      ];
      const result261b = await payoffPass(makeInput261(records261b));
      const inv = result261b.issues.filter((i: any) => i.rule === 'PAYOFF_PRECEDES_SETUP');
      assert.strictEqual(inv.length, 0, 'Should NOT fire when setup precedes payoff');
    });

    it('PAYOFF_GAP_EXCESSIVE fires when a plant-to-payoff gap spans 60%+ of the story', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      // 10 scenes; clue 'x' planted scene 0, paid scene 9 → gap 9 >= 6
      const records261c = [
        makeRec261(0, { seededClueIds: ['x'] }),
        makeRec261(1), makeRec261(2), makeRec261(3), makeRec261(4),
        makeRec261(5), makeRec261(6), makeRec261(7), makeRec261(8),
        makeRec261(9, { payoffSetupIds: ['x'] }),
      ];
      const result261c = await payoffPass(makeInput261(records261c));
      const gap = result261c.issues.filter((i: any) => i.rule === 'PAYOFF_GAP_EXCESSIVE');
      assert.ok(gap.length >= 1, `Should detect PAYOFF_GAP_EXCESSIVE, got: ${JSON.stringify(result261c.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(gap[0].severity, 'minor');
    });

    it('PAYOFF_GAP_EXCESSIVE does NOT fire when the fuse is moderate', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      // gap of 3 scenes (< 6)
      const records261d = [
        makeRec261(0, { seededClueIds: ['x'] }),
        makeRec261(1), makeRec261(2),
        makeRec261(3, { payoffSetupIds: ['x'] }),
        makeRec261(4), makeRec261(5), makeRec261(6), makeRec261(7), makeRec261(8), makeRec261(9),
      ];
      const result261d = await payoffPass(makeInput261(records261d));
      const gap = result261d.issues.filter((i: any) => i.rule === 'PAYOFF_GAP_EXCESSIVE');
      assert.strictEqual(gap.length, 0, 'Should NOT fire when the plant-to-payoff gap is moderate');
    });

    it('PAYOFF_FRONT_LOADED fires when >60% of payoffs land in the first half', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      // 10 scenes; 4 payoffs, 3 in first half (scenes 2,3,4), 1 in second (scene 8)
      const records261e = [
        makeRec261(0, { seededClueIds: ['a'] }),
        makeRec261(1, { seededClueIds: ['b'] }),
        makeRec261(2, { seededClueIds: ['c'], payoffSetupIds: ['a'] }),
        makeRec261(3, { payoffSetupIds: ['b'] }),
        makeRec261(4, { payoffSetupIds: ['c'] }),
        makeRec261(5, { seededClueIds: ['d'] }),
        makeRec261(6), makeRec261(7),
        makeRec261(8, { payoffSetupIds: ['d'] }),
        makeRec261(9),
      ];
      const result261e = await payoffPass(makeInput261(records261e));
      const front = result261e.issues.filter((i: any) => i.rule === 'PAYOFF_FRONT_LOADED');
      assert.ok(front.length >= 1, `Should detect PAYOFF_FRONT_LOADED, got: ${JSON.stringify(result261e.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(front[0].severity, 'minor');
    });

    it('PAYOFF_FRONT_LOADED does NOT fire when payoffs are balanced across halves', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      // 10 scenes; 4 payoffs, 2 first half (scenes 2,3), 2 second half (scenes 7,8)
      const records261f = [
        makeRec261(0, { seededClueIds: ['a'] }),
        makeRec261(1, { seededClueIds: ['b'] }),
        makeRec261(2, { seededClueIds: ['c'], payoffSetupIds: ['a'] }),
        makeRec261(3, { seededClueIds: ['d'], payoffSetupIds: ['b'] }),
        makeRec261(4), makeRec261(5), makeRec261(6),
        makeRec261(7, { payoffSetupIds: ['c'] }),
        makeRec261(8, { payoffSetupIds: ['d'] }),
        makeRec261(9),
      ];
      const result261f = await payoffPass(makeInput261(records261f));
      const front = result261f.issues.filter((i: any) => i.rule === 'PAYOFF_FRONT_LOADED');
      assert.strictEqual(front.length, 0, 'Should NOT fire when payoffs are balanced across halves');
    });
  });


  describe('Wave 247 — payoffPass: setup Act 3 surge, payoff single-scene dump, setup desert Act 2b', async () => {
    const makeRec247 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeInput247 = (records: any[]) => ({
      fountain: 'INT. SC - DAY\nAction line.\n', original: '...',
      records: records as any, structure: { completionPercent: 50, actPosition: 'act2a' } as any,
      storyContext: {} as any,
      annotations: records.map(() => null) as any,
      approvedSpans: [],
    });

    it('SETUP_ACT3_SURGE fires when 40%+ of clues are planted in Act 3', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      // 8 records; 5 clues total; 2 in Act 3 (scenes 6-7 = floor(8*0.75)=6)
      const records247a = [
        makeRec247(0, { seededClueIds: ['c1', 'c2'] }),
        makeRec247(1),
        makeRec247(2, { seededClueIds: ['c3'] }),
        makeRec247(3), makeRec247(4), makeRec247(5),
        makeRec247(6, { seededClueIds: ['c4', 'c5'] }),
        makeRec247(7),
      ];
      const result = await payoffPass(makeInput247(records247a));
      assert.ok(result.issues.some((i: any) => i.rule === 'SETUP_ACT3_SURGE'), `Expected SETUP_ACT3_SURGE, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('SETUP_ACT3_SURGE does NOT fire when clues are planted early', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      // 5 clues all in Act 1-2 (scenes 0-4)
      const records247b = [
        makeRec247(0, { seededClueIds: ['c1', 'c2'] }),
        makeRec247(1, { seededClueIds: ['c3'] }),
        makeRec247(2, { seededClueIds: ['c4', 'c5'] }),
        makeRec247(3), makeRec247(4), makeRec247(5), makeRec247(6), makeRec247(7),
      ];
      const result = await payoffPass(makeInput247(records247b));
      assert.ok(!result.issues.some((i: any) => i.rule === 'SETUP_ACT3_SURGE'), 'Should NOT fire when clues are planted in Acts 1-2');
    });

    it('PAYOFF_SINGLE_SCENE_DUMP fires when >50% of payoffs land in one scene', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      // 4 payoffs total; 3 land in scene 5 (75% > 50%)
      const records247c = [
        makeRec247(0, { seededClueIds: ['c1', 'c2', 'c3', 'c4'] }),
        makeRec247(1), makeRec247(2), makeRec247(3), makeRec247(4),
        makeRec247(5, { payoffSetupIds: ['c1', 'c2', 'c3'] }),
        makeRec247(6), makeRec247(7), makeRec247(8),
        makeRec247(9, { payoffSetupIds: ['c4'] }),
      ];
      const result = await payoffPass(makeInput247(records247c));
      assert.ok(result.issues.some((i: any) => i.rule === 'PAYOFF_SINGLE_SCENE_DUMP'), `Expected PAYOFF_SINGLE_SCENE_DUMP, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('PAYOFF_SINGLE_SCENE_DUMP does NOT fire when payoffs are distributed', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      // 4 payoffs spread one per scene
      const records247d = [
        makeRec247(0, { seededClueIds: ['c1', 'c2', 'c3', 'c4'] }),
        makeRec247(1), makeRec247(2),
        makeRec247(3, { payoffSetupIds: ['c1'] }),
        makeRec247(4, { payoffSetupIds: ['c2'] }),
        makeRec247(5, { payoffSetupIds: ['c3'] }),
        makeRec247(6),
        makeRec247(7, { payoffSetupIds: ['c4'] }),
      ];
      const result = await payoffPass(makeInput247(records247d));
      assert.ok(!result.issues.some((i: any) => i.rule === 'PAYOFF_SINGLE_SCENE_DUMP'), 'Should NOT fire when payoffs are evenly distributed');
    });

    it('SETUP_DESERT_ACT2B fires when no clues are planted in Act 2b (50%-75%)', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      // 10 records; Act2b = scenes 5-6 (floor(10*0.5)=5, floor(10*0.75)=7); all 3 clues in Act 1
      const records247e = [
        makeRec247(0, { seededClueIds: ['c1', 'c2', 'c3'] }),
        makeRec247(1), makeRec247(2), makeRec247(3), makeRec247(4),
        makeRec247(5), makeRec247(6), makeRec247(7), makeRec247(8), makeRec247(9),
      ];
      const result = await payoffPass(makeInput247(records247e));
      assert.ok(result.issues.some((i: any) => i.rule === 'SETUP_DESERT_ACT2B'), `Expected SETUP_DESERT_ACT2B, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('SETUP_DESERT_ACT2B does NOT fire when at least one clue is planted in Act 2b', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      // clue c3 planted in scene 5 (Act 2b)
      const records247f = [
        makeRec247(0, { seededClueIds: ['c1', 'c2'] }),
        makeRec247(1), makeRec247(2), makeRec247(3), makeRec247(4),
        makeRec247(5, { seededClueIds: ['c3'] }),
        makeRec247(6), makeRec247(7), makeRec247(8), makeRec247(9),
      ];
      const result = await payoffPass(makeInput247(records247f));
      assert.ok(!result.issues.some((i: any) => i.rule === 'SETUP_DESERT_ACT2B'), 'Should NOT fire when a clue is planted in Act 2b');
    });
  });


  describe('Wave 219 — payoffPass: concurrent thread overload, resolution crammed at end, anticipation window decay (tension-debt physics)', async () => {
    const makeRec219 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 1, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'dialogue', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeInput219 = (records: any[]) => ({
      fountain: 'INT. SC - DAY\nAction line.\n', original: 'INT. SC - DAY\nAction line.\n',
      records: records as any, structure: {} as any,
      storyContext: {} as any, annotations: records.map(() => null) as any,
      approvedSpans: [],
    });
    // Build n scenes, then apply plant/payoff specs keyed by scene index.
    const build219 = (n: number, plants: Record<number, string[]>, payoffs: Record<number, string[]>) => {
      const records = Array.from({ length: n }, (_, i) => makeRec219(i));
      for (const [s, ids] of Object.entries(plants)) records[+s].seededClueIds = ids;
      for (const [s, ids] of Object.entries(payoffs)) records[+s].payoffSetupIds = ids;
      return records;
    };

    it('CONCURRENT_THREAD_OVERLOAD fires when many threads are held open simultaneously', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      // 6 clues planted at scenes 0-5 before any payoff → 6 concurrent open threads
      const records = build219(12,
        { 0: ['c0'], 1: ['c1'], 2: ['c2'], 3: ['c3'], 4: ['c4'], 5: ['c5'] },
        { 6: ['c0'], 7: ['c1'], 8: ['c2'], 9: ['c3'], 10: ['c4'], 11: ['c5'] },
      );
      const result = await payoffPass(makeInput219(records));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'CONCURRENT_THREAD_OVERLOAD'),
        'Should fire when peak concurrent open threads exceeds 5',
      );
    });

    it('CONCURRENT_THREAD_OVERLOAD does not fire when threads close as new ones open', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      // 6 clues, each closed before the next pile-up → peak concurrency stays at 2
      const records = build219(12,
        { 0: ['c0'], 1: ['c1'], 3: ['c2'], 5: ['c3'], 7: ['c4'], 9: ['c5'] },
        { 2: ['c0'], 4: ['c1'], 6: ['c2'], 8: ['c3'], 10: ['c4'], 11: ['c5'] },
      );
      const result = await payoffPass(makeInput219(records));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'CONCURRENT_THREAD_OVERLOAD'),
        'Should NOT fire when the story closes threads as it opens new ones',
      );
    });

    it('RESOLUTION_CRAMMED_AT_END fires when most payoffs land in the final 15%', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      // n=12, final 15% = scenes 10-11; 3 of 5 payoffs land there
      const records = build219(12,
        { 0: ['c0'], 1: ['c1'], 2: ['c2'], 3: ['c3'], 4: ['c4'] },
        { 10: ['c0', 'c1'], 11: ['c2'], 5: ['c3'], 6: ['c4'] },
      );
      const result = await payoffPass(makeInput219(records));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'RESOLUTION_CRAMMED_AT_END'),
        'Should fire when 60%+ of payoffs land in the final 15% of scenes',
      );
    });

    it('RESOLUTION_CRAMMED_AT_END does not fire when payoffs are distributed', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      // Payoffs spread across scenes 3,5,7,9,11 → only one in the final 15%
      const records = build219(12,
        { 0: ['c0'], 1: ['c1'], 2: ['c2'], 3: ['c3'], 4: ['c4'] },
        { 3: ['c0'], 5: ['c1'], 7: ['c2'], 9: ['c3'], 11: ['c4'] },
      );
      const result = await payoffPass(makeInput219(records));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'RESOLUTION_CRAMMED_AT_END'),
        'Should NOT fire when payoffs are paced across the whole arc',
      );
    });

    it('ANTICIPATION_WINDOW_DECAY fires when late setups have far shorter fuses than early ones', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      // Early clues: long gaps (8); late clues: gap 1 → late avg < half early avg
      const records = build219(12,
        { 0: ['c0'], 1: ['c1'], 6: ['c2'], 7: ['c3'] },
        { 8: ['c0', 'c3'], 9: ['c1'], 7: ['c2'] },
      );
      const result = await payoffPass(makeInput219(records));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'ANTICIPATION_WINDOW_DECAY'),
        'Should fire when later-planted clues are paid off on much shorter fuses',
      );
    });

    it('ANTICIPATION_WINDOW_DECAY does not fire when fuse lengths stay consistent', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      // Gaps roughly equal across early and late clues
      const records = build219(12,
        { 0: ['c0'], 1: ['c1'], 6: ['c2'], 7: ['c3'] },
        { 3: ['c0'], 5: ['c1'], 10: ['c2'], 11: ['c3'] },
      );
      const result = await payoffPass(makeInput219(records));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'ANTICIPATION_WINDOW_DECAY'),
        'Should NOT fire when setup→payoff gaps stay consistent across the story',
      );
    });
  });


  describe('Wave 206 — payoffPass: setup burst, mid-story payoff void, clue drought', async () => {
    const makeRec206 = (idx: number, override: Partial<any> = {}): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      purpose: 'dialogue', dramaticTurn: 'nothing', revelation: null,
      clockRaised: false, clockDelta: 0, emotionalShift: 'neutral', suspenseDelta: 1,
      dialogueHighlights: [], unresolvedClues: [], seededClueIds: [],
      payoffSetupIds: [], visualBeats: [], relationshipShifts: [],
      ...override,
    });
    const blankFountain206 = (n: number) =>
      Array.from({ length: n }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join('');
    const baseStructure206 = {
      completionPercent: 50, actPosition: 'act2a' as const,
      openClues: 0, reversalCount: 1, midpointPressure: 2, tightestScene: null,
    };
    const payoffInput206 = (records: any[]) => ({
      fountain: blankFountain206(records.length), original: blankFountain206(records.length),
      records: records as any, structure: baseStructure206 as any, annotations: [], approvedSpans: [],
    });

    // ── SETUP_BURST ───────────────────────────────────────────────────────────
    it('payoffPass detects SETUP_BURST when one scene plants 4+ distinct clues', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      const records = [
        makeRec206(0),
        makeRec206(1),
        makeRec206(2, { seededClueIds: ['c1', 'c2', 'c3', 'c4'] }),
        makeRec206(3),
        makeRec206(4),
        makeRec206(5),
      ];
      const result = await payoffPass(payoffInput206(records));
      const issues = result.issues.filter(i => i.rule === 'SETUP_BURST');
      assert.ok(issues.length >= 1, `Should detect SETUP_BURST; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(issues[0].severity === 'minor');
    });

    it('payoffPass does NOT fire SETUP_BURST when clues are spread across scenes', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      const records = [
        makeRec206(0, { seededClueIds: ['c1', 'c2'] }),
        makeRec206(1, { seededClueIds: ['c3', 'c4'] }),
        makeRec206(2),
        makeRec206(3),
        makeRec206(4),
        makeRec206(5),
      ];
      const result = await payoffPass(payoffInput206(records));
      assert.ok(
        !result.issues.some(i => i.rule === 'SETUP_BURST'),
        'Should NOT fire when no single scene seeds 4+ clues',
      );
    });

    // ── MIDSTORY_PAYOFF_VOID ──────────────────────────────────────────────────
    it('payoffPass detects MIDSTORY_PAYOFF_VOID when payoffs bracket an empty middle', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      // n=8, mid=[2,6). Payoffs at scene 1 (Act 1) and scene 7 (Act 3); none in middle.
      const records = Array.from({ length: 8 }, (_, i) => {
        if (i === 1) return makeRec206(i, { payoffSetupIds: ['p1'] });
        if (i === 7) return makeRec206(i, { payoffSetupIds: ['p2'] });
        return makeRec206(i);
      });
      const result = await payoffPass(payoffInput206(records));
      const issues = result.issues.filter(i => i.rule === 'MIDSTORY_PAYOFF_VOID');
      assert.ok(issues.length >= 1, `Should detect MIDSTORY_PAYOFF_VOID; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(issues[0].severity === 'minor');
    });

    it('payoffPass does NOT fire MIDSTORY_PAYOFF_VOID when a payoff lands in the middle', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      const records = Array.from({ length: 8 }, (_, i) => {
        if (i === 1) return makeRec206(i, { payoffSetupIds: ['p1'] });
        if (i === 4) return makeRec206(i, { payoffSetupIds: ['p3'] }); // middle payoff
        if (i === 7) return makeRec206(i, { payoffSetupIds: ['p2'] });
        return makeRec206(i);
      });
      const result = await payoffPass(payoffInput206(records));
      assert.ok(
        !result.issues.some(i => i.rule === 'MIDSTORY_PAYOFF_VOID'),
        'Should NOT fire when the middle act resolves a thread',
      );
    });

    // ── CLUE_DROUGHT ──────────────────────────────────────────────────────────
    it('payoffPass detects CLUE_DROUGHT when the setup/payoff engine goes idle for a long stretch', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      // n=10, clue events at scenes 1, 2, 8 → max gap 6 (scenes 3-7 dry)
      const records = Array.from({ length: 10 }, (_, i) => {
        if (i === 1) return makeRec206(i, { seededClueIds: ['c1'] });
        if (i === 2) return makeRec206(i, { seededClueIds: ['c2'] });
        if (i === 8) return makeRec206(i, { seededClueIds: ['c3'] });
        return makeRec206(i);
      });
      const result = await payoffPass(payoffInput206(records));
      const issues = result.issues.filter(i => i.rule === 'CLUE_DROUGHT');
      assert.ok(issues.length >= 1, `Should detect CLUE_DROUGHT; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(issues[0].severity === 'minor');
    });

    it('payoffPass does NOT fire CLUE_DROUGHT when clue events are evenly distributed', async () => {
      const { payoffPass } = await import('../../server/nvm/revision/passes/payoff.ts');
      // n=10, clue events at scenes 1, 3, 5, 7 → max gap 2
      const records = Array.from({ length: 10 }, (_, i) => {
        if (i === 1) return makeRec206(i, { seededClueIds: ['c1'] });
        if (i === 3) return makeRec206(i, { seededClueIds: ['c2'] });
        if (i === 5) return makeRec206(i, { seededClueIds: ['c3'] });
        if (i === 7) return makeRec206(i, { seededClueIds: ['c4'] });
        return makeRec206(i);
      });
      const result = await payoffPass(payoffInput206(records));
      assert.ok(
        !result.issues.some(i => i.rule === 'CLUE_DROUGHT'),
        'Should NOT fire when clue events are spread evenly across the story',
      );
    });
  });